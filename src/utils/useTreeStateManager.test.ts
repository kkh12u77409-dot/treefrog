import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useTreeStateManager } from './useTreeStateManager';

// This suite tests hook state, not DOM behavior (covered by Playwright).
Object.assign(globalThis, { window: new EventTarget(), IS_REACT_ACT_ENVIRONMENT: true });
test('stable reset, atomic history, pending text and path-based deletion', async () => {
  let manager!: ReturnType<typeof useTreeStateManager>;
  function Harness() {
    manager = useTreeStateManager({ initialTreeText: 'App/\n├── a/\n│   └── main.py\n└── main.py', maxHistory: 3 });
    return null;
  }
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(React.createElement(Harness)); });
  const reset = manager.resetTree;
  await act(async () => { manager.setPolicy('overwrite'); manager.setAddInitPy(false); });
  assert.equal(manager.policy, 'overwrite');
  assert.equal(manager.addInitPy, false);
  assert.equal(manager.resetTree, reset);
  assert.equal(manager.history.length, 3);
  await act(async () => { manager.undo(); });
  assert.equal(manager.addInitPy, true);
  assert.equal(manager.policy, 'overwrite');
  await act(async () => { manager.redo(); });
  assert.equal(manager.addInitPy, false);
  await act(async () => { manager.setTreeText('New/\n└── main.py'); });
  await act(async () => { manager.setPolicy('skip'); });
  assert.equal(manager.treeText, 'New/\n└── main.py');
  assert.equal(manager.currentSnapshot.treeText, manager.treeText);
  await act(async () => { manager.resetTree('App/\n├── a/\n│   └── main.py\n└── main.py', 'reset', 'إعادة'); });
  await act(async () => { manager.removeItemFromTree('App/a/main.py'); });
  assert.ok(manager.treeText.includes('main.py'));
  assert.equal(manager.treeText.split('main.py').length - 1, 1);
  await act(async () => { renderer.unmount(); });
});
