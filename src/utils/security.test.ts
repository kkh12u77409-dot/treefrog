import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseTreeText } from './treeParser';
import { splitContent } from './contentSplitter';
import { validateRelativePath } from './pathSafety';
import { generateStandalonePythonInstaller, generateStandaloneBashInstaller, generateStandalonePowerShellInstaller } from './installerGenerator';
import { INSTALLER_RUNTIME } from './installerRuntime';
import { exportProjectZip } from './zipGenerator';
import JSZip from 'jszip';

const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
for (const fixture of JSON.parse(readFileSync('TreeForge/tests/fixtures/parser-cases.json', 'utf8'))) {
  test(`parser parity: ${fixture.name}`, () => {
    const result = parseTreeText(fixture.text);
    assert.equal(result.errors.length === 0, fixture.valid);
    if (fixture.valid) {
      const paths: string[] = [];
      const walk = (n: NonNullable<typeof result.root>) => { if (!n.isDir) paths.push(n.path); n.children.forEach(walk); };
      assert.ok(result.root); walk(result.root);
      assert.deepEqual(paths, fixture.files);
    }
  });
}
for (const fixture of JSON.parse(readFileSync('TreeForge/tests/fixtures/splitter-cases.json', 'utf8'))) {
  test(`splitter parity: ${fixture.name}`, () => {
    const chunks = splitContent(fixture.text, fixture.candidates);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].matchStatus, fixture.status);
    assert.equal(chunks[0].resolvedPath, fixture.path);
    assert.equal(chunks[0].content, fixture.content);
  });
}
test('rejects portable unsafe paths', () => {
  for (const value of ['../escape', '/tmp/file', 'C:\\file', '\\server\\file', 'a/../b', 'a//b', 'NUL.py', 'bad\0file']) {
    assert.throws(() => validateRelativePath(value), Error, value);
  }
});
test('Python and TypeScript installers share exactly the same runtime', () => {
  const result = spawnSync(python, ['-c', 'from TreeForge.core.installer_runtime import RUNTIME; print(RUNTIME, end="")'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, INSTALLER_RUNTIME);
});
for (const format of ['python', 'bash', 'powershell']) {
  test(`${format} installer round trip, injection resistance, collisions and containment`, { skip: (format === 'bash' && process.platform === 'win32') || (format === 'powershell' && process.platform !== 'win32') }, () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'treeforge-installer-'));
    try {
      const name = 'App$(touch PWNED)';
      const files = { [`${name}/main.py`]: 'print("مرحبا")\nEOF\ntouch PWNED\n', 'empty.txt': '' };
      const generate = format === 'python' ? generateStandalonePythonInstaller : format === 'bash' ? generateStandaloneBashInstaller : generateStandalonePowerShellInstaller;
      const script = path.join(dir, format === 'python' ? 'install.py' : format === 'bash' ? 'install.sh' : 'install.ps1');
      const run = (policy: 'skip' | 'overwrite' | 'auto_rename') => {
        writeFileSync(script, generate(files, name, { policy }));
        const result = spawnSync(format === 'python' ? python : format === 'bash' ? 'bash' : 'powershell', format === 'powershell' ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script] : [script], { cwd: dir, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
      };
      run('skip');
      const target = path.join(dir, name, 'main.py');
      assert.equal(readFileSync(target, 'utf8'), files[`${name}/main.py`]);
      assert.equal(existsSync(path.join(dir, 'PWNED')), false);
      writeFileSync(target, 'original'); run('skip'); assert.equal(readFileSync(target, 'utf8'), 'original');
      run('auto_rename'); assert.ok(existsSync(path.join(dir, name, 'main (1).py')));
      run('overwrite'); assert.equal(readFileSync(target, 'utf8'), files[`${name}/main.py`]);
      assert.throws(() => generate({ '../escape.py': 'bad' }, 'App'));
      if (process.platform !== 'win32') {
        mkdirSync(path.join(dir, 'outside'));
        symlinkSync(path.join(dir, 'outside'), path.join(dir, name, 'link'));
        writeFileSync(script, generate({ 'link/escape.py': 'bad' }, name));
        const result = spawnSync(format === 'python' ? python : format === 'bash' ? 'bash' : 'powershell', format === 'powershell' ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script] : [script], { cwd: dir, encoding: 'utf8' });
        assert.notEqual(result.status, 0);
        assert.equal(existsSync(path.join(dir, 'outside', 'escape.py')), false);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
test('ZIP honors disabled root, init generation and explicit empty content', async () => {
  const root = parseTreeText('App/\n└── main.py').root!;
  root.children[0].content = '';
  const blob = await exportProjectZip(root, { addInitPy: true, starterContent: true });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.equal(await zip.file('App/main.py')!.async('string'), '');
  assert.ok(zip.file('App/__init__.py'));
  root.enabled = false;
  const empty = await exportProjectZip(root, { addInitPy: true, starterContent: true });
  assert.deepEqual(Object.keys((await JSZip.loadAsync(await empty.arrayBuffer())).files), []);
});
