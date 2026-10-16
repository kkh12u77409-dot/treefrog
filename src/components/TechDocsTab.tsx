import React from 'react';
import { 
  CheckCircle2, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  FolderGit2, 
  Palette, 
  Globe2, 
  TestTube2, 
  Terminal, 
  Sparkles
} from 'lucide-react';
import { Language } from '../types';

interface TechDocsTabProps {
  language: Language;
}

export const TechDocsTab: React.FC<TechDocsTabProps> = ({ language }) => {
  const isAr = language === 'ar';

  const technologies = [
    {
      name: 'Python 3.11+',
      roleAr: 'اللغة الأساسية للمنطق الخلفي ومحركات المعالجة',
      roleEn: 'Core language for background logic and parsing engines',
      detailsAr: 'استخدام Type Hints الكاملة، dataclasses، و pathlib بدلاً من os.path لضمان استقرار العمليات عبر الأنظمة المختلفة.',
      detailsEn: 'Full type annotations, dataclasses, and pathlib instead of os.path for cross-platform robustness.',
      icon: Cpu,
    },
    {
      name: 'PyQt6 (6.x)',
      roleAr: 'إطار بناء واجهة سطح المكتب الحديثة',
      roleEn: 'Modern desktop GUI framework',
      detailsAr: 'اعتماد أحدث معايير PyQt6: enums محددة النطاق مثل Qt.AlignmentFlag، استخدام exec()، ونمط التصميم Card-based مع QSplitters.',
      detailsEn: 'Fully scoped enums (Qt.AlignmentFlag), exec() lifecycle, and card-based responsive QSplitter layouts.',
      icon: Layers,
    },
    {
      name: 'QThread Worker Engine',
      roleAr: 'تعدد المسارات غير المتزامن لحماية الواجهة من التجمد',
      roleEn: 'Asynchronous background multithreading',
      detailsAr: 'فصل عمليات إنشاء الملفات والقراءة والكتابة المكثفة داخل كائنات QThread مستقلة مع إرسال إشارات تقدم pyqtSignal.',
      detailsEn: 'Decoupled intensive disk I/O operations into background QThread workers with real-time pyqtSignal updates.',
      icon: Terminal,
    },
    {
      name: 'Atomic Writes & .bak Backups',
      roleAr: 'أمان البيانات والكتابة الذرية وخاصية التراجع',
      roleEn: 'Atomic safety, automatic backups, and undo',
      detailsAr: 'الكتابة إلى ملفات مؤقتة ثم استبدالها ذرياً، مع الاحتفاظ بنسخ احتياطية .bak وإتاحة استعادة الحالة السابقة بضغطة زر.',
      detailsEn: 'Writes to temporary files before atomic replacement, keeps .bak backups, and enables one-click batch undo.',
      icon: ShieldCheck,
    },
    {
      name: 'Fuzzy Matching & Marker Parser',
      roleAr: 'التقسيم الذكي للملفات المجمعة والمطابقة التقريبية',
      roleEn: 'Smart multi-file splitting & fuzzy matching',
      detailsAr: 'التعرف على أكثر من 7 صيغ فواصل مع محرك مطابقة ثلاثي المراحل (المسار الدقيق، اسم الملف الفريد، ومطابقة difflib).',
      detailsEn: 'Extracts 7+ separator formats with a 3-tier matcher (exact relative, unique filename, and difflib fuzzy ratio).',
      icon: FolderGit2,
    },
    {
      name: 'Bilingual RTL/LTR Engine',
      roleAr: 'تعريب كامل وتبديل فوري للغة مع دعم RTL الحقيقي',
      roleEn: 'Instant Arabic RTL & English LTR internationalization',
      detailsAr: 'دعم تغيير اتجاه الواجهة بالكامل QApplication.setLayoutDirection، مع إبقاء محررات الأكواد والمسارات LTR لحفظ سهولة القراءة.',
      detailsEn: 'True RTL layout mirroring with isolated LTR code editors and file paths for developer ergonomics.',
      icon: Globe2,
    },
    {
      name: 'QSS & Palette Tokens',
      roleAr: 'سمات التصميم الداكنة والفاتحة وأيقونات SVG متكيفة',
      roleEn: 'Design tokens, dark/light themes, and dynamic SVG',
      detailsAr: 'لوحة ألوان موحدة تعتمد على Fusion style بدون ألوان ثابتة في عناصر الواجهة، مع إعادة تلوين أيقونات SVG ديناميكياً.',
      detailsEn: 'Central design token palette over Fusion style with dynamic runtime SVG recoloring.',
      icon: Palette,
    },
    {
      name: 'Thinking AI Engine (Gemini)',
      roleAr: 'هندسة معمارية ذكية بنمط التفكير العميق',
      roleEn: 'AI Tree Architect with High Thinking Mode',
      detailsAr: 'تكامل مع أحدث نماذج Gemini للتفكير العميق وتصميم هياكل المشاريع البرمجية وتوليد الأكواد الأولية المتوافقة.',
      detailsEn: 'Integration with Gemini models using ThinkingLevel.HIGH to synthesize clean software architectures.',
      icon: Sparkles,
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      titleAr: 'تحليل المتطلبات وهندسة معمارية النظام',
      titleEn: 'Requirements Analysis & Architecture Design',
      descAr: 'تحديد الفصل الصارم بين منطق الأعمال الأساسي (core/) الذي لا يعتمد على PyQt6، وبين طبقة الواجهة الرسومية (ui/) وطبقة الخدمات (services/).',
      descEn: 'Establishing strict separation between pure Python business logic (core/) and the PyQt6 presentation layer (ui/).',
    },
    {
      step: '02',
      titleAr: 'بناء محلل الشجرة النصية ومحرك الأمان',
      titleEn: 'Tree Syntax Parser & Security Validation',
      descAr: 'برمجة core/tree_parser.py للتعامل مع رموز الشجرة الصندوقية (├──)، والمسافات البادئة، ومسارات المجموعات السريعة ui/ (a.py, b.py)، وفحص منع هجمات المسارات مثل (..) والأسماء المحجوزة في ويندوز (CON, PRN).',
      descEn: 'Constructing core/tree_parser.py to parse box drawing (├──), indentation, inline groups, and block path traversal / Windows reserved names.',
    },
    {
      step: '03',
      titleAr: 'محرك التقسيم الذكي والمطابقة التقريبية للملفات',
      titleEn: 'Multi-File Content Splitter & Fuzzy Matching',
      descAr: 'تطوير core/content_splitter.py لاستخراج ملفات متعددة من نصوص مجمعة والتعرف على فواصل مثل ### و === و // FILE: ومطابقتها بذكاء مع ملفات المشروع عبر difflib.',
      descEn: 'Developing core/content_splitter.py to extract files from multi-file batches and match them via 3-tier matching algorithms.',
    },
    {
      step: '04',
      titleAr: 'الكتابة الذرية، وإدارة النسخ الاحتياطية، والتراجع',
      titleEn: 'Atomic File Writing, Backups, and Undo',
      descAr: 'بناء core/file_writer.py لتنفيذ الكتابة عبر ملفات مؤقتة واستبدالها ذرياً، وحفظ نسخ .bak قبل التعديل، مع ميزة التراجع الكامل عن آخر حزمة.',
      descEn: 'Implementing core/file_writer.py for atomic file replacement, creating .bak backups, and enabling batch rollback.',
    },
    {
      step: '05',
      titleAr: 'واجهة المستخدم الحديثة PyQt6 ونظام السمة',
      titleEn: 'PyQt6 Modern UI, Cards, and Design Tokens',
      descAr: 'تصميم الواجهة في ui/ عبر هيكل شريط جانبي (Sidebar) وصفحات مكدسة (QStackedWidget) وبطاقات مستديرة الحواف ومحرر أكواد مخصص برسم أرقام الأسطر والتلوين البرمجي.',
      descEn: 'Crafting the desktop interface using sidebar navigation, stacked pages, custom CodeEditor with gutter line numbers, and floating toasts.',
    },
    {
      step: '06',
      titleAr: 'دعم اللغة العربية والاتجاه من اليمين لليسار (RTL)',
      titleEn: 'Bilingual Internationalization & RTL Mirroring',
      descAr: 'توفير خدمات i18n_service.py لتغيير اللغة فورياً مع تطبيق setLayoutDirection لعكس الواجهة، مع الإبقاء على الأكواد والمسارات LTR.',
      descEn: 'Providing i18n_service.py for instant language toggling with true RTL mirroring while preserving LTR code readability.',
    },
    {
      step: '07',
      titleAr: 'كتابة اختبارات الوحدة الشاملة والتأكد من نجاحها',
      titleEn: 'Comprehensive Unit Testing Suite',
      descAr: 'تضمين tests/ لاختبار المحلل، والمقسم، ومحرك الأمان، والتأكد من نجاح 100% من الاختبارات عبر unittest و pytest.',
      descEn: 'Writing tests for syntax tolerance, security rejection, fuzzy matching, and atomic writes with 100% pass rate.',
    },
    {
      step: '08',
      titleAr: 'تحزيم التطبيق وتوفير بيئة الويب التفاعلية',
      titleEn: 'Distribution Packaging & Full-Stack Web Suite',
      descAr: 'إنشاء make_zip.py وأوامر PyInstaller لتحزيم التطبيق كملف تنفيذي مستقل EXE، ودمجه مع استوديو الويب التفاعلي لتوفير تجربة فورية وتنزيل مباشر.',
      descEn: 'Building make_zip.py and PyInstaller commands, alongside the interactive full-stack web studio with direct ZIP downloads.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Overview Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'التقنيات المستخدمة في بناء تطبيق TreeForge' : 'Technologies Used in TreeForge'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'مواصفات حزمة التطوير المستخدمة في كلا الإصدارين (تطبيق سطح المكتب بلغة بايثون واستوديو الويب)'
                : 'Full architectural specification for both the Python desktop application and the web studio'}
            </p>
          </div>
        </div>

        {/* Tech Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {technologies.map((tech, idx) => {
            const Icon = tech.icon;
            return (
              <div
                key={idx}
                className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-2 hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-sm text-slate-200">{tech.name}</span>
                </div>
                <p className="text-xs font-semibold text-emerald-400/90">
                  {isAr ? tech.roleAr : tech.roleEn}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isAr ? tech.detailsAr : tech.detailsEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workflow Steps Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'خطوات العمل التفصيلية ومراحل التنفيذ' : 'Step-by-Step Implementation Workflow'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'المراحل الهندسية المتبعة لبناء التطبيق من مرحلة التخطيط وحتى التحزيم النهائي'
                : 'Chronological phases executed from requirements planning to final packaging and testing'}
            </p>
          </div>
        </div>

        {/* Steps Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflowSteps.map((step, idx) => (
            <div
              key={idx}
              className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex space-x-3.5 rtl:space-x-reverse hover:border-slate-700 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-black shrink-0 font-mono">
                {step.step}
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-200">
                  {isAr ? step.titleAr : step.titleEn}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isAr ? step.descAr : step.descEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
