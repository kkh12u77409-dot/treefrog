"""Comprehensive unit tests for ToastManager, placement, stacking, and deduplication."""

import sys
import unittest
try:
    from PyQt6.QtCore import Qt, QSize, QPoint, QEvent
    from PyQt6.QtGui import QResizeEvent
    from PyQt6.QtWidgets import QApplication, QWidget
    from TreeForge.ui.toast import ToastManager, show_toast, ToastCard

    PYQT6_AVAILABLE = True
    PYQT6_IMPORT_ERROR = None
except (ImportError, Exception) as exc:
    PYQT6_AVAILABLE = False
    PYQT6_IMPORT_ERROR = str(exc)


# Ensure single offscreen QApplication if PyQt6 loaded successfully
if PYQT6_AVAILABLE:
    app = QApplication.instance()
    if not app:
        app = QApplication(sys.argv)


@unittest.skipUnless(
    PYQT6_AVAILABLE,
    f"PyQt6 GUI is not available or DLL failed to load ({PYQT6_IMPORT_ERROR}). "
    "Note: PyQt6 binaries support Python 3.8 to 3.13 (Python 3.11 or 3.12 recommended; Python 3.14 is unsupported). "
    "On Windows, ensure Microsoft Visual C++ 2015-2022 Redistributable (x64) is installed."
)
class TestToastManager(unittest.TestCase):
    """Verifies ToastCard positioning, stacking, deduplication, and window bounds."""

    def setUp(self):
        self.window = QWidget()
        self.window.resize(1180, 780)
        self.window.show()
        self.manager = ToastManager.instance()
        # Clear any leftover toasts
        for t in list(self.manager._active_toasts):
            t.hide()
            t.deleteLater()
        self.manager._active_toasts.clear()

    def tearDown(self):
        for t in list(self.manager._active_toasts):
            t.hide()
            t.deleteLater()
        self.manager._active_toasts.clear()
        self.window.close()

    def test_toast_centered_and_bottom_margin(self):
        """Verify toast is horizontally centered (|center - win_w/2| <= 1px) and bottom edge is win_h - 28."""
        toast = show_toast(self.window, "Testing alignment", "success")
        self.assertIsNotNone(toast)
        if hasattr(toast, "enter_anim_pos"):
            toast.enter_anim_pos.setCurrentTime(220)
        if hasattr(toast, "_repos_anim"):
            toast._repos_anim.setCurrentTime(180)

        win_w = self.window.width()
        win_h = self.window.height()
        tw = toast.width()
        th = toast.height()
        tx = toast.x()
        ty = toast.y()

        center_offset = abs((tx + tw / 2.0) - (win_w / 2.0))
        self.assertLessEqual(
            center_offset, 1.0,
            f"Toast is not horizontally centered: offset {center_offset} > 1px"
        )

        bottom_edge = ty + th
        expected_bottom = win_h - 28
        self.assertEqual(
            bottom_edge, expected_bottom,
            f"Toast bottom edge {bottom_edge} does not match expected {expected_bottom}"
        )

    def test_toast_small_window_bounds_800x600(self):
        """Verify toast never exceeds window boundaries in small 800x600 windows."""
        self.window.resize(800, 600)
        toast = show_toast(
            self.window,
            "A lengthy notification message designed to verify responsive card wrapping within small viewports",
            "info"
        )
        self.assertIsNotNone(toast)
        self.manager._reposition_all(self.window)
        if hasattr(toast, "enter_anim_pos"):
            toast.enter_anim_pos.setCurrentTime(220)

        tw = toast.width()
        th = toast.height()
        tx = toast.x()
        ty = toast.y()

        self.assertLessEqual(tw, self.window.width() - 48, "Toast width exceeds window.width() - 48")
        self.assertGreaterEqual(tx, 0, "Toast left edge extends outside window")
        self.assertLessEqual(tx + tw, self.window.width(), "Toast right edge extends outside window")
        self.assertLessEqual(ty + th, self.window.height(), "Toast bottom edge extends outside window")

    def test_toast_deduplication(self):
        """Verify identical type+text requests increment counter instead of stacking duplicates."""
        t1 = show_toast(self.window, "Operation executed", "warning")
        self.assertIsNotNone(t1)
        self.assertEqual(t1.count, 1)

        t2 = show_toast(self.window, "Operation executed", "warning")
        # Returns the same instance
        self.assertEqual(t1, t2)
        self.assertEqual(t1.count, 2)
        self.assertFalse(t1.lbl_count.isHidden())
        self.assertEqual(t1.lbl_count.text(), "×2")

        # Total active toasts should still be 1
        active = [t for t in self.manager._active_toasts if not t.is_exiting]
        self.assertEqual(len(active), 1)

    def test_toast_max_3_cards_stack(self):
        """Verify that at most 3 non-exiting cards are shown simultaneously."""
        t1 = show_toast(self.window, "Message 1", "info")
        t2 = show_toast(self.window, "Message 2", "info")
        t3 = show_toast(self.window, "Message 3", "info")
        t4 = show_toast(self.window, "Message 4", "info")

        visible = [t for t in self.manager._active_toasts if not t.is_exiting]
        self.assertLessEqual(len(visible), 3, f"More than 3 visible cards found: {len(visible)}")
        self.assertTrue(t1.is_exiting or t1 not in visible, "Oldest toast was not dismissed when 4th arrived")

    def test_toast_reposition_on_window_resize(self):
        """Verify toasts smoothly reposition and stay centered after window resize."""
        self.window.resize(1000, 700)
        toast = show_toast(self.window, "Resize test notification", "error")
        self.manager._reposition_all(self.window)
        if hasattr(toast, "enter_anim_pos"):
            toast.enter_anim_pos.setCurrentTime(220)

        # Trigger window resize
        self.window.resize(1200, 800)
        resize_event = QResizeEvent(QSize(1200, 800), QSize(1000, 700))
        self.manager.eventFilter(self.window, resize_event)
        self.manager._reposition_all(self.window)
        if hasattr(toast, "_repos_anim") and toast._repos_anim:
            toast._repos_anim.setCurrentTime(180)

        new_w = self.window.width()
        new_h = self.window.height()
        tw = toast.width()
        th = toast.height()
        tx = toast.x()
        ty = toast.y()

        center_offset = abs((tx + tw / 2.0) - (new_w / 2.0))
        self.assertLessEqual(center_offset, 1.0, f"Toast not centered after resize: {center_offset}")
        self.assertEqual(ty + th, new_h - 28, f"Toast not at bottom margin after resize: {ty + th} != {new_h - 28}")


if __name__ == "__main__":
    unittest.main()
