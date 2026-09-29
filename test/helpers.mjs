import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

export const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));
export const tool = {
  name: 'call_endpoint', description: 'Live description; prices belong to the service.',
  inputSchema: { type: 'object', properties: { platform: { type: 'string' }, idempotency_key: { type: 'string' } } },
  annotations: { readOnlyHint: true, openWorldHint: true },
};
export function normalReply(message) {
  if (message.method === 'initialize') return {
    protocolVersion: '2025-11-25', capabilities: { tools: {} },
    serverInfo: { name: 'monocrawl', version: '9.9.9' }, instructions: 'Current hosted instructions.',
  };
  if (message.method === 'tools/list') return { tools: [tool] };
  if (message.method === 'ping') return {};
  return { content: [{ type: 'text', text: 'fixture' }], structuredContent: { success: true, credits_used: 3 }, isError: false };
}
export async function fixture(t, handler = () => undefined) {
  const calls = [];
  const server = createServer(async (req, res) => {
    try {
      let text = ''; for await (const chunk of req) text += chunk;
      const message = JSON.parse(text);
      calls.push({ message, headers: req.headers });
      const custom = await handler(message, req, res);
      if (res.destroyed || res.writableEnded) return;
      if (custom?.drop) { req.socket.destroy(); return; }
      res.writeHead(custom?.status || (message.id === undefined ? 202 : 200), { 'content-type': 'application/json', ...custom?.headers });
      if (message.id === undefined) { res.end(); return; }
      res.end(custom?.raw ?? JSON.stringify(custom?.body ?? { jsonrpc: '2.0', id: message.id, result: normalReply(message) }));
    } catch { res.destroy(); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  return { calls, url: 'http://127.0.0.1:' + server.address().port + '/mcp' };
}
export function transportFor(url, { entry = serverPath, env = {}, command = process.execPath, args = [entry], cwd } = {}) {
  const transport = new StdioClientTransport({ command, args, cwd, env: {
    MONOCRAWL_MCP_URL: url, ...env,
  }, stderr: 'pipe' });
  let stderr = '';
  transport.stderr.on('data', chunk => { stderr += chunk; });
  return { transport, stderr: () => stderr };
}
export async function sdkClient(t, url, options) {
  const wire = transportFor(url, options);
  const client = new Client({ name: 'monocrawl-package-test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(wire.transport);
  return { client, ...wire };
}
export async function rawClient(t, url, options) {
  const wire = transportFor(url, options);
  const pending = new Map();
  const received = [];
  wire.transport.onmessage = message => { received.push(message); pending.get(message.id)?.(message); pending.delete(message.id); };
  wire.transport.onerror = () => {};
  t.after(() => wire.transport.close());
  await wire.transport.start();
  return { ...wire, received, request: message => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(message.id); reject(new Error('Test response timeout')); }, 5000);
    pending.set(message.id, response => { clearTimeout(timer); resolve(response); });
    wire.transport.send(message).catch(reject);
  }) };
}
