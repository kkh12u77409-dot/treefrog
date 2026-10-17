"""Styles, component helpers, and section headers for TreeForge PyQt6 interface.

Strict design system compliance: contains zero hardcoded hex literals.
All styling is mediated through theme tokens, object names, and QSS dynamic properties.
"""

from typing import Optional
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QFrame, QLabel, QVBoxLayout, QHBoxLayout, QWidget

from ..services.theme_service import set_variant


class SectionHeader(QWidget):
    """Reusable section header with dynamic text updating for live retranslation."""

    def __init__(self, title: str, subtitle: str = "", parent: Optional[QWidget] = None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 6)
        layout.setSpacing(2)

        self.title_label = QLabel(title, self)
        self.title_label.setObjectName("pageTitle")
        layout.addWidget(self.title_label)

        self.subtitle_label = QLabel(subtitle, self)
        self.subtitle_label.setObjectName("pageSubtitle")
        self.subtitle_label.setWordWrap(True)
        if not subtitle:
            self.subtitle_label.setVisible(False)
        layout.addWidget(self.subtitle_label)

    def set_texts(self, title: str, subtitle: str = "") -> None:
        """Update both title and subtitle texts for runtime language switching."""
        self.title_label.setText(title)
        if subtitle:
            self.subtitle_label.setText(subtitle)
            self.subtitle_label.setVisible(True)
        else:
            self.subtitle_label.setVisible(False)


def create_section_header(title: str, subtitle: str = "") -> SectionHeader:
    """Creates a SectionHeader instance supporting live retranslation."""
    return SectionHeader(title, subtitle)


def create_card_frame(parent: Optional[QWidget] = None) -> QFrame:
    """Creates a card styled container frame with card=true property."""
    frame = QFrame(parent)
    frame.setProperty("card", "true")
    frame.setObjectName("cardFrame")
    return frame


def create_badge(text: str, badge_type: str = "success") -> QLabel:
    """Creates a pill-shaped status badge styled via object names without hex literals."""
    lbl = QLabel(f" {text} ")
    lbl.setObjectName("statLabel" if badge_type == "success" else "caption")
    lbl.setProperty("badge", badge_type)
    return lbl


def set_button_text(btn, text: str) -> None:
    """Sets button text cleanly."""
    if not text:
        btn.setText("")
        return
    btn.setText(text.strip())



