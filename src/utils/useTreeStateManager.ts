import { useState, useRef, useCallback, useEffect } from 'react';
import { TreeSnapshot, CollisionPolicy } from '../types';
import { parseTreeText } from './treeParser';
import { addNodeToTree, removeNodeFromTree, treeToText } from './treeOperations';

interface UseTreeStateManagerOptions {
  initialTreeText: string;
  initialPolicy?: CollisionPolicy;
  initialAddInitPy?: boolean;
  initialStarterContent?: boolean;
  maxHistory?: number;
  active?: boolean;
}

type Patch = Partial<Omit<TreeSnapshot, 'id' | 'timestamp'>>;

export function useTreeStateManager({ initialTreeText, initialPolicy = 'skip', initialAddInitPy = true,
  initialStarterContent = true, maxHistory = 50, active = true }: UseTreeStateManagerOptions) {
  const [state, setState] = useState(() => ({ history: [{ id: 'snap_0', timestamp: Date.now(),
    description: 'Initial state', descriptionAr: 'الحالة الابتدائية', treeText: initialTreeText,
    disabledNodePaths: [] as string[], policy: initialPolicy, addInitPy: initialAddInitPy,
    starterContent: initialStarterContent }] as TreeSnapshot[], currentIndex: 0 }));
  const stateRef = useRef(state);
  const [treeText, setText] = useState(initialTreeText);
  const draft = useRef(treeText);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = Math.max(2, maxHistory);
  const cancelTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => cancelTimer, [cancelTimer]);
  const publish = useCallback((next: typeof state) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const pushState = useCallback((patch: Patch, description: string, descriptionAr: string) => {
    cancelTimer();
    const current = stateRef.current;
    const latest = current.history[current.currentIndex];
    const snapshot: TreeSnapshot = { ...latest, ...patch, treeText: patch.treeText ?? draft.current,
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2)}`, timestamp: Date.now(), description, descriptionAr };
    const history = [...current.history.slice(0, current.currentIndex + 1), snapshot].slice(-limit);
    draft.current = snapshot.treeText;
    setText(snapshot.treeText);
    publish({ history, currentIndex: history.length - 1 });
  }, [cancelTimer, limit, publish]);
  const handleTextChange = useCallback((text: string) => {
    draft.current = text;
    setText(text);
    cancelTimer();
    timer.current = setTimeout(() => {
      const current = stateRef.current;
      if (draft.current !== current.history[current.currentIndex].treeText)
        pushState({ treeText: draft.current }, 'Edited tree structure text', 'تعديل نص هيكل المجلدات');
    }, 700);
  }, [cancelTimer, pushState]);
  const jumpTo = useCallback((index: number) => {
    cancelTimer();
    const current = stateRef.current;
    if (index < 0 || index >= current.history.length) return null;
    const snapshot = current.history[index];
    draft.current = snapshot.treeText;
    setText(snapshot.treeText);
    publish({ ...current, currentIndex: index });
    return snapshot;
  }, [cancelTimer, publish]);
  const undo = useCallback(() => {
    const current = stateRef.current;
    if (draft.current !== current.history[current.currentIndex].treeText) return jumpTo(current.currentIndex);
    return jumpTo(current.currentIndex - 1);
  }, [jumpTo]);
  const redo = useCallback(() => jumpTo(stateRef.current.currentIndex + 1), [jumpTo]);
  const currentSnapshot = state.history[state.currentIndex];
  const canUndo = state.currentIndex > 0 || treeText !== currentSnapshot.treeText;
  const canRedo = state.currentIndex < state.history.length - 1;
  const resetTree = useCallback((text: string, en: string, ar: string) => {
    pushState({ treeText: text, disabledNodePaths: [] }, en, ar);
  }, [pushState]);
  const toggleNodeDisabled = useCallback((path: string, name: string) => {
    const current = stateRef.current;
    const paths = current.history[current.currentIndex].disabledNodePaths;
    pushState({ disabledNodePaths: paths.includes(path) ? paths.filter(p => p !== path) : [...paths, path] },
      `Toggle ${name}`, `تغيير تضمين ${name}`);
  }, [pushState]);
  const setAllNodesDisabled = useCallback((disabled: boolean, paths: string[]) =>
    pushState({ disabledNodePaths: disabled ? [...paths] : [] }, 'Change inclusion', 'تغيير التضمين'), [pushState]);
  const addItemToTree = useCallback((name: string, isFolder: boolean, parent?: string) => {
    const root = parseTreeText(draft.current).root;
    if (!root) return;
    const result = addNodeToTree(root, parent || root.path, name.replace(/\/$/, ''), isFolder);
    if (result.success) pushState({ treeText: treeToText(result.root) }, `Add ${name}`, `إضافة ${name}`);
  }, [pushState]);
  const removeItemFromTree = useCallback((path: string) => {
    const root = parseTreeText(draft.current).root;
    if (!root) return;
    const result = removeNodeFromTree(root, path);
    if (result.success) pushState({ treeText: treeToText(result.root) }, `Remove ${path}`, `حذف ${path}`);
  }, [pushState]);
  useEffect(() => {
    if (!active) return;
    const listener = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]')) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [active, undo, redo]);
  return { treeText, setTreeText: handleTextChange, currentSnapshot, disabledNodePaths: currentSnapshot.disabledNodePaths,
    policy: currentSnapshot.policy, setPolicy: (policy: CollisionPolicy) => pushState({ policy }, `Policy: ${policy}`, `السياسة: ${policy}`),
    addInitPy: currentSnapshot.addInitPy, setAddInitPy: (addInitPy: boolean) => pushState({ addInitPy }, 'Package initialization', 'تهيئة الحزم'),
    starterContent: currentSnapshot.starterContent, setStarterContent: (starterContent: boolean) => pushState({ starterContent }, 'Starter content', 'المحتوى الابتدائي'),
    undo, redo, canUndo, canRedo, history: state.history, currentIndex: state.currentIndex, jumpTo,
    resetTree, toggleNodeDisabled, setAllNodesDisabled, addItemToTree, removeItemFromTree };
}
