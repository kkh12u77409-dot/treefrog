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

const STARTER_TEMPLATES: Record<string, string> = {
  '.py': '"""Module documentation."""\n\n\ndef main() -> None:\n    """Main entry point."""\n    pass\n\n\nif __name__ == "__main__":\n    main()\n',
  '.md': '# {projectName}\n\nProject overview, installation, and usage instructions.\n\n## Getting Started\n\n```bash\npip install -r requirements.txt\npython main.py\n```\n',
  '.gitignore': '__pycache__/\n*.py[cod]\n*$py.class\n.env\n.venv/\nenv/\n.idea/\n.vscode/\n*.bak\n',
  '.json': '{\n  "version": "1.0.0"\n}\n',
  '.txt': '# {projectName} notes\n',
};

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
  const [createVenv, setCreateVenv] = useState<boolean>(true);
  const [installDeps, setInstallDeps] = useState<boolean>(true);
  const [initGit, setInitGit] = useState<boolean>(true);
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
        if (n.enabled) initial.add(n.path);
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
    if (n.content) return n.content;
    if (starterContent) {
      const ext = '.' + n.name.split('.').pop()?.toLowerCase();
      const tpl = STARTER_TEMPLATES[ext];
      if (tpl) return tpl.replace('{projectName}', root.name);
      if (n.name === 'requirements.txt') return '# Core dependencies\nPyQt6>=6.6.1\npytest>=7.4.4\n';
    }
    return '';
  };

  // Generate Python Scaffolder Script
  const generatePythonScript = (): string => {
    const selectedFiles = allNodesList.filter((n) => !n.isDir && selectedPaths.has(n.path));
    const selectedDirs = allNodesList.filter((n) => n.isDir && selectedPaths.has(n.path));

    const dirsJson = JSON.stringify(selectedDirs.map((d) => d.path), null, 4);
    const filesDict: Record<string, string> = {};
    for (const f of selectedFiles) {
      filesDict[f.path] = getFileContent(f);
    }
    const filesJson = JSON.stringify(filesDict, null, 4);

    return `#!/usr/bin/env python3
"""TreeForge Project Initiator & Scaffolder.
Automated setup script for '${root.name}'.
"""

import os
import sys
import subprocess
from pathlib import Path

PROJECT_NAME = "${root.name}"
DIRECTORIES = ${dirsJson}
FILES = ${filesJson}

def init_environment():
    base_dir = Path.cwd()
    print(f"🌲 Initiating TreeForge project: {PROJECT_NAME}...")

    # 1. Create directories
    for d in DIRECTORIES:
        dir_path = base_dir / d
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"  📁 Created: {d}")

    # 2. Write files
    for file_path_str, content in FILES.items():
        file_path = base_dir / file_path_str
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")
        print(f"  📄 Written: {file_path_str}")

    # 3. Add __init__.py if requested
    ${addInitPy ? `
    for d in DIRECTORIES:
        target_dir = base_dir / d
        if any(f.endswith('.py') for f in os.listdir(target_dir)):
            init_file = target_dir / "__init__.py"
            if not init_file.exists():
                init_file.write_text('"""Package initialization."""\\n', encoding="utf-8")
                print(f"  🐍 Added __init__.py in: {d}")
    ` : '# __init__.py auto-generation skipped'}

    ${createVenv ? `
    # 4. Setup Virtual Environment
    venv_dir = base_dir / "${root.name}" / ".venv"
    if not venv_dir.exists():
        print("📦 Creating virtual environment (.venv)...")
        subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)
        print("✅ Virtual environment created at .venv")
    ` : ''}

    ${installDeps ? `
    # 5. Install Dependencies if requirements.txt exists
    req_file = base_dir / "${root.name}" / "requirements.txt"
    if req_file.exists():
        print("⬇️ Installing dependencies from requirements.txt...")
        pip_bin = str(venv_dir / ("Scripts" if os.name == "nt" else "bin") / "pip")
        if not Path(pip_bin).exists():
            pip_bin = "pip"
        subprocess.run([pip_bin, "install", "-r", str(req_file)])
    ` : ''}

    ${initGit ? `
    # 6. Initialize Git
    if not (base_dir / "${root.name}" / ".git").exists():
        try:
            print("🔧 Initializing Git repository...")
            subprocess.run(["git", "init", str(base_dir / "${root.name}")], check=True)
            print("✅ Git repository initialized.")
        except Exception as e:
            print(f"⚠️ Git init skipped: {e}")
    ` : ''}

    print("\\n🎉 Project environment ready! Navigate to folder and start coding:")
    print(f"   cd {PROJECT_NAME}")
    ${createVenv ? `print("   source .venv/bin/activate  # (or .venv\\\\Scripts\\\\activate on Windows)")` : ''}
    ${launchApp ? `
    entry_file = base_dir / "${root.name}" / "main.py"
    if entry_file.exists():
        print("🚀 Launching main.py...")
        subprocess.run([sys.executable, str(entry_file)])
    ` : ''}

if __name__ == "__main__":
    init_environment()
`;
  };

  // Generate Bash Bootstrap Script (.sh)
  const generateBashScript = (): string => {
    const selectedFiles = allNodesList.filter((n) => !n.isDir && selectedPaths.has(n.path));
    const selectedDirs = allNodesList.filter((n) => n.isDir && selectedPaths.has(n.path));

    let script = `#!/usr/bin/env bash
# ========================================================
# TreeForge Local Environment Bootstrap Script
# Project: ${root.name}
# ========================================================
set -e

echo "🌲 Initializing ${root.name} local environment..."

# 1. Create directory structure
`;

    for (const d of selectedDirs) {
      script += `mkdir -p "${d.path}"\n`;
    }

    script += `\necho "📁 Directories created successfully."\n\n# 2. Write project files\n`;

    for (const f of selectedFiles) {
      const content = getFileContent(f);
      script += `cat << 'EOF' > "${f.path}"\n${content}\nEOF\necho "  📄 Created: ${f.path}"\n\n`;
    }

    if (addInitPy) {
      script += `# Auto-add __init__.py in Python packages\nfind "${root.name}" -type f -name "*.py" -exec dirname {} \\; | sort -u | while read -r pdir; do\n  if [ ! -f "$pdir/__init__.py" ]; then\n    echo '"""Package init."""' > "$pdir/__init__.py"\n  fi\ndone\n\n`;
    }

    if (createVenv) {
      script += `# 3. Create & activate Python virtual environment\nif [ ! -d "${root.name}/.venv" ]; then\n  echo "📦 Creating virtual environment (.venv)..."\n  python3 -m venv "${root.name}/.venv"\nfi\nsource "${root.name}/.venv/bin/activate"\n\n`;
    }

    if (installDeps) {
      script += `# 4. Install dependencies\nif [ -f "${root.name}/requirements.txt" ]; then\n  echo "⬇️ Installing Python dependencies..."\n  pip install --upgrade pip\n  pip install -r "${root.name}/requirements.txt"\nfi\n\n`;
    }

    if (initGit) {
      script += `# 5. Git repository initialization\nif [ ! -d "${root.name}/.git" ]; then\n  echo "🔧 Initializing git repository..."\n  (cd "${root.name}" && git init && git add . && git commit -m "feat: initial commit from TreeForge") || true\nfi\n\n`;
    }

    script += `echo "🎉 Setup complete! To begin:"\necho "   cd ${root.name}"\n`;
    if (createVenv) script += `echo "   source .venv/bin/activate"\n`;
    if (launchApp) script += `python3 "${root.name}/main.py"\n`;

    return script;
  };

  // Generate PowerShell Bootstrap Script (.ps1)
  const generatePowerShellScript = (): string => {
    const selectedFiles = allNodesList.filter((n) => !n.isDir && selectedPaths.has(n.path));
    const selectedDirs = allNodesList.filter((n) => n.isDir && selectedPaths.has(n.path));

    let script = `# ========================================================
# TreeForge Local Environment Bootstrap Script (PowerShell)
# Project: ${root.name}
# ========================================================
$ErrorActionPreference = "Stop"

Write-Host "🌲 Initializing ${root.name} local environment..." -ForegroundColor Green

# 1. Create directories
`;

    for (const d of selectedDirs) {
      script += `New-Item -ItemType Directory -Force -Path "${d.path.replace(/\//g, '\\')}" | Out-Null\n`;
    }

    script += `\nWrite-Host "📁 Directories created." -ForegroundColor Cyan\n\n# 2. Write files\n`;

    for (const f of selectedFiles) {
      const content = getFileContent(f).replace(/"/g, '`"');
      script += `@"\n${getFileContent(f)}\n"@ | Out-File -FilePath "${f.path.replace(/\//g, '\\')}" -Encoding utf8\n`;
    }

    if (createVenv) {
      script += `\n# 3. Create virtual environment\nif (!(Test-Path "${root.name}\\.venv")) {\n  Write-Host "📦 Creating virtual environment (.venv)..." -ForegroundColor Yellow\n  python -m venv "${root.name}\\.venv"\n}\n`;
    }

    if (installDeps) {
      script += `\n# 4. Install dependencies\nif (Test-Path "${root.name}\\requirements.txt") {\n  & "${root.name}\\.venv\\Scripts\\pip.exe" install -r "${root.name}\\requirements.txt"\n}\n`;
    }

    script += `\nWrite-Host "🎉 Setup complete! Navigate to '${root.name}' to begin." -ForegroundColor Green\n`;
    return script;
  };

  // Get current generated script text based on selected format
  const activeScriptContent = useMemo(() => {
    if (selectedFormat === 'bash_script') return generateBashScript();
    if (selectedFormat === 'python_script') return generatePythonScript();
    if (selectedFormat === 'powershell_script') return generatePowerShellScript();
    return '';
  }, [selectedFormat, selectedPaths, createVenv, installDeps, initGit, launchApp]);

  // Execute direct export / download
  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      if (selectedFormat === 'zip') {
        const zip = new JSZip();
        const selectedFiles = allNodesList.filter((n) => !n.isDir && selectedPaths.has(n.path));

        for (const file of selectedFiles) {
          zip.file(file.path, getFileContent(file));
        }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
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
