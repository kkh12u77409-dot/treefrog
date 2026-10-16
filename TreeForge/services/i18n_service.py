"""Internationalization service for TreeForge.

Provides instant runtime language switching between English and Arabic with full RTL support.
"""

from typing import Dict, Any, Optional
from PyQt6.QtCore import QObject, pyqtSignal


TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "en": {
        # App & Navigation
        "app_name": "TreeForge",
        "app_tagline": "Turn text trees into real projects & bulk inject code",
        "nav_builder": "Tree Builder",
        "nav_content": "Content & Files",
        "nav_settings": "Settings",
        
        # Builder Page
        "builder_title": "Project Tree to Filesystem",
        "builder_desc": "Paste your project tree text below and configure generation options.",
        "tree_input_placeholder": "Paste your project tree here...\n\nSumMaster/\n├── main.py\n├── requirements.txt\n├── README.md\n├── ui/ (main_window.py, styles.py)\n└── tests/ (test_app.py)",
        "load_example": "Load Example Tree",
        "clear_input": "Clear",
        "parse_tree": "Parse & Preview Tree",
        "dest_folder": "Destination Directory",
        "browse": "Browse...",
        "select_folder": "Select Destination Directory",
        "recent_folders": "Recent Folders",
        
        # Options
        "options_title": "Generation Options",
        "policy_label": "Existing Files Policy:",
        "policy_skip": "Skip (Safe, never destroy)",
        "policy_overwrite": "Overwrite (Replace existing)",
        "policy_auto_rename": "Auto-rename (file (1).py)",
        "opt_add_init": "Add __init__.py to Python packages",
        "opt_starter_content": "Create starter templates (.py, .md, .gitignore)",
        "opt_dry_run": "Dry-run mode (Simulate without writing)",
        
        # Preview & Stats
        "preview_title": "Structure Preview",
        "items_count": "{folders} Folders, {files} Files",
        "build_button": "Build Project Tree",
        "building": "Forging files...",
        "cancel": "Cancel",
        "open_folder": "Open Folder",
        "copy_tree": "Copy Tree",
        "select_all": "Select All",
        "deselect_all": "Deselect All",
        
        # Content Page
        "content_title": "Content Workspace",
        "content_desc": "Save text into individual files or split multi-file batches at once.",
        "tab_single": "Single File Editor",
        "tab_batch": "Batch Smart Splitter",
        "tab_queue": "Multi-File Queue",
        "target_file": "Target File:",
        "save_file": "Save File (Ctrl+S)",
        "saved_success": "File saved successfully!",
        "batch_input_placeholder": "Paste multi-file code containing markers...\n\n### main.py\nprint('Hello TreeForge!')\n\n### README.md\n# My Awesome Project\n\n### ui/styles.py\nDARK_THEME = True",
        "split_and_match": "Split & Match Files",
        "col_include": "Include",
        "col_target": "Target Path",
        "col_status": "Status",
        "col_lines": "Lines",
        "col_size": "Size",
        "col_marker": "Marker",
        "status_matched": "Matched",
        "status_ambiguous": "Ambiguous",
        "status_not_found": "Not Found",
        "save_selected": "Save Selected Files",
        "undo_batch": "Undo Last Batch",
        "add_to_queue": "Add to Queue",
        "save_queue": "Save All in Queue",
        "clear_queue": "Clear Queue",
        "queue_count": "{count} file(s) waiting in queue",
        
        # Splitter Options
        "opt_strip_fences": "Strip surrounding code fences (```)",
        "opt_backup": "Create .bak backup before overwrite",
        "newline_mode": "Line Endings:",
        "nl_keep": "Keep Original",
        "nl_lf": "Force LF (Linux / macOS)",
        "nl_crlf": "Force CRLF (Windows)",
        "bom_toggle": "UTF-8 with BOM",
        
        # Settings Page
        "settings_title": "Application Preferences",
        "section_appearance": "Appearance & UI",
        "theme_label": "Color Theme:",
        "theme_system": "System Default",
        "theme_dark": "Dark Modern",
        "theme_light": "Light Crisp",
        "language_label": "Display Language:",
        "lang_en": "English",
        "lang_ar": "العربية (Arabic)",
        "section_defaults": "Default Behaviors",
        "reset_defaults": "Reset to Defaults",
        "about_title": "About TreeForge",
        "about_text": "TreeForge v1.0.0 — Crafted with Python 3.11+ & PyQt6.\nDesigned for developers to bridge project scaffolding and code generation.",
        
        # Notifications & Dialogs
        "toast_parsed_ok": "Parsed successfully: {folders} folders, {files} files",
        "toast_parse_err": "Found {count} syntax or validation issue(s)",
        "toast_build_ok": "Successfully created {count} item(s)!",
        "toast_dry_ok": "Dry run completed: {count} item(s) simulated",
        "toast_undo_ok": "Restored {count} file(s) from backup",
        "toast_queue_added": "Added {name} to save queue",
        "confirm_overwrite_title": "Confirm Overwrite",
        "confirm_overwrite_msg": "The following {count} file(s) will be overwritten. Proceed?",
    },
    "ar": {
        # App & Navigation
        "app_name": "تري فورج (TreeForge)",
        "app_tagline": "حوّل هياكل المجلدات النصية إلى مشاريع حقيقية مع كتابة جماعية للملفات",
        "nav_builder": "منشئ المجلدات",
        "nav_content": "محرر المحتوى وحقن الأكواد",
        "nav_settings": "الإعدادات",
        
        # Builder Page
        "builder_title": "من الشجرة النصية إلى نظام الملفات",
        "builder_desc": "الصق هيكل المجلدات النصي هنا وحدد خيارات التوليد والبناء.",
        "tree_input_placeholder": "الصق هيكل مشروعك النصي هنا...\n\nSumMaster/\n├── main.py\n├── requirements.txt\n├── README.md\n├── ui/ (main_window.py, styles.py)\n└── tests/ (test_app.py)",
        "load_example": "تحميل شجرة نموذجية",
        "clear_input": "مسح",
        "parse_tree": "تحليل ومعاينة الشجرة",
        "dest_folder": "مجلد الوجهة المستهدف",
        "browse": "استعراض...",
        "select_folder": "اختر مجلد الوجهة",
        "recent_folders": "المسارات الأخيرة",
        
        # Options
        "options_title": "خيارات البناء والتوليد",
        "policy_label": "سياسة الملفات الموجودة:",
        "policy_skip": "تخطي (آمن، لا يحذف البيانات)",
        "policy_overwrite": "استبدال (الكتابة فوق الملف)",
        "policy_auto_rename": "إعادة تسمية تلقائية (file (1).py)",
        "opt_add_init": "إضافة __init__.py إلى حزم بايثون",
        "opt_starter_content": "توليد قوالب أولية للملفات (.py, .md, .gitignore)",
        "opt_dry_run": "وضع المعاينة الجافة (محاكاة بدون كتابة على القرص)",
        
        # Preview & Stats
        "preview_title": "المعاينة التفاعلية للشجرة",
        "items_count": "{folders} مجلد، {files} ملف",
        "build_button": "بناء هيكل المشروع الآن",
        "building": "جارٍ إنشاء الملفات والمجلدات...",
        "cancel": "إلغاء",
        "open_folder": "فتح المجلد",
        "copy_tree": "نسخ الشجرة",
        "select_all": "تحديد الكل",
        "deselect_all": "إلغاء تحديد الكل",
        
        # Content Page
        "content_title": "مساحة حقن وإدارة المحتوى",
        "content_desc": "احفظ الأكواد في ملفات محددة أو قسّم النصوص الكبيرة لملفات متعددة بضغطة واحدة.",
        "tab_single": "محرر الملف الفردي",
        "tab_batch": "التقسيم الذكي للملفات المجمعة",
        "tab_queue": "طابور الحفظ المتعدد",
        "target_file": "الملف المستهدف:",
        "save_file": "حفظ الملف (Ctrl+S)",
        "saved_success": "تم حفظ الملف بنجاح!",
        "batch_input_placeholder": "الصق نصوصاً مجمعة تحتوي على علامات الملفات...\n\n### main.py\nprint('أهلاً بك في TreeForge!')\n\n### README.md\n# مشروعي الجديد\n\n### ui/styles.py\nDARK_THEME = True",
        "split_and_match": "تقسيم ومطابقة الملفات",
        "col_include": "تضمين",
        "col_target": "المسار المستهدف",
        "col_status": "حالة التطابق",
        "col_lines": "الأسطر",
        "col_size": "الحجم",
        "col_marker": "العلامة",
        "status_matched": "متطابق",
        "status_ambiguous": "متعدد الاحتمالات",
        "status_not_found": "غير موجود",
        "save_selected": "حفظ الملفات المحددة دفعة واحدة",
        "undo_batch": "تراجع عن الحزمة السابقة",
        "add_to_queue": "إضافة إلى طابور الحفظ",
        "save_queue": "حفظ جميع ملفات الطابور",
        "clear_queue": "تفريغ الطابور",
        "queue_count": "{count} ملف في قائمة الانتظار",
        
        # Splitter Options
        "opt_strip_fences": "إزالة علامات الكود البرمجي (```)",
        "opt_backup": "إنشاء نسخة احتياطية (.bak) قبل الاستبدال",
        "newline_mode": "فواصل الأسطر:",
        "nl_keep": "الإبقاء على الأصل",
        "nl_lf": "فرض LF (لينكس / ماك)",
        "nl_crlf": "فرض CRLF (ويندوز)",
        "bom_toggle": "ترميز UTF-8 مع BOM",
        
        # Settings Page
        "settings_title": "إعدادات التطبيق وتخصيص الواجهة",
        "section_appearance": "المظهر والواجهة",
        "theme_label": "سمة الألوان:",
        "theme_system": "تلقائي حسب النظام",
        "theme_dark": "الوضع الداكن العصري",
        "theme_light": "الوضع الفاتح المريح",
        "language_label": "لغة الواجهة:",
        "lang_en": "الإنجليزية (English)",
        "lang_ar": "العربية",
        "section_defaults": "السلوكيات الافتراضية",
        "reset_defaults": "استعادة الإعدادات الافتراضية",
        "about_title": "حول تطبيق TreeForge",
        "about_text": "TreeForge الإصدار 1.0.0 — مبني باحترافية باستخدام بايثون 3.11+ و PyQt6.\nصُمم لتسريع إنشاء المشاريع وحقن الأكواد الذكية بدقة وكفاءة.",
        
        # Notifications & Dialogs
        "toast_parsed_ok": "تم التحليل بنجاح: {folders} مجلد، {files} ملف",
        "toast_parse_err": "تم اكتشاف {count} خطأ في بناء الجملة أو التسميات",
        "toast_build_ok": "تم إنشاء {count} عنصر بنجاح على القرص!",
        "toast_dry_ok": "اكتملت المحاكاة: تمت تجربة {count} عنصر بنجاح",
        "toast_undo_ok": "تمت استعادة {count} ملف بنجاح من النسخ الاحتياطية",
        "toast_queue_added": "تمت إضافة {name} إلى طابور الحفظ",
        "confirm_overwrite_title": "تأكيد الاستبدال",
        "confirm_overwrite_msg": "سيتم استبدال محتويات {count} ملف(ات). هل تريد المتابعة؟",
    }
}


class I18nService(QObject):
    """Manages application language state and dynamic UI string translation."""

    language_changed = pyqtSignal(str)

    def __init__(self, default_lang: str = "en"):
        super().__init__()
        self._current_lang = default_lang if default_lang in TRANSLATIONS else "en"

    @property
    def current_language(self) -> str:
        return self._current_lang

    def set_language(self, lang_code: str) -> None:
        if lang_code in TRANSLATIONS and lang_code != self._current_lang:
            self._current_lang = lang_code
            self.language_changed.emit(lang_code)

    def t(self, key: str, **kwargs: Any) -> str:
        """Translate key into current language with optional string interpolation."""
        strings = TRANSLATIONS.get(self._current_lang, TRANSLATIONS["en"])
        val = strings.get(key, TRANSLATIONS["en"].get(key, key))
        if kwargs:
            try:
                return val.format(**kwargs)
            except Exception:
                return val
        return val

    def is_rtl(self) -> bool:
        return self._current_lang == "ar"


# Global singleton instance
i18n = I18nService()
