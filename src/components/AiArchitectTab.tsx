import { parseTreeText } from '../utils/treeParser';
import { aiResultSchema } from '../utils/aiSchema';
import React, { useState } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  ArrowRight, 
  Check, 
  Copy, 
  FolderTree, 
  FileCode, 
  Loader2,
  Lightbulb
} from 'lucide-react';
import { Language } from '../types';
import { ModernToast, ToastType } from './ModernToast';

interface AiArchitectTabProps {
  language: Language;
  onApplyProject: (treeText: string, batchCode: string) => void;
}

const QUICK_PROMPTS_AR = [
  'نظام إدارة مخازن ومبيعات (POS) لسطح المكتب باستخدام بايثون و PyQt6 وقاعدة بيانات SQLite',
  'أداة سطح مكتب لتحويل وضغط الصور والصوتيات والفيديوهات مع شريط تقدم وتعدد مسارات',
  'نظام تتبع وإدارة المهام والمشاريع بأسلوب Kanban مع حفظ البيانات محلياً',
  'لوحة تحكم وتحليل بيانات مالية مع رسوم بيانية وتصدير تقارير Excel و PDF',
];

const QUICK_PROMPTS_EN = [
  'Desktop Point of Sale (POS) and inventory tracker with PyQt6 and SQLite',
  'Multi-threaded media batch converter & compressor desktop utility',
  'Kanban task management desktop application with local JSON/SQLite persistence',
  'Financial analytics dashboard with real-time charts and PDF/Excel export',
];

export const AiArchitectTab: React.FC<AiArchitectTabProps> = ({ language, onApplyProject }) => {
  const isAr = language === 'ar';
  const [accessToken, setAccessToken] = useState('');
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    projectName: string;
    summary: string;
    treeText: string;
    batchCode: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedTree, setCopiedTree] = useState<boolean>(false);
  const [toastState, setToastState] = useState<{
    message: string;
    type?: ToastType;
    title?: string;
  } | null>(null);

  const showToast = (message: string, type: ToastType = 'success', title?: string) => {
    setToastState({ message, type, title });
  };

  const quickPrompts = isAr ? QUICK_PROMPTS_AR : QUICK_PROMPTS_EN;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-ai-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        signal: AbortSignal.timeout(50_000),
        body: JSON.stringify({ prompt, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate project structure');
      }
      setResult(aiResultSchema.parse(data.data));
      showToast(
        isAr ? 'تم تصميم وتوليد معمارية المشروع بنجاح!' : 'Project architecture synthesized successfully!',
        'success',
        isAr ? 'اكتمل التحليل' : 'AI Architect'
      );
    } catch (err: any) {
      const errMsg = err.message || 'Error communicating with AI service';
      setError(errMsg);
      showToast(errMsg, 'error', isAr ? 'فشل التوليد' : 'AI Error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    const parsed = parseTreeText(result.treeText);
    if (!parsed.root || parsed.errors.length) {
      showToast(isAr ? 'الشجرة المولّدة غير صالحة. أعد التوليد.' : 'Generated tree is invalid. Please generate again.', 'error');
      return;
    }
    onApplyProject(result.treeText, result.batchCode);
    showToast(
      isAr ? 'تم تحميل هيكل المشروع والأكواد في أداة البناء!' : 'Loaded project tree and starter code into Builder!',
      'success',
      isAr ? 'تطبيق المشروع' : 'Applied'
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
      {/* Intro Hero Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BrainCircuit className="w-48 h-48 text-purple-400" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 rtl:space-x-reverse px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAr ? 'الذكاء الاصطناعي بنمط التفكير العميق (Thinking Mode)' : 'Deep Thinking AI Architecture'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isAr ? 'مهندس المشاريع الذكي — صمم معمارية تطبيقك فوراً' : 'AI Tree Architect — Synthesize Clean Architecture'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {isAr
              ? 'صف فكرة تطبيقك، وسيقوم الذكاء الاصطناعي بالتفكير العميق لتحليل الوحدات المطلوبة، وهيكلة الشجرة النصية المتوافقة مع TreeForge، وتوليد كود أولي متكامل للملفات الرئيسية.'
              : 'Describe your application idea, and the AI will reason through architectural boundaries, design patterns, generate a TreeForge-compatible tree, and craft starter code.'}
          </p>
        </div>
      </div>

      {/* Input Box & Quick Ideas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>{isAr ? 'اكتب فكرة التطبيق أو المتطلبات:' : 'Describe your project requirements:'}</span>
            <span className="text-slate-500">{isAr ? 'يدعم العربية والإنجليزية' : 'Arabic & English supported'}</span>
          </div>

          <label className="block text-xs text-slate-300">
            {isAr ? 'رمز الوصول لخدمة الذكاء الاصطناعي (لا يُحفظ)' : 'AI access token (not persisted)'}
            <input type="password" autoComplete="off" value={accessToken} onChange={e => setAccessToken(e.target.value)}
              className="block w-full mt-2 p-2 bg-slate-950 border border-slate-700 rounded" />
          </label>
          <textarea
            maxLength={6000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              isAr
                ? 'مثال: تطبيق بايثون مكتبي لإدارة عيادة طبية مع جداول مواعيد وسجلات مرضى وقاعدة بيانات SQLite...'
                : 'Example: A Python desktop clinic management app with patient records, appointments, and SQLite...'
            }
            className="w-full h-28 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
          />
        </div>

        {/* Quick suggestions */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-[11px] font-semibold text-slate-400">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'اقتراحات سريعة للبدء:' : 'Quick ideas:'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(q)}
                className="text-left rtl:text-right text-[11px] px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جارٍ التفكير والتصميم...' : 'Thinking & Synthesizing...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? 'توليد الهيكل والأكواد بالذكاء الاصطناعي' : 'Generate Project with Thinking AI'}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Generated Result Showcase */}
      {result && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-fadeIn">
          {/* Top Result Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="text-base font-extrabold text-white">{result.projectName}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {isAr ? 'جاهز للحقن' : 'Ready to Forge'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {result.summary}
              </p>
            </div>

            <button
              onClick={handleApply}
              className="flex items-center space-x-2 rtl:space-x-reverse px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition shrink-0"
            >
              <span>{isAr ? 'تحميل الشجرة والكود في التطبيق' : 'Apply to Builder & Injector'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>

          {/* 2-Column Result Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tree View */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col h-80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-bold text-slate-300">
                  <FolderTree className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'شجرة المشروع المولدة' : 'Synthesized Tree'}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.treeText);
                    setCopiedTree(true);
                    setTimeout(() => setCopiedTree(false), 2000);
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Copy tree"
                >
                  {copiedTree ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <pre className="flex-1 overflow-auto text-xs font-mono text-emerald-400 leading-relaxed" dir="ltr">
                {result.treeText}
              </pre>
            </div>

            {/* Batch Code View */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col h-80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-bold text-slate-300">
                  <FileCode className="w-4 h-4 text-sky-400" />
                  <span>{isAr ? 'أكواد الملفات الأولية' : 'Starter Code Chunks'}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.batchCode);
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Copy code"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="flex-1 overflow-auto text-xs font-mono text-slate-300 leading-relaxed" dir="ltr">
                {result.batchCode}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
