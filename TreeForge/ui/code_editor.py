"""Custom code editor for TreeForge with line numbers and syntax highlighting."""

import re
from typing import List, Tuple
from PyQt6.QtCore import Qt, QRect, QSize
from PyQt6.QtGui import (
    QColor, QPainter, QTextFormat, QFont, QSyntaxHighlighter,
    QTextCharFormat, QKeyEvent
)
from PyQt6.QtWidgets import QPlainTextEdit, QWidget, QTextEdit


class LineNumberArea(QWidget):
    def __init__(self, editor: "CodeEditor"):
        super().__init__(editor)
        self.code_editor = editor

    def sizeHint(self) -> QSize:
        return QSize(self.code_editor.line_number_area_width(), 0)

    def paintEvent(self, event) -> None:
        self.code_editor.line_number_area_paint_event(event)


class MultiSyntaxHighlighter(QSyntaxHighlighter):
    """Lightweight syntax highlighter for Python, Markdown, and JSON."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.highlighting_rules: List[Tuple[re.Pattern, QTextCharFormat]] = []

        # Keywords format
        keyword_format = QTextCharFormat()
        keyword_format.setForeground(QColor("#38bdf8"))  # Light cyan / blue
        keyword_format.setFontWeight(QFont.Weight.Bold)
        keywords = [
            r"\bdef\b", r"\bclass\b", r"\bimport\b", r"\bfrom\b", r"\breturn\b",
            r"\bif\b", r"\belif\b", r"\belse\b", r"\bfor\b", r"\bwhile\b",
            r"\btry\b", r"\bexcept\b", r"\bfinally\b", r"\bwith\b", r"\bas\b",
            r"\bpass\b", r"\braise\b", r"\bTrue\b", r"\bFalse\b", r"\bNone\b"
        ]
        for kw in keywords:
            self.highlighting_rules.append((re.compile(kw), keyword_format))

        # String format
        string_format = QTextCharFormat()
        string_format.setForeground(QColor("#34d399"))  # Emerald green
        self.highlighting_rules.append((re.compile(r'"[^"\\]*(\\.[^"\\]*)*"'), string_format))
        self.highlighting_rules.append((re.compile(r"'[^'\\]*(\\.[^'\\]*)*'"), string_format))

        # Comments format
        comment_format = QTextCharFormat()
        comment_format.setForeground(QColor("#94a3b8"))  # Slate grey
        comment_format.setFontItalic(True)
        self.highlighting_rules.append((re.compile(r"#[^\n]*"), comment_format))
        self.highlighting_rules.append((re.compile(r"//[^\n]*"), comment_format))

        # Markdown headers / Markers
        header_format = QTextCharFormat()
        header_format.setForeground(QColor("#fbbf24"))  # Amber
        header_format.setFontWeight(QFont.Weight.Bold)
        self.highlighting_rules.append((re.compile(r"^#{1,6}\s+.*$"), header_format))
        self.highlighting_rules.append((re.compile(r"^[=\-]{3,}\s+.*$"), header_format))

    def highlightBlock(self, text: str) -> None:
        for pattern, fmt in self.highlighting_rules:
            for match in pattern.finditer(text):
                start = match.start()
                length = match.end() - start
                self.setFormat(start, length, fmt)


class CodeEditor(QPlainTextEdit):
    """Full-featured code editor with line numbers gutter and current-line highlight."""

    def __init__(self, parent: QWidget = None):
        super().__init__(parent)
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
            line_color = QColor("#1e293b")
            selection.format.setBackground(line_color)
            selection.format.setProperty(QTextFormat.Property.FullWidthSelection, True)
            selection.cursor = self.textCursor()
            selection.cursor.clearSelection()
            extra_selections.append(selection)
        self.setExtraSelections(extra_selections)

    def line_number_area_paint_event(self, event) -> None:
        painter = QPainter(self.line_number_area)
        painter.fillRect(event.rect(), QColor("#0f172a"))

        block = self.firstVisibleBlock()
        block_number = block.blockNumber()
        top = int(self.blockBoundingGeometry(block).translated(self.contentOffset()).top())
        bottom = top + int(self.blockBoundingRect(block).height())

        while block.isValid() and top <= event.rect().bottom():
            if block.isVisible() and bottom >= event.rect().top():
                number = str(block_number + 1)
                painter.setPen(QColor("#64748b"))
                painter.drawText(
                    0, top, self.line_number_area.width() - 8,
                    self.fontMetrics().height(),
                    Qt.AlignmentFlag.AlignRight, number
                )
            block = block.next()
            top = bottom
            bottom = top + int(self.blockBoundingRect(block).height())
            block_number += 1

    def keyPressEvent(self, event: QKeyEvent) -> None:
        # Handle Tab as 4 spaces
        if event.key() == Qt.Key.Key_Tab and not event.modifiers():
            self.insertPlainText("    ")
            return
        super().keyPressEvent(event)
