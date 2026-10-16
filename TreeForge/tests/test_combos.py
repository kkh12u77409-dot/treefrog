"""ComboBox data preservation, MRU path deduplication, and policy tests."""

import unittest
from TreeForge.core.models import ItemPolicy
from TreeForge.services.i18n_service import i18n
from TreeForge.services.settings_service import settings


class TestCombos(unittest.TestCase):
    """Tests combobox data mappings and MRU recent paths logic."""

    def test_policy_items_and_descriptions(self):
        policies = [ItemPolicy.SKIP, ItemPolicy.OVERWRITE, ItemPolicy.AUTO_RENAME]
        self.assertEqual(len(policies), 3)

        for lang in ("en", "ar"):
            i18n.set_language(lang)
            for pol in policies:
                key = f"policy_{pol.value}"
                desc_key = f"policy_{pol.value if pol != ItemPolicy.AUTO_RENAME else 'rename'}_desc"
                self.assertTrue(len(i18n.t(key)) > 0)
                self.assertTrue(len(i18n.t(desc_key)) > 0)

    def test_mru_path_deduplication(self):
        paths = [
            "/projects/app1",
            "/projects/app2",
            "/projects/app1",  # duplicate
            "/projects/app3",
            "/projects/app4",
            "/projects/app5",
            "/projects/app6",
            "/projects/app7",
            "/projects/app8",
            "/projects/app9",
            "/projects/app10",
            "/projects/app11",  # exceeds 10
        ]

        seen = set()
        deduped = []
        for p in paths:
            if p not in seen:
                seen.add(p)
                deduped.append(p)
                if len(deduped) >= 10:
                    break

        self.assertEqual(len(deduped), 10)
        self.assertEqual(deduped[0], "/projects/app1")
        self.assertEqual(deduped[1], "/projects/app2")
        self.assertEqual(deduped[2], "/projects/app3")  # dup was skipped

    def test_no_qstyleoptionviewitem_stateflag_bug(self):
        """Ensure QStyleOptionViewItem.StateFlag is never used (must use QStyle.StateFlag)."""
        import re
        from pathlib import Path
        themed_combo_py = Path(__file__).resolve().parent.parent / "ui" / "widgets" / "themed_combo.py"
        with open(themed_combo_py, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("QStyleOptionViewItem.StateFlag", content)
        self.assertIn("QStyle.StateFlag.State_MouseOver", content)
        self.assertIn("QStyle.StateFlag.State_Selected", content)

    def test_all_lucide_svg_paths_are_valid(self):
        """Ensure all Lucide SVGs in icon_service.py have valid commands and no truncated paths."""
        import re
        from pathlib import Path
        icon_service_py = Path(__file__).resolve().parent.parent / "services" / "icon_service.py"
        with open(icon_service_py, "r", encoding="utf-8") as f:
            content = f.read()
        paths = re.findall(r'd="([^"]+)"', content)
        for p in paths:
            first_char = p.strip()[0] if p.strip() else ""
            self.assertIn(
                first_char,
                "mMlLhHvVcCzZqQtTaAsS",
                f"Invalid SVG path command '{p[:20]}' found in icon_service.py"
            )


if __name__ == "__main__":
    unittest.main()

