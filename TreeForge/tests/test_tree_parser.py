"""Comprehensive test suite for TreeForge tree_parser."""

import unittest
from TreeForge.core.tree_parser import TreeParser, calculate_depth_and_content, validate_name_segment


class TestTreeParser(unittest.TestCase):

    def setUp(self):
        self.parser = TreeParser(default_root_name="TestApp")

    def test_box_drawing_parsing(self):
        tree_text = """SumMaster/
├── main.py
├── requirements.txt
├── README.md
├── assets/icons/
├── ui/  (main_window.py, spinner.py, styles.py)
├── core/ (calculator.py, worker.py)
└── tests/ (test_calculator.py, test_worker.py)"""

        result = self.parser.parse(tree_text)
        self.assertEqual(len(result.errors), 0, f"Errors: {[e.message for e in result.errors]}")
        self.assertIsNotNone(result.root)
        self.assertEqual(result.root.name, "SumMaster")

        # Check inline group items created
        ui_node = result.root.find_node_by_path("SumMaster/ui")
        self.assertIsNotNone(ui_node)
        self.assertTrue(ui_node.is_dir)
        ui_child_names = [c.name for c in ui_node.children]
        self.assertIn("main_window.py", ui_child_names)
        self.assertIn("spinner.py", ui_child_names)
        self.assertIn("styles.py", ui_child_names)

        # Check nested path
        icons_node = result.root.find_node_by_path("SumMaster/assets/icons")
        self.assertIsNotNone(icons_node)
        self.assertTrue(icons_node.is_dir)

    def test_ascii_and_indentation_parsing(self):
        tree_text = """MyProject/
|-- src/
|   |-- index.py
|   `-- utils.py
`-- docs/
    `-- index.md"""

        result = self.parser.parse(tree_text)
        self.assertEqual(len(result.errors), 0)
        self.assertIsNotNone(result.root)
        src_node = result.root.find_node_by_path("MyProject/src")
        self.assertIsNotNone(src_node)
        self.assertEqual(len(src_node.children), 2)

    def test_path_traversal_rejection(self):
        malicious = """HackerProject/
├── normal.py
├── ../../etc/passwd
└── innocent/"""

        result = self.parser.parse(malicious)
        self.assertTrue(any("forbidden" in e.message.lower() or "traversal" in e.message.lower() for e in result.errors))

    def test_illegal_windows_characters_and_reserved_names(self):
        invalid_tree = """WinTest/
├── file<with>brackets.py
├── CON.txt
└── test?.py"""

        result = self.parser.parse(invalid_tree)
        self.assertGreaterEqual(len(result.errors), 2)

    def test_unicode_and_arabic_names(self):
        arabic_tree = """المشروع_البرمجي/
├── الرئيسية.py
├── المساعد/ (أداة1.py, أداة2.py)
└── توثيق.md"""

        result = self.parser.parse(arabic_tree)
        self.assertEqual(len(result.errors), 0)
        self.assertEqual(result.root.name, "المشروع_البرمجي")
        helper_node = result.root.find_node_by_path("المشروع_البرمجي/المساعد")
        self.assertIsNotNone(helper_node)
        self.assertEqual(len(helper_node.children), 2)

    def test_extensionless_and_dotfiles(self):
        tree_text = """Repo/
├── .gitignore
├── .env.example
├── Dockerfile
├── Makefile
└── LICENSE"""

        result = self.parser.parse(tree_text)
        self.assertEqual(len(result.errors), 0)
        file_names = [f.name for f in result.root.get_all_files()]
        self.assertIn(".gitignore", file_names)
        self.assertIn("Dockerfile", file_names)
        self.assertIn("LICENSE", file_names)


if __name__ == "__main__":
    unittest.main()
