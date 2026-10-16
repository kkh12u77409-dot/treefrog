"""Theme and styling tokens service for TreeForge.

Provides unified WCAG contrast checked design tokens, modular QSS generation,
system color scheme synchronization, and Windows dark mode window chrome.
"""

import sys
from typing import Dict, Any, Optional
from PyQt6.QtCore import QObject, pyqtSignal, Qt
from PyQt6.QtGui import QPalette, QColor, QFont, QGuiApplication
from PyQt6.QtWidgets import QApplication, QWidget

from .theme_tokens import DARK_TOKENS, LIGHT_TOKENS, get_theme_tokens, METRICS


def set_variant(widget: QWidget, variant: str) -> None:
    """Set dynamic variant property on widget and trigger QSS restyling."""
    widget.setProperty("variant", variant)
    style = widget.style()
    if style:
        style.unpolish(widget)
        style.polish(widget)
    widget.update()


class ThemeService(QObject):
    """Central styling and theme management."""

    theme_changed = pyqtSignal(str)

    def __init__(self, initial_theme: str = "dark"):
        super().__init__()
        self._user_preference = initial_theme  # 'system', 'dark', 'light'
        self._resolved_theme = "dark" if initial_theme == "dark" else "light"
        
        # Connect to system color scheme if supported
        try:
            hints = QGuiApplication.styleHints()
            if hints and hasattr(hints, "colorSchemeChanged"):
                hints.colorSchemeChanged.connect(self._on_system_scheme_changed)
        except Exception:
            pass

    @property
    def current_theme(self) -> str:
        return self._resolved_theme

    @property
    def user_preference(self) -> str:
        return self._user_preference

    @property
    def palette(self) -> Dict[str, str]:
        return get_theme_tokens(self._resolved_theme)

    def set_theme(self, theme_choice: str) -> None:
        """Set theme preference: 'system', 'dark', or 'light'."""
        self._user_preference = theme_choice
        resolved = self._resolve_theme(theme_choice)
        self._resolved_theme = resolved
        self.apply_theme()
        
        # Clear icon service cache so all icons recolor
        try:
            from .icon_service import icon_service
            icon_service.clear()
        except Exception:
            pass

        self.theme_changed.emit(resolved)

    def _resolve_theme(self, choice: str) -> str:
        if choice in ("dark", "light"):
            return choice
        # System detection
        try:
            hints = QGuiApplication.styleHints()
            if hints and hasattr(hints, "colorScheme"):
                scheme = hints.colorScheme()
                if scheme == Qt.ColorScheme.Dark:
                    return "dark"
                elif scheme == Qt.ColorScheme.Light:
                    return "light"
        except Exception:
            pass
        return "dark"

    def _on_system_scheme_changed(self) -> None:
        if self._user_preference == "system":
            self.set_theme("system")

    def apply_titlebar_theme(self, window: QWidget) -> None:
        """Apply Windows 10/11 immersive dark title bar via ctypes DwmSetWindowAttribute."""
        if sys.platform != "win32":
            return
        try:
            import ctypes
            from ctypes import wintypes
            hwnd = int(window.winId())
            DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1 = 19
            DWMWA_USE_IMMERSIVE_DARK_MODE = 20
            DWMWA_CAPTION_COLOR = 35
            
            is_dark = (self._resolved_theme == "dark")
            value = ctypes.c_int(1 if is_dark else 0)

            # Try modern attribute 20, fallback to 19
            res = ctypes.windll.dwmapi.DwmSetWindowAttribute(
                hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, ctypes.byref(value), ctypes.sizeof(value)
            )
            if res != 0:
                ctypes.windll.dwmapi.DwmSetWindowAttribute(
                    hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1, ctypes.byref(value), ctypes.sizeof(value)
                )

            # Caption color on Windows 11
            if is_dark:
                color_ref = 0x0020120B  # BGR for #0b1220
                color_val = ctypes.c_ulong(color_ref)
                ctypes.windll.dwmapi.DwmSetWindowAttribute(
                    hwnd, DWMWA_CAPTION_COLOR, ctypes.byref(color_val), ctypes.sizeof(color_val)
                )
        except Exception:
            pass

    def apply_theme(self) -> None:
        """Apply Qt typography, palette, and generated modular QSS."""
        app = QApplication.instance()
        if not app:
            return

        tokens = self.palette
        m = METRICS

        # Set default application font
        default_font = QFont("Segoe UI Variable", 10)
        default_font.setStyleHint(QFont.StyleHint.SansSerif)
        app.setFont(default_font)

        # Build comprehensive modular QSS without global '*' overrides
        qss = f"""
        /* === 1. BASE WINDOW & WIDGETS === */
        QMainWindow, QWidget#centralWidget {{
            background-color: {tokens["bg_window"]};
            color: {tokens["text_primary"]};
        }}

        QWidget {{
            color: {tokens["text_primary"]};
        }}

        /* === 2. TYPOGRAPHIC ROLES === */
        #pageTitle {{
            font-size: 20px;
            font-weight: 700;
            color: {tokens["text_primary"]};
            padding: 0;
            margin: 0;
        }}

        #pageSubtitle {{
            font-size: 13px;
            color: {tokens["text_secondary"]};
            padding: 0;
            margin-top: 2px;
        }}

        #sectionTitle {{
            font-size: 14px;
            font-weight: 600;
            color: {tokens["text_primary"]};
        }}

        #caption {{
            font-size: 12px;
            color: {tokens["text_muted"]};
        }}

        #statLabel {{
            font-size: 13px;
            font-weight: 600;
            color: {tokens["accent_text"]};
        }}

        #brandTitle {{
            font-size: 18px;
            font-weight: 800;
            color: {tokens["text_primary"]};
        }}

        #brandSub {{
            font-size: 11px;
            color: {tokens["text_muted"]};
        }}

        /* === 3. SIDEBAR NAVIGATION === */
        QWidget#sidebar {{
            background-color: {tokens["bg_sidebar"]};
            border-right: 1px solid {tokens["border"]};
        }}

        QPushButton[nav="true"] {{
            background-color: transparent;
            color: {tokens["text_secondary"]};
            border: none;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 500;
            text-align: left;
        }}

        QPushButton[nav="true"]:hover {{
            background-color: {tokens["bg_elevated"]};
            color: {tokens["text_primary"]};
        }}

        QPushButton[nav="true"]:checked {{
            background-color: {tokens["accent_soft"]};
            color: {tokens["accent_text"]};
            font-weight: 600;
            border-left: 3px solid {tokens["accent_solid"]};
        }}

        QPushButton[nav="true"]:focus-visible {{
            border: 2px solid {tokens["border_focus"]};
        }}

        /* === 4. CARDS & PANELS === */
        QFrame[card="true"] {{
            background-color: {tokens["bg_card"]};
            border: 1px solid {tokens["border"]};
            border-radius: {m["radius_card"]}px;
        }}

        #optionsBox {{
            background-color: {tokens["bg_elevated"]};
            border: 1px solid {tokens["border"]};
            border-radius: {m["radius_control"]}px;
            padding: 12px;
        }}

        /* === 5. BUTTONS === */
        QPushButton {{
            background-color: {tokens["bg_elevated"]};
            color: {tokens["text_primary"]};
            border: 1px solid {tokens["border"]};
            border-radius: {m["radius_control"]}px;
            padding: 8px 16px;
            font-weight: 500;
            font-size: 13px;
            min-height: 20px;
        }}

        QPushButton:hover {{
            background-color: {tokens["border"]};
            border-color: {tokens["border_input"]};
            color: {tokens["text_primary"]};
        }}

        QPushButton:pressed {{
            background-color: {tokens["bg_input"]};
        }}

        QPushButton:disabled {{
            opacity: 0.45;
            color: {tokens["text_muted"]};
            background-color: {tokens["bg_elevated"]};
            border-color: {tokens["border"]};
        }}

        QPushButton:focus-visible {{
            border: 2px solid {tokens["border_focus"]};
        }}

        QPushButton[variant="primary"],
        QPushButton#btnSaveSingle,
        QPushButton#btnBuild,
        QPushButton#btnParseBatch,
        QPushButton#btnSaveBatch,
        QPushButton#btnSaveQueue {{
            background-color: {tokens["accent_solid"]};
            color: #ffffff;
            border: 1px solid {tokens["accent_hover"] if self._resolved_theme == "dark" else tokens["accent_solid"]};
            border-radius: {m["radius_control"]}px;
            padding: 8px 20px;
            font-weight: 600;
            font-size: 13px;
            min-height: 22px;
        }}

        QPushButton[variant="primary"]:hover,
        QPushButton#btnSaveSingle:hover,
        QPushButton#btnBuild:hover,
        QPushButton#btnParseBatch:hover,
        QPushButton#btnSaveBatch:hover,
        QPushButton#btnSaveQueue:hover {{
            background-color: {tokens["accent_hover"]};
            border-color: {tokens["accent_text"] if self._resolved_theme == "dark" else tokens["accent_hover"]};
            color: #ffffff;
        }}

        QPushButton[variant="primary"]:pressed,
        QPushButton#btnSaveSingle:pressed,
        QPushButton#btnBuild:pressed,
        QPushButton#btnParseBatch:pressed,
        QPushButton#btnSaveBatch:pressed,
        QPushButton#btnSaveQueue:pressed {{
            background-color: {tokens["accent_pressed"]};
            border-color: {tokens["accent_pressed"]};
            color: #ffffff;
        }}

        QPushButton[variant="primary"]:disabled,
        QPushButton#btnSaveSingle:disabled,
        QPushButton#btnBuild:disabled,
        QPushButton#btnParseBatch:disabled,
        QPushButton#btnSaveBatch:disabled,
        QPushButton#btnSaveQueue:disabled {{
            background-color: {tokens["border"]};
            border-color: {tokens["border"]};
            color: {tokens["text_muted"]};
        }}

        QPushButton[variant="ghost"] {{
            background-color: transparent;
            border: 1px solid transparent;
            color: {tokens["text_secondary"]};
        }}

        QPushButton[variant="ghost"]:hover {{
            background-color: {tokens["bg_elevated"]};
            color: {tokens["text_primary"]};
            border-color: {tokens["border"]};
        }}

        QPushButton[variant="danger"] {{
            background-color: transparent;
            color: {tokens["error"]};
            border: 1px solid {tokens["border"]};
        }}

        QPushButton[variant="danger"]:hover {{
            background-color: {tokens["error"]};
            color: #ffffff;
            border-color: {tokens["error"]};
        }}

        /* === 6. INPUTS & TEXT EDITS === */
        QLineEdit, QTextEdit, QPlainTextEdit {{
            background-color: {tokens["bg_input"]};
            border: 1px solid {tokens["border_input"]};
            border-radius: {m["radius_control"]}px;
            padding: 8px 12px;
            color: {tokens["text_primary"]};
            selection-background-color: {tokens["accent_solid"]};
            selection-color: {tokens["on_accent"]};
            font-size: 13px;
        }}

        QLineEdit:hover, QTextEdit:hover, QPlainTextEdit:hover {{
            border-color: {tokens["text_secondary"]};
        }}

        QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus {{
            border: 2px solid {tokens["border_focus"]};
            padding: 7px 11px;
        }}

        /* === 7. COMBOBOXES === */
        QComboBox {{
            background-color: {tokens["bg_input"]};
            border: 1px solid {tokens["border_input"]};
            border-radius: {m["radius_control"]}px;
            padding: 6px 12px;
            color: {tokens["text_primary"]};
            min-height: 22px;
            font-size: 13px;
        }}

        QComboBox:hover {{
            border-color: {tokens["text_secondary"]};
        }}

        QComboBox:focus {{
            border: 2px solid {tokens["border_focus"]};
        }}

        QComboBox::drop-down {{
            border: none;
            width: 28px;
            background: transparent;
        }}

        QComboBox QAbstractItemView {{
            background-color: {tokens["bg_card"]};
            border: 1px solid {tokens["border"]};
            border-radius: {m["radius_control"]}px;
            selection-background-color: {tokens["accent_soft"]};
            selection-color: {tokens["accent_text"]};
            color: {tokens["text_primary"]};
            padding: 4px;
            outline: none;
        }}

        /* === 8. CHECKBOXES (SWITCH & SQUARE) === */
        QCheckBox {{
            spacing: 8px;
            font-size: 13px;
            color: {tokens["text_primary"]};
        }}

        QCheckBox::indicator {{
            width: 18px;
            height: 18px;
            border-radius: 4px;
            border: 1.5px solid {tokens["border_input"]};
            background-color: {tokens["bg_input"]};
        }}

        QCheckBox::indicator:hover {{
            border-color: {tokens["border_focus"]};
        }}

        QCheckBox::indicator:checked {{
            background-color: {tokens["accent_solid"]};
            border-color: {tokens["accent_solid"]};
            image: none;
        }}

        /* === 9. TABS (UNDERLINE & PILL) === */
        QTabWidget::pane {{
            background-color: {tokens["bg_card"]};
            border: 1px solid {tokens["border"]};
            border-radius: {m["radius_card"]}px;
            top: -1px;
        }}

        QTabBar::tab {{
            background-color: transparent;
            color: {tokens["text_secondary"]};
            border: none;
            border-bottom: 2px solid transparent;
            padding: 8px 18px;
            font-weight: 500;
            font-size: 13px;
            min-height: 22px;
        }}

        QTabBar::tab:hover {{
            color: {tokens["text_primary"]};
            background-color: {tokens["bg_elevated"]};
            border-radius: 6px 6px 0 0;
        }}

        QTabBar::tab:selected {{
            color: {tokens["accent_text"]};
            border-bottom: 2px solid {tokens["accent_solid"]};
            font-weight: 600;
        }}

        /* === 10. TREES & TABLES === */
        QTreeView, QTreeWidget, QTableWidget {{
            background-color: {tokens["bg_card"]};
            border: 1px solid {tokens["border"]};
            border-radius: {m["radius_control"]}px;
            alternate-background-color: {tokens["bg_elevated"]};
            gridline-color: {tokens["border"]};
            color: {tokens["text_primary"]};
            outline: none;
        }}

        QTreeView::item, QTableWidget::item {{
            height: 32px;
            padding: 2px 8px;
            border-radius: 4px;
        }}

        QTreeView::item:hover, QTableWidget::item:hover {{
            background-color: {tokens["bg_elevated"]};
            color: {tokens["text_primary"]};
        }}

        QTreeView::item:selected, QTableWidget::item:selected {{
            background-color: {tokens["accent_soft"]};
            color: {tokens["accent_text"]};
            font-weight: 600;
        }}

        QHeaderView::section {{
            background-color: {tokens["bg_elevated"]};
            color: {tokens["text_secondary"]};
            padding: 6px 10px;
            border: none;
            border-bottom: 1px solid {tokens["border"]};
            font-weight: 600;
            font-size: 12px;
        }}

        /* === 11. SCROLLBARS === */
        QScrollBar:vertical {{
            border: none;
            background: transparent;
            width: 10px;
            margin: 0px;
        }}

        QScrollBar::handle:vertical {{
            background: {tokens["border"]};
            min-height: 24px;
            border-radius: 5px;
        }}

        QScrollBar::handle:vertical:hover {{
            background: {tokens["accent_solid"]};
        }}

        QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
            height: 0px;
            background: transparent;
        }}

        QScrollBar:horizontal {{
            border: none;
            background: transparent;
            height: 10px;
            margin: 0px;
        }}

        QScrollBar::handle:horizontal {{
            background: {tokens["border"]};
            min-width: 24px;
            border-radius: 5px;
        }}

        QScrollBar::handle:horizontal:hover {{
            background: {tokens["accent_solid"]};
        }}

        QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{
            width: 0px;
            background: transparent;
        }}

        /* === 12. SPLITTER === */
        QSplitter::handle {{
            background-color: transparent;
        }}

        QSplitter::handle:hover {{
            background-color: {tokens["accent_solid"]};
        }}

        /* === 13. PROGRESS BAR === */
        QProgressBar {{
            background-color: {tokens["bg_elevated"]};
            border: 1px solid {tokens["border"]};
            border-radius: 4px;
            text-align: center;
            height: 8px;
            font-size: 10px;
        }}

        QProgressBar::chunk {{
            background-color: {tokens["accent_solid"]};
            border-radius: 3px;
        }}

        /* === 14. STATUS BAR === */
        QStatusBar {{
            background-color: {tokens["bg_window"]};
            border-top: 1px solid {tokens["border"]};
            color: {tokens["text_secondary"]};
            font-size: 12px;
            padding: 2px 10px;
        }}

        /* === 15. TOOLTIPS === */
        QToolTip {{
            background-color: {tokens["bg_card"]};
            border: 1px solid {tokens["border"]};
            border-radius: 8px;
            color: {tokens["text_primary"]};
            padding: 6px 10px;
            font-size: 12px;
        }}
        """
        app.setStyleSheet(qss)


# Global singleton instance
theme = ThemeService()
