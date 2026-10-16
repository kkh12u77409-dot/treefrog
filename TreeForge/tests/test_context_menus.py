"""Context menu action structure and localization tests."""

import unittest
from TreeForge.services.i18n_service import TRANSLATIONS, i18n


class TestContextMenus(unittest.TestCase):
    """Verifies that all context menu actions are mapped to valid localized strings."""

    ACTIONS_CHECKLIST = [
        ("undo", "Undo", "تراجع"),
        ("redo", "Redo", "إعادة"),
        ("cut", "Cut", "قص"),
        ("copy", "Copy", "نسخ"),
        ("paste", "Paste", "لصق"),
        ("paste_plain", "Paste as plain text", "لصق كنص عادي"),
        ("delete", "Delete", "حذف"),
        ("select_all", "Select all", "تحديد الكل"),
        ("insert_branch", "Insert branch symbol", "إدراج رمز فرع"),
        ("go_to_line", "Go to line…", "الانتقال إلى سطر…"),
        ("word_wrap", "Word wrap", "التفاف الأسطر"),
        ("copy_code_block", "Copy as code block", "نسخ ككتلة كود"),
        ("save_file_menu", "Save file", "حفظ الملف"),
        ("add_queue_menu", "Add to queue", "إضافة إلى الطابور"),
        ("include_branch", "Include this branch", "تضمين هذا الفرع"),
        ("exclude_branch", "Exclude this branch", "استبعاد هذا الفرع"),
        ("expand_all", "Expand all", "توسيع الكل"),
        ("collapse_all", "Collapse all", "طي الكل"),
        ("copy_name", "Copy name", "نسخ الاسم"),
        ("copy_rel_path", "Copy relative path", "نسخ المسار النسبي"),
        ("copy_full_path", "Copy full path", "نسخ المسار الكامل"),
        ("show_in_explorer", "Show in file explorer", "إظهار في مستكشف الملفات"),
        ("open_in_editor", "Open in editor", "فتح في المحرر"),
        ("refresh", "Refresh", "تحديث"),
        ("include_row", "Include", "تضمين"),
        ("exclude_row", "Exclude", "استبعاد"),
        ("include_matched", "Include all matched", "تضمين كل المتطابق"),
        ("exclude_missing", "Exclude not found", "استبعاد غير الموجود"),
        ("change_target", "Change target", "تغيير المسار المستهدف"),
        ("best_match", "Best match", "الأفضل تطابقًا"),
        ("clear_recent", "Clear recent paths", "مسح المسارات الأخيرة"),
        ("remove_recent", "Remove from recent", "إزالة من الأخيرة"),
    ]

    def test_context_menu_translations(self):
        for key, en_expected, ar_expected in self.ACTIONS_CHECKLIST:
            i18n.set_language("en")
            self.assertEqual(i18n.t(key), en_expected, f"English text mismatch for {key}")

            i18n.set_language("ar")
            self.assertEqual(i18n.t(key), ar_expected, f"Arabic text mismatch for {key}")

    def test_bidi_isolate_helper(self):
        isolated = i18n.isolate_ltr("Ctrl+Shift+V")
        self.assertTrue(isolated.startswith("\u2066"))
        self.assertTrue(isolated.endswith("\u2069"))


if __name__ == "__main__":
    unittest.main()
