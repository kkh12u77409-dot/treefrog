import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BuilderTab } from './components/BuilderTab';
import { ContentTab } from './components/ContentTab';
import { AiArchitectTab } from './components/AiArchitectTab';
import { DesktopSuiteTab } from './components/DesktopSuiteTab';
import { TechDocsTab } from './components/TechDocsTab';
import { Language, Theme, WebTreeNode } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('builder');
  const [language, setLanguage] = useState<Language>('ar');
  const [theme, setTheme] = useState<Theme>('dark');

  // Shared state between Builder and Content tabs
  const [candidateFiles, setCandidateFiles] = useState<string[]>([]);
  const [activeBatchCode, setActiveBatchCode] = useState<string>('');
  const [externalTreeText, setExternalTreeText] = useState<string>('');

  // Handle HTML document RTL / LTR direction and lang
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Handle Dark / Light mode class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleSendToContent = (treeRoot: WebTreeNode, paths: string[]) => {
    setCandidateFiles(paths);
    setActiveTab('content');
  };

  const handleApplyAiProject = (treeText: string, batchCode: string) => {
    setActiveBatchCode(batchCode);
    setExternalTreeText(treeText);
    setActiveTab('builder');
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'builder' && (
          <BuilderTab
            language={language}
            onSendToContent={handleSendToContent}
            externalTreeText={externalTreeText}
          />
        )}

        {activeTab === 'content' && (
          <ContentTab
            language={language}
            candidateFiles={candidateFiles}
            initialBatchCode={activeBatchCode}
          />
        )}

        {activeTab === 'ai-architect' && (
          <AiArchitectTab language={language} onApplyProject={handleApplyAiProject} />
        )}

        {activeTab === 'desktop-suite' && (
          <DesktopSuiteTab language={language} />
        )}

        {activeTab === 'tech-docs' && (
          <TechDocsTab language={language} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-12 bg-slate-950/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <img 
              src="/src/assets/images/treeforge_logo_1792138921289.jpg" 
              alt="TreeForge" 
              className="w-5 h-5 rounded-md object-cover border border-emerald-500/30"
              referrerPolicy="no-referrer"
            />
            <span className="font-extrabold text-slate-300">TreeForge</span>
            <span>•</span>
            <span>{language === 'ar' ? 'تطبيق مكتبي متكامل بلغة بايثون و PyQt6' : 'Desktop & Web Project Scaffolding Suite'}</span>
          </div>

          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button
              onClick={() => setActiveTab('tech-docs')}
              className="hover:text-emerald-400 transition"
            >
              {language === 'ar' ? 'المواصفات التقنية' : 'Tech Specs'}
            </button>
            <button
              onClick={() => setActiveTab('desktop-suite')}
              className="hover:text-emerald-400 transition"
            >
              {language === 'ar' ? 'الكود المصدري' : 'Source Code'}
            </button>
            <a
              href="/api/download-zip"
              className="text-emerald-400 font-semibold hover:underline"
            >
              TreeForge.zip
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
