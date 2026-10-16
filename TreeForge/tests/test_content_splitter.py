"""Test suite for TreeForge content_splitter."""

import unittest
from TreeForge.core.content_splitter import ContentSplitter, strip_code_fences
from TreeForge.core.models import MatchStatus


class TestContentSplitter(unittest.TestCase):

    def setUp(self):
        self.splitter = ContentSplitter(strip_fences=True)

    def test_marker_types_extraction(self):
        multi_text = """### main.py
print("main code")

=== config/settings.json ===
{
  "theme": "dark"
}

--- docs/guide.md ---
# User Guide

// FILE: ui/styles.py
BUTTON_COLOR = "#10b981"

# FILE: core/engine.py
class Engine:
    pass
"""

        chunks = self.splitter.split(multi_text)
        self.assertEqual(len(chunks), 5)
        self.assertEqual(chunks[0].raw_target_path, "main.py")
        self.assertIn('print("main code")', chunks[0].content)

        self.assertEqual(chunks[1].raw_target_path, "config/settings.json")
        self.assertEqual(chunks[2].raw_target_path, "docs/guide.md")
        self.assertEqual(chunks[3].raw_target_path, "ui/styles.py")
        self.assertEqual(chunks[4].raw_target_path, "core/engine.py")

    def test_fence_stripping(self):
        raw_code = "```python\ndef test():\n    return 42\n```"
        stripped = strip_code_fences(raw_code)
        self.assertEqual(stripped, "def test():\n    return 42")

    def test_fuzzy_matching_to_tree_files(self):
        candidate_paths = [
            "SumMaster/main.py",
            "SumMaster/ui/main_window.py",
            "SumMaster/ui/styles.py",
            "SumMaster/core/calculator.py",
            "SumMaster/services/settings_service.py"
        ]

        text = """### calculator.py
def add(a, b): return a + b

### styles.py
PRIMARY = '#fff'

### ui/main_window.py
class Window: pass
"""

        chunks = self.splitter.split(text, available_paths=candidate_paths)
        self.assertEqual(len(chunks), 3)

        # Unique filename match: calculator.py -> SumMaster/core/calculator.py
        self.assertEqual(chunks[0].match_status, MatchStatus.MATCHED)
        self.assertEqual(chunks[0].resolved_path, "SumMaster/core/calculator.py")

        # Unique filename match: styles.py -> SumMaster/ui/styles.py
        self.assertEqual(chunks[1].match_status, MatchStatus.MATCHED)
        self.assertEqual(chunks[1].resolved_path, "SumMaster/ui/styles.py")

        # Exact relative match
        self.assertEqual(chunks[2].match_status, MatchStatus.MATCHED)
        self.assertEqual(chunks[2].resolved_path, "SumMaster/ui/main_window.py")


if __name__ == "__main__":
    unittest.main()
