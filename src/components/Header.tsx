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
    <header className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-200 border-slate-700/60 bg-slate-900/85">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer group" 
            onClick={() => setActiveTab('builder')}
            title="TreeForge Scaffolder"
          >
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-emerald-500/50 to-teal-400/50 blur-[2px] opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <img
                  src={logoUrl}
                  alt="TreeForge Logo"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  TreeForge
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PyQt6 6.x
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr ? 'من الشجرة النصية إلى نظام الملفات وحقن الأكواد' : 'Text Tree to Physical Files & Batch Code Writer'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 rtl:space-x-reverse">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls: Language, Theme, Download Desktop Zip */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* Quick Download Desktop App */}
            <a
              href="/api/download-zip"
              download="TreeForge_PyQt6_App.zip"
              className="hidden sm:inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-sm"
              title="Download standalone Python PyQt6 application"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل تطبيق PyQt6' : 'Desktop ZIP'}</span>
            </a>

            {/* Language Switch */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
              title="Toggle English / Arabic"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {/* Theme Switch */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Toggle Dark / Light Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Row */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-2 rtl:space-x-reverse border-t border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 rtl:space-x-reverse whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-300 bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
