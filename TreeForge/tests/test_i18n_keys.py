"""Internationalization key completeness and en/ar parity tests."""

import unittest
from TreeForge.services.i18n_service import TRANSLATIONS


class TestI18nKeys(unittest.TestCase):
    """Verifies that English and Arabic language translation dictionaries have full parity."""

    REQUIRED_CONTEXT_MENU_KEYS = [
        "undo", "redo", "cut", "copy", "paste", "paste_plain", "delete",
        "select_all", "insert_branch", "go_to_line", "word_wrap", "copy_code_block",
        "save_file_menu", "add_queue_menu", "include_branch", "exclude_branch",
        "expand_branch", "collapse_branch", "expand_all", "collapse_all",
        "copy_name", "copy_rel_path", "copy_full_path", "show_in_explorer",
        "open_in_editor", "refresh", "include_row", "exclude_row",
        "include_matched", "exclude_missing", "change_target", "best_match",
        "columns", "move_up", "move_down", "remove", "clear_recent",
        "remove_recent", "copy_message", "dismiss", "copy_workspace_path"
    ]

    def test_en_ar_parity(self):
        en_keys = set(TRANSLATIONS["en"].keys())
        ar_keys = set(TRANSLATIONS["ar"].keys())

        missing_in_ar = en_keys - ar_keys
        missing_in_en = ar_keys - en_keys

        self.assertEqual(len(missing_in_ar), 0, f"Keys present in EN but missing in AR: {missing_in_ar}")
        self.assertEqual(len(missing_in_en), 0, f"Keys present in AR but missing in EN: {missing_in_en}")

    def test_required_context_menu_keys_exist(self):
        for lang in ("en", "ar"):
            for key in self.REQUIRED_CONTEXT_MENU_KEYS:
                self.assertIn(
                    key, TRANSLATIONS[lang],
                    f"Required key '{key}' is missing in '{lang}' translation dictionary"
                )
                self.assertTrue(
                    len(TRANSLATIONS[lang][key].strip()) > 0,
                    f"Key '{key}' in '{lang}' has empty translation"
                )


if __name__ == "__main__":
    unittest.main()
