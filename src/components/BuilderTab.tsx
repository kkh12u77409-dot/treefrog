import React, { useState, useMemo, useEffect } from 'react';
import { 
  Play, 
  Trash2, 
  Download, 
  Folder, 
  FileText, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  Copy, 
  FileCode,
  ArrowRight,
  ShieldCheck,
  Settings2,
  Undo2,
  Redo2,
  History,
  FolderPlus,
  FilePlus,
  Plus,
  X,
  Clock,
  Workflow,
  FolderTree,
  Wand2,
  Sparkles,
  Eye,
  FileJson,
  Search
} from 'lucide-react';
import { ThemedSelect } from './ThemedSelect';
import { parseTreeText } from '../utils/treeParser';
import { exportProjectZip, downloadBlob } from '../utils/zipGenerator';
import { downloadTreeJson } from '../utils/treeJsonExporter';
import { filterTree } from '../utils/treeFilter';
import { ModernToast, ToastType } from './ModernToast';
import { useTreeStateManager } from '../utils/useTreeStateManager';
import { VisualTreeDiagram } from './VisualTreeDiagram';
import { ExportWizardModal } from './ExportWizardModal';
import { VisualPreviewModal } from './VisualPreviewModal';
import { WebTreeNode, CollisionPolicy, Language } from '../types';
import { InteractiveVisualTreeView } from './InteractiveVisualTreeView';
import { 
  treeToText, 
  addNodeToTree, 
  renameNodeInTree, 
  removeNodeFromTree, 
  moveNodeInTree,
  duplicateNodeInTree 
} from '../utils/treeOperations';

const DEFAULT_PROJECT_EXAMPLE = `MyProject/
├── main.py
├── requirements.txt
├── README.md
├── app/
│   ├── server.py
│   └── models.py
└── tests/
    └── test_server.py`;

const PRESET_TEMPLATES: Record<string, { nameAr: string; nameEn: string; tree: string }> = {
  default_app: {
    nameAr: 'النموذج الافتراضي (MyProject)',
    nameEn: 'Default App (MyProject)',
    tree: DEFAULT_PROJECT_EXAMPLE,
  },
  fastapi: {
    nameAr: 'واجهة برمجية FastAPI بمعمارية نظيفة',
    nameEn: 'FastAPI Clean Architecture',
    tree: `FastAPI_Service/
├── main.py
├── requirements.txt
├── Dockerfile
├── README.md
├── app/
│   ├── api/v1/ (endpoints.py, auth.py)
│   ├── core/ (config.py, security.py)
│   ├── models/ (user.py, item.py)
│   └── services/ (user_service.py)
└── tests/ (test_api.py, conftest.py)`,
  },
  datascience: {
    nameAr: 'مشروع علم بيانات وتعلم آلي',
    nameEn: 'Data Science & ML Pipeline',
    tree: `ML_Pipeline/
├── README.md
├── requirements.txt
├── environment.yml
├── data/ (raw/, processed/)
├── notebooks/ (01_eda.ipynb, 02_model.ipynb)
├── src/
│   ├── data_loader.py
│   ├── features.py
│   └── train.py
└── models/`,
  },
  fullstack: {
    nameAr: 'مشروع ويب متكامل (React + Node)',
    nameEn: 'Full-Stack Web (React + Express)',
    tree: `WebApp/
├── package.json
├── README.md
├── .gitignore
├── client/
│   ├── src/ (App.tsx, main.tsx, index.css)
│   ├── public/
│   └── vite.config.ts
├── server/
│   ├── src/ (index.ts, routes.ts, db.ts)
│   └── tsconfig.json
└── shared/ (types.ts)`,
  },
};

interface BuilderTabProps {
  language: Language;
  onSendToContent: (treeRoot: WebTreeNode, candidatePaths: string[]) => void;
  externalTreeText?: string;
}

export const BuilderTab: React.FC<BuilderTabProps> = ({ language, onSendToContent, externalTreeText }) => {
  const isAr = language === 'ar';

  // State Management Layer with Undo/Redo & History tracking
  const {
    treeText,
    setTreeText,
    disabledNodePaths,
    policy,
    setPolicy,
    addInitPy,
    setAddInitPy,
    starterContent,
    setStarterContent,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    currentIndex,
    jumpTo,
    currentSnapshot,
    toggleNodeDisabled,
    setAllNodesDisabled,
    resetTree,
    addItemToTree,
    removeItemFromTree,
  } = useTreeStateManager({
    initialTreeText: DEFAULT_PROJECT_EXAMPLE,
    initialPolicy: 'skip',
    initialAddInitPy: true,
    initialStarterContent: true,
    maxHistory: 50,
  });

  // Listen for AI Architect external project updates
  useEffect(() => {
    if (externalTreeText && externalTreeText.trim()) {
      resetTree(
        externalTreeText,
        'Applied AI Architect Project',
        'تطبيق هيكل المشروع من الذكاء الاصطناعي'
      );
    }
  }, [externalTreeText, resetTree]);

  const [dryRun, setDryRun] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [toastState, setToastState] = useState<{
    message: string;
    type?: ToastType;
    title?: string;
  } | null>(null);

  const showToast = (message: string, type: ToastType = 'success', title?: string) => {
    setToastState({ message, type, title });
  };
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'diagram' | 'explorer'>('diagram');
  const [showExportWizard, setShowExportWizard] = useState<boolean>(false);
  const [showVisualPreviewModal, setShowVisualPreviewModal] = useState<boolean>(false);
  const [treeSearchQuery, setTreeSearchQuery] = useState<string>('');

  // Quick add item input state
  const [quickItemName, setQuickItemName] = useState<string>('');
  const [quickItemType, setQuickItemType] = useState<'file' | 'folder'>('file');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Automatically parse tree and apply enabled/disabled states from snapshot
  const parseResult = useMemo(() => {
    const res = parseTreeText(treeText, 'MyProject');
    if (res.root) {
      const disabledSet = new Set(disabledNodePaths);
      function applyDisabled(n: WebTreeNode) {
        n.enabled = !disabledSet.has(n.path);
        n.children.forEach(applyDisabled);
      }
      applyDisabled(res.root);
    }
    return res;
  }, [treeText, disabledNodePaths]);

  // Filter visual tree structure by search query for fast navigation in large projects
  const { filteredRoot, matchCount } = useMemo(() => {
    return filterTree(parseResult.root, treeSearchQuery);
  }, [parseResult.root, treeSearchQuery]);

  // Collect all file paths
  const allFilePaths = useMemo(() => {
    const list: string[] = [];
    if (!parseResult.root) return list;
    function collect(n: WebTreeNode) {
      if (!n.isDir) list.push(n.path);
      n.children.forEach(collect);
    }
    collect(parseResult.root);
    return list;
  }, [parseResult.root]);

  // Collect all paths (both folders and files) for select-all logic
  const allNodePaths = useMemo(() => {
    const list: string[] = [];
    if (!parseResult.root) return list;
    function collect(n: WebTreeNode) {
      list.push(n.path);
      n.children.forEach(collect);
    }
    collect(parseResult.root);
    return list;
  }, [parseResult.root]);

  // Options for Collision Policy dropdown
  const policyOptions = useMemo(
    () => [
      {
        value: 'skip',
        label: isAr ? 'تخطي (Safe Skip)' : 'Safe Skip',
        description: isAr
          ? 'الأكثر أماناً: لا يمس الملفات الموجودة إطلاقاً'
          : 'Safest: Never touches existing files',
        icon: ShieldCheck,
        badge: isAr ? 'افتراضي' : 'Default',
      },
      {
        value: 'overwrite',
        label: isAr ? 'استبدال (Overwrite)' : 'Overwrite',
        description: isAr
          ? 'يستبدل محتويات الملفات الموجودة بالكامل'
          : 'Completely overwrite existing files',
        icon: AlertTriangle,
      },
      {
        value: 'auto_rename',
        label: isAr ? 'إعادة تسمية تلقائية' : 'Auto-Rename',
        description: isAr
          ? 'ينشئ ملفاً جديداً باسم مرقم (مثل file_1.py)'
          : 'Creates numbered file (e.g. file_1.py)',
        icon: Copy,
      },
    ],
    [isAr]
  );

  // Handle undo with toast
  const handleUndo = () => {
    const target = undo();
    if (target) {
      showToast(
        isAr ? `تراجع: ${target.descriptionAr}` : `Undo: ${target.description}`,
        'info',
        isAr ? 'سجل التعديلات' : 'History Undo'
      );
    }
  };

  // Handle redo with toast
  const handleRedo = () => {
    const target = redo();
    if (target) {
      showToast(
        isAr ? `إعادة: ${target.descriptionAr}` : `Redo: ${target.description}`,
        'info',
        isAr ? 'سجل التعديلات' : 'History Redo'
      );
    }
  };

  // Download project ZIP
  const handleDownloadZip = async () => {
    if (!parseResult.root) return;
    if (dryRun) {
      showToast(
        isAr
          ? 'تمت المحاكاة الجافة بنجاح (لم يتم إنشاء ملفات حقيقية)'
          : 'Dry run completed successfully (no disk changes)',
        'warning',
        isAr ? 'محاكاة جافة' : 'Dry Run Active'
      );
      return;
    }

    try {
      setDownloading(true);
      const zipBlob = await exportProjectZip(parseResult.root, {
        addInitPy,
        starterContent,
      });
      downloadBlob(zipBlob, `${parseResult.root.name}.zip`);
      showToast(
        isAr
          ? `تم تنزيل المشروع ${parseResult.root.name}.zip بنجاح!`
          : `Successfully downloaded ${parseResult.root.name}.zip!`,
        'success',
        isAr ? 'اكتمل التصدير' : 'Export Ready'
      );
    } catch (err: any) {
      showToast(err.message || 'Export error', 'error', isAr ? 'خطأ في التصدير' : 'Export Error');
    } finally {
      setDownloading(false);
    }
  };

  // Export current tree structure and configuration as a JSON file
  const handleExportJson = () => {
    if (!parseResult.root) return;
    try {
      const filename = downloadTreeJson(parseResult.root, {
        policy,
        addInitPy,
        starterContent,
        treeText,
        disabledNodePaths,
      });
      showToast(
        isAr
          ? `تم تصدير هيكل المشروع والإعدادات إلى ${filename} بنجاح!`
          : `Exported project tree structure to ${filename}!`,
        'success',
        isAr ? 'تصدير JSON' : 'JSON Exported'
      );
    } catch (err: any) {
      showToast(err.message || 'JSON Export error', 'error', isAr ? 'فشل تصدير JSON' : 'JSON Error');
    }
  };

  const handleCopyTree = () => {
    navigator.clipboard.writeText(treeText);
    setCopied(true);
    showToast(
      isAr ? 'تم نسخ شجرة المشروع النصية بنجاح إلى الحافظة!' : 'Project text tree copied to clipboard!',
      'success',
      isAr ? 'نسخ الحافظة' : 'Copied'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToContent = () => {
    if (!parseResult.root) return;
    onSendToContent(parseResult.root, allFilePaths);
  };

  const handleAddQuickItem = () => {
    if (!quickItemName.trim()) return;
    addItemToTree(quickItemName, quickItemType === 'folder');
    setQuickItemName('');
    setShowAddModal(false);
    showToast(
      isAr
        ? `تمت إضافة ${quickItemName} إلى الشجرة بنجاح!`
        : `Added ${quickItemName} to project tree!`,
      'success'
    );
  };

  // Interactive Tree Operations Handlers
  const handleTreeAddNode = (parentPath: string, name: string, isDir: boolean) => {
    if (!parseResult.root) return;
    const res = addNodeToTree(parseResult.root, parentPath, name, isDir);
    if (res.success) {
      const newText = treeToText(res.root);
      resetTree(newText, `Add ${name}`, `إضافة ${name}`);
      showToast(isAr ? `تمت إضافة ${name} بنجاح!` : `Added ${name} successfully!`, 'success');
    } else if (res.message) {
      showToast(res.message, 'error', isAr ? 'تعذر الإضافة' : 'Cannot Add');
    }
  };

  const handleTreeRenameNode = (targetPath: string, newName: string) => {
    if (!parseResult.root) return;
    const res = renameNodeInTree(parseResult.root, targetPath, newName);
    if (res.success) {
      const newText = treeToText(res.root);
      resetTree(newText, `Rename to ${newName}`, `إعادة تسمية إلى ${newName}`);
      showToast(isAr ? `تمت إعادة التسمية إلى ${newName} بنجاح!` : `Renamed to ${newName} successfully!`, 'success');
    } else if (res.message) {
      showToast(res.message, 'error', isAr ? 'تعذر إعادة التسمية' : 'Cannot Rename');
    }
  };

  const handleTreeRemoveNode = (targetPath: string) => {
    if (!parseResult.root) return;
    const nodeName = targetPath.split('/').pop() || targetPath;
    const res = removeNodeFromTree(parseResult.root, targetPath);
    if (res.success) {
      const newText = treeToText(res.root);
      resetTree(newText, `Remove ${nodeName}`, `حذف ${nodeName}`);
      showToast(isAr ? `تم حذف ${nodeName} بنجاح!` : `Removed ${nodeName} successfully!`, 'success');
    }
  };

  const handleTreeMoveNode = (sourcePath: string, targetFolderPath: string) => {
    if (!parseResult.root) return;
    const sourceName = sourcePath.split('/').pop() || sourcePath;
    const targetName = targetFolderPath.split('/').pop() || targetFolderPath;
    const res = moveNodeInTree(parseResult.root, sourcePath, targetFolderPath);
    if (res.success) {
      const newText = treeToText(res.root);
      resetTree(newText, `Move ${sourceName} into ${targetName}`, `نقل ${sourceName} إلى ${targetName}`);
      showToast(isAr ? `تم نقل ${sourceName} إلى ${targetName} بنجاح!` : `Moved ${sourceName} into ${targetName} successfully!`, 'success');
    } else if (res.message) {
      showToast(res.message, 'error', isAr ? 'تعذر نقل العنصر' : 'Cannot Move');
    }
  };

  const handleTreeDuplicateNode = (targetPath: string) => {
    if (!parseResult.root) return;
    const res = duplicateNodeInTree(parseResult.root, targetPath);
    if (res.success) {
      const newText = treeToText(res.root);
      resetTree(newText, `Duplicate item`, `تكرار العنصر`);
      showToast(isAr ? `تم تكرار العنصر بنجاح!` : `Item duplicated successfully!`, 'success');
    }
  };

  // Highlight search matches within a node name
  const renderHighlightedName = (name: string, query: string) => {
    const q = query.trim();
    if (!q) return name;
    const idx = name.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return name;
    const before = name.substring(0, idx);
    const match = name.substring(idx, idx + q.length);
    const after = name.substring(idx + q.length);
    return (
      <span>
        {before}
        <span className="bg-amber-400/30 text-amber-300 font-bold px-0.5 rounded border border-amber-400/40">
          {match}
        </span>
        {after}
      </span>
    );
  };

  // Render tree node in GUI with checkbox, type icon, and delete button
  const renderTreeNode = (node: WebTreeNode, depth: number = 0) => {
    const isPy = node.name.endsWith('.py');
    const isDirectMatch =
      treeSearchQuery.trim().length > 0 &&
      node.name.toLowerCase().includes(treeSearchQuery.trim().toLowerCase());

    return (
      <div key={node.id} className="select-none group">
        <div
          className={`flex items-center space-x-2 rtl:space-x-reverse py-1.5 px-2 rounded-md transition text-xs font-mono hover:bg-slate-800/80 ${
            !node.enabled ? 'opacity-40' : ''
          } ${isDirectMatch ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}
          style={{ paddingInlineStart: `${depth * 18 + 8}px` }}
        >
          {/* Inclusion checkbox */}
          <button
            onClick={() => toggleNodeDisabled(node.path, node.name)}
            className="text-slate-400 hover:text-emerald-400 focus:outline-none transition shrink-0"
            title={node.enabled ? (isAr ? 'استبعاد' : 'Exclude') : (isAr ? 'تضمين' : 'Include')}
          >
            {node.enabled ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Node icon */}
          {node.isDir ? (
            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          ) : isPy ? (
            <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
          )}

          {/* Name */}
          <span className={`truncate ${node.isDir ? 'font-bold text-slate-200' : 'text-slate-300'}`}>
            {renderHighlightedName(node.name, treeSearchQuery)}
            {node.isDir && '/'}
          </span>

          {/* Badges and Remove action */}
          <div className="ms-auto flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-[10px] text-slate-500">
              {node.isDir ? (isAr ? 'مجلد' : 'Folder') : (isAr ? 'ملف' : 'File')}
            </span>

            {/* Quick delete node button (pushes undoable state) */}
            <button
              onClick={() => removeItemFromTree(node.name)}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition"
              title={isAr ? `حذف ${node.name}` : `Remove ${node.name}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {node.children.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Modern Centered Floating Toast Notification */}
      {toastState && (
        <ModernToast
          message={toastState.message}
          title={toastState.title}
          type={toastState.type}
          duration={3500}
          onClose={() => setToastState(null)}
          language={language}
        />
      )}

      {/* Preset Templates Bar & State Management Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl">
        {/* Preset buttons */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse overflow-x-auto text-xs">
          <span className="font-semibold text-slate-400 shrink-0">
            {isAr ? 'قوالب جاهزة:' : 'Presets:'}
          </span>
          {Object.entries(PRESET_TEMPLATES).map(([key, item]) => (
            <button
              key={key}
              onClick={() =>
                resetTree(
                  item.tree,
                  `Load ${item.nameEn} template`,
                  `تحميل قالب ${item.nameAr}`
                )
              }
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition"
            >
              {isAr ? item.nameAr : item.nameEn}
            </button>
          ))}
        </div>

        {/* State Management Controls: Undo, Redo, History Timeline */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl text-xs font-semibold border transition disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-emerald-400"
            title={isAr ? 'تراجع (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'تراجع' : 'Undo'}</span>
            {currentIndex > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300">
                {currentIndex}
              </span>
            )}
          </button>

          {/* Redo Button */}
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl text-xs font-semibold border transition disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-emerald-400"
            title={isAr ? 'إعادة (Ctrl+Y أو Ctrl+Shift+Z)' : 'Redo (Ctrl+Y or Ctrl+Shift+Z)'}
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة' : 'Redo'}</span>
            {history.length - 1 - currentIndex > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300">
                {history.length - 1 - currentIndex}
              </span>
            )}
          </button>

          {/* History Timeline Drawer Trigger */}
          <button
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 transition"
            title={isAr ? 'سجل التعديلات الكامل' : 'Edit History Timeline'}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAr ? 'السجل' : 'Timeline'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {history.length}
            </span>
          </button>
        </div>
      </div>

      {/* History Timeline Drawer / Modal */}
      {showHistoryModal && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm text-white">
                {isAr ? 'سجل العمليات والتعديلات (Undo / Redo History)' : 'Directory Edit History & Checkpoints'}
              </span>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            {isAr
              ? 'انقر على أي نقطة زمنية سابقة للرجوع إليها فوراً مع الاحتفاظ بكافة فروع التعديلات:'
              : 'Click on any past checkpoint to instantly jump back or forward to that exact state:'}
          </p>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {history.map((snapshot, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={snapshot.id}
                  onClick={() => {
                    jumpTo(idx);
                    showToast(
                      isAr
                        ? `تم الانتقال إلى: ${snapshot.descriptionAr}`
                        : `Jumped to: ${snapshot.description}`,
                      'info',
                      isAr ? 'استعادة الحالة' : 'Checkpoint Restored'
                    );
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-mono text-left rtl:text-right transition ${
                    isActive
                      ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300 font-bold'
                      : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span>{isAr ? snapshot.descriptionAr : snapshot.description}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                    <span>{new Date(snapshot.timestamp).toLocaleTimeString()}</span>
                    {isActive && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                        {isAr ? 'الحالي' : 'Current'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Text Input & Editor Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[640px]">
            {/* Header Actions */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="font-bold text-slate-200 text-sm">
                  {isAr ? 'مدخل شجرة المشروع النصية' : 'Text Project Tree Input'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                  {isAr ? 'تتبع التغييرات نشط' : 'Undo Tracking Active'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <button
                  onClick={() => {
                    resetTree(
                      DEFAULT_PROJECT_EXAMPLE,
                      'Loaded default example tree',
                      'تحميل شجرة المشروع الافتراضية'
                    );
                    showToast(
                      isAr ? 'تم تحميل الشجرة الافتراضية بنجاح!' : 'Default example tree loaded!',
                      'success',
                      isAr ? 'تحميل نموذج' : 'Example Loaded'
                    );
                  }}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 transition shadow-sm"
                  title={isAr ? 'تحميل النموذج الافتراضي (Load Example)' : 'Load Example Tree'}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحميل نموذج' : 'Load Example'}</span>
                </button>
                <button
                  onClick={handleCopyTree}
                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Copy text"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    resetTree(
                      '',
                      'Cleared tree input',
                      'مسح شجرة المجلدات بالكامل'
                    )
                  }
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                  title="Clear input"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Monospace Text Area with live debounced state tracking */}
            <textarea
              value={treeText}
              onChange={(e) => setTreeText(e.target.value)}
              placeholder={isAr ? 'الصق هيكل المجلدات هنا...' : 'Paste your tree structure here...'}
              className="w-full flex-1 my-3 bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/70 resize-none leading-relaxed tracking-wide"
              dir="ltr"
              spellCheck={false}
            />

            {/* Bottom Input Bar: Quick Add Node */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => {
                    setQuickItemType('file');
                    setShowAddModal(true);
                  }}
                  className="flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
                >
                  <FilePlus className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isAr ? 'إضافة ملف' : '+ File'}</span>
                </button>
                <button
                  onClick={() => {
                    setQuickItemType('folder');
                    setShowAddModal(true);
                  }}
                  className="flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAr ? 'إضافة مجلد' : '+ Folder'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500">
                {isAr ? 'ملاحظة: اختصارات Ctrl+Z و Ctrl+Y مفعلة' : 'Tip: Ctrl+Z & Ctrl+Y shortcuts active'}
              </div>
            </div>

            {/* Validation & Syntax Errors */}
            {parseResult.errors.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl max-h-24 overflow-y-auto space-y-1 text-xs text-red-300 mt-2">
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse font-semibold text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isAr
                      ? `تم اكتشاف ${parseResult.errors.length} خطأ في التسميات أو البنية:`
                      : `Found ${parseResult.errors.length} syntax or naming issue(s):`}
                  </span>
                </div>
                {parseResult.errors.map((err, idx) => (
                  <p key={idx} className="font-mono text-[11px] text-red-300/90">
                    • {err.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Tree Preview & Generation Options (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col min-h-[660px]">
            {/* Header, Item Counter & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="font-bold text-slate-200 text-sm">
                  {isAr ? 'معاينة الشجرة' : 'Tree Preview'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {isAr
                    ? `${parseResult.totalFolders} مجلد • ${parseResult.totalFiles} ملف`
                    : `${parseResult.totalFolders} Folders • ${parseResult.totalFiles} Files`}
                </span>
              </div>

              {/* View Switcher: Diagram vs Explorer */}
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setPreviewMode('diagram')}
                    className={`flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      previewMode === 'diagram'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={isAr ? 'عرض مخطط العقد والخطوط التفاعلي' : 'Visual Nodes & Lines Diagram'}
                  >
                    <Workflow className="w-3.5 h-3.5" />
                    <span>{isAr ? 'عقد وخطوط' : 'Nodes & Lines'}</span>
                  </button>

                  <button
                    onClick={() => setPreviewMode('explorer')}
                    className={`flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      previewMode === 'explorer'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={isAr ? 'عرض الشجرة التفاعلية (سحب وإفلات، إعادة تسمية، قائمة النقر الأيمن)' : 'Interactive Visual Tree (Drag & Drop, Rename, Right-Click)'}
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>{isAr ? 'شجرة تفاعلية (DnD)' : 'Interactive Tree (DnD)'}</span>
                  </button>

                  <button
                    onClick={() => setShowVisualPreviewModal(true)}
                    disabled={!parseResult.root}
                    className="flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition border border-emerald-500/30 ms-1 disabled:opacity-40"
                    title={isAr ? 'فتح نافذة المعاينة المرئية والتحقق بالرموز' : 'Open Visual Preview & Verification Modal'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isAr ? 'معاينة مرئية' : 'Preview Modal'}</span>
                  </button>

                  <button
                    onClick={handleExportJson}
                    disabled={!parseResult.root}
                    className="flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition border border-amber-500/30 ms-1 disabled:opacity-40"
                    title={isAr ? 'تصدير هيكل الشجرة والإعدادات كملف JSON' : 'Export Tree Structure as JSON'}
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تصدير JSON' : 'Export JSON'}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1 rtl:space-x-reverse text-xs">
                  <button
                    onClick={() => setAllNodesDisabled(false, allNodePaths)}
                    className="px-1.5 py-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition text-[11px]"
                    title="Include All"
                  >
                    {isAr ? 'تحديد' : 'All'}
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={() => setAllNodesDisabled(true, allNodePaths)}
                    className="px-1.5 py-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition text-[11px]"
                    title="Deselect All"
                  >
                    {isAr ? 'إلغاء' : 'None'}
                  </button>
                </div>
              </div>
            </div>

            {/* Search Input to filter visual tree structure */}
            <div className="mt-3 relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 rtl:right-3 pointer-events-none" />
                <input
                  type="text"
                  value={treeSearchQuery}
                  onChange={(e) => setTreeSearchQuery(e.target.value)}
                  placeholder={
                    isAr
                      ? 'بحث وتصفية بالاسم في هيكل الشجرة (مثل .py أو src أو test)...'
                      : 'Filter tree structure by file or folder name (e.g. .py, src, test)...'
                  }
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500/80 rounded-xl pl-9 rtl:pr-9 pr-24 rtl:pl-24 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition shadow-inner"
                />
                {treeSearchQuery && (
                  <div className="absolute right-2.5 rtl:left-2.5 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                      {matchCount} {isAr ? 'عنصر' : 'found'}
                    </span>
                    <button
                      onClick={() => setTreeSearchQuery('')}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title={isAr ? 'مسح البحث' : 'Clear search'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {treeSearchQuery.trim() && (
                <div className="flex items-center justify-between mt-1 px-1 text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {isAr
                        ? `تصفية نشطة لـ "${treeSearchQuery}" (${matchCount} مطابقة)`
                        : `Filtering by "${treeSearchQuery}" (${matchCount} matches)`}
                    </span>
                  </span>
                  <button
                    onClick={() => setTreeSearchQuery('')}
                    className="text-emerald-400 hover:underline"
                  >
                    {isAr ? 'إلغاء التصفية' : 'Clear Filter'}
                  </button>
                </div>
              )}
            </div>

            {/* Tree Viewport: Visual Nodes & Lines Diagram OR Explorer Tree */}
            <div className="flex-1 my-3 relative min-h-0">
              {parseResult.root ? (
                treeSearchQuery.trim() && !filteredRoot ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-2">
                    <Search className="w-8 h-8 text-slate-600 mb-1" />
                    <p className="text-sm font-semibold text-slate-300">
                      {isAr
                        ? `لا توجد ملفات أو مجلدات تطابق "${treeSearchQuery}"`
                        : `No files or folders match "${treeSearchQuery}"`}
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      {isAr
                        ? 'جرب البحث باسم ملف أو مجلد مختلف، أو امتداد مثل .py أو .md'
                        : 'Try searching for another folder or file name, or an extension like .py or .md'}
                    </p>
                    <button
                      onClick={() => setTreeSearchQuery('')}
                      className="mt-2 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
                    >
                      {isAr ? 'إلغاء التصفية' : 'Clear Filter'}
                    </button>
                  </div>
                ) : previewMode === 'diagram' ? (
                  <VisualTreeDiagram
                    root={filteredRoot || parseResult.root}
                    language={language}
                    searchQuery={treeSearchQuery}
                    onSearchChange={setTreeSearchQuery}
                    onToggleNode={toggleNodeDisabled}
                    onRemoveNode={handleTreeRemoveNode}
                    onAddChildNode={handleTreeAddNode}
                  />
                ) : (
                  <InteractiveVisualTreeView
                    root={filteredRoot || parseResult.root}
                    language={language}
                    searchQuery={treeSearchQuery}
                    onToggleNode={toggleNodeDisabled}
                    onAddNode={handleTreeAddNode}
                    onRenameNode={handleTreeRenameNode}
                    onRemoveNode={handleTreeRemoveNode}
                    onMoveNode={handleTreeMoveNode}
                    onDuplicateNode={handleTreeDuplicateNode}
                  />
                )
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs bg-slate-950/70 border border-slate-800/90 rounded-xl">
                  {isAr ? 'أدخل شجرة صالحة لرؤية المعاينة' : 'Enter a valid tree to see preview'}
                </div>
              )}
            </div>

            {/* Options Panel with State-Managed Toggles */}
            <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400 font-medium shrink-0">
                  {isAr ? 'سياسة الملفات الموجودة:' : 'Collision Policy:'}
                </span>
                <ThemedSelect
                  value={policy}
                  onChange={(val) => setPolicy(val as CollisionPolicy)}
                  options={policyOptions}
                  isRtl={isAr}
                  compact={true}
                  className="w-52 sm:w-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={addInitPy}
                    onChange={(e) => setAddInitPy(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                  />
                  <span>{isAr ? 'إضافة __init__.py للحزم' : 'Add __init__.py to pkgs'}</span>
                </label>

                <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={starterContent}
                    onChange={(e) => setStarterContent(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                  />
                  <span>{isAr ? 'قوالب أولية للملفات' : 'Starter file templates'}</span>
                </label>

                <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer text-slate-300 col-span-2">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                  />
                  <span>{isAr ? 'وضع المعاينة الجافة (Dry-Run)' : 'Dry-Run Mode (Simulate only)'}</span>
                </label>
              </div>
            </div>

            {/* Bottom Generation Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-3">
              <button
                onClick={handleDownloadZip}
                disabled={!parseResult.root || downloading}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 border border-emerald-500/40 disabled:opacity-50 transition"
              >
                <Download className="w-4 h-4 text-white shrink-0" />
                <span>
                  {downloading
                    ? isAr
                      ? 'جارٍ التحزيم...'
                      : 'Packaging...'
                    : dryRun
                    ? isAr
                      ? 'محاكاة البناء (Dry-Run)'
                      : 'Simulate Build'
                    : isAr
                    ? 'بناء هيكل المشروع الآن (ZIP)'
                    : 'Forge & Download ZIP'}
                </span>
              </button>

              {/* Visual Preview Modal Trigger */}
              <button
                onClick={() => setShowVisualPreviewModal(true)}
                disabled={!parseResult.root}
                className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-semibold disabled:opacity-50 transition shrink-0"
                title={isAr ? 'معاينة شجرة الملفات بالرموز المرئية والتحقق منها قبل المتابعة' : 'Visual preview of file system tree before proceeding'}
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'معاينة الهيكل' : 'Preview Tree'}</span>
              </button>

              {/* Export JSON Button */}
              <button
                onClick={handleExportJson}
                disabled={!parseResult.root}
                className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-semibold disabled:opacity-50 transition shrink-0 shadow-sm"
                title={isAr ? 'تصدير هيكل شجرة الملفات والإعدادات الحالية كملف JSON محلياً' : 'Export current file system tree structure as a JSON file'}
              >
                <FileJson className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'تصدير JSON' : 'Export JSON'}</span>
              </button>

              {/* Export Wizard Trigger */}
              <button
                onClick={() => setShowExportWizard(true)}
                disabled={!parseResult.root}
                className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 disabled:opacity-50 transition shrink-0"
                title={isAr ? 'معالج التصدير الذكي (.py / .sh / .zip)' : 'Smart Export Wizard (.py / .sh / .zip)'}
              >
                <Wand2 className="w-4 h-4 text-purple-200" />
                <span>{isAr ? 'معالج التصدير' : 'Export Wizard'}</span>
              </button>

              <button
                onClick={handleSendToContent}
                disabled={!parseResult.root}
                className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold disabled:opacity-50 transition shrink-0"
                title={isAr ? 'إرسال هذه الملفات إلى مساحة حقن الأكواد' : 'Send files to Content workspace'}
              >
                <span>{isAr ? 'حقن الأكواد' : 'Inject Code'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 text-emerald-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-sm text-white">
                {isAr
                  ? quickItemType === 'folder'
                    ? 'إضافة مجلد جديد إلى الشجرة'
                    : 'إضافة ملف جديد إلى الشجرة'
                  : quickItemType === 'folder'
                  ? 'Add New Folder to Tree'
                  : 'Add New File to Tree'}
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">
                {isAr ? 'اسم العنصر:' : 'Item Name (relative or with extension):'}
              </label>
              <input
                type="text"
                value={quickItemName}
                onChange={(e) => setQuickItemName(e.target.value)}
                placeholder={quickItemType === 'folder' ? 'new_module/' : 'script.py'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddQuickItem();
                }}
              />
            </div>

            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleAddQuickItem}
                disabled={!quickItemName.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-40"
              >
                {isAr ? 'إضافة إلى الشجرة' : 'Add to Tree'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Preview Modal with Folders & Files Icons */}
      <VisualPreviewModal
        isOpen={showVisualPreviewModal}
        onClose={() => setShowVisualPreviewModal(false)}
        root={parseResult.root}
        language={language}
        policy={policy}
        addInitPy={addInitPy}
        starterContent={starterContent}
        onToggleNode={toggleNodeDisabled}
        onDownloadZip={handleDownloadZip}
        onExportJson={handleExportJson}
        onOpenExportWizard={() => setShowExportWizard(true)}
        onSendToContent={handleSendToContent}
      />

      {/* Smart Export Wizard Modal */}
      <ExportWizardModal
        isOpen={showExportWizard}
        onClose={() => setShowExportWizard(false)}
        root={parseResult.root}
        language={language}
        policy={policy}
        addInitPy={addInitPy}
        starterContent={starterContent}
      />
    </div>
  );
};
