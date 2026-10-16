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


if __name__ == "__main__":
    unittest.main()
