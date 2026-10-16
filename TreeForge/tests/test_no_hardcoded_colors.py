"""Verification test asserting that no hardcoded hex or rgb literals exist in TreeForge/ui/*.py."""

import re
import unittest
from pathlib import Path


class TestNoHardcodedColors(unittest.TestCase):
    """Enforces zero hardcoded color literals across all UI files."""

    def test_ui_files_free_of_hardcoded_hex_colors(self):
        ui_dir = Path(__file__).resolve().parent.parent / "ui"
        self.assertTrue(ui_dir.exists(), "UI directory does not exist")

        # Regex detecting #rgb, #rrggbb, #rrggbbaa (excluding comments)
        hex_pattern = re.compile(r"""["']#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})["']""")
        rgb_pattern = re.compile(r"""["']rgba?\([^)]+\)["']""")

        violations = []

        for py_file in ui_dir.rglob("*.py"):
            lines = py_file.read_text(encoding="utf-8").splitlines()
            for line_no, line in enumerate(lines, 1):
                clean_line = line.strip()
                # Skip comments and docstrings
                if clean_line.startswith("#") or clean_line.startswith('"""') or clean_line.startswith("'''"):
                    continue

                if hex_pattern.search(line):
                    violations.append(f"{py_file.name}:{line_no} contains hex color literal: {clean_line}")
                elif rgb_pattern.search(line):
                    violations.append(f"{py_file.name}:{line_no} contains rgb literal: {clean_line}")

        self.assertEqual(
            len(violations), 0,
            f"Found {len(violations)} hardcoded color violation(s) in ui/:\n" + "\n".join(violations)
        )


if __name__ == "__main__":
    unittest.main()
