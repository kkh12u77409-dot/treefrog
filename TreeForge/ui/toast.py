"""Non-intrusive floating toast notifications for PyQt6."""

from typing import Optional
from PyQt6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, QPoint
from PyQt6.QtGui import QColor, QPainter, QBrush, QPen, QFont
from PyQt6.QtWidgets import QWidget, QLabel, QHBoxLayout, QGraphicsOpacityEffect


class ToastNotification(QWidget):
    """Floating notification banner that automatically fades out."""

    def __init__(self, parent: QWidget, text: str, toast_type: str = "info", duration_ms: int = 3500):
        super().__init__(parent)
        self.setWindowFlags(Qt.WindowType.SubWindow | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating)

        color_map = {
            "info": ("#1e293b", "#38bdf8", "#0284c7"),
            "success": ("#064e3b", "#34d399", "#10b981"),
            "warning": ("#78350f", "#fbbf24", "#d97706"),
            "error": ("#7f1d1d", "#f87171", "#ef4444"),
        }
        bg_col, border_col, accent_col = color_map.get(toast_type, color_map["info"])

        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 10, 16, 10)

        self.label = QLabel(text, self)
        font = QFont()
        font.setPointSize(10)
        font.setBold(True)
        self.label.setFont(font)
        self.label.setStyleSheet("color: #ffffff; background: transparent;")
        layout.addWidget(self.label)

        self.setStyleSheet(f"""
            QWidget {{
                background-color: {bg_col};
                border: 1px solid {border_col};
                border-left: 5px solid {accent_col};
                border-radius: 8px;
            }}
        """)

        self.opacity_effect = QGraphicsOpacityEffect(self)
        self.setGraphicsEffect(self.opacity_effect)
        self.opacity_effect.setOpacity(0.0)

        self.anim = QPropertyAnimation(self.opacity_effect, b"opacity")
        self.anim.setDuration(300)
        self.anim.setStartValue(0.0)
        self.anim.setEndValue(0.96)
        self.anim.setEasingCurve(QEasingCurve.Type.OutQuad)

        self.dismiss_timer = QTimer(self)
        self.dismiss_timer.setSingleShot(True)
        self.dismiss_timer.timeout.connect(self.fade_out)
        self.duration_ms = duration_ms

    def show_toast(self) -> None:
        self.adjustSize()
        if self.parentWidget():
            parent_rect = self.parentWidget().rect()
            x = (parent_rect.width() - self.width()) // 2
            y = parent_rect.height() - self.height() - 40
            self.move(x, y)
        self.show()
        self.anim.start()
        self.dismiss_timer.start(self.duration_ms)

    def fade_out(self) -> None:
        self.anim.stop()
        self.anim.setStartValue(0.96)
        self.anim.setEndValue(0.0)
        self.anim.finished.connect(self.deleteLater)
        self.anim.start()


def show_toast(parent: QWidget, text: str, toast_type: str = "info") -> None:
    toast = ToastNotification(parent, text, toast_type=toast_type)
    toast.show_toast()
