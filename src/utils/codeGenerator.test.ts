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

test('generateStandalonePythonInstaller embeds file dictionary properly', () => {
  const files = {
    'main.py': 'print("hello world")',
    'README.md': '# Hello',
  };
  const script = generateStandalonePythonInstaller(files, 'DemoProject');
  assert.ok(script.includes('PROJECT_NAME = "DemoProject"'));
  assert.ok(script.includes('FILES_DATA = {'));
  assert.ok(script.includes('hello world'));
});

test('generateStandaloneBashInstaller creates valid bash script', () => {
  const files = {
    'main.py': 'print("hello")',
  };
  const script = generateStandaloneBashInstaller(files, 'DemoProject');
  assert.ok(script.startsWith('#!/usr/bin/env bash'));
  assert.ok(script.includes('cat << \'EOF\' > "main.py"'));
});
