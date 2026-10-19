import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  FolderPlus,
  FilePlus,
  Copy,
  Check,
  X,
  Move,
  MoreVertical,
  CornerDownRight,
  Sparkles,
  Info
} from 'lucide-react';
import { WebTreeNode, Language } from '../types';

interface InteractiveVisualTreeViewProps {
  root: WebTreeNode;
  language: Language;
  onToggleNode: (nodePath: string, nodeName: string) => void;
  onAddNode: (parentPath: string, name: string, isDir: boolean) => void;
  onRenameNode: (targetPath: string, newName: string) => void;
  onRemoveNode: (targetPath: string) => void;
  onMoveNode: (sourcePath: string, targetFolderPath: string) => void;
  onDuplicateNode?: (targetPath: string) => void;
  searchQuery?: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetNode: WebTreeNode | null;
}

export const InteractiveVisualTreeView: React.FC<InteractiveVisualTreeViewProps> = ({
  root,
  language,
  onToggleNode,
  onAddNode,
  onRenameNode,
  onRemoveNode,
  onMoveNode,
  onDuplicateNode,
  searchQuery = '',
}) => {
  const isAr = language === 'ar';

  // Collapsed folders set
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());

  // Drag and Drop state
  const [draggedNodePath, setDraggedNodePath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  // Inline rename state
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // Quick Inline Add state (when user clicks + File or + Folder)
  const [addingToParent, setAddingToParent] = useState<{ parentPath: string; isDir: boolean } | null>(null);
  const [newChildName, setNewChildName] = useState<string>('');

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetNode: null,
  });

  // Copied path notification
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Ref to tree container
  const containerRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when editing starts
  useEffect(() => {
    if (editingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingPath]);

  useEffect(() => {
    if (addingToParent && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingToParent]);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (_e: Event) => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleOutsideClick, true);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleOutsideClick, true);
    };
  }, [contextMenu.visible]);

  // Toggle folder collapse
  const toggleCollapse = (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Expand all / Collapse all
  const expandAll = () => setCollapsedPaths(new Set());
  const collapseAll = () => {
    const allDirs = new Set<string>();
    function collect(n: WebTreeNode) {
      if (n.isDir && n.path !== root.path) allDirs.add(n.path);
      n.children.forEach(collect);
    }
    collect(root);
    setCollapsedPaths(allDirs);
  };

  // Commit Inline Rename
  const handleCommitRename = (targetPath: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      onRenameNode(targetPath, trimmed);
    }
    setEditingPath(null);
    setEditingName('');
  };

  // Commit Inline Add Child
  const handleCommitAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingToParent || !newChildName.trim()) return;
    onAddNode(addingToParent.parentPath, newChildName.trim(), addingToParent.isDir);
    setNewChildName('');
    setAddingToParent(null);
  };

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, node: WebTreeNode) => {
    if (node.path === root.path) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDraggedNodePath(node.path);
    e.dataTransfer.setData('text/plain', node.path);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent, targetNode: WebTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNodePath || draggedNodePath === targetNode.path) return;

    // Only allow drop onto directories or root
    const targetPath = targetNode.isDir ? targetNode.path : targetNode.path.split('/').slice(0, -1).join('/');
    if (dragOverPath !== targetPath) {
      setDragOverPath(targetPath);
    }
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent, targetNode: WebTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    const sourcePath = draggedNodePath || e.dataTransfer.getData('text/plain');
    setDraggedNodePath(null);
    setDragOverPath(null);

    if (!sourcePath) return;

    const targetFolderPath = targetNode.isDir
      ? targetNode.path
      : targetNode.path.split('/').slice(0, -1).join('/') || root.path;

    onMoveNode(sourcePath, targetFolderPath);
  };

  // Handle Context Menu (Right Click or Action Button Click)
  const handleContextMenu = (e: React.MouseEvent, node: WebTreeNode) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 220;
    const menuHeight = 260;

    let targetX = e.clientX;
    let targetY = e.clientY;

    // If opened via button click, place cleanly underneath the button
    const targetElement = e.currentTarget as HTMLElement;
    if (targetElement && targetElement.tagName === 'BUTTON') {
      const rect = targetElement.getBoundingClientRect();
      targetX = isAr ? rect.right - menuWidth : rect.left;
      targetY = rect.bottom + 4;
    }

    // Clamp coordinates to stay within window bounds and avoid overlapping
    let posX = targetX;
    if (posX + menuWidth > window.innerWidth - 10) {
      posX = window.innerWidth - menuWidth - 10;
    }
    if (posX < 10) {
      posX = 10;
    }

    let posY = targetY;
    if (posY + menuHeight > window.innerHeight - 10) {
      // If opening downward would clip offscreen, place cleanly above
      if (targetElement && targetElement.tagName === 'BUTTON') {
        const rect = targetElement.getBoundingClientRect();
        posY = Math.max(10, rect.top - menuHeight - 4);
      } else {
        posY = Math.max(10, window.innerHeight - menuHeight - 10);
      }
    }

    setContextMenu({
      visible: true,
      x: posX,
      y: posY,
      targetNode: node,
    });
  };

  // Get file type styling
  const getFileBadge = (name: string, isDir: boolean) => {
    if (isDir) return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">dir</span>;
    if (name.endsWith('.py')) return <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">py</span>;
    if (name.endsWith('.md')) return <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">md</span>;
    if (name.endsWith('.json') || name.endsWith('.toml')) return <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">config</span>;
    return <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">file</span>;
  };

  // Render individual node recursively
  const renderNode = (node: WebTreeNode, depth: number = 0) => {
    const isDir = node.isDir;
    const isRoot = node.path === root.path;
    const isCollapsed = collapsedPaths.has(node.path);
    const isEditing = editingPath === node.path;
    const isDragOver = dragOverPath === node.path;
    const isBeingDragged = draggedNodePath === node.path;
    const hasChildren = node.children.length > 0;
    const matchesSearch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      <div key={node.id} className="relative select-none">
        {/* Node Row */}
        <div
          draggable={!isRoot && !isEditing}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={() => {
            if (dragOverPath === node.path) setDragOverPath(null);
          }}
          onDrop={(e) => handleDrop(e, node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          className={`group flex items-center justify-between py-1.5 px-2.5 rounded-xl border text-xs font-mono transition-all duration-150 cursor-pointer my-0.5 ${
            isBeingDragged
              ? 'opacity-30 border-dashed border-emerald-500 bg-slate-100 dark:bg-slate-900'
              : isDragOver
              ? 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 shadow-md scale-[1.01]'
              : isRoot
              ? 'bg-slate-100 dark:bg-slate-900/90 border-emerald-500/40 text-slate-900 dark:text-white shadow-xs'
              : !node.enabled
              ? 'opacity-40 bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-900 text-slate-400 dark:text-slate-500'
              : matchesSearch
              ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200'
          }`}
          style={{
            marginInlineStart: `${depth * 18}px`,
          }}
          onClick={() => {
            if (isDir) toggleCollapse(node.path);
          }}
        >
          {/* Left part: Chevron, Checkbox, Icon, Name/Editor */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Expand/Collapse Chevron for folders */}
            {isDir ? (
              <button
                onClick={(e) => toggleCollapse(node.path, e)}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            {/* Checkbox (toggle enabled state) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleNode(node.path, node.name);
              }}
              className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition shrink-0"
              title={node.enabled ? (isAr ? 'استبعاد' : 'Exclude') : (isAr ? 'تفعيل' : 'Include')}
            >
              {node.enabled ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
              )}
            </button>

            {/* Icon */}
            {isDir ? (
              isCollapsed ? (
                <Folder className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              ) : (
                <FolderOpen className="w-4 h-4 text-amber-500 dark:text-amber-300 shrink-0" />
              )
            ) : node.name.endsWith('.py') ? (
              <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            )}

            {/* Name or Inline Rename Input */}
            {isEditing ? (
              <div
                className="flex items-center gap-1.5 flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={renameInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommitRename(node.path);
                    if (e.key === 'Escape') setEditingPath(null);
                  }}
                  className="bg-white dark:bg-slate-950 border border-emerald-500 rounded px-2 py-0.5 text-xs text-slate-900 dark:text-white focus:outline-none w-48 font-mono shadow-inner"
                />
                <button
                  onClick={() => handleCommitRename(node.path)}
                  className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingPath(null)}
                  className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingPath(node.path);
                  setEditingName(node.name);
                }}
                className={`truncate ${
                  isRoot ? 'font-black text-slate-900 dark:text-white text-sm' : isDir ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                }`}
                title={isAr ? `انقر مرتين أو اضغط بزر الماوس الأيمن للتعديل: ${node.path}` : `Double click or right-click to edit: ${node.path}`}
              >
                {node.name}
                {isDir && '/'}
              </span>
            )}
          </div>

          {/* Right Action Controls on Hover */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ms-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Add File / Folder inside this directory */}
            {isDir && (
              <>
                <button
                  onClick={() => {
                    setAddingToParent({ parentPath: node.path, isDir: false });
                    setNewChildName('');
                  }}
                  className="p-1 rounded bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/20 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition"
                  title={isAr ? `إضافة ملف داخل ${node.name}` : `Add file inside ${node.name}`}
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setAddingToParent({ parentPath: node.path, isDir: true });
                    setNewChildName('');
                  }}
                  className="p-1 rounded bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-500/20 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 transition"
                  title={isAr ? `إضافة مجلد داخل ${node.name}` : `Add folder inside ${node.name}`}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Rename Icon */}
            {!isEditing && (
              <button
                onClick={() => {
                  setEditingPath(node.path);
                  setEditingName(node.name);
                }}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-700 transition"
                title={isAr ? 'إعادة تسمية' : 'Rename'}
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}

            {/* Delete Icon */}
            {!isRoot && (
              <button
                onClick={() => onRemoveNode(node.path)}
                className="p-1 rounded bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-500/20 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 transition"
                title={isAr ? 'حذف العنصر' : 'Delete'}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}

            {/* Context menu trigger button */}
            <button
              onClick={(e) => handleContextMenu(e, node)}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition"
              title={isAr ? 'المزيد من الخيارات' : 'More Options'}
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Inline Add Item Form (displayed immediately below folder when user clicks +) */}
        {addingToParent && addingToParent.parentPath === node.path && (
          <form
            onSubmit={handleCommitAddChild}
            className="flex items-center space-x-2 rtl:space-x-reverse py-1 px-3 bg-slate-900 border border-emerald-500/40 rounded-xl my-1 animate-fadeIn"
            style={{ marginInlineStart: `${(depth + 1) * 18}px` }}
          >
            <CornerDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {addingToParent.isDir ? (
              <FolderPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <FilePlus className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            )}

            <input
              ref={addInputRef}
              type="text"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder={
                addingToParent.isDir
                  ? isAr ? 'اسم المجلد (مثل core)...' : 'Folder name (e.g. core)...'
                  : isAr ? 'اسم الملف (مثل app.py)...' : 'File name (e.g. app.py)...'
              }
              className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />

            <button
              type="submit"
              disabled={!newChildName.trim()}
              className="px-2.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-40"
            >
              {isAr ? 'إضافة' : 'Add'}
            </button>

            <button
              type="button"
              onClick={() => setAddingToParent(null)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Children (if folder is expanded) */}
        {isDir && !isCollapsed && node.children.length > 0 && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-2xl overflow-hidden relative shadow-inner"
      onDragOver={(e) => {
        e.preventDefault();
        if (draggedNodePath && dragOverPath !== root.path) {
          setDragOverPath(root.path);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        const source = draggedNodePath || e.dataTransfer.getData('text/plain');
        setDraggedNodePath(null);
        setDragOverPath(null);
        if (source) {
          onMoveNode(source, root.path);
        }
      }}
    >
      {/* Interactive Top Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {isAr ? 'مستعرض الشجرة التفاعلي' : 'Interactive Tree Explorer'}
          </span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-semibold">
            {isAr ? 'سحب وإفلات • نقر يميني' : 'Drag & Drop • Right-Click'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={expandAll}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition"
            title={isAr ? 'توسيع الكل' : 'Expand All'}
          >
            {isAr ? 'توسيع' : 'Expand'}
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition"
            title={isAr ? 'طي الكل' : 'Collapse All'}
          >
            {isAr ? 'طي' : 'Collapse'}
          </button>
        </div>
      </div>

      {/* Main Scrollable Tree Viewport */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-0.5">
        {renderNode(root, 0)}
      </div>

      {/* Drop Zone Indicator for Root */}
      {draggedNodePath && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border-t border-dashed border-emerald-400 dark:border-emerald-500/50 flex items-center justify-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 animate-pulse">
          <Move className="w-3.5 h-3.5" />
          <span>{isAr ? 'أفلت هنا للنقل إلى المجلد الرئيسي للمشروع' : 'Drop here to move into root project folder'}</span>
        </div>
      )}

      {/* Bottom Hint Banner */}
      <div className="px-3.5 py-2 bg-slate-100/80 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
        <span>
          {isAr
            ? '💡 اسحب الملفات للإفلات داخل المجلدات • انقر بالزر الأيمن أو مرتين لإعادة التسمية والإضافة'
            : '💡 Drag & drop files into folders • Right-click or double-click to rename/add'}
        </span>
      </div>

      {/* CUSTOM FLOATING CONTEXT MENU */}
      {contextMenu.visible && contextMenu.targetNode && (
        <div
          className="fixed z-50 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn divide-y divide-slate-100 dark:divide-slate-800 backdrop-blur-md"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with target name */}
          <div className="px-3 py-1.5 font-bold font-mono text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
            {contextMenu.targetNode.name}
            {contextMenu.targetNode.isDir ? '/' : ''}
          </div>

          {/* Folder actions */}
          {contextMenu.targetNode.isDir && (
            <div className="py-1">
              <button
                onClick={() => {
                  setAddingToParent({ parentPath: contextMenu.targetNode!.path, isDir: false });
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full px-3 py-1.5 text-left rtl:text-right hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
              >
                <FilePlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>{isAr ? 'ملف جديد هنا' : 'New File here'}</span>
              </button>

              <button
                onClick={() => {
                  setAddingToParent({ parentPath: contextMenu.targetNode!.path, isDir: true });
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full px-3 py-1.5 text-left rtl:text-right hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-400 transition"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span>{isAr ? 'مجلد فرعي جديد' : 'New Subfolder'}</span>
              </button>
            </div>
          )}

          {/* Common Node Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                setEditingPath(contextMenu.targetNode!.path);
                setEditingName(contextMenu.targetNode!.name);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
              className="w-full px-3 py-1.5 text-left rtl:text-right hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isAr ? 'إعادة تسمية (F2)' : 'Rename (F2)'}</span>
            </button>

            {onDuplicateNode && contextMenu.targetNode.path !== root.path && (
              <button
                onClick={() => {
                  onDuplicateNode(contextMenu.targetNode!.path);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full px-3 py-1.5 text-left rtl:text-right hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
              >
                <Copy className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>{isAr ? 'تكرار العنصر (Duplicate)' : 'Duplicate Item'}</span>
              </button>
            )}

            <button
              onClick={() => {
                onToggleNode(contextMenu.targetNode!.path, contextMenu.targetNode!.name);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
              className="w-full px-3 py-1.5 text-left rtl:text-right hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
            >
              {contextMenu.targetNode.enabled ? (
                <>
                  <Square className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>{isAr ? 'استبعاد من البناء' : 'Exclude from build'}</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isAr ? 'تضمين في البناء' : 'Include in build'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.targetNode!.path);
                setCopiedPath(contextMenu.targetNode!.path);
                setContextMenu((prev) => ({ ...prev, visible: false }));
                setTimeout(() => setCopiedPath(null), 2000);
              }}
              className="w-full px-3 py-1.5 text-left rtl:text-right hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span>{isAr ? 'نسخ المسار النسبي' : 'Copy Relative Path'}</span>
            </button>
          </div>

          {/* Delete Action */}
          {contextMenu.targetNode.path !== root.path && (
            <div className="py-1">
              <button
                onClick={() => {
                  onRemoveNode(contextMenu.targetNode!.path);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full px-3 py-1.5 text-left rtl:text-right hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-2 font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'حذف العنصر' : 'Delete'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
