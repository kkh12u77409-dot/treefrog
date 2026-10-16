import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  Terminal,
  Database,
  Code2,
  SlidersHorizontal,
  Search,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Wand2,
  ArrowRight,
  Copy,
  Check,
  Eye,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  Maximize2,
  Minimize2,
  FileCheck2,
  Hash,
  FileJson
} from 'lucide-react';
import { WebTreeNode, Language, CollisionPolicy } from '../types';

interface VisualPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  root: WebTreeNode | null;
  language: Language;
  policy: CollisionPolicy;
  addInitPy: boolean;
  starterContent: boolean;
  onToggleNode: (nodePath: string, nodeName: string) => void;
  onDownloadZip: () => void;
  onExportJson?: () => void;
  onOpenExportWizard: () => void;
  onSendToContent: () => void;
}

type FilterCategory = 'all' | 'folders' | 'files' | 'python' | 'configs' | 'docs';

// File extension classification helper
export function getFileInfo(fileName: string) {
  const lower = fileName.toLowerCase();
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';

  if (['.py', '.pyw', '.pyi', '.pyx', '.ipynb'].includes(ext)) {
    return {
      type: 'python',
      label: 'Python',
      color: 'emerald',
      icon: FileCode,
      badge: 'PY',
    };
  }

  if (['.sh', '.bash', '.zsh', '.bat', '.cmd', '.ps1'].includes(ext)) {
    return {
      type: 'shell',
      label: 'Shell Script',
      color: 'purple',
      icon: Terminal,
      badge: 'SH',
    };
  }

  if (['.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.cfg'].includes(ext)) {
    return {
      type: 'config',
      label: 'Config / Data',
      color: 'amber',
      icon: SlidersHorizontal,
      badge: ext.replace('.', '').toUpperCase(),
    };
  }

  if (['.md', '.txt', '.rst', '.license', '.pdf'].includes(ext) || lower === 'license') {
    return {
      type: 'docs',
      label: 'Documentation',
      color: 'cyan',
      icon: FileText,
      badge: ext.replace('.', '').toUpperCase() || 'DOC',
    };
  }

  if (['.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.scss'].includes(ext)) {
    return {
      type: 'web',
      label: 'Web / Script',
      color: 'sky',
      icon: Code2,
      badge: ext.replace('.', '').toUpperCase(),
    };
  }

  if (['.sql', '.db', '.sqlite', '.sqlite3'].includes(ext)) {
    return {
      type: 'database',
      label: 'Database',
      color: 'violet',
      icon: Database,
      badge: 'SQL',
    };
  }

  return {
    type: 'generic',
    label: 'File',
    color: 'slate',
    icon: File,
    badge: ext.replace('.', '').toUpperCase() || 'FILE',
  };
}

// Convert node structure to ASCII Tree representation
function generateAsciiTree(node: WebTreeNode, prefix: string = '', isLast: boolean = true, isRoot: boolean = true): string {
  if (isRoot) {
    let result = `${node.name}/\n`;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
      result += generateAsciiTree(children[i], '', i === children.length - 1, false);
    }
    return result;
  }

  const connector = isLast ? '└── ' : '├── ';
  const suffix = node.isDir ? '/' : '';
  const stateMarker = node.enabled ? '' : ' [excluded]';
  let result = `${prefix}${connector}${node.name}${suffix}${stateMarker}\n`;

  const childPrefix = prefix + (isLast ? '    ' : '│   ');
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    result += generateAsciiTree(children[i], childPrefix, i === children.length - 1, false);
  }
  return result;
}

export const VisualPreviewModal: React.FC<VisualPreviewModalProps> = ({
  isOpen,
  onClose,
  root,
  language,
  policy,
  addInitPy,
  starterContent,
  onToggleNode,
  onDownloadZip,
  onExportJson,
  onOpenExportWizard,
  onSendToContent,
}) => {
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'visual' | 'ascii'>('visual');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<WebTreeNode | null>(null);
  const [copiedAscii, setCopiedAscii] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Initialize selected node to root when modal opens
  useEffect(() => {
    if (isOpen && root) {
      setSelectedNode(root);
      setCollapsedPaths(new Set());
      setSearchQuery('');
      setFilterCategory('all');
    }
  }, [isOpen, root]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute stats across the whole tree
  const stats = useMemo(() => {
    let totalFolders = 0;
    let totalFiles = 0;
    let enabledFiles = 0;
    let enabledFolders = 0;
    let maxDepth = 0;
    const extensionCounts: Record<string, number> = {};

    function traverse(node: WebTreeNode, depth: number) {
      maxDepth = Math.max(maxDepth, depth);
      if (node.isDir) {
        totalFolders++;
        if (node.enabled) enabledFolders++;
      } else {
        totalFiles++;
        if (node.enabled) enabledFiles++;
        const ext = node.name.includes('.') ? node.name.slice(node.name.lastIndexOf('.')).toLowerCase() : 'other';
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
      }
      node.children.forEach(c => traverse(c, depth + 1));
    }

    if (root) {
      traverse(root, 1);
    }

    return {
      totalFolders,
      totalFiles,
      totalItems: totalFolders + totalFiles,
      enabledFiles,
      enabledFolders,
      maxDepth,
      extensionCounts,
    };
  }, [root]);

  // Toggle folder collapse
  const toggleCollapse = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Expand all folders
  const expandAll = () => {
    setCollapsedPaths(new Set());
  };

  // Collapse all subfolders (except root)
  const collapseAll = () => {
    if (!root) return;
    const allFolderPaths = new Set<string>();
    function collect(n: WebTreeNode) {
      if (n.isDir && n.path !== root?.path) {
        allFolderPaths.add(n.path);
      }
      n.children.forEach(collect);
    }
    collect(root);
    setCollapsedPaths(allFolderPaths);
  };

  // Check if a node matches search and filter criteria
  const nodeMatches = (node: WebTreeNode): boolean => {
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = !q || node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q);
    if (!nameMatch) return false;

    if (filterCategory === 'all') return true;
    if (filterCategory === 'folders') return node.isDir;
    if (filterCategory === 'files') return !node.isDir;

    if (!node.isDir) {
      const info = getFileInfo(node.name);
      if (filterCategory === 'python') return info.type === 'python';
      if (filterCategory === 'configs') return info.type === 'config';
      if (filterCategory === 'docs') return info.type === 'docs';
    }
    return false;
  };

  // Determine if a folder contains any matching descendants
  const folderHasMatches = (folder: WebTreeNode): boolean => {
    if (nodeMatches(folder)) return true;
    for (const child of folder.children) {
      if (child.isDir) {
        if (folderHasMatches(child)) return true;
      } else if (nodeMatches(child)) {
        return true;
      }
    }
    return false;
  };

  // Generate ASCII representation
  const asciiTreeText = useMemo(() => {
    if (!root) return '';
    return generateAsciiTree(root);
  }, [root]);

  const handleCopyAscii = () => {
    navigator.clipboard.writeText(asciiTreeText);
    setCopiedAscii(true);
    setTimeout(() => setCopiedAscii(false), 2500);
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  if (!isOpen || !root) return null;

  // Recursive tree renderer for Visual Tree
  const renderVisualNode = (node: WebTreeNode, depth: number = 0, isLastChild: boolean = true) => {
    const hasSearch = searchQuery.trim().length > 0;
    const isMatching = nodeMatches(node);
    const hasMatchingDescendant = node.isDir ? folderHasMatches(node) : false;

    // Filter visibility
    if ((hasSearch || filterCategory !== 'all') && !isMatching && !hasMatchingDescendant) {
      return null;
    }

    const isCollapsed = collapsedPaths.has(node.path);
    const isSelected = selectedNode?.path === node.path;
    const fileInfo = !node.isDir ? getFileInfo(node.name) : null;
    const FileIcon = fileInfo ? fileInfo.icon : File;

    return (
      <div key={node.id || node.path} className="flex flex-col">
        {/* Node Row */}
        <div
          onClick={() => setSelectedNode(node)}
          className={`group flex items-center py-1.5 px-2.5 rounded-xl cursor-pointer text-xs transition duration-150 select-none relative ${
            isSelected
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 shadow-sm'
              : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
          } ${!node.enabled ? 'opacity-40 line-through' : ''}`}
          style={{ paddingInlineStart: `${Math.max(8, depth * 22 + 8)}px` }}
        >
          {/* Guide Line visualization in tree */}
          {depth > 0 && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none border-s border-slate-700/50"
              style={{ insetInlineStart: `${depth * 22 - 6}px` }}
            />
          )}

          {/* Folder expand/collapse chevron or file spacer */}
          {node.isDir ? (
            <button
              onClick={(e) => toggleCollapse(node.path, e)}
              className="p-1 -ms-1 me-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition"
              title={isCollapsed ? (isAr ? 'توسيع' : 'Expand') : (isAr ? 'طي' : 'Collapse')}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-5 -ms-1 me-1" />
          )}

          {/* Enabled / Disabled checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleNode(node.path, node.name);
            }}
            className="p-1 -ms-1 me-1.5 text-slate-400 hover:text-emerald-400 rounded transition"
            title={node.enabled ? (isAr ? 'استبعاد من المشروع' : 'Exclude from project') : (isAr ? 'تضمين في المشروع' : 'Include in project')}
          >
            {node.enabled ? (
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-600" />
            )}
          </button>

          {/* Icon: Folder vs File with contextual color */}
          <div className="me-2 shrink-0">
            {node.isDir ? (
              isCollapsed ? (
                <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              ) : (
                <FolderOpen className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              )
            ) : fileInfo?.color === 'emerald' ? (
              <FileIcon className="w-4 h-4 text-emerald-400" />
            ) : fileInfo?.color === 'purple' ? (
              <FileIcon className="w-4 h-4 text-purple-400" />
            ) : fileInfo?.color === 'amber' ? (
              <FileIcon className="w-4 h-4 text-amber-400" />
            ) : fileInfo?.color === 'cyan' ? (
              <FileIcon className="w-4 h-4 text-cyan-400" />
            ) : fileInfo?.color === 'sky' ? (
              <FileIcon className="w-4 h-4 text-sky-400" />
            ) : fileInfo?.color === 'violet' ? (
              <FileIcon className="w-4 h-4 text-violet-400" />
            ) : (
              <FileIcon className="w-4 h-4 text-slate-400" />
            )}
          </div>

          {/* Item Name */}
          <span className={`truncate font-mono ${node.isDir ? 'font-bold text-slate-100' : 'font-medium text-slate-200'}`}>
            {node.name}
            {node.isDir && '/'}
          </span>

          {/* Badges on right side */}
          <div className="ms-auto flex items-center space-x-1.5 rtl:space-x-reverse ps-2 shrink-0">
            {node.isDir ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-sans">
                {node.children.length} {isAr ? 'عنصر' : node.children.length === 1 ? 'item' : 'items'}
              </span>
            ) : fileInfo ? (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                  fileInfo.color === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : fileInfo.color === 'purple'
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    : fileInfo.color === 'amber'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : fileInfo.color === 'cyan'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                }`}
              >
                {fileInfo.badge}
              </span>
            ) : null}

            {!node.enabled && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                {isAr ? 'مستبعد' : 'Skipped'}
              </span>
            )}
          </div>
        </div>

        {/* Recursive render child nodes if folder is expanded */}
        {node.isDir && !isCollapsed && (
          <div className="flex flex-col">
            {node.children.map((child, index) =>
              renderVisualNode(child, depth + 1, index === node.children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none sm:rounded-2xl'
            : 'w-full max-w-5xl h-[90vh] max-h-[850px]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-sm">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <h3 className="text-base font-bold text-white truncate">
                  {isAr ? 'معاينة هيكل نظام الملفات المرئية' : 'Visual File System Tree Preview'}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                  {root.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {isAr
                  ? 'تحقق من المجلدات والملفات والمسارات والهيكل الهرمي قبل المتابعة في البناء والتصدير'
                  : 'Verify folders, files, hierarchy, and generation settings before proceeding'}
              </p>
            </div>
          </div>

          {/* Header controls: Fullscreen & Close */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title={isFullscreen ? (isAr ? 'تصغير' : 'Exit Fullscreen') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
              title={isAr ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats Ribbon */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Total items badge */}
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/60 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-white">{stats.totalItems}</span>
              <span className="text-slate-400">{isAr ? 'عنصر كلي' : 'Total Items'}</span>
            </div>

            {/* Folders count badge */}
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">{stats.totalFolders}</span>
              <span>{isAr ? 'مجلدات' : 'Folders'}</span>
            </div>

            {/* Files count badge */}
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">{stats.totalFiles}</span>
              <span>{isAr ? 'ملفات' : 'Files'}</span>
            </div>

            {/* Max depth badge */}
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
              <Hash className="w-3.5 h-3.5 text-sky-400" />
              <span>{isAr ? 'أقصى عمق:' : 'Max Depth:'}</span>
              <span className="font-bold text-white">{stats.maxDepth}</span>
            </div>
          </div>

          {/* Extension tags summary */}
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse overflow-x-auto py-0.5">
            {Object.entries(stats.extensionCounts)
              .slice(0, 5)
              .map(([ext, count]) => (
                <span
                  key={ext}
                  className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                >
                  <strong className="text-emerald-400">{count}</strong> {ext}
                </span>
              ))}
            <div className="flex items-center space-x-1 rtl:space-x-reverse text-slate-400 text-[11px] ps-1 border-s border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="uppercase font-semibold text-[10px] text-emerald-400">{policy}</span>
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Filters, View Modes & Tree Controls */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث عن ملف أو مجلد...' : 'Filter files & folders...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl ps-9 pe-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 rtl:space-x-reverse overflow-x-auto text-xs">
            {(
              [
                { id: 'all', labelEn: 'All', labelAr: 'الكل' },
                { id: 'folders', labelEn: 'Folders', labelAr: 'مجلدات' },
                { id: 'files', labelEn: 'Files', labelAr: 'ملفات' },
                { id: 'python', labelEn: 'Python', labelAr: 'بايثون' },
                { id: 'configs', labelEn: 'Configs', labelAr: 'إعدادات' },
                { id: 'docs', labelEn: 'Docs', labelAr: 'مستندات' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setFilterCategory(item.id)}
                className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                  filterCategory === item.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                {isAr ? item.labelAr : item.labelEn}
              </button>
            ))}
          </div>

          {/* Right actions: Expand/Collapse & Tab View Switcher */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {activeTab === 'visual' && (
              <div className="flex items-center space-x-1 rtl:space-x-reverse text-xs">
                <button
                  onClick={expandAll}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
                  title={isAr ? 'توسيع جميع المجلدات' : 'Expand all folders'}
                >
                  {isAr ? 'توسيع الكل' : 'Expand All'}
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
                  title={isAr ? 'طي جميع المجلدات الفرعية' : 'Collapse subfolders'}
                >
                  {isAr ? 'طي الكل' : 'Collapse All'}
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('visual')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  activeTab === 'visual'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'شجرة مرئية' : 'Visual Tree'}
              </button>
              <button
                onClick={() => setActiveTab('ascii')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  activeTab === 'ascii'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'نصية ASCII' : 'ASCII / Text'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area: Visual Tree with Inspector OR ASCII Tree */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-slate-950/40">
          {activeTab === 'visual' ? (
            <>
              {/* Left Tree Explorer Panel */}
              <div className="flex-1 overflow-y-auto p-4 space-y-0.5 border-b md:border-b-0 md:border-e border-slate-800/80 custom-scrollbar">
                {renderVisualNode(root)}
              </div>

              {/* Right Details / Inspector Drawer */}
              <div className="w-full md:w-80 bg-slate-900/60 p-4 flex flex-col space-y-4 shrink-0 overflow-y-auto border-t md:border-t-0">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse font-bold text-xs text-slate-200">
                    <Info className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isAr ? 'تفاصيل العنصر المحدد' : 'Selected Item Details'}</span>
                  </div>
                  {selectedNode && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {selectedNode.isDir ? (isAr ? 'مجلد' : 'Folder') : (isAr ? 'ملف' : 'File')}
                    </span>
                  )}
                </div>

                {selectedNode ? (
                  <div className="space-y-3.5 text-xs">
                    {/* Item Name & Icon */}
                    <div className="flex items-start space-x-2.5 rtl:space-x-reverse">
                      <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 shrink-0">
                        {selectedNode.isDir ? (
                          <Folder className="w-5 h-5 text-amber-400" />
                        ) : (
                          <FileCode className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-bold text-white truncate text-sm">
                          {selectedNode.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1 rtl:space-x-reverse mt-0.5">
                          <span>{selectedNode.isDir ? (isAr ? 'مجلد مسار' : 'Directory') : getFileInfo(selectedNode.name).label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Full Relative Path with copy button */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {isAr ? 'المسار النسبي الكامل:' : 'Full Relative Path:'}
                      </span>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 break-all">
                        <span>{selectedNode.path}</span>
                        <button
                          onClick={() => handleCopyPath(selectedNode.path)}
                          className="p-1 text-slate-400 hover:text-white ms-2 shrink-0 rounded hover:bg-slate-800 transition"
                          title="Copy path"
                        >
                          {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Metadata properties */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">{isAr ? 'الحالة:' : 'Status:'}</span>
                        <span className={`font-semibold ${selectedNode.enabled ? 'text-emerald-400' : 'text-red-400'}`}>
                          {selectedNode.enabled ? (isAr ? 'مضمن في التوليد' : 'Included') : (isAr ? 'مستبعد' : 'Excluded')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isAr ? 'النوع:' : 'Type:'}</span>
                        <span className="font-semibold text-slate-300">
                          {selectedNode.isDir ? (isAr ? 'مجلد' : 'Folder') : selectedNode.name.split('.').pop()?.toUpperCase() || 'FILE'}
                        </span>
                      </div>
                      {selectedNode.isDir && (
                        <div className="col-span-2 pt-1 border-t border-slate-800">
                          <span className="text-slate-500 block">{isAr ? 'العناصر المباشرة:' : 'Direct Children:'}</span>
                          <span className="font-semibold text-slate-200">
                            {selectedNode.children.length} {isAr ? 'عنصر' : 'items'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Inclusion toggle button */}
                    <button
                      onClick={() => onToggleNode(selectedNode.path, selectedNode.name)}
                      className={`w-full py-2 px-3 rounded-xl font-semibold flex items-center justify-center space-x-1.5 rtl:space-x-reverse transition ${
                        selectedNode.enabled
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {selectedNode.enabled ? (
                        <>
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isAr ? 'استبعاد هذا العنصر' : 'Exclude this Item'}</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isAr ? 'إعادة تضمين هذا العنصر' : 'Include this Item'}</span>
                        </>
                      )}
                    </button>

                    {/* Generation options info */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>{isAr ? 'سياسة التصادم:' : 'Collision Policy:'}</span>
                        <span className="font-mono text-emerald-400 uppercase font-semibold">{policy}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{isAr ? 'قوالب البداية:' : 'Starter Templates:'}</span>
                        <span className="text-slate-300">{starterContent ? (isAr ? 'مفعل' : 'Enabled') : (isAr ? 'معطل' : 'Disabled')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{isAr ? 'ملفات __init__.py:' : '__init__.py Injection:'}</span>
                        <span className="text-slate-300">{addInitPy ? (isAr ? 'مفعل' : 'Enabled') : (isAr ? 'معطل' : 'Disabled')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
                    <FileCheck2 className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
                    <span>{isAr ? 'انقر على أي ملف أو مجلد لفحص خصائصه' : 'Click on any file or folder to inspect its details'}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ASCII Tree View */
            <div className="flex-1 flex flex-col p-4 min-h-0">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-mono">
                  {isAr ? 'رسم تخطيطي لشجرة الملفات والمجلدات بصيغة ASCII جاهز للنسخ في ملف README.md:' : 'ASCII Diagram ready to copy into README.md or project documentation:'}
                </span>
                <button
                  onClick={handleCopyAscii}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                >
                  {copiedAscii ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAscii ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الشجرة' : 'Copy ASCII')}</span>
                </button>
              </div>

              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-auto font-mono text-xs text-emerald-300 leading-relaxed custom-scrollbar select-text" dir="ltr">
                <pre>{asciiTreeText}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: Proceed Actions */}
        <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            {isAr ? 'إغلاق ومتابعة التعديل' : 'Close & Keep Editing'}
          </button>

          <div className="flex flex-wrap items-center space-x-2 rtl:space-x-reverse">
            {/* Proceed to Code Injection */}
            <button
              onClick={() => {
                onClose();
                onSendToContent();
              }}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
              title={isAr ? 'المتابعة إلى مساحة حقن الأكواد' : 'Proceed to Code Injection'}
            >
              <span>{isAr ? 'حقن الأكواد' : 'Inject Code'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 text-emerald-400" />
            </button>

            {/* Export JSON Configuration */}
            {onExportJson && (
              <button
                onClick={onExportJson}
                className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-semibold transition"
                title={isAr ? 'تصدير هيكل شجرة الملفات والإعدادات كملف JSON' : 'Export File System Tree as JSON'}
              >
                <FileJson className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'تصدير JSON' : 'Export JSON'}</span>
              </button>
            )}

            {/* Proceed to Export Wizard */}
            <button
              onClick={() => {
                onClose();
                onOpenExportWizard();
              }}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition"
              title={isAr ? 'المتابعة إلى معالج التصدير' : 'Proceed to Export Wizard'}
            >
              <Wand2 className="w-3.5 h-3.5 text-purple-200" />
              <span>{isAr ? 'معالج التصدير' : 'Export Wizard'}</span>
            </button>

            {/* Proceed to Download ZIP */}
            <button
              onClick={() => {
                onClose();
                onDownloadZip();
              }}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'بناء وتنزيل ZIP' : 'Forge & Download ZIP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
