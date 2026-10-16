"""Modern centered floating toast notifications with dark ink / glass identity,
semantic accents, smooth enter/exit animations, deduplication, stack management,
and pause-on-hover for TreeForge.
"""

from typing import Optional, List
from PyQt6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, QRect, QPoint, QEvent, QObject
from PyQt6.QtGui import QColor, QFont, QPainter, QPainterPath, QPen, QLinearGradient
from PyQt6.QtWidgets import (
    QWidget, QLabel, QHBoxLayout, QVBoxLayout, QPushButton,
    QGraphicsOpacityEffect, QFrame
)

from ..services.theme_service import theme
from ..services.i18n_service import i18n
from ..services.icon_service import icon_service


SHADOW_PAD = 8


class ToastIconBadge(QWidget):
    """Circular icon badge drawn crisply with 100% vector accuracy and token transparency."""

    def __init__(self, toast_type: str, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.toast_type = toast_type
        self.setFixedSize(32, 32)

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        p = theme.palette
        status_col_str = p.get(f"toast_{self.toast_type}", p["toast_info"])
        status_col = QColor(status_col_str)

        # Background circle with ~20% alpha
        bg_col = QColor(status_col)
        bg_col.setAlpha(45)
        painter.setBrush(bg_col)

        # Subtle border with ~35% alpha
        border_col = QColor(status_col)
        border_col.setAlpha(90)
        painter.setPen(QPen(border_col, 1.2))

        rect = self.rect().adjusted(1, 1, -1, -1)
        painter.drawEllipse(rect)

        # Render 18px Lucide status icon centered
        icon_map = {
            "success": "circle-check",
            "warning": "triangle-alert",
            "error": "circle-x",
            "info": "info",
        }
        ic_name = icon_map.get(self.toast_type, "info")
        ic = icon_service.icon(ic_name, size=18, role="on_accent")
        ix = (self.width() - 18) // 2
        iy = (self.height() - 18) // 2
        ic.paint(painter, ix, iy, 18, 18)

        painter.end()


class ToastCard(QFrame):
    """Modern floating card notification with dark ink / glass styling,
    semantic accent stripes, remaining time progress bar, and pause-on-hover.
    """

    def __init__(
        self,
        parent: QWidget,
        message: str,
        toast_type: str = "info",
        duration_ms: Optional[int] = None
    ):
        super().__init__(parent)
        self.raw_message = message
        self.toast_type = toast_type
        self.count = 1
        self.is_exiting = False

        # Durations per specification: success 3s, info 3.5s, warning 5s, error 7s
        default_durations = {
            "success": 3000,
            "info": 3500,
            "warning": 5000,
            "error": 7000,
        }
        self.duration_ms = duration_ms if duration_ms is not None else default_durations.get(toast_type, 3500)
        self.remaining_ms = self.duration_ms

        self.setWindowFlags(Qt.WindowType.SubWindow | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)
        self.setAccessibleName(f"Toast: {self.toast_type} - {self.raw_message}")

        self._setup_ui()
        self._setup_timer()
        self._setup_animation()

    def _setup_ui(self) -> None:
        p = theme.palette

        root_layout = QHBoxLayout(self)
        root_layout.setContentsMargins(
            SHADOW_PAD + 14,
            SHADOW_PAD + 10,
            SHADOW_PAD + 14,
            SHADOW_PAD + 12
        )
        root_layout.setSpacing(12)

        # 1. Circular 32px Icon Badge
        self.icon_badge = ToastIconBadge(self.toast_type, self)
        root_layout.addWidget(self.icon_badge, 0, Qt.AlignmentFlag.AlignTop)

        # 2. Text column (Title row + Message)
        text_col = QVBoxLayout()
        text_col.setContentsMargins(0, 0, 0, 0)
        text_col.setSpacing(3)

        # Title header row
        head_row = QHBoxLayout()
        head_row.setSpacing(6)

        # Status Title
        self.lbl_title = QLabel()
        title_font = QFont()
        title_font.setPixelSize(11)
        title_font.setBold(True)
        self.lbl_title.setFont(title_font)
        status_col_str = p.get(f"toast_{self.toast_type}", p["toast_info"])
        self.lbl_title.setStyleSheet(f"color: {status_col_str}; font-weight: 700; font-size: 11px;")
        self.lbl_title.setText(i18n.t(f"toast_{self.toast_type}"))
        head_row.addWidget(self.lbl_title)

        # Deduplication count badge ("×2", "×3"...)
        self.lbl_count = QLabel()
        cnt_font = QFont()
        cnt_font.setPixelSize(10)
        cnt_font.setBold(True)
        self.lbl_count.setFont(cnt_font)
        self.lbl_count.setStyleSheet(
            f"color: {status_col_str}; background-color: {p['toast_bg_end']}; "
            f"border: 1px solid {status_col_str}; border-radius: 6px; padding: 0px 4px;"
        )
        self.lbl_count.setVisible(False)
        head_row.addWidget(self.lbl_count)

        # App branding subtitle
        self.lbl_app = QLabel("• TreeForge")
        app_font = QFont()
        app_font.setPixelSize(10)
        self.lbl_app.setFont(app_font)
        self.lbl_app.setStyleSheet(f"color: {p['toast_subtext']};")
        head_row.addWidget(self.lbl_app)

        head_row.addStretch()
        text_col.addLayout(head_row)

        # Message text label (13px, weight 600, up to 4 lines with word wrap)
        self.lbl_msg = QLabel(self.raw_message)
        self.lbl_msg.setWordWrap(True)
        msg_font = QFont()
        msg_font.setPixelSize(13)
        msg_font.setWeight(QFont.Weight.DemiBold)
        self.lbl_msg.setFont(msg_font)
        self.lbl_msg.setStyleSheet(f"color: {p['toast_text']}; font-weight: 600; font-size: 13px;")
        text_col.addWidget(self.lbl_msg)

        root_layout.addLayout(text_col, 1)

        # 3. Close button
        self.btn_close = QPushButton(self)
        self.btn_close.setFixedSize(24, 24)
        self.btn_close.setCursor(Qt.CursorShape.PointingHandCursor)
        self.btn_close.setToolTip(i18n.t("close"))
        self.btn_close.setIcon(icon_service.icon("x", size=12, role="default"))
        self.btn_close.setStyleSheet(f"""
            QPushButton {{
                border-radius: 12px;
                background-color: transparent;
                border: none;
            }}
            QPushButton:hover {{
                background-color: {p['toast_bg_end']};
            }}
        """)
        self.btn_close.clicked.connect(self.dismiss)
        root_layout.addWidget(self.btn_close, 0, Qt.AlignmentFlag.AlignTop)

    def _setup_timer(self) -> None:
        self.tick_timer = QTimer(self)
        self.tick_timer.setInterval(30)
        self.tick_timer.timeout.connect(self._on_tick)
        self.tick_timer.start()

    def _on_tick(self) -> None:
        if self.is_exiting:
            return
        self.remaining_ms -= 30
        if self.remaining_ms <= 0:
            self.tick_timer.stop()
            self.dismiss()
        else:
            self.update()

    def _setup_animation(self) -> None:
        self.opacity_effect = QGraphicsOpacityEffect(self)
        self.setGraphicsEffect(self.opacity_effect)
        self.opacity_effect.setOpacity(0.0)

        self.enter_anim_pos = QPropertyAnimation(self, b"pos")
        self.enter_anim_pos.setDuration(220)
        self.enter_anim_pos.setEasingCurve(QEasingCurve.Type.OutCubic)

        self.enter_anim_op = QPropertyAnimation(self.opacity_effect, b"opacity")
        self.enter_anim_op.setDuration(220)
        self.enter_anim_op.setStartValue(0.0)
        self.enter_anim_op.setEndValue(1.0)
        self.enter_anim_op.setEasingCurve(QEasingCurve.Type.OutCubic)

    def animate_in(self, target_pos: QPoint) -> None:
        start_pos = QPoint(target_pos.x(), target_pos.y() + 16)
        self.move(start_pos)
        self.enter_anim_pos.setStartValue(start_pos)
        self.enter_anim_pos.setEndValue(target_pos)
        self.enter_anim_pos.start()
        self.enter_anim_op.start()

    def increment_count(self) -> None:
        """Deduplication: increment repeat badge and reset remaining timer."""
        self.count += 1
        self.lbl_count.setText(f"×{self.count}")
        self.lbl_count.setVisible(True)
        self.remaining_ms = self.duration_ms
        self.update()

    def enterEvent(self, event) -> None:
        """Pause remaining time timer on mouse hover."""
        if hasattr(self, "tick_timer") and self.tick_timer.isActive():
            self.tick_timer.stop()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:
        """Resume timer with remaining time if not already exiting."""
        if not self.is_exiting and self.remaining_ms > 0:
            if hasattr(self, "tick_timer"):
                self.tick_timer.start(30)
        super().leaveEvent(event)

    def paintEvent(self, event) -> None:
        """Paint dark ink / glass card, outer soft shadow, 4px stripe, and remaining progress."""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        p = theme.palette
        full_rect = self.rect()
        card_rect = full_rect.adjusted(SHADOW_PAD, SHADOW_PAD, -SHADOW_PAD, -SHADOW_PAD)

        # 1. Outer soft drop shadow (simulated in layers without clipping)
        for i in range(SHADOW_PAD):
            alpha = int(22 * (1.0 - (i / SHADOW_PAD)))
            shadow_path = QPainterPath()
            s_rect = card_rect.adjusted(-i, -i + 2, i, i + 2)
            shadow_path.addRoundedRect(s_rect.x(), s_rect.y(), s_rect.width(), s_rect.height(), 16 + i, 16 + i)
            painter.fillPath(shadow_path, QColor(0, 0, 0, alpha))

        # 2. Card background with vertical gradient
        card_path = QPainterPath()
        card_path.addRoundedRect(card_rect.x(), card_rect.y(), card_rect.width(), card_rect.height(), 16, 16)

        grad = QLinearGradient(0, card_rect.top(), 0, card_rect.bottom())
        grad.setColorAt(0.0, QColor(p["toast_bg"]))
        grad.setColorAt(1.0, QColor(p["toast_bg_end"]))
        painter.fillPath(card_path, grad)

        # 3. 1px border in status color (~40% opacity)
        status_col_str = p.get(f"toast_{self.toast_type}", p["toast_info"])
        status_col = QColor(status_col_str)
        border_col = QColor(status_col)
        border_col.setAlpha(102)
        border_pen = QPen(border_col, 1.0)
        painter.setPen(border_pen)
        painter.drawPath(card_path)

        # 4. 4px accent stripe on the start edge (right in RTL, left in LTR)
        is_rtl = i18n.is_rtl()
        stripe_w = 4
        stripe_margin = 12
        stripe_x = card_rect.right() - stripe_w if is_rtl else card_rect.left()
        stripe_rect = QRect(
            stripe_x,
            card_rect.top() + stripe_margin,
            stripe_w,
            max(4, card_rect.height() - (stripe_margin * 2))
        )
        stripe_path = QPainterPath()
        stripe_path.addRoundedRect(stripe_rect.x(), stripe_rect.y(), stripe_rect.width(), stripe_rect.height(), 2, 2)
        painter.fillPath(stripe_path, status_col)

        # 5. 3px remaining time progress bar at bottom of card
        if self.duration_ms > 0:
            progress_ratio = max(0.0, min(1.0, self.remaining_ms / self.duration_ms))
            bar_h = 3
            bar_y = card_rect.bottom() - bar_h - 1
            total_bar_w = card_rect.width() - 32
            curr_bar_w = int(total_bar_w * progress_ratio)

            if curr_bar_w > 0:
                bar_x = card_rect.right() - 16 - curr_bar_w if is_rtl else card_rect.left() + 16
                bar_path = QPainterPath()
                bar_path.addRoundedRect(bar_x, bar_y, curr_bar_w, bar_h, 1.5, 1.5)
                bar_col = QColor(status_col)
                bar_col.setAlpha(190)
                painter.fillPath(bar_path, bar_col)

        painter.end()

    def dismiss(self) -> None:
        """Smoothly animate out and delete."""
        if self.is_exiting:
            return
        self.is_exiting = True
        if hasattr(self, "tick_timer") and self.tick_timer.isActive():
            self.tick_timer.stop()

        ToastManager.instance().on_toast_dismissing(self)

        # Exit animation: fade-out with 12px slide downwards over 160ms
        exit_pos = QPropertyAnimation(self, b"pos")
        exit_pos.setDuration(160)
        exit_pos.setStartValue(self.pos())
        exit_pos.setEndValue(QPoint(self.x(), self.y() + 12))
        exit_pos.setEasingCurve(QEasingCurve.Type.InCubic)

        exit_op = QPropertyAnimation(self.opacity_effect, b"opacity")
        exit_op.setDuration(160)
        exit_op.setStartValue(self.opacity_effect.opacity())
        exit_op.setEndValue(0.0)
        exit_op.setEasingCurve(QEasingCurve.Type.InCubic)

        self._exit_anims = [exit_pos, exit_op]

        def _cleanup():
            self.hide()
            ToastManager.instance().remove_toast(self)
            self.deleteLater()

        exit_op.finished.connect(_cleanup)
        exit_pos.start()
        exit_op.start()


# Backward compatibility alias
ToastNotification = ToastCard


class ToastManager(QObject):
    """Manages centered placement, stacking, deduplication, and window event filtering."""

    _instance: Optional["ToastManager"] = None

    @classmethod
    def instance(cls) -> "ToastManager":
        if cls._instance is None:
            cls._instance = ToastManager()
        return cls._instance

    def __init__(self):
        super().__init__()
        self._active_toasts: List[ToastCard] = []
        self._installed_windows = set()

    def show(self, parent: QWidget, message: str, toast_type: str = "info") -> Optional[ToastCard]:
        top_window = parent.window() if parent else None
        if not top_window:
            return None

        # Install eventFilter on top_window to handle resize/move
        if top_window not in self._installed_windows:
            top_window.installEventFilter(self)
            self._installed_windows.add(top_window)

        # 1. Deduplication (T-f): check existing non-exiting toasts
        for t in self._active_toasts:
            if not t.is_exiting and t.toast_type == toast_type and t.raw_message == message:
                t.increment_count()
                return t

        # 2. Limit to max 3 visible toasts: dismiss oldest
        visible = [t for t in self._active_toasts if not t.is_exiting]
        if len(visible) >= 3:
            oldest = visible[0]
            oldest.dismiss()

        toast = ToastCard(top_window, message, toast_type=toast_type)
        self._active_toasts.append(toast)
        toast.show()

        self._reposition_all(top_window, animate_new=toast)
        return toast

    def on_toast_dismissing(self, toast: ToastCard) -> None:
        """Called as soon as a toast starts its exit animation to smoothly reposition survivors."""
        top_window = toast.parentWidget()
        if top_window:
            self._reposition_all(top_window, skip_anim_for=toast)

    def remove_toast(self, toast: ToastCard) -> None:
        if toast in self._active_toasts:
            self._active_toasts.remove(toast)
        top_window = toast.parentWidget()
        if top_window:
            self._reposition_all(top_window)

    def eventFilter(self, watched: QObject, event: QEvent) -> bool:
        if event.type() in (QEvent.Type.Resize, QEvent.Type.Move, QEvent.Type.WindowStateChange):
            if isinstance(watched, QWidget):
                self._reposition_all(watched)
        return super().eventFilter(watched, event)

    def _reposition_all(
        self,
        window: QWidget,
        animate_new: Optional[ToastCard] = None,
        skip_anim_for: Optional[ToastCard] = None
    ) -> None:
        """Position toasts horizontally centered, stacking upwards from bottom (28px margin)."""
        win_w = window.width()
        win_h = window.height()

        stack = [t for t in self._active_toasts if not t.is_exiting]
        current_bottom_y = win_h - 28
        spacing = 10

        # Stack from newest (bottom) to oldest (top)
        for toast in reversed(stack):
            max_w = min(560, max(280, win_w - 48))
            toast.setMaximumWidth(max_w)
            
            msg_fm = toast.lbl_msg.fontMetrics()
            decor_w = (SHADOW_PAD + 14) * 2 + 32 + 12 + 24 + 12
            avail_msg_w = max(100, max_w - decor_w)
            bounding = msg_fm.boundingRect(QRect(0, 0, avail_msg_w, 1000), Qt.TextFlag.TextWordWrap, toast.raw_message)
            raw_w = bounding.width() + decor_w
            tw = min(max_w, max(min(340, max_w), raw_w))

            toast.setFixedWidth(tw)
            toast.layout().activate()
            toast.adjustSize()
            th = max(68, toast.sizeHint().height())
            toast.resize(tw, th)

            center_x = max(0, (win_w - tw) // 2)
            target_y = current_bottom_y - th
            target_pos = QPoint(center_x, target_y)

            if toast == animate_new:
                toast.animate_in(target_pos)
            elif toast != skip_anim_for:
                if hasattr(toast, "_repos_anim"):
                    toast._repos_anim.stop()
                anim = QPropertyAnimation(toast, b"pos")
                anim.setDuration(180)
                anim.setStartValue(toast.pos())
                anim.setEndValue(target_pos)
                anim.setEasingCurve(QEasingCurve.Type.OutCubic)
                anim.start()
                toast._repos_anim = anim

            current_bottom_y = target_y - spacing


def show_toast(parent: QWidget, text: str, toast_type: str = "info") -> Optional[ToastCard]:
    return ToastManager.instance().show(parent, text, toast_type=toast_type)
