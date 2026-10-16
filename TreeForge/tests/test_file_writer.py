"""Test suite for TreeForge file_writer."""

import unittest
import tempfile
import shutil
from pathlib import Path
from TreeForge.core.file_writer import FileWriter
from TreeForge.core.models import ItemPolicy, NewlineMode


class TestFileWriter(unittest.TestCase):

    def setUp(self):
        self.test_dir = Path(tempfile.mkdtemp(prefix="treeforge_test_"))

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_atomic_write(self):
        writer = FileWriter(policy=ItemPolicy.OVERWRITE)
        target = self.test_dir / "subdir" / "test_file.py"
        success, msg, final_path = writer.write_file(target, "print('hello atomic')")
        self.assertTrue(success)
        self.assertTrue(target.exists())
        self.assertEqual(target.read_text(encoding="utf-8"), "print('hello atomic')")

    def test_backup_and_undo(self):
        writer = FileWriter(policy=ItemPolicy.OVERWRITE, create_backups=True)
        target = self.test_dir / "data.txt"
        target.write_text("original content", encoding="utf-8")

        # Overwrite with new content
        success, msg, _ = writer.write_file(target, "updated content")
        self.assertTrue(success)
        self.assertEqual(target.read_text(encoding="utf-8"), "updated content")

        # Undo
        restored, errors = writer.undo_last_batch()
        self.assertEqual(restored, 1)
        self.assertEqual(target.read_text(encoding="utf-8"), "original content")

    def test_skip_policy(self):
        writer = FileWriter(policy=ItemPolicy.SKIP)
        target = self.test_dir / "keep_me.txt"
        target.write_text("do not touch", encoding="utf-8")

        success, msg, _ = writer.write_file(target, "try to overwrite")
        self.assertFalse(success)
        self.assertEqual(target.read_text(encoding="utf-8"), "do not touch")

    def test_auto_rename_policy(self):
        writer = FileWriter(policy=ItemPolicy.AUTO_RENAME)
        target = self.test_dir / "report.md"
        target.write_text("v1", encoding="utf-8")

        success, msg, final_path = writer.write_file(target, "v2")
        self.assertTrue(success)
        self.assertNotEqual(target, final_path)
        self.assertTrue(final_path.name.startswith("report (1)"))
        self.assertEqual(final_path.read_text(encoding="utf-8"), "v2")
        self.assertEqual(target.read_text(encoding="utf-8"), "v1")


if __name__ == "__main__":
    unittest.main()
