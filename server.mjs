#!/usr/bin/env node
import { startProxy } from './lib/proxy.mjs';

try {
  const proxy = await startProxy();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    void proxy.close().finally(() => { process.exitCode = 0; });
  });
} catch (error) {
  // Configuration errors never include environment values.
  process.stderr.write('Monocrawl MCP: ' + error.message + '\n');
  process.exitCode = 1;
}
