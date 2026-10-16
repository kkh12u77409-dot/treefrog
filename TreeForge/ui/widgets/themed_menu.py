"""Themed custom context menu with rounded translucent card geometry, soft shadow,
and bidirectional keyboard accessibility for TreeForge.
"""

from typing import Optional, Callable, Any, Dict
from PyQt6.QtCore import Qt, QPoint, QRect, QSize, QPropertyAnimation, QEasingCurve
from PyQt6.QtGui import (
    QAction, QIcon, QPainter, QColor, QFont, QCursor, QKeySequence,
    QPen, QBrush, QPainterPath
)
from PyQt6.QtWidgets import (
    QMenu, QWidget, QApplication, QProxyStyle, QStyle, QStyleOptionMenuItem
)

from ...services.theme_service import theme
from ...services.i18n_service import i18n
from ...services.icon_service import icon_service


class ThemedMenu(QMenu):
    """Modern translucent frameless popup menu adhering to TreeForge design system."""

    def __init__(self, title: str = "", parent: Optional[QWidget] = None):
        super().__init__(title, parent)
        self.setWindowFlags(
            Qt.WindowType.Popup |
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.NoDropShadowWindowHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_Hover, True)

        # Inherit application layout direction (mirrors for RTL Arabic)
        app = QApplication.instance()
        if app:
            self.setLayoutDirection(app.layoutDirection())

        self._action_registry: Dict[QAction, Dict[str, Any]] = {}
        self._margin = 10  # Margin for soft drop-shadow
        self.setMinimumWidth(210)

        # Connect cleanup on theme or language change
        theme.theme_changed.connect(self._on_theme_or_lang_changed)
        i18n.language_changed.connect(self._on_theme_or_lang_changed)

    def _on_theme_or_lang_changed(self) -> None:
        """Close menu cleanly when application theme or language changes."""
        if self.isVisible():
            self.close()
        # Re-resolve texts for registered actions
        for action, meta in self._action_registry.items():
            key = meta.get("key")
            if key:
                action.setText(i18n.t(key))

    def add_action(
        self,
        key: str,
        icon_name: Optional[str] = None,
        shortcut: Optional[str] = None,
        slot: Optional[Callable] = None,
        enabled: bool = True,
        checkable: bool = False,
        checked: bool = False,
        danger: bool = False
    ) -> QAction:
        """Create and register a localized action."""
        text = i18n.t(key)
        icon = icon_service.icon(icon_name, size=16, role="danger" if danger else "default") if icon_name else QIcon()
        
        action = QAction(icon, text, self)
        if shortcut:
            action.setShortcut(QKeySequence(shortcut))
        if slot:
            action.triggered.connect(slot)
        action.setEnabled(enabled)
        action.setCheckable(checkable)
        if checkable:
            action.setChecked(checked)

        action.setProperty("danger", danger)
        action.setProperty("i18n_key", key)
        self._action_registry[action] = {
            "key": key,
            "danger": danger,
            "shortcut": shortcut,
            "icon_name": icon_name,
        }

        self.addAction(action)
        return action

    def add_submenu(self, key: str, icon_name: Optional[str] = None) -> "ThemedMenu":
        """Create a child ThemedMenu with matching layout direction and styling."""
        sub = ThemedMenu(i18n.t(key), self)
        sub.setLayoutDirection(self.layoutDirection())
        if icon_name:
            sub.setIcon(icon_service.icon(icon_name, size=16))
        self.addMenu(sub)
        return sub

    def paintEvent(self, event) -> None:
        """Custom paint of rounded card, 1px border, soft shadow, and menu items."""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        p = theme.palette
        rect = self.rect()

        # Inner card rectangle inside shadow margins
        card_rect = rect.adjusted(self._margin, self._margin, -self._margin, -self._margin)

        # 1. Soft Shadow
        shadow_path = QPainterPath()
        shadow_path.addRoundedRect(card_rect.x(), card_rect.y() + 2, card_rect.width(), card_rect.height(), 10, 10)
        painter.fillPath(shadow_path, QColor(0, 0, 0, 50))

        # 2. Card Background & Border
        card_path = QPainterPath()
        card_path.addRoundedRect(card_rect.x(), card_rect.y(), card_rect.width(), card_rect.height(), 10, 10)
        painter.fillPath(card_path, QColor(p["bg_card"]))
        painter.setPen(QPen(QColor(p["border"]), 1))
        painter.drawPath(card_path)

        # 3. Paint Menu Items
        action_at_cursor = self.actionAt(self.mapFromGlobal(QCursor.pos()))
        active_action = self.activeAction() or action_at_cursor

        is_rtl = (self.layoutDirection() == Qt.LayoutDirection.RightToLeft)

        for action in self.actions():
            item_rect = self.actionGeometry(action)
            if not item_rect.isValid() or item_rect.isEmpty():
                continue

            # Draw separator
            if action.isSeparator():
                sep_y = item_rect.center().y()
                painter.setPen(QPen(QColor(p["border"]), 1))
                painter.drawLine(card_rect.left() + 10, sep_y, card_rect.right() - 10, sep_y)
                continue

            # Item bounds adjusted inside card
            ir = item_rect.adjusted(card_rect.left() + 4, 0, card_rect.left() + 4, 0)
            ir.setHeight(34)

            is_hovered = (action == active_action) and action.isEnabled()
            is_danger = action.property("danger") is True

            # Hover background
            if is_hovered:
                hover_bg = QColor(p["error"]) if is_danger else QColor(16, 185, 129, 35)
                h_path = QPainterPath()
                h_path.addRoundedRect(card_rect.left() + 4, ir.top(), card_rect.width() - 8, 32, 6, 6)
                painter.fillPath(h_path, hover_bg)

            # Colors
            if not action.isEnabled():
                text_col = QColor(p["text_muted"])
                text_col.setAlphaF(0.55)
            elif is_hovered:
                text_col = QColor(p["on_accent"]) if is_danger else QColor(p["accent_text"])
            else:
                text_col = QColor(p["text_primary"])

            # Draw Checkmark / Icon
            if action.isCheckable() and action.isChecked():
                check_icon = icon_service.icon("check", size=16, role="accent")
                cx = ir.right() - 24 if is_rtl else ir.left() + 8
                check_icon.paint(painter, cx, ir.top() + 8, 16, 16)
            elif not action.icon().isNull():
                ix = ir.right() - 24 if is_rtl else ir.left() + 8
                action.icon().paint(painter, ix, ir.top() + 8, 16, 16)

            # Draw Label
            text_x = ir.left() + 32 if not is_rtl else ir.left() + 10
            text_w = ir.width() - 42
            painter.setPen(text_col)
            font = painter.font()
            font.setPointSize(10)
            font.setBold(is_hovered)
            painter.setFont(font)
            
            align = (Qt.AlignmentFlag.AlignRight if is_rtl else Qt.AlignmentFlag.AlignLeft) | Qt.AlignmentFlag.AlignVCenter
            text_rect = QRect(text_x, ir.top(), text_w, ir.height())
            painter.drawText(text_rect, align, action.text())

            # Draw Shortcut column (Always LTR isolated)
            sc_text = action.shortcut().toString(QKeySequence.SequenceFormat.NativeText)
            if sc_text:
                painter.setPen(QColor(p["text_muted"]))
                sc_align = (Qt.AlignmentFlag.AlignLeft if is_rtl else Qt.AlignmentFlag.AlignRight) | Qt.AlignmentFlag.AlignVCenter
                painter.drawText(ir.adjusted(8, 0, -8, 0), sc_align, f"\u2066{sc_text}\u2069")

        painter.end()

    def exec_at(self, widget: QWidget, pos: QPoint, reason: Qt.ContextMenuPolicy = None) -> Optional[QAction]:
        """Show menu positioned properly with screen bounds and HiDPI checks."""
        app = QApplication.instance()
        if app:
            self.setLayoutDirection(app.layoutDirection())

        # Determine global position
        if pos == QPoint(-1, -1) or pos is None:
            global_pos = QCursor.pos()
        else:
            global_pos = widget.mapToGlobal(pos)

        # Ensure fully within primary/current screen geometry
        screen = QApplication.screenAt(global_pos) or QApplication.primaryScreen()
        if screen:
            geo = screen.availableGeometry()
            menu_size = self.sizeHint()
            x = min(global_pos.x(), geo.right() - menu_size.width())
            y = min(global_pos.y(), geo.bottom() - menu_size.height())
            x = max(geo.left(), x)
            y = max(geo.top(), y)
            global_pos = QPoint(x, y)

        return self.exec(global_pos)
