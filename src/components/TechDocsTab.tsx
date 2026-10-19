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
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
            <Cpu className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'التقنيات المستخدمة في بناء تطبيق TreeForge' : 'Technologies Used in TreeForge'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
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
                className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 space-y-2 hover:border-emerald-400 dark:hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-200">{tech.name}</span>
                </div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {isAr ? tech.roleAr : tech.roleEn}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isAr ? tech.detailsAr : tech.detailsEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Design System & Accessibility Matrix */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold shrink-0">
            <Palette className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'نظام التصميم، رموز الألوان، ومطابقة معايير WCAG 2.1' : 'Design Tokens & WCAG 2.1 Accessibility Matrix'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isAr
                ? 'جدول الألوان المعتمد بدون أي لون ثابت في ملفات الواجهة مع التحقق التلقائي من التباين'
                : 'Zero hardcoded colors across all UI files; strict token-driven QSS and WCAG AA contrast compliance'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                <th className="py-2.5 px-3">Design Token</th>
                <th className="py-2.5 px-3">Dark Palette</th>
                <th className="py-2.5 px-3">Light Palette</th>
                <th className="py-2.5 px-3">Contrast Ratio</th>
                <th className="py-2.5 px-3">Standard Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-700 dark:text-emerald-400">bg_window</td>
                <td className="py-2 px-3">#0b1220</td>
                <td className="py-2 px-3">#f3f5f9</td>
                <td className="py-2 px-3">—</td>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400">Root Window Chrome</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-700 dark:text-emerald-400">bg_card / bg_sidebar</td>
                <td className="py-2 px-3">#131c2e / #0f172a</td>
                <td className="py-2 px-3">#ffffff / #ffffff</td>
                <td className="py-2 px-3">—</td>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400">Surface Cards & Nav</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-700 dark:text-emerald-400">text_primary on bg_card</td>
                <td className="py-2 px-3">#e6edf7</td>
                <td className="py-2 px-3">#0f172a</td>
                <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400 font-bold">&gt; 12.5 : 1</td>
                <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400">WCAG AAA Pass</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-700 dark:text-emerald-400">text_muted on bg_card</td>
                <td className="py-2 px-3">#8494ab</td>
                <td className="py-2 px-3">#64748b</td>
                <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400 font-bold">&gt; 4.5 : 1</td>
                <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400">WCAG AA Pass</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-700 dark:text-emerald-400">on_accent on accent_solid</td>
                <td className="py-2 px-3">#04261b on #10b981</td>
                <td className="py-2 px-3">#ffffff on #047857</td>
                <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400 font-bold">&gt; 5.2 : 1</td>
                <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400">WCAG AA Pass (Fixed D5/L6)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-700 dark:text-emerald-400">border_input on bg_input</td>
                <td className="py-2 px-3">#5a6a85 on #0f1726</td>
                <td className="py-2 px-3">#8695aa on #ffffff</td>
                <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400 font-bold">&gt; 3.0 : 1</td>
                <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400">Non-text UI Component Pass</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Defect Resolutions & Upgrades Directory */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'سجل معالجة العيوب والتحسينات المكتملة' : 'Defect Resolutions & Modernization Log'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isAr
                ? 'فهرس شامل لجميع العيوب المعالجة في الواجهة وقوائم كليك يمين والقوائم المنسدلة'
                : 'Mapping of defect IDs (L1-L11, D1-D8, T1-T2, I1-I4, M1-M7, C1-C10) to implemented components'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            { id: 'M1-M7', title: 'Context Menus Overhaul', file: 'ui/widgets/themed_menu.py + ui/context_menus.py', desc: 'Bespoke rounded translucent card menus with soft shadow, bidirectional shortcuts, and rich per-widget action sets.' },
            { id: 'C1-C10', title: 'Themed Dropdowns Upgrade', file: 'ui/widgets/themed_combo.py', desc: 'Custom ComboItemDelegate with descriptions, badge chips, checkmarks, wheel prevention, and PathComboBox validation.' },
            { id: 'L1 & I1', title: 'Dynamic Section Headers', file: 'ui/styles.py (SectionHeader)', desc: 'Replaced hardcoded title colors with SectionHeader supporting live retranslation without losing container handles.' },
            { id: 'L2', title: 'Builder Soft Panel', file: 'ui/builder_page.py (#optionsBox)', desc: 'Replaced dark slab background with themed bg_elevated soft panel, 12px radius, and switch-style toggles.' },
            { id: 'L3 & D6', title: 'Theme-Aware Code Editor', file: 'ui/code_editor.py', desc: 'Gutter, current line, and syntax highlighter driven dynamically by code_* and syn_* theme tokens.' },
            { id: 'L4 & D1', title: 'Modern Tabs & Card Panes', file: 'services/theme_service.py', desc: 'Modern underline/pill tabs with accent indicator, card pane background, and full RTL mirroring.' },
            { id: 'L7 & L8', title: 'Crisp Checkboxes & Scrollbars', file: 'services/theme_service.py', desc: 'Themed vector check indicators and clean 10px scrollbars with hidden arrow buttons and rounded thumb handles.' },
            { id: 'D3', title: 'Windows 10/11 Title Bar Chrome', file: 'services/theme_service.py', desc: 'Implemented DwmSetWindowAttribute via ctypes for immersive dark title bar and caption matching.' },
            { id: 'D4', title: 'Stackable Semantic Toasts', file: 'ui/toast.py (ToastManager)', desc: 'Card notification with semantic 4px edge, status icons, soft shadow, hover pause, and bottom-end stacking.' },
            { id: 'T1 & T2', title: 'Lucide Icon System & Zero Hex', file: 'services/icon_service.py + theme_tokens.py', desc: 'Dynamic recolored SVG icons via QSvgRenderer, IconBinder, and 100% elimination of hex literals in ui/.' },
            { id: 'I2', title: 'Self-Labelled Language Selector', file: 'ui/settings_page.py', desc: 'Always shows English and العربية with EN / ع badge chips; added System default theme mode.' },
            { id: 'I3 & I4', title: 'True RTL Polish & 960x640 Min', file: 'ui/main_window.py', desc: 'Complete layout mirroring while keeping code editors and file paths strictly LTR for ergonomic readability.' }
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                  {item.id}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[130px]">{item.file}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">{item.title}</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
