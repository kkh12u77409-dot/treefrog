import logoUrl from '../assets/images/treeforge-logo.webp';
import React from 'react';
import { 
  FolderTree, 
  FileCode2, 
  Sparkles, 
  Terminal, 
  BookOpen, 
  Sun, 
  Moon, 
  Languages, 
  Download
} from 'lucide-react';
import { Language, Theme } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  theme,
  setTheme,
}) => {
  const isAr = language === 'ar';

  const tabs = [
    {
      id: 'builder',
      label: isAr ? 'منشئ المجلدات (Builder)' : 'Tree Builder',
      icon: FolderTree,
    },
    {
      id: 'content',
      label: isAr ? 'محرر وحقن الأكواد (Content)' : 'Batch Code Injector',
      icon: FileCode2,
    },
    {
      id: 'ai-architect',
      label: isAr ? 'المهندس الذكي (Thinking AI)' : 'AI Tree Architect',
      icon: Sparkles,
      badge: 'Thinking',
    },
    {
      id: 'desktop-suite',
      label: isAr ? 'حزمة بايثون المكتبية (PyQt6)' : 'Python Desktop Suite',
      icon: Terminal,
    },
    {
      id: 'tech-docs',
      label: isAr ? 'التقنيات وخطوات العمل' : 'Tech Specs & Workflow',
      icon: BookOpen,
    },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-200 bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setActiveTab('builder')}
            title="TreeForge Scaffolder"
          >
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-emerald-500/40 to-sky-400/40 blur-[2px] opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-emerald-500/40 flex items-center justify-center shadow-xs">
                <img
                  src={logoUrl}
                  alt="TreeForge Logo"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  TreeForge
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  PyQt6 6.x
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'من الشجرة النصية إلى نظام الملفات وحقن الأكواد' : 'Text Tree to Physical Files & Batch Code Writer'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-md shadow-emerald-600/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive 
                        ? 'bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950' 
                        : 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls: Language, Theme, Download Desktop Zip */}
          <div className="flex items-center gap-2">
            {/* Quick Download Desktop App */}
            <a
              href="/api/download-zip"
              download="TreeForge_PyQt6_App.zip"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-slate-950 transition-all shadow-xs"
              title="Download standalone Python PyQt6 application"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'تحميل تطبيق PyQt6' : 'Desktop ZIP'}</span>
            </a>

            {/* Language Switch */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs"
              title="Toggle English / Arabic"
            >
              <Languages className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {/* Theme Switch */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs"
              title="Toggle Dark / Light Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Row */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-2 border-t border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
