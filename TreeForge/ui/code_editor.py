"""Custom code editor for TreeForge with theme-aware gutter, current line highlight,
and dynamic syntax highlighting driven by design tokens.
"""

import re
from typing import List, Tuple, Optional
from PyQt6.QtCore import Qt, QRect, QSize
from PyQt6.QtGui import (
    QColor, QPainter, QTextFormat, QFont, QSyntaxHighlighter,
    QTextCharFormat, QKeyEvent, QPen
)
from PyQt6.QtWidgets import QPlainTextEdit, QWidget, QTextEdit

from ..services.theme_service import theme
from .context_menus import create_code_editor_context_menu


class LineNumberArea(QWidget):
    def __init__(self, editor: "CodeEditor"):
        super().__init__(editor)
        self.code_editor = editor

    def sizeHint(self) -> QSize:
        return QSize(self.code_editor.line_number_area_width(), 0)

    def paintEvent(self, event) -> None:
        self.code_editor.line_number_area_paint_event(event)


class MultiSyntaxHighlighter(QSyntaxHighlighter):
    """Dynamic token-driven syntax highlighter for Python, Markdown, and JSON."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.highlighting_rules: List[Tuple[re.Pattern, QTextCharFormat]] = []
        self.rebuild_formats()

    def rebuild_formats(self) -> None:
        """Re-read current theme palette and regenerate formatting rules."""
        self.highlighting_rules.clear()
        p = theme.palette

        # Keywords
        kw_fmt = QTextCharFormat()
        kw_fmt.setForeground(QColor(p["syn_keyword"]))
        kw_fmt.setFontWeight(QFont.Weight.Bold)
        keywords = [
            r"\bdef\b", r"\bclass\b", r"\bimport\b", r"\bfrom\b", r"\breturn\b",
            r"\bif\b", r"\belif\b", r"\belse\b", r"\bfor\b", r"\bwhile\b",
            r"\btry\b", r"\bexcept\b", r"\bfinally\b", r"\bwith\b", r"\bas\b",
            r"\bpass\b", r"\braise\b", r"\bTrue\b", r"\bFalse\b", r"\bNone\b",
            r"\basync\b", r"\bawait\b", r"\byield\b"
        ]
        for kw in keywords:
            self.highlighting_rules.append((re.compile(kw), kw_fmt))

        # Strings
        str_fmt = QTextCharFormat()
        str_fmt.setForeground(QColor(p["syn_string"]))
        self.highlighting_rules.append((re.compile(r'"[^"\\]*(\\.[^"\\]*)*"'), str_fmt))
        self.highlighting_rules.append((re.compile(r"'[^'\\]*(\\.[^'\\]*)*'"), str_fmt))

        # Comments
        comment_fmt = QTextCharFormat()
        comment_fmt.setForeground(QColor(p["syn_comment"]))
        comment_fmt.setFontItalic(True)
        self.highlighting_rules.append((re.compile(r"#[^\n]*"), comment_fmt))
        self.highlighting_rules.append((re.compile(r"//[^\n]*"), comment_fmt))

        # Numbers
        num_fmt = QTextCharFormat()
        num_fmt.setForeground(QColor(p["syn_number"]))
        self.highlighting_rules.append((re.compile(r"\b\d+(\.\d+)?\b"), num_fmt))

        # Markdown headers / Section markers
        head_fmt = QTextCharFormat()
        head_fmt.setForeground(QColor(p["syn_heading"]))
        head_fmt.setFontWeight(QFont.Weight.Bold)
        self.highlighting_rules.append((re.compile(r"^#{1,6}\s+.*$"), head_fmt))
        self.highlighting_rules.append((re.compile(r"^###\s+.*$"), head_fmt))

        self.rehighlight()

    def highlightBlock(self, text: str) -> None:
        for pattern, fmt in self.highlighting_rules:
            for match in pattern.finditer(text):
                start = match.start()
                length = match.end() - start
                self.setFormat(start, length, fmt)


class CodeEditor(QPlainTextEdit):
    """Full-featured code editor with theme token colors and custom context menu."""

    def __init__(self, parent: Optional[QWidget] = None, file_name: str = "main.py"):
        super().__init__(parent)
        self.file_name = file_name
        self.line_number_area = LineNumberArea(self)

        font = QFont("JetBrains Mono", 10)
        font.setStyleHint(QFont.StyleHint.Monospace)
        self.setFont(font)
        self.setTabStopDistance(self.fontMetrics().horizontalAdvance(' ') * 4)

        self.highlighter = MultiSyntaxHighlighter(self.document())

        self.blockCountChanged.connect(self.update_line_number_area_width)
        self.updateRequest.connect(self.update_line_number_area)
        self.cursorPositionChanged.connect(self.highlight_current_line)

        self.update_line_number_area_width(0)
        self.highlight_current_line()

        # Custom Context Menu Policy
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self._on_context_menu)

        theme.theme_changed.connect(self._on_theme_changed)

    def _on_theme_changed(self) -> None:
        self.highlighter.rebuild_formats()
        self.highlight_current_line()
        self.line_number_area.update()
        self.viewport().update()

    def line_number_area_width(self) -> int:
        digits = 1
        max_num = max(1, self.blockCount())
        while max_num >= 10:
            max_num //= 10
            digits += 1
        space = 20 + self.fontMetrics().horizontalAdvance('9') * digits
        return space

    def update_line_number_area_width(self, _) -> None:
        self.setViewportMargins(self.line_number_area_width(), 0, 0, 0)

    def update_line_number_area(self, rect: QRect, dy: int) -> None:
        if dy:
            self.line_number_area.scroll(0, dy)
        else:
            self.line_number_area.update(0, rect.y(), self.line_number_area.width(), rect.height())
        if rect.contains(self.viewport().rect()):
            self.update_line_number_area_width(0)

    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        cr = self.contentsRect()
        self.line_number_area.setGeometry(
            QRect(cr.left(), cr.top(), self.line_number_area_width(), cr.height())
        )

    def highlight_current_line(self) -> None:
        extra_selections = []
        if not self.isReadOnly():
            selection = QTextEdit.ExtraSelection()
            p = theme.palette
            selection.format.setBackground(QColor(p["code_current_line"]))
            selection.format.setProperty(QTextFormat.Property.FullWidthSelection, True)
            selection.cursor = self.textCursor()
            selection.cursor.clearSelection()
            extra_selections.append(selection)
        self.setExtraSelections(extra_selections)

    def line_number_area_paint_event(self, event) -> None:
        p = theme.palette
        painter = QPainter(self.line_number_area)
        painter.fillRect(event.rect(), QColor(p["code_gutter_bg"]))

        # 1px vertical separator line
        painter.setPen(QPen(QColor(p["border"]), 1))
        painter.drawLine(
            self.line_number_area.width() - 1, event.rect().top(),
            self.line_number_area.width() - 1, event.rect().bottom()
        )

        block = self.firstVisibleBlock()
        block_number = block.blockNumber()
        top = int(self.blockBoundingGeometry(block).translated(self.contentOffset()).top())
        bottom = top + int(self.blockBoundingRect(block).height())

        while block.isValid() and top <= event.rect().bottom():
            if block.isVisible() and bottom >= event.rect().top():
                number = str(block_number + 1)
                painter.setPen(QColor(p["code_gutter_text"]))
                painter.drawText(
                    0, top, self.line_number_area.width() - 8,
                    self.fontMetrics().height(),
                    Qt.AlignmentFlag.AlignRight, number
                )
            block = block.next()
            top = bottom
            bottom = top + int(self.blockBoundingRect(block).height())
            block_number += 1
        painter.end()

    def keyPressEvent(self, event: QKeyEvent) -> None:
        if event.key() == Qt.Key.Key_Tab and not event.modifiers():
            self.insertPlainText("    ")
            return
        super().keyPressEvent(event)

    def _on_context_menu(self, pos) -> None:
        create_code_editor_context_menu(self, pos, self.file_name)
