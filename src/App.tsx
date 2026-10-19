import { parseTreeText } from './utils/treeParser';
import logoUrl from './assets/images/treeforge-logo.webp';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
const BuilderTab = lazy(() => import('./components/BuilderTab').then(m => ({ default: m.BuilderTab })));
const ContentTab = lazy(() => import('./components/ContentTab').then(m => ({ default: m.ContentTab })));
const AiArchitectTab = lazy(() => import('./components/AiArchitectTab').then(m => ({ default: m.AiArchitectTab })));
const DesktopSuiteTab = lazy(() => import('./components/DesktopSuiteTab').then(m => ({ default: m.DesktopSuiteTab })));
const TechDocsTab = lazy(() => import('./components/TechDocsTab').then(m => ({ default: m.TechDocsTab })));
import { Language, Theme, WebTreeNode } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('builder');
  const [visited, setVisited] = useState(() => new Set(['builder']));
  useEffect(() => { setVisited(prev => prev.has(activeTab) ? prev : new Set([...prev, activeTab])); }, [activeTab]);
  // Warn before refreshing/closing: project code is deliberately not persisted unencrypted.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const [language, setLanguage] = useState<Language>('ar');
  const [theme, setTheme] = useState<Theme>('dark');

  // Shared state between Builder and Content tabs
  const [virtualFiles, setVirtualFiles] = useState<Record<string, string>>({});
  const [candidateFiles, setCandidateFiles] = useState<string[]>(['MyProject/main.py', 'MyProject/requirements.txt', 'MyProject/README.md', 'MyProject/app/server.py', 'MyProject/app/models.py', 'MyProject/tests/test_server.py']);
  const [projectVersion, setProjectVersion] = useState(0);
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
    const initial: Record<string, string> = {};
    const collect = (node: WebTreeNode) => {
      if (node.content !== undefined) initial[node.path] = node.content;
      node.children.forEach(collect);
    };
    collect(treeRoot);
    setVirtualFiles(prev => ({ ...initial, ...Object.fromEntries(Object.entries(prev).filter(([path]) => path.startsWith(treeRoot.path + '/'))) }));
    setActiveTab('content');
  };

  const handleApplyAiProject = (treeText: string, batchCode: string) => {
    const parsed = parseTreeText(treeText);
    if (!parsed.root || parsed.errors.length) return;
    const paths: string[] = [];
    const collect = (node: WebTreeNode) => { if (!node.isDir) paths.push(node.path); node.children.forEach(collect); };
    collect(parsed.root);
    setCandidateFiles(paths);
    setProjectVersion(version => version + 1);
    setVirtualFiles({});
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
        <Suspense fallback={<p role="status">{language === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}</p>}>
        {visited.has('builder') && (
          <section hidden={activeTab !== 'builder'}>
          <BuilderTab
            language={language}
            fileContents={virtualFiles}
            active={activeTab === 'builder'}
            onSendToContent={handleSendToContent}
            externalTreeText={externalTreeText}
            projectVersion={projectVersion}
          />
          </section>
        )}

        {visited.has('content') && (
          <section hidden={activeTab !== 'content'}>
          <ContentTab
            language={language}
            candidateFiles={candidateFiles}
            virtualFiles={virtualFiles}
            setVirtualFiles={setVirtualFiles}
            initialBatchCode={activeBatchCode}
            projectVersion={projectVersion}
          />
          </section>
        )}

        {visited.has('ai-architect') && (
          <section hidden={activeTab !== 'ai-architect'}>
          <AiArchitectTab language={language} onApplyProject={handleApplyAiProject} />
          </section>
        )}

        {visited.has('desktop-suite') && (
          <section hidden={activeTab !== 'desktop-suite'}>
          <DesktopSuiteTab language={language} />
          </section>
        )}

        {visited.has('tech-docs') && (
          <section hidden={activeTab !== 'tech-docs'}>
          <TechDocsTab language={language} />
          </section>
        )}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 mt-12 bg-white dark:bg-slate-950/80 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="TreeForge"
              className="w-5 h-5 rounded-md object-cover border border-emerald-500/40"
              referrerPolicy="no-referrer"
            />
            <span className="font-extrabold text-slate-800 dark:text-slate-200">TreeForge</span>
            <span>•</span>
            <span>{language === 'ar' ? 'تطبيق مكتبي متكامل بلغة بايثون و PyQt6' : 'Desktop & Web Project Scaffolding Suite'}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('tech-docs')}
              className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              {language === 'ar' ? 'المواصفات التقنية' : 'Tech Specs'}
            </button>
            <button
              onClick={() => setActiveTab('desktop-suite')}
              className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              {language === 'ar' ? 'الكود المصدري' : 'Source Code'}
            </button>
            <a
              href="/api/download-zip"
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              TreeForge.zip
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
