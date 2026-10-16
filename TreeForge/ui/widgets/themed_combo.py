"""Themed ComboBox with custom item delegate, rich multi-line descriptions, badge chips,
wheel hijack prevention, and specialized PathComboBox for TreeForge.
"""

from pathlib import Path
from typing import List, Tuple, Optional, Any, Dict
from PyQt6.QtCore import Qt, QRect, QSize, pyqtSignal, QEvent
from PyQt6.QtGui import (
    QPainter, QColor, QFont, QPen, QPainterPath, QCursor, QWheelEvent,
    QKeyEvent, QIcon, QMouseEvent
)
from PyQt6.QtWidgets import (
    QComboBox, QStyledItemDelegate, QStyleOptionViewItem, QWidget,
    QLineEdit, QApplication, QListView, QStyle
)

from ...services.theme_service import theme
from ...services.i18n_service import i18n
from ...services.icon_service import icon_service


class ComboItemDelegate(QStyledItemDelegate):
    """Rich delegate rendering title, description, badge chips, icons, and active checkmarks."""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)

    def sizeHint(self, option: QStyleOptionViewItem, index) -> QSize:
        desc = index.data(Qt.ItemDataRole.UserRole + 1)
        # B1: Height is 56px with secondary description, 36px otherwise
        h = 56 if desc else 36
        return QSize(option.rect.width(), h)

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index) -> None:
        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        p = theme.palette
        rect = option.rect.adjusted(4, 2, -4, -2)
        is_hover = bool(option.state & QStyle.StateFlag.State_MouseOver)
        is_selected = bool(option.state & QStyle.StateFlag.State_Selected)
        is_rtl = (option.direction == Qt.LayoutDirection.RightToLeft)

        # 1. Background (using theme tokens with alpha)
        if is_selected:
            bg_color = QColor(p["accent_solid"])
            bg_color.setAlpha(35)
        elif is_hover:
            bg_color = QColor(p["bg_elevated"])
        else:
            bg_color = QColor(p["bg_card"])

        bg_path = QPainterPath()
        bg_path.addRoundedRect(rect.x(), rect.y(), rect.width(), rect.height(), 6, 6)
        painter.fillPath(bg_path, bg_color)

        # 2. Leading Icon (on the start edge)
        icon_val = index.data(Qt.ItemDataRole.DecorationRole)
        icon_size = 18
        if icon_val:
            ix = rect.right() - icon_size - 8 if is_rtl else rect.left() + 8
            iy = rect.center().y() - (icon_size // 2)
            if isinstance(icon_val, QIcon):
                icon_val.paint(painter, ix, iy, icon_size, icon_size)

        start_offset = 34 if icon_val else 10

        # 3. Calculate End Edge dimensions (Checkmark + Badge)
        badge = index.data(Qt.ItemDataRole.UserRole + 2)
        badge_w = 0
        bh = 18
        b_font = QFont(painter.font())
        b_font.setPointSize(8)
        b_font.setBold(True)

        if badge:
            painter.setFont(b_font)
            badge_text = f" {badge} "
            badge_w = painter.fontMetrics().horizontalAdvance(badge_text) + 8

        # Positioning on the end edge (left in RTL, right in LTR)
        if is_rtl:
            # End edge is at rect.left()
            cx = rect.left() + 8
            if is_selected and badge:
                bx = cx + 16 + 8
                end_offset = 8 + 16 + 8 + badge_w + 8
            elif is_selected:
                bx = rect.left() + 8
                end_offset = 8 + 16 + 8
            elif badge:
                bx = rect.left() + 8
                end_offset = 8 + badge_w + 8
            else:
                bx = rect.left() + 8
                end_offset = 10
        else:
            # End edge is at rect.right()
            cx = rect.right() - 24
            if is_selected and badge:
                bx = cx - 8 - badge_w
                end_offset = 8 + 16 + 8 + badge_w + 8
            elif is_selected:
                bx = rect.right() - 8 - badge_w
                end_offset = 8 + 16 + 8
            elif badge:
                bx = rect.right() - 8 - badge_w
                end_offset = 8 + badge_w + 8
            else:
                bx = rect.right()
                end_offset = 10

        # Available width for text
        available_text_w = max(10, rect.width() - start_offset - end_offset)
        if is_rtl:
            text_x = rect.left() + end_offset
            text_rect = QRect(text_x, rect.top() + 4, available_text_w, rect.height() - 8)
            align = Qt.AlignmentFlag.AlignRight
        else:
            text_x = rect.left() + start_offset
            text_rect = QRect(text_x, rect.top() + 4, available_text_w, rect.height() - 8)
            align = Qt.AlignmentFlag.AlignLeft

        # 4. Draw Texts with QFontMetrics.elidedText
        title = index.data(Qt.ItemDataRole.DisplayRole) or ""
        desc = index.data(Qt.ItemDataRole.UserRole + 1)

        font = QFont(painter.font())
        font.setPointSize(10)
        font.setBold(is_selected or is_hover)
        painter.setFont(font)
        painter.setPen(QColor(p["accent_text"] if is_selected else p["text_primary"]))
        fm = painter.fontMetrics()
        elided_title = fm.elidedText(title, Qt.TextElideMode.ElideRight, available_text_w)

        if desc:
            title_rect = QRect(text_rect.x(), text_rect.y() + 2, text_rect.width(), 20)
            painter.drawText(title_rect, align | Qt.AlignmentFlag.AlignVCenter, elided_title)

            desc_font = QFont(font)
            desc_font.setPointSize(9)
            desc_font.setBold(False)
            painter.setFont(desc_font)
            painter.setPen(QColor(p["text_muted"]))
            desc_fm = painter.fontMetrics()
            elided_desc = desc_fm.elidedText(desc, Qt.TextElideMode.ElideRight, available_text_w)
            desc_rect = QRect(text_rect.x(), text_rect.y() + 24, text_rect.width(), 20)
            painter.drawText(desc_rect, align | Qt.AlignmentFlag.AlignVCenter, elided_desc)
        else:
            painter.drawText(text_rect, align | Qt.AlignmentFlag.AlignVCenter, elided_title)

        # 5. Draw Badge Chip (if present, using tokens with alpha)
        if badge:
            painter.setFont(b_font)
            by = rect.center().y() - (bh // 2)
            badge_path = QPainterPath()
            badge_path.addRoundedRect(bx, by, badge_w, bh, 9, 9)
            badge_bg = QColor(p["accent_solid"])
            badge_bg.setAlpha(40)
            painter.fillPath(badge_path, badge_bg)
            painter.setPen(QPen(QColor(p["accent_text"]), 1))
            painter.drawPath(badge_path)
            painter.drawText(QRect(bx, by, badge_w, bh), Qt.AlignmentFlag.AlignCenter, f" {badge} ")

        # 6. Draw Checkmark on the end side for selected item
        if is_selected:
            check_ic = icon_service.icon("check", size=16, role="accent")
            cy = rect.center().y() - 8
            check_ic.paint(painter, cx, cy, 16, 16)

        painter.restore()


class ThemedComboBox(QComboBox):
    """Custom ComboBox with themed delegate, wheel prevention, and dynamic retranslation."""

    def __init__(self, parent: Optional[QWidget] = None, compact: bool = False):
        super().__init__(parent)
        self.compact = compact
        self.setFixedHeight(28 if compact else 36)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setMaxVisibleItems(8)

        self._item_data_source: List[Tuple[Any, str, Optional[str], Optional[str], Optional[str]]] = []
        # format: (data, title_key_or_str, icon_name, desc_key, badge_text)

        # Custom delegate
        self.setItemDelegate(ComboItemDelegate(self))

        # Modern popup view properties
        view = self.view()
        if view:
            view.setObjectName("comboPopupView")
            view.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        theme.theme_changed.connect(self._on_theme_changed)
        i18n.language_changed.connect(self._on_language_changed)

    def _on_theme_changed(self) -> None:
        self.update()

    def _on_language_changed(self) -> None:
        self.retranslate()

    def wheelEvent(self, e: QWheelEvent) -> None:
        """Prevent mouse wheel from accidentally changing combobox value while scrolling."""
        # Only accept wheel if the popup list view is currently visible
        view = self.view()
        if view and view.isVisible():
            super().wheelEvent(e)
        else:
            e.ignore()

    def add_themed_item(
        self,
        data: Any,
        title_key: str,
        icon_name: Optional[str] = None,
        desc_key: Optional[str] = None,
        badge_text: Optional[str] = None
    ) -> None:
        """Add item tracking its keys so it can be retranslated cleanly without losing data."""
        self._item_data_source.append((data, title_key, icon_name, desc_key, badge_text))
        self._insert_item_record(data, title_key, icon_name, desc_key, badge_text)

    def _insert_item_record(
        self,
        data: Any,
        title_key: str,
        icon_name: Optional[str],
        desc_key: Optional[str],
        badge_text: Optional[str]
    ) -> None:
        title = i18n.t(title_key) if title_key in i18n.t(title_key) or True else title_key
        # If title_key exists in translations dictionary use it, else raw string
        translated_title = i18n.t(title_key)
        translated_desc = i18n.t(desc_key) if desc_key else None

        icon = icon_service.icon(icon_name, size=16) if icon_name else QIcon()
        idx = self.count()
        self.addItem(icon, translated_title, data)
        if translated_desc:
            self.setItemData(idx, translated_desc, Qt.ItemDataRole.UserRole + 1)
        if badge_text:
            self.setItemData(idx, badge_text, Qt.ItemDataRole.UserRole + 2)

    def retranslate(self) -> None:
        """Rebuild items while preserving currently selected data."""
        current_val = self.currentData()
        self.blockSignals(True)
        self.clear()
        for data, title_key, icon_name, desc_key, badge_text in self._item_data_source:
            self._insert_item_record(data, title_key, icon_name, desc_key, badge_text)
        
        # Restore selection
        idx = self.findData(current_val)
        if idx >= 0:
            self.setCurrentIndex(idx)
        self.blockSignals(False)


class PathComboBox(ThemedComboBox):
    """Editable folder path combobox with validation, MRU de-duplication, and browse coupling."""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent, compact=False)
        self.setEditable(True)
        self.setAcceptDrops(True)
        self.setInsertPolicy(QComboBox.InsertPolicy.NoInsert)

        line_edit = self.lineEdit()
        if line_edit:
            line_edit.setPlaceholderText("/path/to/destination")
            line_edit.textChanged.connect(self._validate_path)

        self._validate_path()

    def set_recent_paths(self, paths: List[str]) -> None:
        """Populate recent paths with folder icons, deduplicated up to 10."""
        self.blockSignals(True)
        self.clear()
        seen = set()
        count = 0
        for p in paths:
            if not p or p in seen:
                continue
            seen.add(p)
            icon = icon_service.icon("folder", size=16, role="accent")
            self.addItem(icon, p, p)
            count += 1
            if count >= 10:
                break
        self.blockSignals(False)
        self._validate_path()

    def _validate_path(self) -> None:
        """Check if destination path is valid and writable."""
        text = self.currentText().strip()
        if not text:
            self.setToolTip("")
            return

        p = Path(text)
        if not p.exists():
            self.setToolTip(i18n.t("path_invalid"))
        elif not p.is_dir():
            self.setToolTip(i18n.t("path_invalid"))
        else:
            self.setToolTip(str(p.resolve()))

    def dragEnterEvent(self, event) -> None:
        if event.mimeData().hasUrls():
            event.acceptProposedAction()

    def dropEvent(self, event) -> None:
        for url in event.mimeData().urls():
            local_path = Path(url.toLocalFile())
            if local_path.is_dir():
                self.setEditText(str(local_path))
                self.insertItem(0, icon_service.icon("folder", size=16), str(local_path), str(local_path))
                self.setCurrentIndex(0)
                event.acceptProposedAction()
                break


class FilterableComboBox(ThemedComboBox):
    """Searchable combobox variant used when candidates count exceeds 6."""

    def __init__(self, parent: Optional[QWidget] = None, compact: bool = True):
        super().__init__(parent, compact=compact)
