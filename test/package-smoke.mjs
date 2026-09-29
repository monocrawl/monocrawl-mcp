import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { fixture, sdkClient } from './helpers.mjs';

const exec = promisify(execFile);
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this check through npm run test:package.');
const source = fileURLToPath(new URL('../', import.meta.url));
const base = await realpath(tmpdir());
const work = await mkdtemp(join(base, 'monocrawl-mcp-pack-'));
const cleanup = [];
const t = { after: fn => cleanup.push(fn) };
try {
  const packed = await exec(process.execPath, [npmCli, 'pack', '--json', '--pack-destination', work], { cwd: source });
  const [manifest] = JSON.parse(packed.stdout);
  const expected = ['LICENSE', 'README.md', 'lib/proxy.mjs', 'package.json', 'server.mjs'];
  assert.deepEqual(manifest.files.map(x => x.path).sort(), expected);
  const archive = join(work, manifest.filename);
  await exec(process.execPath, [npmCli, 'install', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', archive], { cwd: work });
  const installed = join(work, 'node_modules', 'monocrawl-mcp');
  const pkg = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(pkg.bin['monocrawl-mcp'], 'server.mjs');
  assert.ok((await readFile(join(installed, 'server.mjs'), 'utf8')).startsWith('#!/usr/bin/env node'));
  assert.ok((await readdir(join(work, 'node_modules', '.bin'))).some(x => x === 'monocrawl-mcp' || x === 'monocrawl-mcp.cmd'));
  const upstream = await fixture(t);
  const { client, stderr } = await sdkClient(t, upstream.url, {
    command: process.execPath, args: [npmCli, 'exec', '--offline', '--', 'monocrawl-mcp'], cwd: work,
  });
  assert.equal((await client.listTools()).tools[0].name, 'call_endpoint');
  assert.equal((await client.callTool({ name: 'call_endpoint', arguments: {} })).structuredContent.success, true);
  assert.equal(stderr(), '');
  console.log(JSON.stringify({ status: 'passed', package: pkg.name, version: pkg.version, archive_files: expected, installed_command: 'monocrawl-mcp', checks: ['clean packed install', 'executable bin', 'SDK initialization', 'anonymous tool discovery', 'structured fixture tool response', 'no stdout diagnostics'] }, null, 2));
} finally {
  for (const fn of cleanup.reverse()) await fn();
  // Validate the resolved target before recursive cleanup, all within Node.
  const resolved = await realpath(work);
  const child = relative(base, resolved);
  if (!child || child.startsWith('..') || isAbsolute(child) || !child.startsWith('monocrawl-mcp-pack-')) throw new Error('Refusing unexpected cleanup path.');
  await rm(resolved, { recursive: true, force: true });
}
