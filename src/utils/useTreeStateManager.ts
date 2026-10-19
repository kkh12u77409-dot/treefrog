import { useState, useRef, useCallback, useEffect } from 'react';
import { TreeSnapshot, CollisionPolicy } from '../types';

interface UseTreeStateManagerOptions {
  initialTreeText: string;
  initialPolicy?: CollisionPolicy;
  initialAddInitPy?: boolean;
  initialStarterContent?: boolean;
  maxHistory?: number;
}

export function useTreeStateManager({
  initialTreeText,
  initialPolicy = 'skip',
  initialAddInitPy = true,
  initialStarterContent = true,
  maxHistory = 50,
}: UseTreeStateManagerOptions) {
  const initialSnapshot: TreeSnapshot = {
    id: 'snap_0',
    timestamp: Date.now(),
    description: 'Initial state',
    descriptionAr: 'الحالة الابتدائية',
    treeText: initialTreeText,
    disabledNodePaths: [],
    policy: initialPolicy,
    addInitPy: initialAddInitPy,
    starterContent: initialStarterContent,
  };

  const [history, setHistory] = useState<TreeSnapshot[]>([initialSnapshot]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Current active snapshot values
  const currentSnapshot = history[currentIndex] || initialSnapshot;
  const [treeText, setTreeText] = useState<string>(currentSnapshot.treeText);

  // Sync internal treeText when currentSnapshot changes (e.g. on undo/redo/jump)
  useEffect(() => {
    setTreeText(currentSnapshot.treeText);
  }, [currentSnapshot.treeText]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Push an explicit checkpoint to history
  const pushState = useCallback(
    (
      patch: Partial<Omit<TreeSnapshot, 'id' | 'timestamp'>>,
      description: string,
      descriptionAr: string
    ) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      setHistory((prev) => {
        const sliced = prev.slice(0, currentIndex + 1);
        const latest = sliced[sliced.length - 1] || initialSnapshot;

        const newSnapshot: TreeSnapshot = {
          id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          description,
          descriptionAr,
          treeText: patch.treeText !== undefined ? patch.treeText : latest.treeText,
          disabledNodePaths:
            patch.disabledNodePaths !== undefined
              ? patch.disabledNodePaths
              : [...latest.disabledNodePaths],
          policy: patch.policy !== undefined ? patch.policy : latest.policy,
          addInitPy: patch.addInitPy !== undefined ? patch.addInitPy : latest.addInitPy,
          starterContent:
            patch.starterContent !== undefined
              ? patch.starterContent
              : latest.starterContent,
        };

        const nextHistory = [...sliced, newSnapshot];
        if (nextHistory.length > maxHistory) {
          nextHistory.shift();
        }
        return nextHistory;
      });

      setCurrentIndex((prev) => {
        const next = prev + 1;
        return next >= maxHistory ? maxHistory - 1 : next;
      });
    },
    [currentIndex, initialSnapshot, maxHistory]
  );

  // Handle typing with debounced history commit
  const handleTextChange = useCallback(
    (newText: string) => {
      setTreeText(newText);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (newText !== currentSnapshot.treeText) {
          pushState(
            { treeText: newText },
            'Edited tree structure text',
            'تعديل نص هيكل المجلدات'
          );
        }
      }, 700);
    },
    [currentSnapshot.treeText, pushState]
  );

  // Perform Undo
  const undo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (canUndo) {
      const targetIndex = currentIndex - 1;
      setCurrentIndex(targetIndex);
      const target = history[targetIndex];
      if (target) {
        setTreeText(target.treeText);
      }
      return target;
    }
    return null;
  }, [canUndo, currentIndex, history]);

  // Perform Redo
  const redo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (canRedo) {
      const targetIndex = currentIndex + 1;
      setCurrentIndex(targetIndex);
      const target = history[targetIndex];
      if (target) {
        setTreeText(target.treeText);
      }
      return target;
    }
    return null;
  }, [canRedo, currentIndex, history]);

  // Jump to specific point in history
  const jumpTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < history.length && index !== currentIndex) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        setCurrentIndex(index);
        const target = history[index];
        if (target) {
          setTreeText(target.treeText);
        }
      }
    },
    [currentIndex, history]
  );

  // Toggle single node inclusion
  const toggleNodeDisabled = useCallback(
    (nodePath: string, nodeName: string) => {
      const currentDisabled = currentSnapshot.disabledNodePaths;
      const isCurrentlyDisabled = currentDisabled.includes(nodePath);

      const nextDisabled = isCurrentlyDisabled
        ? currentDisabled.filter((p) => p !== nodePath)
        : [...currentDisabled, nodePath];

      const actionEn = isCurrentlyDisabled ? `Include ${nodeName}` : `Exclude ${nodeName}`;
      const actionAr = isCurrentlyDisabled ? `تضمين ${nodeName}` : `استبعاد ${nodeName}`;

      pushState({ disabledNodePaths: nextDisabled }, actionEn, actionAr);
    },
    [currentSnapshot.disabledNodePaths, pushState]
  );

  // Set all nodes enabled/disabled
  const setAllNodesDisabled = useCallback(
    (disableAll: boolean, allPaths: string[]) => {
      const nextDisabled = disableAll ? [...allPaths] : [];
      const actionEn = disableAll ? 'Exclude all items' : 'Include all items';
      const actionAr = disableAll ? 'استبعاد كافة العناصر' : 'تضمين كافة العناصر';

      pushState({ disabledNodePaths: nextDisabled }, actionEn, actionAr);
    },
    [pushState]
  );

  // Reset to new tree (e.g. when loading preset or AI output)
  const resetTree = useCallback(
    (newTreeText: string, labelEn: string, labelAr: string) => {
      pushState(
        { treeText: newTreeText, disabledNodePaths: [] },
        labelEn,
        labelAr
      );
      setTreeText(newTreeText);
    },
    [pushState]
  );

  // Direct operations: Add item to tree text
  const addItemToTree = useCallback(
    (itemLine: string, isFolder: boolean, parentPath?: string) => {
      const cleanLine = itemLine.trim();
      if (!cleanLine) return;

      const formatted = isFolder && !cleanLine.endsWith('/') ? `${cleanLine}/` : cleanLine;
      let updatedText = '';

      if (parentPath) {
        const parentSegment = parentPath.split('/').filter(Boolean).pop();
        const lines = treeText.split('\n');
        let parentIdx = -1;
        if (parentSegment) {
          parentIdx = lines.findIndex((l) => {
            const clean = l.replace(/^[│|├──└──\s\-\*\+`]+/g, '').replace(/\/$/, '').trim();
            return clean === parentSegment;
          });
        }

        if (parentIdx !== -1) {
          const parentLine = lines[parentIdx];
          const matchPrefix = parentLine.match(/^([│\s|]+)/);
          const indent = matchPrefix ? matchPrefix[1] + '    ' : '    ';
          lines.splice(parentIdx + 1, 0, `${indent}├── ${formatted}`);
          updatedText = lines.join('\n');
        } else {
          updatedText = `${treeText.trimEnd()}\n├── ${formatted}`;
        }
      } else {
        updatedText = `${treeText.trimEnd()}\n├── ${formatted}`;
      }

      const labelEn = `Add ${formatted}`;
      const labelAr = `إضافة ${formatted}`;

      pushState({ treeText: updatedText }, labelEn, labelAr);
      setTreeText(updatedText);
    },
    [pushState, treeText]
  );

  // Direct operations: Remove item from tree text
  const removeItemFromTree = useCallback(
    (targetName: string) => {
      const lines = treeText.split('\n');
      const filtered = lines.filter((line) => {
        const clean = line.replace(/^[│|├──└──\s\-\*\+`]+/g, '').trim();
        return clean !== targetName && clean !== `${targetName}/`;
      });
      const updatedText = filtered.join('\n');

      const labelEn = `Remove ${targetName}`;
      const labelAr = `حذف ${targetName}`;

      pushState({ treeText: updatedText }, labelEn, labelAr);
      setTreeText(updatedText);
    },
    [pushState, treeText]
  );

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input/textarea with their own native undo
      // UNLESS the active element is not an input or if it's our tree container
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          // Redo
          if (canRedo) {
            e.preventDefault();
            redo();
          }
        } else {
          // Undo
          if (canUndo) {
            e.preventDefault();
            undo();
          }
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        // Redo (Windows Ctrl+Y)
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canRedo, canUndo, redo, undo]);

  return {
    treeText,
    setTreeText: handleTextChange,
    disabledNodePaths: currentSnapshot.disabledNodePaths,
    policy: currentSnapshot.policy,
    setPolicy: (p: CollisionPolicy) => pushState({ policy: p }, `Set policy to ${p}`, `تغيير السياسة إلى ${p}`),
    addInitPy: currentSnapshot.addInitPy,
    setAddInitPy: (v: boolean) => pushState({ addInitPy: v }, v ? 'Enable __init__.py' : 'Disable __init__.py', v ? 'تفعيل __init__.py' : 'تعطيل __init__.py'),
    starterContent: currentSnapshot.starterContent,
    setStarterContent: (v: boolean) => pushState({ starterContent: v }, v ? 'Enable starter templates' : 'Disable starter templates', v ? 'تفعيل القوالب الأولية' : 'تعطيل القوالب الأولية'),
    
    // Undo / Redo Controls
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    currentIndex,
    jumpTo,
    currentSnapshot,

    // Specialized actions
    toggleNodeDisabled,
    setAllNodesDisabled,
    resetTree,
    addItemToTree,
    removeItemFromTree,
  };
}
