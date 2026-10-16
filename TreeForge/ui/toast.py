"""Modern floating toast notifications with semantic edge, soft shadow, stack manager,
and bidirectional placement for TreeForge.
"""

from typing import Optional, List
from PyQt6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, QPoint, QRect
from PyQt6.QtGui import QColor, QFont, QPainter, QPainterPath, QPen
from PyQt6.QtWidgets import (
    QWidget, QLabel, QHBoxLayout, QVBoxLayout, QPushButton,
    QGraphicsDropShadowEffect, QApplication
)

from ..services.theme_service import theme
from ..services.i18n_service import i18n
from ..services.icon_service import icon_service


class ToastNotification(QWidget):
    """Floating card notification with semantic border, icon, and pause on hover."""

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

        self.setWindowFlags(Qt.WindowType.SubWindow | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)
        self.setMaximumWidth(420)
        self.setMinimumWidth(280)

        self._init_ui()
        self._init_animation()

    def _init_ui(self) -> None:
        p = theme.palette
        root_layout = QHBoxLayout(self)
        root_layout.setContentsMargins(12, 12, 12, 12)

        # Inner container card
        self.container = QWidget(self)
        self.container.setObjectName("toastContainer")
        
        # Soft shadow
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(24)
        shadow.setOffset(0, 6)
        shadow.setColor(QColor(0, 0, 0, 80 if theme.current_theme == "dark" else 30))
        self.container.setGraphicsEffect(shadow)

        c_layout = QHBoxLayout(self.container)
        c_layout.setContentsMargins(14, 12, 14, 12)
        c_layout.setSpacing(12)

        # Status Icon
        icon_map = {
            "success": "circle-check",
            "warning": "triangle-alert",
            "error": "circle-x",
            "info": "info",
        }
        ic_name = icon_map.get(self.toast_type, "info")
        self.icon_lbl = QLabel()
        self.icon_lbl.setPixmap(icon_service.icon(ic_name, size=20, role=self.toast_type).pixmap(20, 20))
        c_layout.addWidget(self.icon_lbl, 0, Qt.AlignmentFlag.AlignTop)

        # Text label
        self.lbl_text = QLabel(self.message)
        self.lbl_text.setObjectName("caption")
        self.lbl_text.setWordWrap(True)
        font = QFont()
        font.setPointSize(10)
        font.setBold(True)
        self.lbl_text.setFont(font)
        c_layout.addWidget(self.lbl_text, 1)

        # Close button
        self.btn_close = QPushButton()
        self.btn_close.setIcon(icon_service.icon("x", size=14, role="default"))
        self.btn_close.setFixedSize(22, 22)
        self.btn_close.setFlat(True)
        self.btn_close.setProperty("variant", "ghost")
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
        """Draw card background with semantic status edge."""
        painter = QPainter(self.container)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        p = theme.palette
        rect = self.container.rect()

        # Semantic accent color
        color_map = {
            "success": p["success"],
            "warning": p["warning"],
            "error": p["error"],
            "info": p["info"],
        }
        edge_color = QColor(color_map.get(self.toast_type, p["info"]))

        # Card body
        path = QPainterPath()
        path.addRoundedRect(rect.x(), rect.y(), rect.width(), rect.height(), 12, 12)
        painter.fillPath(path, QColor(p["bg_card"]))
        painter.setPen(QPen(QColor(p["border"]), 1))
        painter.drawPath(path)

        # 4px Semantic leading edge
        is_rtl = (self.layoutDirection() == Qt.LayoutDirection.RightToLeft)
        edge_x = rect.right() - 4 if is_rtl else rect.left()
        edge_rect = QRect(edge_x, rect.top() + 6, 4, rect.height() - 12)
        painter.fillRect(edge_rect, edge_color)

        painter.end()

    def dismiss(self) -> None:
        ToastManager.instance().remove_toast(self)


class ToastManager:
    """Manages placement and non-overlapping stacking of multiple active toasts."""

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
        self._reposition_all(top_window)
        toast.show()
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
        margin_x = 24
        margin_y = 24
        current_y = window.height() - margin_y
        is_rtl = (window.layoutDirection() == Qt.LayoutDirection.RightToLeft)

        for toast in reversed(self._active_toasts):
            toast.adjustSize()
            tw = toast.width()
            th = toast.height()
            current_y -= th

            x = margin_x if is_rtl else (window.width() - tw - margin_x)
            toast.move(x, current_y)
            current_y -= 8


def show_toast(parent: QWidget, text: str, toast_type: str = "info") -> None:
    ToastManager.instance().show(parent, text, toast_type=toast_type)
