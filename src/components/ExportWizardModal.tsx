import { getStarterContent } from '../utils/starterTemplates';
import { generateStandalonePythonInstaller, generateStandaloneBashInstaller, generateStandalonePowerShellInstaller } from '../utils/installerGenerator';
import { validateRelativePath } from '../utils/pathSafety';
import React, { useState, useMemo } from 'react';
import { 
  Wand2, 
  X, 
  Check, 
  Copy, 
  Download, 
  FileCode, 
  Folder, 
  FileText, 
  Terminal, 
  Package, 
  ChevronRight, 
  ChevronLeft, 
  CheckSquare, 
  Square, 
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { WebTreeNode, Language, CollisionPolicy } from '../types';
import { exportProjectZip, downloadBlob } from '../utils/zipGenerator';
import JSZip from 'jszip';

interface ExportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  root: WebTreeNode | null;
  language: Language;
  policy: CollisionPolicy;
  addInitPy: boolean;
  starterContent: boolean;
}

export type ExportFormat = 'zip' | 'python_script' | 'bash_script' | 'powershell_script';

export const ExportWizardModal: React.FC<ExportWizardModalProps> = ({
  isOpen,
  onClose,
  root,
  language,
  policy,
  addInitPy,
  starterContent,
}) => {
  const isAr = language === 'ar';

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('bash_script');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [extensionFilter, setExtensionFilter] = useState<string>('all');

  // Environment setup flags for scripts
  const [createVenv, setCreateVenv] = useState<boolean>(false);
  const [installDeps, setInstallDeps] = useState<boolean>(false);
  const [initGit, setInitGit] = useState<boolean>(false);
  const [launchApp, setLaunchApp] = useState<boolean>(false);

  // Set of selected node paths
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Flatten all nodes from tree
  const allNodesList = useMemo(() => {
    const list: WebTreeNode[] = [];
    if (!root) return list;
    function collect(n: WebTreeNode) {
      list.push(n);
      n.children.forEach(collect);
    }
    collect(root);
    return list;
  }, [root]);

  // Initialize selected paths with all enabled nodes when modal opens
  React.useEffect(() => {
    if (root && isOpen) {
      const initial = new Set<string>();
      function mark(n: WebTreeNode) {
        if (!n.enabled) return;
        initial.add(n.path);
        n.children.forEach(mark);
      }
      mark(root);
      setSelectedPaths(initial);
      setCurrentStep(1);
    }
  }, [root, isOpen]);

  if (!isOpen || !root) return null;

  // Toggle selection
  const togglePathSelection = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = (enable: boolean) => {
    if (enable) {
      setSelectedPaths(new Set(allNodesList.map((n) => n.path)));
    } else {
      setSelectedPaths(new Set());
    }
  };

  // Filtered nodes for selection list
  const filteredNodes = allNodesList.filter((n) => {
    if (searchFilter && !n.name.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false;
    }
    if (extensionFilter === 'py' && !n.isDir && !n.name.endsWith('.py')) return false;
    if (extensionFilter === 'docs' && !n.isDir && !n.name.endsWith('.md') && !n.name.endsWith('.txt')) return false;
    if (extensionFilter === 'configs' && !n.isDir && !n.name.endsWith('.json') && !n.name.endsWith('.toml') && !n.name.endsWith('.gitignore') && !n.name.endsWith('.yml')) return false;
    return true;
  });

  // Helper to get resolved content of a file
  const getFileContent = (n: WebTreeNode): string => {
    if (n.content !== undefined) return n.content;
    if (starterContent) return getStarterContent(n.name, root.name);
    return '';
  };

  const selectedNodes = allNodesList.filter(n => selectedPaths.has(n.path) &&
    allNodesList.filter(parent => parent.isDir && n.path.startsWith(parent.path + '/')).every(parent => selectedPaths.has(parent.path)));
  const exportFiles: Record<string, string> = Object.create(null);
  for (const node of selectedNodes) {
    validateRelativePath(node.path);
    if (!node.isDir) exportFiles[node.path] = getFileContent(node);
  }
  if (addInitPy) {
    for (const dir of selectedNodes.filter(n => n.isDir)) {
      if (!dir.children.some(c => c.name === '__init__.py') && Object.keys(exportFiles).some(p => p.startsWith(dir.path + '/') && p.endsWith('.py')) &&
          !(dir.path + '/__init__.py' in exportFiles)) exportFiles[dir.path + '/__init__.py'] = '\"\"\"Package initialization.\"\"\"\n';
    }
  }
  const installerOptions = { policy, directories: selectedNodes.filter(n => n.isDir).map(n => n.path), createVenv,
    installDeps: installDeps && createVenv, initGit, launchApp };
  const generatePythonScript = () => generateStandalonePythonInstaller(exportFiles, root.name, installerOptions);
  const generateBashScript = () => generateStandaloneBashInstaller(exportFiles, root.name, installerOptions);
  const generatePowerShellScript = () => generateStandalonePowerShellInstaller(exportFiles, root.name, installerOptions);
  let activeScriptContent = '';
  try {
    if (selectedFormat === 'bash_script') activeScriptContent = generateBashScript();
    if (selectedFormat === 'python_script') activeScriptContent = generatePythonScript();
    if (selectedFormat === 'powershell_script') activeScriptContent = generatePowerShellScript();
  } catch (error) { activeScriptContent = `Invalid export: ${String(error)}`; }

  // Execute direct export / download
  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      if (selectedFormat === 'zip') {
        const zip = new JSZip();
        for (const node of selectedNodes.filter(n => n.isDir)) zip.folder(validateRelativePath(node.path));
        for (const [path, content] of Object.entries(exportFiles)) zip.file(validateRelativePath(path), content);

        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `${root.name}_custom_export.zip`);
      } else if (selectedFormat === 'bash_script') {
        const blob = new Blob([generateBashScript()], { type: 'text/x-sh;charset=utf-8' });
        downloadBlob(blob, `init_${root.name}.sh`);
      } else if (selectedFormat === 'python_script') {
        const blob = new Blob([generatePythonScript()], { type: 'text/x-python;charset=utf-8' });
        downloadBlob(blob, `setup_${root.name}.py`);
      } else if (selectedFormat === 'powershell_script') {
        const blob = new Blob([generatePowerShellScript()], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, `init_${root.name}.ps1`);
      }
      onClose();
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeScriptContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={isAr ? 'معالج التصدير' : 'Export wizard'} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full h-[680px] flex flex-col shadow-2xl overflow-hidden">
        {/* Wizard Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {isAr ? 'معالج التصدير الذكي (Export Wizard)' : 'Smart Export Wizard'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'اختر الملفات وصدّرها كحزمة مضغوطة أو سكربت بايثون/باش لتجهيز البيئة محلياً فورياً'
                  : 'Select specific files and export directly as .zip, .py, or .sh bootstrap script'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress Indicator */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center space-x-2 rtl:space-x-reverse font-bold transition ${
                currentStep === 1 ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                1
              </span>
              <span>{isAr ? 'تحديد الملفات' : '1. Select Files'}</span>
            </button>

            <span className="text-slate-700">→</span>

            <button
              onClick={() => setCurrentStep(2)}
              className={`flex items-center space-x-2 rtl:space-x-reverse font-bold transition ${
                currentStep === 2 ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                2
              </span>
              <span>{isAr ? 'خيارات البيئة' : '2. Environment'}</span>
            </button>

            <span className="text-slate-700">→</span>

            <button
              onClick={() => setCurrentStep(3)}
              className={`flex items-center space-x-2 rtl:space-x-reverse font-bold transition ${
                currentStep === 3 ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                3
              </span>
              <span>{isAr ? 'الصيغة والتصدير' : '3. Format & Export'}</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-emerald-400 font-semibold">
            {selectedPaths.size} / {allNodesList.length} {isAr ? 'عنصر محدد' : 'items selected'}
          </div>
        </div>

        {/* Wizard Step Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: SELECT SPECIFIC FILES */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1 max-w-sm">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 rtl:right-3 top-2.5" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder={isAr ? 'تصفية وبحث في الملفات...' : 'Filter files...'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 rtl:pr-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs">
                  <button
                    onClick={() => setExtensionFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      extensionFilter === 'all'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isAr ? 'الكل' : 'All'}
                  </button>
                  <button
                    onClick={() => setExtensionFilter('py')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      extensionFilter === 'py'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Python (.py)
                  </button>
                  <button
                    onClick={() => setExtensionFilter('docs')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      extensionFilter === 'docs'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isAr ? 'توثيق' : 'Docs'}
                  </button>
                  <button
                    onClick={() => setExtensionFilter('configs')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      extensionFilter === 'configs'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isAr ? 'إعدادات' : 'Configs'}
                  </button>

                  <span className="text-slate-700">|</span>

                  <button
                    onClick={() => selectAll(true)}
                    className="text-emerald-400 hover:underline px-1 text-xs"
                  >
                    {isAr ? 'تحديد الكل' : 'Select All'}
                  </button>
                  <button
                    onClick={() => selectAll(false)}
                    className="text-red-400 hover:underline px-1 text-xs"
                  >
                    {isAr ? 'إلغاء' : 'Clear'}
                  </button>
                </div>
              </div>

              {/* Items Table Checklist */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-12 text-center">✓</th>
                      <th className="p-3">{isAr ? 'المسار النسبي' : 'Relative Path'}</th>
                      <th className="p-3">{isAr ? 'النوع' : 'Type'}</th>
                      <th className="p-3">{isAr ? 'الحجم التقديري' : 'Est. Content'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredNodes.map((n) => {
                      const isSelected = selectedPaths.has(n.path);
                      const isPy = n.name.endsWith('.py');
                      return (
                        <tr
                          key={n.id}
                          onClick={() => togglePathSelection(n.path)}
                          className={`hover:bg-slate-800/40 cursor-pointer transition ${
                            isSelected ? 'bg-slate-800/20' : 'opacity-40'
                          }`}
                        >
                          <td className="p-3 text-center">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400 inline" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 inline" />
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              {n.isDir ? (
                                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                              ) : isPy ? (
                                <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                              )}
                              <span className={n.isDir ? 'font-bold text-slate-200' : 'text-slate-300'}>
                                {n.path}
                                {n.isDir && '/'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400">
                            {n.isDir ? (isAr ? 'مجلد' : 'Folder') : (isAr ? 'ملف' : 'File')}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {n.isDir ? '—' : `${getFileContent(n).split('\n').length} lines`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 2: ENVIRONMENT CONFIGURATION */}
          {currentStep === 2 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-white">
                  {isAr ? 'خيارات تهيئة البيئة المحلية في السكربت' : 'Local Environment Automation Options'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'حدد الأوامر الآلية التي سينفذها السكربت عند تشغيله على جهازك أو جهاز العميل'
                    : 'Choose which setup tasks the bootstrap script will automatically perform'}
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start space-x-3 rtl:space-x-reverse p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={createVenv}
                    onChange={(e) => setCreateVenv(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-200">
                      {isAr ? 'إنشاء وتفعيل بيئة بايثون افتراضية (.venv)' : 'Create & activate virtual environment (.venv)'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isAr
                        ? 'يقوم بتنفيذ python -m venv .venv وعزل الحزم عن نظام التشغيل الرئيسي'
                        : 'Runs python -m venv .venv and isolates your application dependencies'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 rtl:space-x-reverse p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={installDeps}
                    onChange={(e) => setInstallDeps(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-200">
                      {isAr ? 'تثبيت التبعيات تلقائياً (pip install -r requirements.txt)' : 'Install dependencies automatically'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isAr
                        ? 'تثبيت مكتبة PyQt6 و pytest تلقائياً داخل البيئة الافتراضية'
                        : 'Automatically runs pip install for PyQt6 and testing packages'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 rtl:space-x-reverse p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={initGit}
                    onChange={(e) => setInitGit(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-200">
                      {isAr ? 'تهيئة مستودع Git والالتزام الأولي' : 'Initialize Git repository (git init)'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isAr
                        ? 'إنشاء مستودع محلي جديد وعمل أول Git commit للملفات المصدرة'
                        : 'Creates a fresh Git repo and commits the forged starter files'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 rtl:space-x-reverse p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={launchApp}
                    onChange={(e) => setLaunchApp(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-200">
                      {isAr ? 'تشغيل التطبيق فور انتهاء التجهيز (python main.py)' : 'Launch app on completion (python main.py)'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isAr
                        ? 'فتح نافذة التطبيق فورياً بعد نجاح إنشاء البيئة وتثبيت الحزم'
                        : 'Immediately fires up the PyQt6 main window after setup finishes'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: FORMAT SELECTION & SCRIPT PREVIEW */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Format selection cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setSelectedFormat('bash_script')}
                  className={`p-3.5 rounded-xl border text-left rtl:text-right transition flex flex-col justify-between ${
                    selectedFormat === 'bash_script'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Terminal className="w-5 h-5 text-emerald-400 mb-2" />
                  <div>
                    <p className="font-bold text-xs">Bash Script (.sh)</p>
                    <p className="text-[10px] text-slate-400">Linux / macOS / WSL</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedFormat('python_script')}
                  className={`p-3.5 rounded-xl border text-left rtl:text-right transition flex flex-col justify-between ${
                    selectedFormat === 'python_script'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-5 h-5 text-sky-400 mb-2" />
                  <div>
                    <p className="font-bold text-xs">Python (.py)</p>
                    <p className="text-[10px] text-slate-400">Cross-Platform setup</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedFormat('zip')}
                  className={`p-3.5 rounded-xl border text-left rtl:text-right transition flex flex-col justify-between ${
                    selectedFormat === 'zip'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-5 h-5 text-amber-400 mb-2" />
                  <div>
                    <p className="font-bold text-xs">ZIP Archive (.zip)</p>
                    <p className="text-[10px] text-slate-400">Direct extractable files</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedFormat('powershell_script')}
                  className={`p-3.5 rounded-xl border text-left rtl:text-right transition flex flex-col justify-between ${
                    selectedFormat === 'powershell_script'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Cpu className="w-5 h-5 text-purple-400 mb-2" />
                  <div>
                    <p className="font-bold text-xs">PowerShell (.ps1)</p>
                    <p className="text-[10px] text-slate-400">Native Windows setup</p>
                  </div>
                </button>
              </div>

              {/* Script Live Code Preview */}
              {selectedFormat !== 'zip' ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="font-mono text-xs text-slate-300 font-bold">
                      {selectedFormat === 'bash_script'
                        ? `init_${root.name}.sh`
                        : selectedFormat === 'python_script'
                        ? `setup_${root.name}.py`
                        : `init_${root.name}.ps1`}
                    </span>

                    <button
                      onClick={handleCopyCode}
                      className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isAr ? 'نسخ السكربت' : 'Copy Script'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="h-64 overflow-auto text-xs font-mono text-emerald-400/90 leading-relaxed" dir="ltr">
                    {activeScriptContent}
                  </pre>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-3">
                  <Package className="w-12 h-12 text-amber-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">
                    {isAr ? 'ملف مضغوط جاهز للتحميل المباشر' : 'Clean ZIP Archive Ready for Export'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {isAr
                      ? `سيتم تحزيم ${selectedPaths.size} ملف ومجلد محدد مع كافة القوالب الأولية و __init__.py.`
                      : `Will package ${selectedPaths.size} selected items with starter templates directly.`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/70 border-t border-slate-800">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                <span>{isAr ? 'السابق' : 'Back'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="flex items-center space-x-1.5 rtl:space-x-reverse px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition"
              >
                <span>{isAr ? 'التالي' : 'Next'}</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            ) : (
              <button
                onClick={handleExecuteExport}
                disabled={isExporting || selectedPaths.size === 0}
                className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isExporting
                    ? isAr
                      ? 'جارٍ التصدير...'
                      : 'Exporting...'
                    : isAr
                    ? `تصدير وتحميل (${selectedFormat.toUpperCase()})`
                    : `Export & Download (${selectedFormat.replace('_script', '').toUpperCase()})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
