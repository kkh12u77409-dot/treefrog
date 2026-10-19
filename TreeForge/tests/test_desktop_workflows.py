"""Real Qt regression tests. Run with QT_QPA_PLATFORM=offscreen on CI."""
import os
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
try:
    from PyQt6.QtWidgets import QApplication, QMessageBox
    from TreeForge.ui.content_page import ContentPage
    from TreeForge.ui.builder_page import BuilderPage
    from TreeForge.core.models import FileChunk, MatchStatus
    QT_ERROR = None
except ImportError as error:
    if os.environ.get("TREEFORGE_REQUIRE_QT") == "true":
        raise
    QT_ERROR = str(error)


@unittest.skipIf(QT_ERROR is not None, f'Qt runtime unavailable: {QT_ERROR}')
class TestDesktopWorkflows(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication.instance() or QApplication([])

    def test_batch_refresh_preserves_undo(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'main.py'
            target.write_text('original')
            page = ContentPage()
            try:
                page.load_tree_from_disk(directory)
                page.chunks = [FileChunk('one', 'main.py', 'main.py', 'changed', MatchStatus.MATCHED)]
                with patch.object(QMessageBox, 'question', return_value=QMessageBox.StandardButton.Yes):
                    page._save_selected_batch()
                self.assertTrue(page.worker.wait(5000))
                self.app.processEvents()
                self.assertEqual(target.read_text(), 'changed')
                page._undo_batch()
                self.assertEqual(target.read_text(), 'original')
            finally:
                page.close()

    def test_unsafe_tree_cannot_enable_build(self):
        page = BuilderPage()
        try:
            page.tree_input.setPlainText('App/\n└── CON.txt')
            self.assertFalse(page.btn_build.isEnabled())
        finally:
            page.close()

    @unittest.skipIf(os.name == 'nt', 'Symlink privileges differ on Windows')
    def test_disk_tree_skips_symlink_cycles(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'cycle').symlink_to(root, target_is_directory=True)
            (root / 'main.py').write_text('')
            page = ContentPage()
            try:
                page.load_tree_from_disk(directory)
                self.assertEqual(page.tree_files, ['main.py'])
            finally:
                page.close()
