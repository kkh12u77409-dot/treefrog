import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Download, 
  Folder, 
  FileCode, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  Cpu,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { PrismCodeViewer } from './PrismCodeViewer';
import { Language, PythonFileEntry } from '../types';

interface DesktopSuiteTabProps {
  language: Language;
}

export const DesktopSuiteTab: React.FC<DesktopSuiteTabProps> = ({ language }) => {
  const isAr = language === 'ar';
  const [files, setFiles] = useState<PythonFileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<PythonFileEntry | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/python-files')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.files) {
          const fileOnly = data.files.filter((f: PythonFileEntry) => !f.isDir);
          setFiles(fileOnly);
          if (fileOnly.length > 0) {
            // Find main.py or first file
            const mainFile = fileOnly.find((f: PythonFileEntry) => f.name === 'main.py') || fileOnly[0];
            setSelectedFile(mainFile);
          }
        }
      })
      .catch((err) => console.error('Error fetching files:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyCode = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 rtl:space-x-reverse px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            <span>Python 3.11+ • PyQt6 (6.x) • PyInstaller Ready</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isAr ? 'حزمة بايثون المكتبية الكاملة لتطبيق TreeForge' : 'Complete TreeForge PyQt6 Desktop Suite'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {isAr
              ? 'الكود المصدري الكامل المكتوب بلغة بايثون لتطبيق سطح المكتب، بما في ذلك المحلل اللغوي، والمقسم الذكي، ومحرر الأكواد، والواجهات الرسومية، والخدمات واختبارات الوحدة.'
              : 'Production-ready Python desktop application codebase with full PyQt6 GUI, pure core logic, unit tests, QSS themes, and packaging scripts.'}
          </p>
        </div>

        {/* Big Action Download ZIP */}
        <a
          href="/api/download-zip"
          download="TreeForge_PyQt6_App.zip"
          className="flex items-center justify-center space-x-2.5 rtl:space-x-reverse px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition shrink-0"
        >
          <Download className="w-5 h-5" />
          <span>{isAr ? 'تحميل التطبيق المكتبي كاملاً (ZIP)' : 'Download Full Desktop App (.ZIP)'}</span>
        </a>
      </div>

      {/* Terminal Cheat Sheet */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2" dir="ltr">
        <div className="flex items-center space-x-2 text-slate-500 pb-1 border-b border-slate-800">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-400">Terminal Quick Start / أوامر التشغيل السريع:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold"># 1. Install & Run:</span>
            <p className="text-emerald-400">pip install -r requirements.txt</p>
            <p className="text-emerald-400">python main.py</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold"># 2. Run Tests & Build Executable:</span>
            <p className="text-sky-400">python -m unittest discover -s tests # (22 Tests Passing)</p>
            <p className="text-amber-400">pyinstaller --noconsole --onefile --icon assets/app.ico --add-data "assets:assets" main.py</p>
          </div>
        </div>
      </div>

      {/* 2-Column Codebase Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File Tree (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
              {isAr ? 'ملفات المشروع المصدري' : 'Project Source Files'}
            </span>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {files.length} {isAr ? 'ملف' : 'files'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-2 space-y-1">
            {files.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              const isPy = file.name.endsWith('.py');
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg text-xs font-mono text-left rtl:text-right transition ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {isPy ? (
                    <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  )}
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[600px]">
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    TreeForge/{selectedFile.path}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({selectedFile.content.split('\n').length} lines)
                  </span>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isAr ? 'نسخ الكود' : 'Copy Code'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 min-h-0 mt-3 overflow-hidden flex flex-col">
                <PrismCodeViewer
                  code={selectedFile.content}
                  filePath={selectedFile.name}
                  maxHeight="100%"
                />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              {isAr ? 'اختر ملفاً لعرض الشيفرة البرمجية' : 'Select a file to inspect its code'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
