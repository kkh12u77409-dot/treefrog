import React, { useState, useEffect } from 'react';
import { 
  FileCode2, 
  Save, 
  Split, 
  Undo2, 
  ListOrdered, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Copy, 
  Trash2, 
  Layers,
  FileCheck,
  Eye,
  X,
  Sparkles,
  Terminal,
  FileText,
  FileJson,
  Replace,
  Check,
  Diff,
  Wand2,
  ChevronDown,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { splitContent } from '../utils/contentSplitter';
import { downloadBlob } from '../utils/zipGenerator';
import { 
  generateFullBatchCode, 
  generateBoilerplateForFile,
  generateStandalonePythonInstaller,
  generateStandaloneBashInstaller 
} from '../utils/codeGenerator';
import { PrismCodeEditor } from './PrismCodeEditor';
import { PrismCodeViewer } from './PrismCodeViewer';
import JSZip from 'jszip';
import { WebFileChunk, Language, MatchStatus } from '../types';

interface ContentTabProps {
  language: Language;
  candidateFiles: string[];
  initialBatchCode?: string;
}

const SAMPLE_BATCH = `### main.py
"""Main application entry point."""
import sys
from PyQt6.QtWidgets import QApplication
from ui.main_window import MainWindow

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()

=== README.md ===
# SumMaster Project

High performance calculation and worker processing suite built with Python and PyQt6.

## Features
- Background multithreading with QThread
- Dynamic theme switching
- Comprehensive unit tests

--- ui/styles.py ---
# UI Design Tokens and Stylesheet
DARK_THEME = {
    "background": "#0f172a",
    "card": "#1e293b",
    "accent": "#10b981",
    "text": "#f8fafc",
}

// FILE: core/calculator.py
class Calculator:
    """Core mathematical operations engine."""
    def add(self, a: float, b: float) -> float:
        return a + b

    def subtract(self, a: float, b: float) -> float:
        return a - b

# FILE: tests/test_calculator.py
import unittest
from core.calculator import Calculator

class TestCalculator(unittest.TestCase):
    def test_add(self):
        calc = Calculator()
        self.assertEqual(calc.add(2, 3), 5)
`;

export const ContentTab: React.FC<ContentTabProps> = ({
  language,
  candidateFiles,
  initialBatchCode = '',
}) => {
  const isAr = language === 'ar';
  const [subTab, setSubTab] = useState<'batch' | 'single' | 'queue'>('batch');

  // Candidate file list (if none passed from builder, supply default SumMaster list)
  const filesList = candidateFiles.length > 0 ? candidateFiles : [
    'SumMaster/main.py',
    'SumMaster/make_zip.py',
    'SumMaster/requirements.txt',
    'SumMaster/README.md',
    'SumMaster/ui/main_window.py',
    'SumMaster/ui/spinner.py',
    'SumMaster/ui/styles.py',
    'SumMaster/core/calculator.py',
    'SumMaster/core/worker.py',
    'SumMaster/services/settings_service.py',
    'SumMaster/tests/test_calculator.py',
    'SumMaster/tests/test_worker.py',
  ];

  // In-memory file storage
  const [virtualFiles, setVirtualFiles] = useState<Record<string, string>>({});
  const [backupHistory, setBackupHistory] = useState<Record<string, string> | null>(null);

  // Batch Splitter State
  const [batchInput, setBatchInput] = useState<string>(initialBatchCode || SAMPLE_BATCH);
  const [chunks, setChunks] = useState<WebFileChunk[]>([]);
  const [stripFences, setStripFences] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Single File State
  const [selectedFile, setSelectedFile] = useState<string>(filesList[0] || '');
  const [singleEditorContent, setSingleEditorContent] = useState<string>('');
  const [showDiffModal, setShowDiffModal] = useState<boolean>(false);

  // Chunk Inspection Modal State
  const [previewingChunk, setPreviewingChunk] = useState<WebFileChunk | null>(null);

  // Queue State
  const [queue, setQueue] = useState<Array<{ path: string; content: string }>>([]);
  const [previewingQueueItem, setPreviewingQueueItem] = useState<{ path: string; content: string } | null>(null);

  // Smart Code Generator Modal & Tools State
  const [showGeneratorModal, setShowGeneratorModal] = useState<boolean>(false);
  const [showSearchReplaceModal, setShowSearchReplaceModal] = useState<boolean>(false);
  const [searchTarget, setSearchTarget] = useState<string>('');
  const [replaceTarget, setReplaceTarget] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  useEffect(() => {
    if (initialBatchCode) {
      setBatchInput(initialBatchCode);
    }
  }, [initialBatchCode]);

  // When selected single file changes, load its content
  useEffect(() => {
    if (selectedFile) {
      setSingleEditorContent(virtualFiles[selectedFile] || `# Content for ${selectedFile}\n`);
    }
  }, [selectedFile, virtualFiles]);

  const notify = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Run Batch Splitting & Matching
  const handleSplitBatch = (textToSplit?: string) => {
    const src = textToSplit !== undefined ? textToSplit : batchInput;
    if (!src.trim()) {
      notify(isAr ? 'الرجاء لصق الأكواد أولاً' : 'Please paste code first', 'info');
      return;
    }
    const parsedChunks = splitContent(src, filesList, stripFences);
    setChunks(parsedChunks);
    notify(
      isAr
        ? `تم تقسيم النص بنجاح إلى ${parsedChunks.length} ملفاً ومطابقتها مع الشجرة!`
        : `Successfully split into ${parsedChunks.length} file chunks and matched!`,
      'success'
    );
  };

  // Generate starter code for all candidate files in project tree
  const handleGenerateAllTreeCode = (stack: 'pyqt6' | 'fastapi' | 'cli_tool' | 'generic' = 'pyqt6') => {
    const projectName = filesList[0] ? filesList[0].split('/')[0] : 'TreeForgeProject';
    const generatedBatch = generateFullBatchCode(filesList, projectName, { stack });
    setBatchInput(generatedBatch);
    handleSplitBatch(generatedBatch);
    setShowGeneratorModal(false);
    notify(
      isAr
        ? `تم توليد أكواد ذكية متكاملة لـ ${filesList.length} ملفاً وحقنها في المحرر!`
        : `Generated complete starter code for ${filesList.length} files!`,
      'success'
    );
  };

  // Save selected batch chunks into virtual files
  const handleSaveSelectedBatch = () => {
    const toSave = chunks.filter((c) => c.included && c.resolvedPath);
    if (toSave.length === 0) {
      notify(isAr ? 'لم يتم تحديد أي ملفات صالحة للحفظ' : 'No valid files selected', 'error');
      return;
    }

    // Save current states into backup
    const backupSnapshot: Record<string, string> = { ...virtualFiles };
    setBackupHistory(backupSnapshot);

    const updated = { ...virtualFiles };
    for (const chunk of toSave) {
      updated[chunk.resolvedPath] = chunk.content;
    }
    setVirtualFiles(updated);

    notify(
      isAr
        ? `تم حفظ ${toSave.length} ملفاً بنجاح في الذاكرة مع إنشاء نسخة احتياطية (.bak)!`
        : `Successfully injected ${toSave.length} files into memory with .bak backup!`,
      'success'
    );
  };

  // Undo last batch
  const handleUndoBatch = () => {
    if (!backupHistory) {
      notify(isAr ? 'لا توجد نسخة احتياطية سابقة للتراجع عنها' : 'No backup available to restore', 'info');
      return;
    }
    setVirtualFiles(backupHistory);
    setBackupHistory(null);
    notify(isAr ? 'تم استرجاع النسخة السابقة بنجاح من النسخ الاحتياطية!' : 'Restored previous state from backup!', 'info');
  };

  // Download all virtual files as ZIP
  const handleExportAllZip = async () => {
    const zip = new JSZip();
    const keys = Object.keys(virtualFiles);
    if (keys.length === 0) {
      notify(isAr ? 'قم بحفظ أو حقن ملفات أولاً لتصديرها' : 'No injected files to export yet', 'info');
      return;
    }

    for (const p of keys) {
      zip.file(p, virtualFiles[p]);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'Injected_Project_Files.zip');
    notify(isAr ? 'تم تنزيل حزمة الملفات المحقونة بنجاح!' : 'Injected files ZIP downloaded!', 'success');
  };

  // Export as Standalone Single Python Script (create_project.py)
  const handleExportStandalonePython = () => {
    const keys = Object.keys(virtualFiles);
    const filesToExport = keys.length > 0 ? virtualFiles : Object.fromEntries(
      chunks.filter(c => c.resolvedPath).map(c => [c.resolvedPath, c.content])
    );

    if (Object.keys(filesToExport).length === 0) {
      notify(isAr ? 'لا توجد أكواد أو ملفات لتصديرها' : 'No files to export', 'error');
      return;
    }

    const projectName = filesList[0] ? filesList[0].split('/')[0] : 'TreeForgeProject';
    const script = generateStandalonePythonInstaller(filesToExport, projectName);
    const blob = new Blob([script], { type: 'text/x-python;charset=utf-8' });
    downloadBlob(blob, 'create_project.py');
    setShowExportMenu(false);
    notify(isAr ? 'تم تنزيل مثبت بايثون المستقل (create_project.py)!' : 'Downloaded standalone Python script (create_project.py)!', 'success');
  };

  // Export as Standalone Bash Installer
  const handleExportStandaloneBash = () => {
    const keys = Object.keys(virtualFiles);
    const filesToExport = keys.length > 0 ? virtualFiles : Object.fromEntries(
      chunks.filter(c => c.resolvedPath).map(c => [c.resolvedPath, c.content])
    );

    if (Object.keys(filesToExport).length === 0) {
      notify(isAr ? 'لا توجد أكواد أو ملفات لتصديرها' : 'No files to export', 'error');
      return;
    }

    const projectName = filesList[0] ? filesList[0].split('/')[0] : 'TreeForgeProject';
    const script = generateStandaloneBashInstaller(filesToExport, projectName);
    const blob = new Blob([script], { type: 'application/x-sh;charset=utf-8' });
    downloadBlob(blob, 'install_project.sh');
    setShowExportMenu(false);
    notify(isAr ? 'تم تنزيل سكربت التثبيت (install_project.sh)!' : 'Downloaded Bash script (install_project.sh)!', 'success');
  };

  // Export as JSON Manifest
  const handleExportJsonManifest = () => {
    const keys = Object.keys(virtualFiles);
    const filesToExport = keys.length > 0 ? virtualFiles : Object.fromEntries(
      chunks.filter(c => c.resolvedPath).map(c => [c.resolvedPath, c.content])
    );

    const manifest = {
      project: filesList[0] ? filesList[0].split('/')[0] : 'TreeForgeProject',
      timestamp: new Date().toISOString(),
      fileCount: Object.keys(filesToExport).length,
      files: filesToExport,
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'treeforge_manifest.json');
    setShowExportMenu(false);
    notify(isAr ? 'تم تصدير ملف JSON بنجاح!' : 'Exported JSON manifest successfully!', 'success');
  };

  // Prepend License Header to All Chunks
  const handlePrependLicense = (licenseType: 'MIT' | 'Apache-2.0') => {
    const year = new Date().getFullYear();
    const header = licenseType === 'MIT'
      ? `# SPDX-License-Identifier: MIT\n# Copyright (c) ${year} TreeForge Project\n\n`
      : `# SPDX-License-Identifier: Apache-2.0\n# Copyright (c) ${year} TreeForge Project\n\n`;

    setChunks(prev => prev.map(c => ({
      ...c,
      content: header + c.content
    })));
    notify(isAr ? `تمت إضافة ترويسة ترخيص ${licenseType} لكافة الملفات!` : `Prepended ${licenseType} license header to all chunks!`, 'info');
  };

  // Search and replace across all chunks
  const handleExecuteSearchReplace = () => {
    if (!searchTarget) return;
    let count = 0;
    setChunks(prev => prev.map(c => {
      if (c.content.includes(searchTarget)) {
        count++;
        const replaced = c.content.split(searchTarget).join(replaceTarget);
        return {
          ...c,
          content: replaced,
          lineCount: replaced.split('\n').length,
          sizeBytes: new Blob([replaced]).size,
        };
      }
      return c;
    }));
    setShowSearchReplaceModal(false);
    notify(isAr ? `تم الاستبدال في ${count} ملفاً بنجاح!` : `Replaced occurrences across ${count} file(s)!`, 'success');
  };

  // Single file save
  const handleSaveSingle = () => {
    if (!selectedFile) return;
    setVirtualFiles((prev) => ({
      ...prev,
      [selectedFile]: singleEditorContent,
    }));
    notify(isAr ? `تم حفظ ${selectedFile} بنجاح!` : `Saved ${selectedFile} successfully!`, 'success');
  };

  // Add single to queue
  const handleAddToQueue = () => {
    if (!selectedFile) return;
    setQueue((prev) => [...prev, { path: selectedFile, content: singleEditorContent }]);
    notify(isAr ? `تمت إضافة ${selectedFile} إلى طابور الحفظ` : `Added ${selectedFile} to queue`, 'info');
  };

  // Save all in queue
  const handleSaveQueue = () => {
    if (queue.length === 0) return;
    const updated = { ...virtualFiles };
    for (const item of queue) {
      updated[item.path] = item.content;
    }
    setVirtualFiles(updated);
    notify(isAr ? `تم حفظ جميع ملفات الطابور (${queue.length})!` : `Saved all ${queue.length} files from queue!`, 'success');
    setQueue([]);
  };

  const getStatusBadge = (status: MatchStatus) => {
    if (status === 'matched') {
      return (
        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <CheckCircle className="w-3 h-3 shrink-0" />
          <span>{isAr ? 'متطابق' : 'Matched'}</span>
        </span>
      );
    }
    if (status === 'ambiguous') {
      return (
        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{isAr ? 'متعدد الاحتمالات' : 'Ambiguous'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 rtl:space-x-reverse text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
        <XCircle className="w-3 h-3 shrink-0" />
        <span>{isAr ? 'غير موجود' : 'Unmatched'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center space-x-3 rtl:space-x-reverse text-xs font-semibold animate-slideUp ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-red-950/90 border-red-500 text-red-300'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : notification.type === 'error' ? (
            <XCircle className="w-4 h-4 text-red-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Sub Mode Navigation Tabs & Export Suite */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <button
            onClick={() => setSubTab('batch')}
            className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-xl text-xs font-bold transition ${
              subTab === 'batch'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>{isAr ? 'التقسيم الذكي للملفات (Batch)' : 'Smart Batch Splitter'}</span>
          </button>

          <button
            onClick={() => setSubTab('single')}
            className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-xl text-xs font-bold transition ${
              subTab === 'single'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'محرر الملف الفردي (Single)' : 'Single File Editor'}</span>
          </button>

          <button
            onClick={() => setSubTab('queue')}
            className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-xl text-xs font-bold transition ${
              subTab === 'queue'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>
              {isAr ? `طابور الحفظ (${queue.length})` : `Save Queue (${queue.length})`}
            </span>
          </button>
        </div>

        {/* Action Controls: Smart Generator & Export Menu */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse relative">
          {/* Smart Code Generator Trigger */}
          <button
            onClick={() => setShowGeneratorModal(true)}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-emerald-500/20 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition shadow-sm hover:border-purple-400"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAr ? 'مولد الأكواد الذكي ⚡' : 'Smart Code Generator ⚡'}</span>
          </button>

          {/* Export Suite Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'أدوات التصدير' : 'Export Suite'}</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 rtl:left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs divide-y divide-slate-800">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-slate-400">
                  {isAr ? 'خيارات التصدير الجاهزة' : 'Export Formats'}
                </div>
                <div className="py-1">
                  <button
                    onClick={handleExportAllZip}
                    disabled={Object.keys(virtualFiles).length === 0}
                    className="w-full px-3 py-2 text-left rtl:text-right hover:bg-slate-800 text-slate-200 flex items-center space-x-2 rtl:space-x-reverse disabled:opacity-40"
                  >
                    <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-100">{isAr ? 'أرشيف مضغوط (.ZIP)' : 'Compressed ZIP Archive'}</p>
                      <p className="text-[10px] text-slate-400">{Object.keys(virtualFiles).length} {isAr ? 'ملف محقون' : 'injected files'}</p>
                    </div>
                  </button>

                  <button
                    onClick={handleExportStandalonePython}
                    className="w-full px-3 py-2 text-left rtl:text-right hover:bg-slate-800 text-slate-200 flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-100">create_project.py</p>
                      <p className="text-[10px] text-slate-400">{isAr ? 'سكربت بايثون مستقل ينشئ كافة الملفات' : 'Self-extracting single Python script'}</p>
                    </div>
                  </button>

                  <button
                    onClick={handleExportStandaloneBash}
                    className="w-full px-3 py-2 text-left rtl:text-right hover:bg-slate-800 text-slate-200 flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-100">install_project.sh</p>
                      <p className="text-[10px] text-slate-400">{isAr ? 'سكربت طرفية شل لإنشاء الهيكل' : 'Shell installation script'}</p>
                    </div>
                  </button>

                  <button
                    onClick={handleExportJsonManifest}
                    className="w-full px-3 py-2 text-left rtl:text-right hover:bg-slate-800 text-slate-200 flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <FileJson className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-100">treeforge_manifest.json</p>
                      <p className="text-[10px] text-slate-400">{isAr ? 'ملف بيانات موحد لخطوط CI/CD' : 'Structured JSON data manifest'}</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODE 1: SMART BATCH SPLITTER */}
      {subTab === 'batch' && (
        <div className="space-y-6">
          {/* Top Card: Multi-file Paste Area */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <span>{isAr ? 'الصق الكود متعدد الملفات' : 'Paste Multi-File Code Here'}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                    ###, ===, ---, // FILE:, # FILE:, ```
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAr
                    ? 'يتعرف النظام تلقائياً على علامات الفواصل، ويفصل الأكواد، ويطابقها مع شجرة المشروع'
                    : 'Recognizes multiple separator conventions and fuzzy matches them to your project tree'}
                </p>
              </div>

              {/* Batch Helper Actions */}
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs flex-wrap gap-y-1">
                <button
                  onClick={() => setShowSearchReplaceModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1"
                  title="Search & Replace"
                >
                  <Replace className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isAr ? 'بحث واستبدال' : 'Find/Replace'}</span>
                </button>

                <button
                  onClick={() => handlePrependLicense('MIT')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1"
                  title="Add MIT Header"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>MIT License</span>
                </button>

                <label className="flex items-center space-x-1.5 rtl:space-x-reverse text-slate-300 cursor-pointer pl-1">
                  <input
                    type="checkbox"
                    checked={stripFences}
                    onChange={(e) => setStripFences(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                  />
                  <span>{isAr ? 'إزالة ```' : 'Strip ```'}</span>
                </label>
              </div>
            </div>

            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder={isAr ? 'الصق نصوص الملفات المجمعة هنا...' : 'Paste combined file text with markers...'}
              className="w-full h-56 bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/70 resize-none leading-relaxed tracking-wide"
              dir="ltr"
              spellCheck={false}
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                {isAr
                  ? `الشجرة المستهدفة تحتوي على ${filesList.length} ملفاً للمطابقة`
                  : `Active tree has ${filesList.length} candidate files for matching`}
              </span>
              <button
                onClick={() => handleSplitBatch()}
                className="flex items-center space-x-2 rtl:space-x-reverse px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
              >
                <Split className="w-4 h-4" />
                <span>{isAr ? 'تحليل وتقسيم الملفات الآن' : 'Split & Match Files'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Card: Match Table Preview */}
          {chunks.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {isAr ? 'معاينة الملفات المستخرجة وجدول المطابقة' : 'Extracted Chunks & Match Results'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isAr
                      ? 'يمكنك تعديل الملف المستهدف في الحالات غير المؤكدة قبل الحفظ'
                      : 'You can adjust candidate target files for ambiguous or unmatched chunks before saving'}
                  </p>
                </div>

                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {backupHistory && (
                    <button
                      onClick={handleUndoBatch}
                      className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500 hover:text-slate-950 transition"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تراجع عن الحزمة السابقة' : 'Undo Last Batch'}</span>
                    </button>
                  )}

                  <button
                    onClick={handleSaveSelectedBatch}
                    className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {isAr
                        ? `حفظ الملفات المحددة (${chunks.filter((c) => c.included).length})`
                        : `Save Selected (${chunks.filter((c) => c.included).length})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={chunks.every((c) => c.included)}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setChunks((prev) => prev.map((c) => ({ ...c, included: val })));
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                        />
                      </th>
                      <th className="p-3">{isAr ? 'المسار المستخرج من النص' : 'Extracted Raw Marker'}</th>
                      <th className="p-3">{isAr ? 'الملف المطابق في المشروع' : 'Matched Project Target'}</th>
                      <th className="p-3">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="p-3">{isAr ? 'الحجم والأسطر' : 'Lines & Size'}</th>
                      <th className="p-3 text-center">{isAr ? 'معاينة' : 'Inspect'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {chunks.map((chunk) => (
                      <tr
                        key={chunk.id}
                        className={`hover:bg-slate-800/40 transition ${
                          !chunk.included ? 'opacity-50 bg-slate-950/40' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={chunk.included}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setChunks((prev) =>
                                prev.map((c) =>
                                  c.id === chunk.id ? { ...c, included: checked } : c
                                )
                              );
                            }}
                            className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-200">
                          {chunk.rawTargetPath}
                        </td>
                        <td className="p-3">
                          {chunk.candidatePaths.length > 1 ? (
                            <select
                              value={chunk.resolvedPath}
                              onChange={(e) => {
                                const newPath = e.target.value;
                                setChunks((prev) =>
                                  prev.map((c) =>
                                    c.id === chunk.id
                                      ? { ...c, resolvedPath: newPath, matchStatus: 'matched' }
                                      : c
                                  )
                                );
                              }}
                              className="bg-slate-800 border border-amber-500/50 rounded-lg px-2 py-1 text-amber-300 text-xs focus:outline-none"
                            >
                              {chunk.candidatePaths.map((cand) => (
                                <option key={cand} value={cand}>
                                  {cand}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-emerald-400">
                              {chunk.resolvedPath || (isAr ? 'لا يوجد تطابق' : 'None')}
                            </span>
                          )}
                        </td>
                        <td className="p-3">{getStatusBadge(chunk.matchStatus)}</td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {chunk.lineCount} lines • {Math.round(chunk.sizeBytes / 1024 * 10) / 10} KB
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setPreviewingChunk(chunk)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Inspect code"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: SINGLE FILE EDITOR WITH DIFF VIEWER */}
      {subTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Selector Tree (4 cols) */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[580px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                {isAr ? 'ملفات المشروع المستهدفة' : 'Candidate Target Files'}
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {filesList.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-1">
              {filesList.map((file) => {
                const isSelected = selectedFile === file;
                const hasVirtual = !!virtualFiles[file];
                return (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition text-left rtl:text-right ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                      <FileCode2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{file}</span>
                    </div>
                    {hasVirtual && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                        title="Saved in memory"
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor & Actions (8 cols) */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[580px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="font-bold text-white font-mono text-xs">{selectedFile}</span>
                {virtualFiles[selectedFile] && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                    {isAr ? 'محفوظ في الذاكرة' : 'Saved in memory'}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {/* Compare / Diff button */}
                <button
                  onClick={() => setShowDiffModal(true)}
                  disabled={!virtualFiles[selectedFile]}
                  className="flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition disabled:opacity-40"
                  title="View Diff with Memory version"
                >
                  <Diff className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isAr ? 'مقارنة الفروقات (Diff)' : 'Diff'}</span>
                </button>

                <button
                  onClick={handleAddToQueue}
                  className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إضافة للطابور' : '+ Queue'}</span>
                </button>

                <button
                  onClick={handleSaveSingle}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isAr ? 'حفظ الملف' : 'Save File'}</span>
                </button>
              </div>
            </div>

            {/* Prism Code Editor */}
            <div className="flex-1 my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
              <PrismCodeEditor
                value={singleEditorContent}
                onChange={setSingleEditorContent}
                filePath={selectedFile}
                minHeight="100%"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>{singleEditorContent.split('\n').length} lines</span>
              <span>{new Blob([singleEditorContent]).size} bytes</span>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: SAVE QUEUE */}
      {subTab === 'queue' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white">
                {isAr ? 'طابور الحفظ المؤقت (Staging Queue)' : 'Staging Save Queue'}
              </h4>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'الملفات التي أضفتها هنا تنتظر الحفظ الجماعي بضغطة زر واحدة'
                  : 'Files queued here are awaiting one-click batch commitment to storage'}
              </p>
            </div>

            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <button
                onClick={() => setQueue([])}
                disabled={queue.length === 0}
                className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500 hover:text-white transition disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'إفراغ الطابور' : 'Clear Queue'}</span>
              </button>

              <button
                onClick={handleSaveQueue}
                disabled={queue.length === 0}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isAr ? 'حفظ كافة ملفات الطابور' : 'Save All Queued Files'}</span>
              </button>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              {isAr ? 'لا توجد ملفات في الطابور حالياً' : 'No files in queue. Add some from the Single File Editor!'}
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl"
                >
                  <div className="flex items-center space-x-2 rtl:space-x-reverse font-mono text-xs">
                    <span className="text-slate-500">#{idx + 1}</span>
                    <span className="text-emerald-400 font-semibold">{item.path}</span>
                    <span className="text-slate-500 text-[11px]">
                      ({item.content.split('\n').length} lines)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <button
                      onClick={() => setPreviewingQueueItem(item)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Inspect"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setQueue((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 rounded bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SMART CODE GENERATOR MODAL */}
      {showGeneratorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <Wand2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-base text-white">
                  {isAr ? 'مولد الأكواد الذكي التلقائي' : 'Smart Code Generator'}
                </h3>
              </div>
              <button
                onClick={() => setShowGeneratorModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr
                ? 'يقوم هذا المولد بتحليل كافة ملفات المشروع في الشجرة الحالية تلقائياً، وتوليد الأكواد الأولية والوحدات النمطية، والواجهات، واختبارات الوحدة بما يتطابق تماماً مع أسمائها وامتداداتها.'
                : 'Analyzes all files in your current tree and automatically generates idiomatic starter code, modular classes, UI widgets, and unit test suites tailored to each filename.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleGenerateAllTreeCode('pyqt6')}
                className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 text-left rtl:text-right space-y-1.5 transition group"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-white group-hover:text-emerald-400">
                    PyQt6 Desktop Suite
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'نوافذ PyQt6، خيوط QThread، إعدادات، واختبارات' : 'QApplication, UI widgets, QThread workers, tests'}
                </p>
              </button>

              <button
                onClick={() => handleGenerateAllTreeCode('fastapi')}
                className="p-4 rounded-xl bg-slate-950 border border-sky-500/40 hover:border-sky-400 text-left rtl:text-right space-y-1.5 transition group"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-xs text-white group-hover:text-sky-400">
                    FastAPI Modern Backend
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'تطبيق FastAPI، مخططات Pydantic، ونقاط نهاية' : 'FastAPI app, Pydantic schemas, REST endpoints'}
                </p>
              </button>

              <button
                onClick={() => handleGenerateAllTreeCode('cli_tool')}
                className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 hover:border-amber-400 text-left rtl:text-right space-y-1.5 transition group"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-white group-hover:text-amber-400">
                    CLI Automation Tool
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'أدوات طرفية، معالجة معطيات الأوامر، وتسجيل' : 'Command line parser, logging, execution pipeline'}
                </p>
              </button>

              <button
                onClick={() => handleGenerateAllTreeCode('generic')}
                className="p-4 rounded-xl bg-slate-950 border border-purple-500/40 hover:border-purple-400 text-left rtl:text-right space-y-1.5 transition group"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-xs text-white group-hover:text-purple-400">
                    {isAr ? 'هندسة نظيفة عامة' : 'Clean Architecture'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'فئات برمجية نموذجية، توثيق، واختبارات قياسية' : 'Standard class boilerplate, docstrings, unit tests'}
                </p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGeneratorModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH & REPLACE MODAL */}
      {showSearchReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Replace className="w-4 h-4 text-sky-400" />
                <h4 className="font-bold text-white text-sm">
                  {isAr ? 'بحث واستبدال في كافة الملفات' : 'Search & Replace Across All Chunks'}
                </h4>
              </div>
              <button onClick={() => setShowSearchReplaceModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{isAr ? 'النص المطلوب البحث عنه:' : 'Find text:'}</label>
                <input
                  type="text"
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value)}
                  placeholder="e.g. SumMaster"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{isAr ? 'استبدال بـ:' : 'Replace with:'}</label>
                <input
                  type="text"
                  value={replaceTarget}
                  onChange={(e) => setReplaceTarget(e.target.value)}
                  placeholder="e.g. MyNewProject"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
              <button
                onClick={() => setShowSearchReplaceModal(false)}
                className="px-3 py-1.5 rounded-lg text-slate-400 text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleExecuteSearchReplace}
                disabled={!searchTarget}
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                {isAr ? 'استبدال الآن' : 'Replace All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIFF MODAL */}
      {showDiffModal && selectedFile && virtualFiles[selectedFile] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Diff className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-white font-mono">
                  {selectedFile} - {isAr ? 'مقارنة المحتوى المحفوظ مع المحرر الحالي' : 'Diff: Saved vs Current'}
                </span>
              </div>
              <button onClick={() => setShowDiffModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 flex-1 overflow-auto">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 pb-1 border-b border-slate-800">
                  {isAr ? 'المحتوى المحفوظ في الذاكرة' : 'Saved in Memory'}:
                </div>
                <PrismCodeViewer code={virtualFiles[selectedFile]} filePath={selectedFile} maxHeight="450px" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-emerald-400 pb-1 border-b border-slate-800">
                  {isAr ? 'المحتوى الحالي في المحرر' : 'Current in Editor'}:
                </div>
                <PrismCodeViewer code={singleEditorContent} filePath={selectedFile} maxHeight="450px" />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDiffModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chunk Inspection Modal with PrismCodeEditor */}
      {previewingChunk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-white font-mono">
                  {previewingChunk.resolvedPath || previewingChunk.rawTargetPath}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({previewingChunk.lineCount} lines)
                </span>
              </div>
              <button
                onClick={() => setPreviewingChunk(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              <PrismCodeEditor
                value={previewingChunk.content}
                onChange={(newContent) => {
                  const updated = {
                    ...previewingChunk,
                    content: newContent,
                    lineCount: newContent.split('\n').length,
                    sizeBytes: new Blob([newContent]).size,
                  };
                  setPreviewingChunk(updated);
                  setChunks((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c))
                  );
                }}
                filePath={previewingChunk.resolvedPath || previewingChunk.rawTargetPath}
                minHeight="420px"
              />
            </div>

            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewingChunk(null)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20"
              >
                {isAr ? 'تم واعتماد التعديلات' : 'Done & Keep Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Item Preview Modal with PrismCodeViewer */}
      {previewingQueueItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-white font-mono">
                  {previewingQueueItem.path}
                </span>
              </div>
              <button
                onClick={() => setPreviewingQueueItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              <PrismCodeViewer
                code={previewingQueueItem.content}
                filePath={previewingQueueItem.path}
                maxHeight="450px"
              />
            </div>

            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewingQueueItem(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
