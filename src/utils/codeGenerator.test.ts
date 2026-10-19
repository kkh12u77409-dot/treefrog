import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  generateBoilerplateForFile, 
  generateFullBatchCode,
  generateStandalonePythonInstaller,
  generateStandaloneBashInstaller
} from './codeGenerator';

test('generateBoilerplateForFile generates PyQt6 main for main.py', () => {
  const code = generateBoilerplateForFile('SumMaster/main.py', 'SumMaster');
  assert.ok(code.includes('QApplication'));
  assert.ok(code.includes('MainWindow'));
});

test('generateBoilerplateForFile generates FastAPI code when stack is fastapi', () => {
  const code = generateBoilerplateForFile('my_api/main.py', 'MyApi', { stack: 'fastapi' });
  assert.ok(code.includes('FastAPI'));
  assert.ok(code.includes('/health'));
});

test('generateBoilerplateForFile generates unittest for test files', () => {
  const code = generateBoilerplateForFile('tests/test_calculator.py', 'SumMaster');
  assert.ok(code.includes('unittest.TestCase'));
});

test('standalone installers encode untrusted data instead of interpolating executable source', () => {
  const files = { 'main.py': 'print("hello world")' };
  const script = generateStandalonePythonInstaller(files, 'DemoProject');
  assert.ok(script.startsWith('#!/usr/bin/env python3'));
  assert.ok(script.includes("PAYLOAD = '"));
  assert.ok(!script.includes('hello world'));
  const bash = generateStandaloneBashInstaller(files, 'DemoProject');
  assert.ok(bash.startsWith('#!/usr/bin/env bash'));
  assert.ok(bash.includes("python3 - <<'TREEFORGE_PYTHON'"));
});

test('non-GUI stacks generate CLI entry points without Qt requirements', () => {
  for (const stack of ['generic', 'cli_tool', 'data_pipeline'] as const) {
    assert.ok(generateBoilerplateForFile('main.py', 'App', { stack }).includes('argparse'));
    assert.ok(!generateBoilerplateForFile('requirements.txt', 'App', { stack }).includes('PyQt6'));
  }
});
