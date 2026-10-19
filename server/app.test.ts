import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import type { Server } from 'node:http';
import { createApp } from './app';

const valid = { projectName: 'App', summary: 'Example', treeText: 'App/\n└── main.py', batchCode: '### main.py\nprint(1)' };
async function withServer(env: NodeJS.ProcessEnv, generate: (() => Promise<string>) | undefined,
  run: (base: string) => Promise<void>) {
  const server: Server = createApp({ root: process.cwd(), env, generate }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
const post = (base: string, body: unknown, token = 'secret', headers: Record<string, string> = {}) => fetch(base + '/api/generate-ai-tree', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...headers }, body: JSON.stringify(body),
});
test('AI is disabled without explicit access configuration', async () => {
  await withServer({}, async () => JSON.stringify(valid), async base => {
    assert.equal((await post(base, { prompt: 'App' })).status, 503);
  });
});
test('AI authentication, validation, origin and successful response', async () => {
  let calls = 0;
  await withServer({ AI_ACCESS_TOKEN: 'secret' }, async () => { calls++; return JSON.stringify(valid); }, async base => {
    assert.equal((await post(base, { prompt: 'App' }, 'wrong')).status, 401);
    assert.equal((await post(base, { prompt: 42 })).status, 400);
    assert.equal((await post(base, { prompt: 'App' }, 'secret', { origin: 'https://evil.example' })).status, 403);
    const response = await post(base, { prompt: 'App', language: 'ar' });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, valid);
    assert.equal(calls, 1);
  });
});
test('AI invalid output is not reported as success and does not leak provider errors', async () => {
  await withServer({ ALLOW_PUBLIC_AI: 'true' }, async () => '{"treeText":42}', async base => {
    const response = await post(base, { prompt: 'App' });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).success, undefined);
  });
});
test('AI has a server-wide daily budget', async () => {
  await withServer({ ALLOW_PUBLIC_AI: 'true', AI_DAILY_LIMIT: '1' }, async () => JSON.stringify(valid), async base => {
    assert.equal((await post(base, { prompt: 'App' })).status, 200);
    assert.equal((await post(base, { prompt: 'App' })).status, 429);
  });
});
test('API lists only text sources and returns JSON for missing routes and malformed JSON', async () => {
  await withServer({}, undefined, async base => {
    const files = (await (await fetch(base + '/api/python-files')).json()).files;
    assert.ok(files.some((file: {path: string}) => file.path === 'main.py'));
    assert.ok(files.every((file: {path: string}) => !['.png', '.zip', '.pyc'].includes(path.extname(file.path))));
    assert.equal((await fetch(base + '/api/missing')).status, 404);
    const response = await fetch(base + '/api/generate-ai-tree', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(response.status, 400);
  });
});
test('AI bounds concurrent provider calls', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let entered!: () => void;
  const ready = new Promise<void>(resolve => { entered = resolve; });
  let calls = 0;
  await withServer({ ALLOW_PUBLIC_AI: 'true' }, async () => {
    if (++calls === 2) entered();
    await gate;
    return JSON.stringify(valid);
  }, async base => {
    const first = post(base, { prompt: 'App' });
    const second = post(base, { prompt: 'App' });
    try {
      await ready;
      assert.equal((await post(base, { prompt: 'App' })).status, 429);
    } finally { release(); }
    assert.equal((await first).status, 200);
    assert.equal((await second).status, 200);
    assert.equal(calls, 2);
  });
});

test('Rate limiter gracefully handles X-Forwarded-For and Forwarded proxy headers without validation errors', async () => {
  await withServer({}, undefined, async base => {
    const response = await fetch(`${base}/api/health`, {
      headers: {
        'x-forwarded-for': '203.0.113.195',
        'forwarded': 'for=203.0.113.195;proto=https',
      },
    });
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.status, 'ok');
  });
});
