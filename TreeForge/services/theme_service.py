"""Theme and styling tokens service for TreeForge.

Provides unified color palettes, dynamic QSS generation, and SVG icon management
for both Dark and Light modes.
"""

from typing import Dict, Any, Optional
from PyQt6.QtCore import QObject, pyqtSignal, Qt
from PyQt6.QtGui import QPalette, QColor, QIcon, QPixmap
from PyQt6.QtWidgets import QApplication


DARK_PALETTE = {
    "bg_window": "#111827",
    "bg_card": "#1f2937",
    "bg_elevated": "#283548",
    "bg_input": "#182232",
    "border": "#374151",
    "border_focus": "#10b981",
    "accent": "#10b981",
    "accent_hover": "#059669",
    "accent_pressed": "#047857",
    "text_primary": "#f9fafb",
    "text_secondary": "#9ca3af",
    "text_muted": "#6b7280",
    "success": "#10b981",
    "warning": "#f59e0b",
    "error": "#ef4444",
    "code_bg": "#0f172a",
    "code_line_num": "#475569",
    "code_current_line": "#1e293b",
}

LIGHT_PALETTE = {
    "bg_window": "#f8fafc",
    "bg_card": "#ffffff",
    "bg_elevated": "#f1f5f9",
    "bg_input": "#ffffff",
    "border": "#e2e8f0",
    "border_focus": "#059669",
    "accent": "#059669",
    "accent_hover": "#047857",
    "accent_pressed": "#065f46",
    "text_primary": "#0f172a",
    "text_secondary": "#475569",
    "text_muted": "#94a3b8",
    "success": "#10b981",
    "warning": "#d97706",
    "error": "#dc2626",
    "code_bg": "#f8fafc",
    "code_line_num": "#94a3b8",
    "code_current_line": "#e2e8f0",
}


SVG_ICONS = {
    "builder": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>""",
    "content": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>""",
    "settings": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>""",
    "folder": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>""",
    "file": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>""",
    "python": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 9 5-5-5-5"/><path d="m14 15-5 5 5 5"/></svg>""",
    "play": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>""",
    "save": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>""",
    "check": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>""",
    "alert": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>""",
    "undo": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>""",
}


class ThemeService(QObject):
    """Central styling and theme management."""

    theme_changed = pyqtSignal(str)

    def __init__(self, initial_theme: str = "dark"):
        super().__init__()
        self._current_theme = initial_theme

    @property
    def current_theme(self) -> str:
        return self._current_theme

    @property
    def palette(self) -> Dict[str, str]:
        return DARK_PALETTE if self._current_theme == "dark" else LIGHT_PALETTE

    def set_theme(self, theme_name: str) -> None:
        if theme_name in ("dark", "light"):
            self._current_theme = theme_name
            self.apply_theme()
            self.theme_changed.emit(theme_name)

    def get_icon(self, icon_name: str, color_override: Optional[str] = None) -> QIcon:
        """Create a theme-aware recolored QIcon from SVG."""
        color = color_override or self.palette["accent"]
        svg_template = SVG_ICONS.get(icon_name, SVG_ICONS["file"])
        svg_data = svg_template.replace("{color}", color).encode("utf-8")
        
        pixmap = QPixmap()
        pixmap.loadFromData(svg_data, "SVG")
        return QIcon(pixmap)

    def apply_theme(self) -> None:
        """Apply Qt palette and custom stylesheet across the whole application."""
        app = QApplication.instance()
        if not app:
            return

        p = self.palette
        # Build QSS
        qss = f"""
        * {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", "Noto Sans Arabic", Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            color: {p["text_primary"]};
        }}
        QMainWindow, QWidget#centralWidget {{
            background-color: {p["bg_window"]};
        }}
        QWidget#sidebar {{
            background-color: {p["bg_card"]};
            border-right: 1px solid {p["border"]};
        }}
        QFrame.card {{
            background-color: {p["bg_card"]};
            border: 1px solid {p["border"]};
            border-radius: 10px;
        }}
        QPushButton {{
            background-color: {p["bg_elevated"]};
            color: {p["text_primary"]};
            border: 1px solid {p["border"]};
            border-radius: 6px;
            padding: 8px 16px;
            font-weight: 500;
        }}
        QPushButton:hover {{
            background-color: {p["border"]};
            border-color: {p["border_focus"]};
        }}
        QPushButton:pressed {{
            background-color: {p["accent_pressed"]};
        }}
        QPushButton.primary {{
            background-color: {p["accent"]};
            color: #ffffff;
            border: none;
            font-weight: 600;
        }}
        QPushButton.primary:hover {{
            background-color: {p["accent_hover"]};
        }}
        QPushButton.primary:pressed {{
            background-color: {p["accent_pressed"]};
        }}
        QLineEdit, QTextEdit, QPlainTextEdit, QComboBox {{
            background-color: {p["bg_input"]};
            border: 1px solid {p["border"]};
            border-radius: 6px;
            padding: 6px 10px;
            color: {p["text_primary"]};
            selection-background-color: {p["accent"]};
            selection-color: #ffffff;
        }}
        QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus, QComboBox:focus {{
            border: 1px solid {p["border_focus"]};
        }}
        QTreeView, QTableWidget {{
            background-color: {p["bg_card"]};
            border: 1px solid {p["border"]};
            border-radius: 8px;
            alternate-background-color: {p["bg_elevated"]};
            gridline-color: {p["border"]};
        }}
        QHeaderView::section {{
            background-color: {p["bg_elevated"]};
            color: {p["text_secondary"]};
            padding: 6px 10px;
            border: none;
            border-bottom: 1px solid {p["border"]};
            font-weight: 600;
        }}
        QProgressBar {{
            background-color: {p["bg_elevated"]};
            border-radius: 4px;
            text-align: center;
            height: 10px;
        }}
        QProgressBar::chunk {{
            background-color: {p["accent"]};
            border-radius: 4px;
        }}
        QCheckBox {{
            spacing: 8px;
        }}
        QCheckBox::indicator {{
            width: 18px;
            height: 18px;
            border-radius: 4px;
            border: 1px solid {p["border"]};
            background-color: {p["bg_input"]};
        }}
        QCheckBox::indicator:checked {{
            background-color: {p["accent"]};
            border-color: {p["accent"]};
        }}
        QSplitter::handle {{
            background-color: {p["border"]};
        }}
        QScrollBar:vertical {{
            border: none;
            background: transparent;
            width: 8px;
        }}
        QScrollBar::handle:vertical {{
            background: {p["border"]};
            min-height: 20px;
            border-radius: 4px;
        }}
        QScrollBar::handle:vertical:hover {{
            background: {p["accent"]};
        }}
        """
        app.setStyleSheet(qss)


theme = ThemeService()
