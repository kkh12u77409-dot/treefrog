"""Styles and component helpers for TreeForge PyQt6 interface."""

from PyQt6.QtWidgets import QFrame, QLabel, QVBoxLayout, QWidget
from PyQt6.QtGui import QFont
from PyQt6.QtCore import Qt


def create_card_frame(parent: QWidget = None) -> QFrame:
    """Creates a card styled container frame."""
    frame = QFrame(parent)
    frame.setProperty("class", "card")
    frame.setObjectName("cardFrame")
    return frame


def create_section_header(title: str, subtitle: str = "") -> QWidget:
    """Creates a stylized section title with optional subtitle."""
    container = QWidget()
    layout = QVBoxLayout(container)
    layout.setContentsMargins(0, 0, 0, 8)
    layout.setSpacing(4)

    title_label = QLabel(title)
    font = QFont()
    font.setPointSize(14)
    font.setBold(True)
    title_label.setFont(font)
    title_label.setStyleSheet("color: #f9fafb;")
    layout.addWidget(title_label)

    if subtitle:
        sub_label = QLabel(subtitle)
        sub_label.setStyleSheet("color: #9ca3af; font-size: 12px;")
        sub_label.setWordWrap(True)
        layout.addWidget(sub_label)

    return container


def create_badge(text: str, badge_type: str = "success") -> QLabel:
    """Creates a pill-shaped status badge with theme styling."""
    lbl = QLabel(f" {text} ")
    if badge_type == "success":
        lbl.setStyleSheet("background-color: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; font-size: 10px; font-weight: bold; padding: 2px 6px;")
    elif badge_type == "warning":
        lbl.setStyleSheet("background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; font-size: 10px; font-weight: bold; padding: 2px 6px;")
    else:
        lbl.setStyleSheet("background-color: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; font-size: 10px; font-weight: bold; padding: 2px 6px;")
    return lbl

