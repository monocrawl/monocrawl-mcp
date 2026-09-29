import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

export const DEFAULT_URL = 'https://www.monocrawl.com/mcp';
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_INFLIGHT = 32;
const rpcError = (id, code, message, data) => ({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });

export function readConfig(env = process.env) {
  let url;
  try { url = new URL(env.MONOCRAWL_MCP_URL || DEFAULT_URL); }
  catch { throw new Error('MONOCRAWL_MCP_URL must be a valid URL.'); }
  const loopback = ['127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash ||
      !(url.href === DEFAULT_URL || (loopback && ['http:', 'https:'].includes(url.protocol)))) {
    throw new Error('MONOCRAWL_MCP_URL must be the official HTTPS endpoint or a literal loopback development URL, without credentials, query or fragment.');
  }
  const key = env.MONOCRAWL_API_KEY?.trim() || '';
  if (/[\r\n]/.test(key)) throw new Error('MONOCRAWL_API_KEY contains invalid characters.');
  const timeoutMs = Number(env.MONOCRAWL_TIMEOUT_MS || 75000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000) {
    throw new Error('MONOCRAWL_TIMEOUT_MS must be an integer between 100 and 120000.');
  }
  return { url, key, timeoutMs };
}

async function readJson(response) {
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    await response.body?.cancel();
    throw new Error('non-json');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('empty-body');
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw new Error('response-too-large');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

// This is a transport bridge, not a second tool registry. The hosted service owns
// protocol negotiation, tool schemas, authorization, confirmation and billing.
// One input message causes at most one POST, including on 401/429/5xx or timeout.
export async function startProxy({ config = readConfig(), stdin = process.stdin, stdout = process.stdout, stderr = process.stderr } = {}) {
  const transport = new StdioServerTransport(stdin, stdout, { maxBufferSize: 1024 * 1024 });
  const pending = new Map();
  const operations = new Set();
  const controllers = new Set();
  let active = 0;
  let protocolVersion;
  let ended = false;
  let closed = false;
  const log = () => stderr.write('Monocrawl MCP: transport error; request was not automatically retried.\n');
  const close = async () => {
    if (closed) return;
    closed = true;
    for (const controller of controllers) controller.abort();
    await transport.close();
  };
  const maybeClose = () => { if (ended && operations.size === 0) void close(); };
  const send = async (message) => { if (!closed) await transport.send(message); };

  async function forward(message) {
    // This hosted endpoint is stateless JSON request/response, with no incoming
    // server requests. Client responses have nothing to answer here.
    if (typeof message.method !== 'string') return;
    const request = Object.hasOwn(message, 'id');
    const id = message.id;
    if (message.method === 'notifications/cancelled') pending.get(message.params?.requestId)?.abort();
    if (request && pending.has(id)) {
      await send(rpcError(id, -32600, 'A request with this ID is already running.'));
      return;
    }
    if (active >= MAX_INFLIGHT) {
      if (request) await send(rpcError(id, -32000, 'Local MCP concurrency limit reached.', { max_inflight: MAX_INFLIGHT }));
      return;
    }
    active++;
    const controller = new AbortController();
    controllers.add(controller);
    if (request) pending.set(id, controller);
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    let status;
    try {
      const headers = { accept: 'application/json, text/event-stream', 'content-type': 'application/json' };
      if (config.key) headers.authorization = 'Bearer ' + config.key;
      if (protocolVersion) headers['mcp-protocol-version'] = protocolVersion;
      const response = await fetch(config.url, {
        method: 'POST', headers, body: JSON.stringify(message),
        redirect: 'manual', signal: controller.signal,
      });
      status = response.status;
      if (!request) { await response.body?.cancel(); return; }
      if (status >= 300 && status < 400) { await response.body?.cancel(); throw new Error('redirect-rejected'); }
      const reply = await readJson(response);
      if (!reply || reply.jsonrpc !== '2.0' ||
          (Object.hasOwn(reply, 'result') === Object.hasOwn(reply, 'error')) ||
          (reply.id !== id && !(reply.id === null && reply.error)) ||
          (reply.error && (!Number.isInteger(reply.error.code) || typeof reply.error.message !== 'string'))) {
        throw new Error('invalid-rpc-response');
      }
      // HTTP authentication failures may use id:null before parsing the request.
      // Associate that structured error with the original stdio request.
      if (reply.id === null && reply.error) reply.id = id;
      if (message.method === 'initialize' && typeof reply.result?.protocolVersion === 'string') {
        protocolVersion = reply.result.protocolVersion;
      }
      await send(reply);
    } catch {
      if (request) await send(rpcError(id, -32000,
        controller.signal.aborted
          ? 'Monocrawl request timed out or was cancelled. Its outcome may be unknown; it was not automatically retried.'
          : 'Monocrawl transport failed. Its outcome may be unknown; it was not automatically retried.',
        { ...(status ? { http_status: status } : {}), automatically_retried: false }));
      else log();
    } finally {
      clearTimeout(timeout);
      active--;
      controllers.delete(controller);
      if (request) pending.delete(id);
    }
  }

  transport.onmessage = (message) => {
    // Track work before it begins so stdin EOF waits for every response.
    const operation = Promise.resolve().then(() => forward(message));
    operations.add(operation);
    operation.catch(log).finally(() => { operations.delete(operation); maybeClose(); });
  };
  transport.onerror = () => {
    log(); // Never print a parser exception: it can contain keys or arguments.
    void send(rpcError(null, -32700, 'Invalid or oversized MCP input.')).catch(() => {});
  };
  transport.onclose = () => { closed = true; for (const controller of controllers) controller.abort(); };
  stdin.once('end', () => { ended = true; maybeClose(); });
  await transport.start();
  return { close };
}
