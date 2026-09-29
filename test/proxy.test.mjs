import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readConfig, DEFAULT_URL } from '../lib/proxy.mjs';
import { fixture, sdkClient, rawClient, serverPath, tool } from './helpers.mjs';

const rpc = (id, method = 'tools/call', params = { name: 'call_endpoint', arguments: {} }) => ({ jsonrpc: '2.0', id, method, params });

test('SDK client negotiates with hosted server and receives current schemas, annotations and results', async t => {
  const upstream = await fixture(t);
  const { client, stderr } = await sdkClient(t, upstream.url, { env: { MONOCRAWL_API_KEY: 'test-secret-not-real' } });
  assert.equal(client.getServerVersion().name, 'monocrawl');
  assert.deepEqual((await client.listTools()).tools, [tool]);
  const result = await client.callTool({ name: 'call_endpoint', arguments: { platform: 'instagram', idempotency_key: 'retry-this-operation-only' } });
  assert.deepEqual(result.structuredContent, { success: true, credits_used: 3 });
  const call = upstream.calls.find(x => x.message.method === 'tools/call');
  assert.equal(call.headers.authorization, 'Bearer test-secret-not-real');
  assert.equal(call.headers['mcp-protocol-version'], '2025-11-25');
  assert.equal(call.message.params.arguments.idempotency_key, 'retry-this-operation-only');
  assert.equal(stderr(), '');
});

test('no-key discovery works without an authorization header', async t => {
  const upstream = await fixture(t);
  const { client } = await sdkClient(t, upstream.url);
  assert.equal((await client.listTools()).tools.length, 1);
  for (const call of upstream.calls) assert.equal(call.headers.authorization, undefined);
});

test('string and zero IDs, metadata and tool-level errors survive unchanged', async t => {
  const expected = { content: [{ type: 'text', text: 'Confirm first' }], structuredContent: { confirm_required: true }, isError: true, _meta: { receipt: 'r1' } };
  const upstream = await fixture(t, message => ({ body: { jsonrpc: '2.0', id: message.id, result: expected } }));
  const { request } = await rawClient(t, upstream.url);
  for (const id of ['string-id', 0]) {
    const message = rpc(id, 'tools/call', { name: 'run_monitor', arguments: { id: 'monitor-1', confirm: false }, _meta: { trace: 'preserve-me' } });
    assert.deepEqual(await request(message), { jsonrpc: '2.0', id, result: expected });
    assert.deepEqual(upstream.calls.at(-1).message, message);
  }
});

for (const status of [401, 429, 503]) test('HTTP ' + status + ' retains structured RPC errors without retry', async t => {
  const error = { code: -32001, message: 'Action refused', data: { reason: 'quota', retry_after_seconds: 5 } };
  const upstream = await fixture(t, () => ({ status, body: { jsonrpc: '2.0', id: null, error } }));
  const { request } = await rawClient(t, upstream.url);
  assert.deepEqual(await request(rpc('error-id')), { jsonrpc: '2.0', id: 'error-id', error });
  assert.equal(upstream.calls.length, 1);
});

test('connection lost after POST is not retried', async t => {
  const upstream = await fixture(t, () => ({ drop: true }));
  const { request } = await rawClient(t, upstream.url);
  const response = await request(rpc(4));
  assert.equal(response.error.data.automatically_retried, false);
  assert.match(response.error.message, /outcome may be unknown/);
  assert.equal(upstream.calls.length, 1);
});

test('timeout is bounded and a possibly charged POST is not retried', async t => {
  const upstream = await fixture(t, () => new Promise(resolve => setTimeout(resolve, 700)));
  const { request } = await rawClient(t, upstream.url, { env: { MONOCRAWL_TIMEOUT_MS: '150' } });
  const response = await request(rpc(5));
  assert.match(response.error.message, /timed out/);
  assert.equal(upstream.calls.length, 1);
});

test('redirect never forwards the bearer token or retries the call', async t => {
  const target = await fixture(t);
  const upstream = await fixture(t, () => ({ status: 307, headers: { location: target.url }, raw: '' }));
  const { request } = await rawClient(t, upstream.url, { env: { MONOCRAWL_API_KEY: 'test-only-secret' } });
  assert.equal((await request(rpc(6))).error.data.http_status, 307);
  assert.equal(upstream.calls.length, 1);
  assert.equal(target.calls.length, 0);
});

for (const [name, custom] of [
  ['HTML failure', { status: 502, headers: { 'content-type': 'text/html' }, raw: '<html>upstream-key-must-not-leak</html>' }],
  ['malformed JSON', { raw: '{malformed' }],
  ['mismatched response ID', { body: { jsonrpc: '2.0', id: 'wrong-id', result: {} } }],
  ['oversized JSON', { raw: JSON.stringify({ jsonrpc: '2.0', id: 8, result: { text: 'x'.repeat(8 * 1024 * 1024) } }) }],
]) test(name + ' returns a bounded, sanitized transport error', async t => {
  const upstream = await fixture(t, () => custom);
  const { request, stderr } = await rawClient(t, upstream.url);
  const response = await request(rpc(8));
  assert.equal(response.id, 8);
  assert.equal(response.error.code, -32000);
  assert.equal(response.error.data.automatically_retried, false);
  assert.ok(JSON.stringify(response).length < 400);
  assert.equal(stderr(), '');
  assert.equal(upstream.calls.length, 1);
});

test('notifications cause no stdio responses and pending calls finish before EOF exits', async t => {
  const upstream = await fixture(t, async () => { await new Promise(resolve => setTimeout(resolve, 70)); });
  const child = spawn(process.execPath, [serverPath], { env: { ...process.env, MONOCRAWL_MCP_URL: upstream.url, MONOCRAWL_API_KEY: '' }, stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  let stdout = ''; let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const completion = once(child, 'exit');
  child.stdin.end(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n' + JSON.stringify(rpc('finish-after-eof', 'ping', {})) + '\n');
  assert.equal((await completion)[0], 0);
  const lines = stdout.trim().split('\n').map(JSON.parse);
  assert.equal(lines.length, 1); assert.equal(lines[0].id, 'finish-after-eof');
  assert.equal(stderr, '');
});

test('configuration defaults to official host and rejects unsafe URLs', () => {
  for (const url of ['http://www.monocrawl.com/mcp', 'https://attacker.example/mcp', 'https://www.monocrawl.com/mcp?key=secret', 'https://user:secret@www.monocrawl.com/mcp', 'file:///etc/passwd', 'http://localhost.evil/mcp']) {
    assert.throws(() => readConfig({ MONOCRAWL_MCP_URL: url }), /MONOCRAWL_MCP_URL/);
  }
  assert.equal(readConfig({ MONOCRAWL_MCP_URL: 'http://127.0.0.1:1234/mcp' }).url.port, '1234');
  assert.throws(() => readConfig({ MONOCRAWL_API_KEY: 'key\r\nheader' }), /invalid characters/);
  assert.throws(() => readConfig({ MONOCRAWL_TIMEOUT_MS: '0' }), /integer/);
});


test('32-call local concurrency cap preserves every admitted response ID', async t => {
  const upstream = await fixture(t, async () => { await new Promise(resolve => setTimeout(resolve, 300)); });
  const { request } = await rawClient(t, upstream.url);
  const results = await Promise.all(Array.from({ length: 40 }, (_, i) => request(rpc('burst-' + i))));
  assert.equal(upstream.calls.length, 32);
  assert.equal(results.filter(x => x.result).length, 32);
  assert.equal(results.filter(x => x.error?.data?.max_inflight === 32).length, 8);
  results.forEach((result, i) => assert.equal(result.id, 'burst-' + i));
});

test('duplicate in-flight ID cannot execute the paid request twice', async t => {
  const upstream = await fixture(t, async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
  const { transport } = await rawClient(t, upstream.url);
  const received = [];
  const replies = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Missing duplicate-ID test replies')), 4000);
    transport.onmessage = message => { received.push(message); if (received.length === 2) { clearTimeout(timer); resolve(); } };
  });
  await transport.send(rpc('duplicate'));
  await transport.send(rpc('duplicate'));
  await replies;
  assert.equal(upstream.calls.length, 1);
  assert.equal(received.filter(x => x.error?.code === -32600).length, 1);
  assert.equal(received.filter(x => x.result).length, 1);
});

test('cancellation aborts the local wait without replaying the request', async t => {
  let admitted;
  const started = new Promise(resolve => { admitted = resolve; });
  const upstream = await fixture(t, async message => {
    if (message.method === 'tools/call') { admitted(); await new Promise(resolve => setTimeout(resolve, 500)); }
  });
  const { request, transport } = await rawClient(t, upstream.url);
  const call = request(rpc('cancel-me'));
  await started;
  await transport.send({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 'cancel-me' } });
  assert.match((await call).error.message, /cancelled/);
  assert.equal(upstream.calls.filter(x => x.message.method === 'tools/call').length, 1);
});
