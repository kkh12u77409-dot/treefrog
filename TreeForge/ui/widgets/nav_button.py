"""Themed navigation tab button with guaranteed text and icon alignment.

In Arabic (RTL), both the text and icon are strictly right-aligned adjacent to each other.
In English (LTR), both the text and icon are strictly left-aligned adjacent to each other.
Strictly complies with zero hardcoded color literals: uses theme tokens dynamically.
"""

from typing import Optional

try:
    from PyQt6.QtCore import Qt, QRect, QSize
    from PyQt6.QtGui import QPainter, QColor, QFont, QIcon
    from PyQt6.QtWidgets import QPushButton, QWidget, QStyle, QStyleOptionButton
except ImportError:
    class QPushButton:
        def __init__(self, *args, **kwargs):
            pass

        def setProperty(self, *args):
            pass

        def setCheckable(self, *args):
            pass

        def text(self):
            return ""

        def icon(self):
            return None

        def iconSize(self):
            return None

        def width(self):
            return 200

        def height(self):
            return 40

        def isChecked(self):
            return False

        def underMouse(self):
            return False

        def layoutDirection(self):
            return 0

        def update(self):
            pass

    class QWidget:
        pass

    class QStyle:
        class ControlElement:
            CE_PushButton = 0

    class QStyleOptionButton:
        pass

    class Qt:
        class CursorShape:
            PointingHandCursor = 0

        class LayoutDirection:
            RightToLeft = 0
            LeftToRight = 1

        class AlignmentFlag:
            AlignRight = 0
            AlignLeft = 0
            AlignVCenter = 0
            AlignCenter = 0

    class QRect:
        def __init__(self, *args):
            pass

    class QSize:
        def __init__(self, *args):
            pass

from ...services.theme_service import theme
from ...services.i18n_service import i18n


class NavTabButton(QPushButton):
    """Sidebar navigation tab button with RTL-aware icon and text alignment."""

    def __init__(self, text: str = "", parent: Optional[QWidget] = None):
        super().__init__(text, parent)
        self.setProperty("nav", "true")
        self.setCheckable(True)
        if hasattr(Qt, "CursorShape") and hasattr(Qt.CursorShape, "PointingHandCursor"):
            try:
                self.setCursor(Qt.CursorShape.PointingHandCursor)
            except Exception:
                pass
        try:
            self.toggled.connect(lambda _: self.update())
        except Exception:
            pass

    def enterEvent(self, event) -> None:
        try:
            super().enterEvent(event)
        except Exception:
            pass
        self.update()

    def leaveEvent(self, event) -> None:
        try:
            super().leaveEvent(event)
        except Exception:
            pass
        self.update()

    def paintEvent(self, event) -> None:
        try:
            painter = QPainter(self)
        except Exception:
            return

        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # 1. Let Qt QSS engine paint background, border, checked state, and hover effect
        opt = QStyleOptionButton()
        self.initStyleOption(opt)
        opt.text = ""
        opt.icon = QIcon()
        self.style().drawControl(QStyle.ControlElement.CE_PushButton, opt, painter, self)

        # 2. Determine layout direction and colors
        is_rtl = (self.layoutDirection() == Qt.LayoutDirection.RightToLeft) or i18n.is_rtl()
        is_checked = self.isChecked()
        is_hovered = self.underMouse()

        tokens = theme.palette
        if is_checked:
            text_color = QColor(tokens.get("accent_text", tokens.get("text_primary")))
            font_weight = QFont.Weight.DemiBold
        elif is_hovered:
            text_color = QColor(tokens.get("text_primary"))
            font_weight = QFont.Weight.Medium
        else:
            text_color = QColor(tokens.get("text_secondary"))
            font_weight = QFont.Weight.Medium

        font = self.font()
        font.setPointSize(10)
        font.setWeight(font_weight)
        painter.setFont(font)

        # 3. Icon and text layout measurements
        icon = self.icon()
        icon_size = self.iconSize()
        if not icon_size.isValid() or icon_size.width() <= 0:
            icon_size = QSize(20, 20)

        padding_h = 16
        spacing = 10
        total_w = self.width()
        total_h = self.height()

        has_icon = bool(icon and not icon.isNull())
        icon_w = icon_size.width() if has_icon else 0
        icon_h = icon_size.height() if has_icon else 0
        icon_y = (total_h - icon_h) // 2

        # Clean display text (strip non-breaking spaces and surrounding spaces)
        clean_text = self.text().replace("\u00A0", "").strip()

        if is_rtl:
            # === RTL (Arabic): BOTH ICON AND TEXT RIGHT-ALIGNED ===
            # [ Padding | ... empty space ... | Text | Spacing | Icon | Padding ]
            icon_x = total_w - padding_h - icon_w
            if has_icon:
                icon_mode = QIcon.Mode.Normal
                icon_state = QIcon.State.On if is_checked else QIcon.State.Off
                icon.paint(painter, icon_x, icon_y, icon_w, icon_h, Qt.AlignmentFlag.AlignCenter, icon_mode, icon_state)

            text_right = icon_x - (spacing if has_icon else 0)
            text_left = padding_h
            text_rect = QRect(text_left, 0, max(0, text_right - text_left), total_h)

            painter.setPen(text_color)
            painter.drawText(text_rect, Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, clean_text)
        else:
            # === LTR (English): BOTH ICON AND TEXT LEFT-ALIGNED ===
            # [ Padding | Icon | Spacing | Text | ... empty space ... | Padding ]
            icon_x = padding_h
            if has_icon:
                icon_mode = QIcon.Mode.Normal
                icon_state = QIcon.State.On if is_checked else QIcon.State.Off
                icon.paint(painter, icon_x, icon_y, icon_w, icon_h, Qt.AlignmentFlag.AlignCenter, icon_mode, icon_state)

            text_left = icon_x + icon_w + (spacing if has_icon else 0)
            text_right = total_w - padding_h
            text_rect = QRect(text_left, 0, max(0, text_right - text_left), total_h)

            painter.setPen(text_color)
            painter.drawText(text_rect, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, clean_text)
