from typing import Dict, Any, Optional

try:
    from PyQt6.QtCore import QObject, pyqtSignal, QTranslator, QLibraryInfo
    from PyQt6.QtWidgets import QApplication
except ImportError:
    class QObject:
        def __init__(self, *args, **kwargs):
            pass

    def pyqtSignal(*args, **kwargs):
        class Signal:
            def connect(self, slot):
                pass
            def emit(self, *args):
                pass
        return Signal()

    class QTranslator:
        pass

    class QLibraryInfo:
        class LibraryPath:
            TranslationsPath = ""
        @staticmethod
        def path(p):
            return ""

    class QApplication:
        @staticmethod
        def instance():
            return None


TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "en": {
        # App & Navigation
        "app_name": "TreeForge",
        "app_tagline": "Turn text trees into real projects & bulk inject code",
        "nav_builder": "Tree Builder",
        "nav_content": "Content && Files",
        "nav_settings": "Settings",
        "ready": "Ready",
        "version_caption": "v1.0.0 • Desktop Suite",
        
        # Builder Page
        "builder_title": "Project Tree to Filesystem",
        "builder_desc": "Paste your project tree text below and configure generation options.",
        "tree_input_placeholder": "Paste your project tree here...\n\nTreeForgeApp/\n├── main.py\n├── config.py\n├── ui/ (main_window.py, views.py)\n└── tests/ (test_app.py)",
        "load_example": "Load example",
        "clear_input": "Clear",
        "parse_tree": "Parse & Preview Tree",
        "dest_folder": "Destination directory",
        "browse": "Browse...",
        "select_folder": "Select Destination Directory",
        "recent_folders": "Recent Folders",
        
        # Options
        "options_title": "Generation options",
        "policy_label": "Existing files policy",
        "policy_skip": "Skip — safe, never destroys data",
        "policy_skip_desc": "Safest: never touches existing files",
        "policy_overwrite": "Overwrite",
        "policy_overwrite_desc": "Replaces files that already exist",
        "policy_auto_rename": "Auto-rename",
        "policy_rename_desc": "Creates file (1).py next to the original",
        "opt_add_init": "Add __init__.py to Python packages",
        "opt_starter_content": "Starter templates",
        "opt_dry_run": "Dry-run mode (simulate without writing)",
        
        # Preview & Stats
        "preview_title": "Structure preview",
        "items_count": "{folders} folders, {files} files",
        "col_item": "Item",
        "col_type": "Type",
        "type_folder": "Folder",
        "type_file": "File",
        "build_button": "Build Project Tree",
        "building": "Forging files...",
        "cancel": "Cancel",
        "open_folder": "Open Folder",
        "copy_tree": "Copy Tree",
        "select_all": "Select all",
        "deselect_all": "Deselect all",
        
        # Content Page
        "content_title": "Content Workspace",
        "content_desc": "Save text into individual files or split multi-file batches at once.",
        "tab_single": "Single file editor",
        "tab_batch": "Batch smart splitter",
        "tab_queue": "Multi-file queue",
        "target_file": "Target File:",
        "save_file": "Save file",
        "saved_success": "File saved successfully!",
        "batch_input_placeholder": "Paste multi-file code containing markers...\n\n### main.py\nprint('Hello TreeForge!')\n\n### README.md\n# My Awesome Project\n\n### ui/styles.py\nDARK_THEME = True",
        "split_and_match": "Split & match files",
        "col_include": "Include",
        "col_target": "Target Path",
        "col_status": "Status",
        "col_lines": "Lines",
        "col_size": "Size",
        "col_marker": "Marker",
        "status_matched": "Matched",
        "status_ambiguous": "Ambiguous",
        "status_not_found": "Not Found",
        "save_selected": "Save selected files",
        "undo_batch": "Undo batch",
        "add_to_queue": "Add to queue",
        "save_queue": "Save all in queue",
        "clear_queue": "Clear queue",
        "queue_count": "{count} file(s) waiting in queue",
        "no_file_selected": "No file selected",
        "project_files": "Project files",
        
        # Splitter Options
        "opt_strip_fences": "Strip code fences (```)",
        "opt_backup": "Create .bak backup",
        "newline_mode": "Line endings:",
        "nl_keep": "Keep original",
        "nl_lf": "LF (Linux · macOS)",
        "nl_lf_desc": "Linux · macOS",
        "nl_crlf": "CRLF (Windows)",
        "nl_crlf_desc": "Windows",
        "bom_toggle": "UTF-8 with BOM",
        
        # Settings Page
        "settings_title": "Application Preferences",
        "settings_desc": "Customize the application appearance, internationalization, and default behaviors.",
        "section_appearance": "Appearance & UI",
        "theme_label": "Color theme:",
        "theme_system": "System default",
        "theme_dark": "Dark modern",
        "theme_light": "Light crisp",
        "language_label": "Display language:",
        "lang_en": "English",
        "lang_ar": "العربية",
        "section_defaults": "Default Behaviors",
        "reset_defaults": "Reset to defaults",
        "about_title": "About TreeForge",
        "about_text": "TreeForge v1.0.0 — Crafted with Python 3.11+ & PyQt6.\nDesigned for developers to bridge project scaffolding and code generation.",
        
        # Context Menus
        "undo": "Undo",
        "redo": "Redo",
        "cut": "Cut",
        "copy": "Copy",
        "paste": "Paste",
        "paste_plain": "Paste as plain text",
        "delete": "Delete",
        "insert_branch": "Insert branch symbol",
        "go_to_line": "Go to line…",
        "word_wrap": "Word wrap",
        "copy_code_block": "Copy as code block",
        "save_file_menu": "Save file",
        "add_queue_menu": "Add to queue",
        "include_branch": "Include this branch",
        "exclude_branch": "Exclude this branch",
        "expand_branch": "Expand branch",
        "collapse_branch": "Collapse branch",
        "expand_all": "Expand all",
        "collapse_all": "Collapse all",
        "copy_name": "Copy name",
        "copy_rel_path": "Copy relative path",
        "copy_full_path": "Copy full path",
        "show_in_explorer": "Show in file explorer",
        "open_in_editor": "Open in editor",
        "refresh": "Refresh",
        "include_row": "Include",
        "exclude_row": "Exclude",
        "include_matched": "Include all matched",
        "exclude_missing": "Exclude not found",
        "change_target": "Change target",
        "best_match": "Best match",
        "columns": "Columns",
        "move_up": "Move up",
        "move_down": "Move down",
        "remove": "Remove",
        "clear_recent": "Clear recent paths",
        "remove_recent": "Remove from recent",
        "copy_message": "Copy message",
        "dismiss": "Dismiss",
        "copy_workspace_path": "Copy workspace path",
        
        # Validation & Badges
        "path_invalid": "Directory does not exist",
        "path_not_writable": "Directory is not writable",
        "filter_placeholder": "Search candidate files…",
        "badge_recommended": "Recommended",
        "badge_default": "Default",
        
        # Notifications & Dialogs
        "toast_success": "Success",
        "toast_warning": "Warning",
        "toast_error": "Error",
        "toast_info": "Info",
        "toast_parsed_ok": "Parsed successfully: {folders} folders, {files} files",
        "toast_parse_err": "Found {count} syntax or validation issue(s)",
        "toast_build_ok": "Successfully created {count} item(s)!",
        "toast_dry_ok": "Dry run completed: {count} item(s) simulated",
        "toast_undo_ok": "Restored {count} file(s) from backup",
        "toast_queue_added": "Added {name} to save queue",
        "confirm_overwrite_title": "Confirm Overwrite",
        "confirm_overwrite_msg": "The following {count} file(s) will be overwritten. Proceed?",
        "btn_overwrite": "Overwrite",
        "btn_cancel": "Cancel",
        "brand_sub": "Desktop Suite",
        "close": "Close",
        "toast_theme_changed": "Theme set to {name}",
        "toast_lang_changed": "Language changed successfully",
        "toast_reset_done": "Preferences reset to defaults",
        "toast_no_project": "No project folder currently open",
        "toast_select_file": "Please select a file to save into",
        "toast_select_dest": "Please select a destination directory first",
        "toast_cancelling": "Cancelling generation...",
        "toast_loaded_dir": "Loaded directory: {name}",
        "toast_loaded_tree": "Loaded tree file: {name}",
        "toast_read_error": "Could not read file: {error}",
        "toast_save_failed": "Save failed: {error}",
        "toast_saved_queue": "Saved {count} queued files!",
        "toast_paste_first": "Please paste batch content first",
        "toast_no_valid_files": "No valid files selected for saving",
        "toast_saved_files": "Saved {count} files successfully!",
        "toast_batch_error": "Batch save error: {error}",
        "toast_build_error": "Build error: {error}",
        "toast_no_backups": "No backups available to restore",
        "toast_empty_tree": "Paste or load a project tree first",
        "empty_tree_title": "No Project Structure",
        "empty_tree_desc": "Paste a tree in the editor or load an example to preview",
        "empty_files_title": "No Project Open",
        "empty_files_desc": "Build a project tree to explore its files",
        "empty_editor_title": "No File Selected",
        "empty_editor_desc": "Select a file from the list to view and edit",
    },
    "ar": {
        # App & Navigation
        "app_name": "تري فورج (TreeForge)",
        "app_tagline": "حوّل هياكل المجلدات النصية إلى مشاريع حقيقية مع كتابة جماعية للملفات",
        "nav_builder": "منشئ المجلدات",
        "nav_content": "المحتوى والملفات",
        "nav_settings": "الإعدادات",
        "ready": "جاهز",
        "version_caption": "الإصدار 1.0.0 • حزمة سطح المكتب",
        
        # Builder Page
        "builder_title": "من الشجرة النصية إلى نظام الملفات",
        "builder_desc": "الصق هيكل المجلدات النصي هنا وحدد خيارات التوليد والبناء.",
        "tree_input_placeholder": "الصق هيكل مشروعك النصي هنا...\n\nTreeForgeApp/\n├── main.py\n├── config.py\n├── ui/ (main_window.py, views.py)\n└── tests/ (test_app.py)",
        "load_example": "تحميل نموذج",
        "clear_input": "مسح",
        "parse_tree": "تحليل ومعاينة الشجرة",
        "dest_folder": "مجلد الوجهة المستهدف",
        "browse": "استعراض...",
        "select_folder": "اختر مجلد الوجهة",
        "recent_folders": "المسارات الأخيرة",
        
        # Options
        "options_title": "خيارات التوليد والبناء",
        "policy_label": "سياسة الملفات الموجودة",
        "policy_skip": "تخطي — آمن، لا يتلف الملفات الحالية",
        "policy_skip_desc": "الأكثر أمانًا: لا يمس الملفات الموجودة إطلاقًا",
        "policy_overwrite": "استبدال",
        "policy_overwrite_desc": "يستبدل الملفات الموجودة ببيانات جديدة",
        "policy_auto_rename": "إعادة تسمية تلقائية",
        "policy_rename_desc": "ينشئ نسخة جديدة باسم مرقم بجانب الأصل",
        "opt_add_init": "إضافة __init__.py إلى حزم بايثون",
        "opt_starter_content": "قوالب أولية للملفات",
        "opt_dry_run": "وضع المعاينة الجافة (محاكاة بدون كتابة)",
        
        # Preview & Stats
        "preview_title": "شجرة المعاينة التفاعلية",
        "items_count": "{folders} مجلد، {files} ملف",
        "col_item": "العنصر",
        "col_type": "النوع",
        "type_folder": "مجلد",
        "type_file": "ملف",
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
        "tab_batch": "التقسيم الذكي للملفات",
        "tab_queue": "طابور الحفظ",
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
        "add_to_queue": "إضافة إلى الطابور",
        "save_queue": "حفظ جميع ملفات الطابور",
        "clear_queue": "تفريغ الطابور",
        "queue_count": "{count} ملف في قائمة الانتظار",
        "no_file_selected": "لم يتم اختيار أي ملف",
        "project_files": "ملفات المشروع",
        
        # Splitter Options
        "opt_strip_fences": "إزالة علامات الكود (```)",
        "opt_backup": "إنشاء نسخة احتياطية (.bak)",
        "newline_mode": "فواصل الأسطر:",
        "nl_keep": "الإبقاء على الأصل",
        "nl_lf": "فرض LF (لينكس / ماك)",
        "nl_lf_desc": "لينكس · ماك",
        "nl_crlf": "فرض CRLF (ويندوز)",
        "nl_crlf_desc": "ويندوز",
        "bom_toggle": "ترميز UTF-8 مع BOM",
        
        # Settings Page
        "settings_title": "إعدادات التطبيق وتخصيص الواجهة",
        "settings_desc": "تخصيص المظهر، واللغة، وسلوكيات البناء الافتراضية للتطبيق.",
        "section_appearance": "المظهر والواجهة",
        "theme_label": "سمة الألوان:",
        "theme_system": "تلقائي حسب النظام",
        "theme_dark": "الوضع الداكن العصري",
        "theme_light": "الوضع الفاتح المريح",
        "language_label": "لغة الواجهة:",
        "lang_en": "English",
        "lang_ar": "العربية",
        "section_defaults": "السلوكيات الافتراضية",
        "reset_defaults": "استعادة الإعدادات الافتراضية",
        "about_title": "حول تطبيق TreeForge",
        "about_text": "TreeForge الإصدار 1.0.0 — مبني باحترافية باستخدام بايثون 3.11+ و PyQt6.\nصُمم لتسريع إنشاء المشاريع وحقن الأكواد الذكية بدقة وكفاءة.",
        
        # Context Menus
        "undo": "تراجع",
        "redo": "إعادة",
        "cut": "قص",
        "copy": "نسخ",
        "paste": "لصق",
        "paste_plain": "لصق كنص عادي",
        "delete": "حذف",
        "insert_branch": "إدراج رمز فرع",
        "go_to_line": "الانتقال إلى سطر…",
        "word_wrap": "التفاف الأسطر",
        "copy_code_block": "نسخ ككتلة كود",
        "save_file_menu": "حفظ الملف",
        "add_queue_menu": "إضافة إلى الطابور",
        "include_branch": "تضمين هذا الفرع",
        "exclude_branch": "استبعاد هذا الفرع",
        "expand_branch": "توسيع الفرع",
        "collapse_branch": "طي الفرع",
        "expand_all": "توسيع الكل",
        "collapse_all": "طي الكل",
        "copy_name": "نسخ الاسم",
        "copy_rel_path": "نسخ المسار النسبي",
        "copy_full_path": "نسخ المسار الكامل",
        "show_in_explorer": "إظهار في مستكشف الملفات",
        "open_in_editor": "فتح في المحرر",
        "refresh": "تحديث",
        "include_row": "تضمين",
        "exclude_row": "استبعاد",
        "include_matched": "تضمين كل المتطابق",
        "exclude_missing": "استبعاد غير الموجود",
        "change_target": "تغيير المسار المستهدف",
        "best_match": "الأفضل تطابقًا",
        "columns": "الأعمدة",
        "move_up": "نقل لأعلى",
        "move_down": "نقل لأسفل",
        "remove": "إزالة",
        "clear_recent": "مسح المسارات الأخيرة",
        "remove_recent": "إزالة من الأخيرة",
        "copy_message": "نسخ الرسالة",
        "dismiss": "إغلاق",
        "copy_workspace_path": "نسخ مسار مساحة العمل",
        
        # Validation & Badges
        "path_invalid": "المجلد غير موجود على القرص",
        "path_not_writable": "تعذر الكتابة في هذا المجلد",
        "filter_placeholder": "ابحث في الملفات المرشحة…",
        "badge_recommended": "موصى به",
        "badge_default": "افتراضي",
        
        # Notifications & Dialogs
        "toast_success": "نجاح",
        "toast_warning": "تنبيه",
        "toast_error": "خطأ",
        "toast_info": "معلومة",
        "toast_parsed_ok": "تم التحليل بنجاح: {folders} مجلد، {files} ملف",
        "toast_parse_err": "تم اكتشاف {count} خطأ في بناء الجملة أو التسميات",
        "toast_build_ok": "تم إنشاء {count} عنصر بنجاح على القرص!",
        "toast_dry_ok": "اكتملت المحاكاة: تمت تجربة {count} عنصر بنجاح",
        "toast_undo_ok": "تمت استعادة {count} ملف بنجاح من النسخ الاحتياطية",
        "toast_queue_added": "تمت إضافة {name} إلى طابور الحفظ",
        "confirm_overwrite_title": "تأكيد الاستبدال",
        "confirm_overwrite_msg": "سيتم استبدال محتويات {count} ملف(ات). هل تريد المتابعة؟",
        "btn_overwrite": "استبدال",
        "btn_cancel": "إلغاء",
        "brand_sub": "حزمة سطح المكتب",
        "close": "إغلاق",
        "toast_theme_changed": "تم تغيير المظهر إلى {name}",
        "toast_lang_changed": "تم تغيير لغة الواجهة بنجاح",
        "toast_reset_done": "تمت استعادة الإعدادات الافتراضية",
        "toast_no_project": "لا يوجد مجلد مشروع مفتوح حالياً",
        "toast_select_file": "يرجى تحديد ملف لحفظه أولاً",
        "toast_select_dest": "يرجى تحديد مجلد الوجهة أولاً",
        "toast_cancelling": "جارٍ إلغاء عملية البناء...",
        "toast_loaded_dir": "تم تحميل المجلد: {name}",
        "toast_loaded_tree": "تم تحميل ملف الشجرة: {name}",
        "toast_read_error": "تعذرت قراءة الملف: {error}",
        "toast_save_failed": "فشل حفظ الملف: {error}",
        "toast_saved_queue": "تم حفظ {count} ملف من الطابور بنجاح!",
        "toast_paste_first": "يرجى لصق محتوى الحزمة أولاً",
        "toast_no_valid_files": "لم يتم تحديد أي ملفات صالحة للحفظ",
        "toast_saved_files": "تم حفظ {count} ملف بنجاح!",
        "toast_batch_error": "خطأ أثناء الحفظ المجمع: {error}",
        "toast_build_error": "خطأ أثناء بناء المشروع: {error}",
        "toast_no_backups": "لا توجد نسخ احتياطية متاحة للاستعادة",
        "toast_empty_tree": "الصق شجرة المشروع أولاً",
        "empty_tree_title": "لا يوجد هيكل للمشروع",
        "empty_tree_desc": "الصق شجرة في المحرر أو حمّل نموذجاً للمعاينة",
        "empty_files_title": "لا يوجد مشروع مفتوح",
        "empty_files_desc": "قم ببناء شجرة مشروع لاستعراض ملفاته",
        "empty_editor_title": "لم يتم تحديد أي ملف",
        "empty_editor_desc": "اختر ملفاً من القائمة لعرضه وتحريره",
    }
}


class I18nService(QObject):
    """Manages application language state, standard Qt translations, and RTL layout."""

    language_changed = pyqtSignal(str)

    def __init__(self, default_lang: str = "en"):
        super().__init__()
        self._current_lang = default_lang if default_lang in TRANSLATIONS else "en"
        self._qt_translator: Optional[QTranslator] = None

    @property
    def translations(self) -> Dict[str, Dict[str, str]]:
        """Return the dictionary of available translations."""
        return TRANSLATIONS

    @property
    def current_language(self) -> str:
        return self._current_lang

    def set_language(self, lang_code: str) -> None:
        if lang_code in TRANSLATIONS and lang_code != self._current_lang:
            self._current_lang = lang_code
            self._install_qt_translations(lang_code)
            self.language_changed.emit(lang_code)

    def _install_qt_translations(self, lang_code: str) -> None:
        """Attempt to load native Qt translation files for dialogs and buttons."""
        app = QApplication.instance()
        if not app:
            return

        if self._qt_translator:
            try:
                app.removeTranslator(self._qt_translator)
            except Exception:
                pass

        try:
            self._qt_translator = QTranslator(app)
            trans_path = QLibraryInfo.path(QLibraryInfo.LibraryPath.TranslationsPath)
            qm_name = f"qtbase_{lang_code}"
            if self._qt_translator.load(qm_name, trans_path):
                app.installTranslator(self._qt_translator)
        except Exception:
            # Fallback gracefully if standard QM files are unavailable in environment
            pass

    def t(self, key: str, default: Optional[str] = None, **kwargs: Any) -> str:
        """Translate key into current language with optional string interpolation."""
        strings = TRANSLATIONS.get(self._current_lang, TRANSLATIONS["en"])
        fallback = default if default is not None else TRANSLATIONS["en"].get(key, key)
        val = strings.get(key, fallback)
        if kwargs:
            try:
                return val.format(**kwargs)
            except Exception:
                return val
        return val

    def is_rtl(self) -> bool:
        return self._current_lang == "ar"

    def isolate_ltr(self, text: str) -> str:
        """Wrap text in Unicode LTR directional isolate so it won't break in RTL."""
        return f"\u2066{text}\u2069"


# Global singleton instance
i18n = I18nService()
