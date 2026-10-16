"""Modern centered floating toast notifications with distinctive styling,
semantic accents, soft drop shadow, stack manager, and pause-on-hover for TreeForge.
"""

from typing import Optional, List
from PyQt6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, QRect
from PyQt6.QtGui import QColor, QFont, QPainter, QPainterPath, QPen
from PyQt6.QtWidgets import (
    QWidget, QLabel, QHBoxLayout, QVBoxLayout, QPushButton,
    QGraphicsDropShadowEffect, QApplication
)

from ..services.theme_service import theme
from ..services.i18n_service import i18n
from ..services.icon_service import icon_service


class ToastNotification(QWidget):
    """Modern floating card notification centered horizontally with semantic accents."""

    def __init__(
        self,
        parent: QWidget,
        message: str,
        toast_type: str = "info",
        duration_ms: int = 4000
    ):
        super().__init__(parent)
        self.message = message
        self.toast_type = toast_type
        self.duration_ms = duration_ms
        self._elapsed_ms = 0

        self.setWindowFlags(Qt.WindowType.SubWindow | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)
        self.setMaximumWidth(520)
        self.setMinimumWidth(320)

        self._init_ui()
        self._init_animation()

    def _init_ui(self) -> None:
        p = theme.palette
        is_dark = theme.current_theme == "dark"

        root_layout = QHBoxLayout(self)
        root_layout.setContentsMargins(10, 8, 10, 8)

        # Inner container card
        self.container = QWidget(self)
        self.container.setObjectName("toastContainer")

        # Soft glowing shadow
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(28)
        shadow.setOffset(0, 8)
        shadow.setColor(QColor(0, 0, 0, 110 if is_dark else 40))
        self.container.setGraphicsEffect(shadow)

        c_layout = QHBoxLayout(self.container)
        c_layout.setContentsMargins(16, 12, 16, 14)
        c_layout.setSpacing(14)

        # Status Icon & Badge
        icon_map = {
            "success": "circle-check",
            "warning": "triangle-alert",
            "error": "circle-x",
            "info": "info",
        }
        ic_name = icon_map.get(self.toast_type, "info")

        # Distinctive accent colors from theme tokens
        accent_hex = p.get(self.toast_type, p.get("accent_text", p.get("accent_solid", "green")))

        # Left / Leading Icon Container
        self.icon_badge = QLabel()
        self.icon_badge.setFixedSize(36, 36)
        self.icon_badge.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.icon_badge.setStyleSheet(f"""
            QLabel {{
                background-color: {accent_hex}22;
                border: 1.5px solid {accent_hex}66;
                border-radius: 10px;
            }}
        """)
        self.icon_badge.setPixmap(icon_service.icon(ic_name, size=20, role=self.toast_type).pixmap(20, 20))
        c_layout.addWidget(self.icon_badge, 0, Qt.AlignmentFlag.AlignVCenter)

        # Text column (tag pill + message)
        text_col = QVBoxLayout()
        text_col.setContentsMargins(0, 0, 0, 0)
        text_col.setSpacing(3)

        # Header tag row
        tag_row = QHBoxLayout()
        tag_row.setSpacing(6)
        
        type_titles = {
            "success": i18n.t("toast_success", default="نجاح" if i18n.is_rtl() else "Success"),
            "warning": i18n.t("toast_warning", default="تنبيه" if i18n.is_rtl() else "Warning"),
            "error": i18n.t("toast_error", default="خطأ" if i18n.is_rtl() else "Error"),
            "info": i18n.t("toast_info", default="معلومة" if i18n.is_rtl() else "Info"),
        }

        self.lbl_tag = QLabel(type_titles.get(self.toast_type, "Info"))
        tag_font = QFont()
        tag_font.setPointSize(9)
        tag_font.setBold(True)
        self.lbl_tag.setFont(tag_font)
        self.lbl_tag.setStyleSheet(f"color: {accent_hex}; font-weight: 800; text-transform: uppercase;")
        tag_row.addWidget(self.lbl_tag)

        self.lbl_app = QLabel("• TreeForge")
        self.lbl_app.setStyleSheet(f"color: {p['text_muted']}; font-size: 11px;")
        tag_row.addWidget(self.lbl_app)
        tag_row.addStretch()
        text_col.addLayout(tag_row)

        # Message Text label
        self.lbl_text = QLabel(self.message)
        self.lbl_text.setObjectName("caption")
        self.lbl_text.setWordWrap(True)
        msg_font = QFont()
        msg_font.setPointSize(10)
        msg_font.setBold(True)
        self.lbl_text.setFont(msg_font)
        self.lbl_text.setStyleSheet(f"color: {p['text_primary']}; font-weight: 600; line-height: 1.4;")
        text_col.addWidget(self.lbl_text)

        c_layout.addLayout(text_col, 1)

        # Close button
        self.btn_close = QPushButton()
        self.btn_close.setIcon(icon_service.icon("x", size=14, role="default"))
        self.btn_close.setFixedSize(26, 26)
        self.btn_close.setFlat(True)
        self.btn_close.setCursor(Qt.CursorShape.PointingHandCursor)
        self.btn_close.setStyleSheet(f"""
            QPushButton {{
                border-radius: 13px;
                background-color: transparent;
                border: none;
            }}
            QPushButton:hover {{
                background-color: {p['bg_elevated']};
            }}
        """)
        self.btn_close.clicked.connect(self.dismiss)
        c_layout.addWidget(self.btn_close, 0, Qt.AlignmentFlag.AlignTop)

        root_layout.addWidget(self.container)

        # Timer for auto-dismiss
        self.dismiss_timer = QTimer(self)
        self.dismiss_timer.setSingleShot(True)
        self.dismiss_timer.timeout.connect(self.dismiss)

    def _init_animation(self) -> None:
        self.anim = QPropertyAnimation(self, b"pos")
        self.anim.setDuration(180)
        self.anim.setEasingCurve(QEasingCurve.Type.OutCubic)

    def enterEvent(self, event) -> None:
        """Pause auto-dismiss timer on mouse hover."""
        if self.dismiss_timer.isActive():
            self.dismiss_timer.stop()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:
        """Resume timer when mouse leaves."""
        self.dismiss_timer.start(1500)
        super().leaveEvent(event)

    def paintEvent(self, event) -> None:
        """Draw modern rounded card with distinctive vibrant border and top highlight."""
        painter = QPainter(self.container)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        p = theme.palette
        rect = self.container.rect()
        is_dark = theme.current_theme == "dark"

        # Distinctive accent colors from theme tokens
        accent_color = QColor(p.get(self.toast_type, p.get("accent_text", p.get("accent_solid", "green"))))

        # Card body background
        path = QPainterPath()
        path.addRoundedRect(0, 0, rect.width(), rect.height(), 14, 14)

        bg_color = QColor(p["bg_card"])
        painter.fillPath(path, bg_color)

        # Subtle distinctive outer border
        border_pen = QPen(QColor(accent_color.red(), accent_color.green(), accent_color.blue(), 120 if is_dark else 80), 1.5)
        painter.setPen(border_pen)
        painter.drawPath(path)

        # 3px Top ambient highlight bar
        highlight_path = QPainterPath()
        highlight_path.addRoundedRect(12, 1, rect.width() - 24, 3, 2, 2)
        painter.fillPath(highlight_path, accent_color)

        painter.end()

    def dismiss(self) -> None:
        ToastManager.instance().remove_toast(self)


class ToastManager:
    """Manages centered placement and non-overlapping stacking of multiple active toasts."""

    _instance: Optional["ToastManager"] = None

    @classmethod
    def instance(cls) -> "ToastManager":
        if cls._instance is None:
            cls._instance = ToastManager()
        return cls._instance

    def __init__(self):
        self._active_toasts: List[ToastNotification] = []

    def show(self, parent: QWidget, message: str, toast_type: str = "info") -> None:
        top_window = parent.window() if parent else None
        if not top_window:
            return

        toast = ToastNotification(top_window, message, toast_type=toast_type)
        self._active_toasts.append(toast)
        toast.show()
        self._reposition_all(top_window)
        toast.dismiss_timer.start(toast.duration_ms)

    def remove_toast(self, toast: ToastNotification) -> None:
        if toast in self._active_toasts:
            self._active_toasts.remove(toast)
        toast.hide()
        toast.deleteLater()
        app = QApplication.instance()
        if app and app.activeWindow():
            self._reposition_all(app.activeWindow())

    def _reposition_all(self, window: QWidget) -> None:
        """Position toasts elegantly in the horizontal center of the active window, stacking from top."""
        start_y = 28
        spacing = 10
        current_y = start_y

        for toast in self._active_toasts:
            toast.adjustSize()
            tw = toast.width()
            th = toast.height()

            # Guaranteed horizontal centering in the parent window
            center_x = max(16, (window.width() - tw) // 2)
            toast.move(center_x, current_y)
            current_y += th + spacing


def show_toast(parent: QWidget, text: str, toast_type: str = "info") -> None:
    ToastManager.instance().show(parent, text, toast_type=toast_type)
