"""Settings and preferences view for TreeForge."""

from typing import Optional
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox,
    QCheckBox, QPushButton, QFrame, QApplication
)

from ..services.i18n_service import i18n
from ..services.theme_service import theme
from ..services.settings_service import settings
from .toast import show_toast
from .styles import create_card_frame, create_section_header


class SettingsPage(QWidget):
    """View for controlling appearance, language, and default behaviors."""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._setup_ui()
        self.retranslate_ui()
        i18n.language_changed.connect(self.retranslate_ui)

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        self.header = create_section_header(
            i18n.t("settings_title"),
            "Customize the application appearance, internationalization, and default behaviors."
        )
        layout.addWidget(self.header)

        # CARD 1: Appearance & Language
        card1 = create_card_frame(self)
        c1_layout = QVBoxLayout(card1)
        c1_layout.setContentsMargins(16, 16, 16, 16)
        c1_layout.setSpacing(14)

        self.lbl_sec_appearance = QLabel(i18n.t("section_appearance"))
        self.lbl_sec_appearance.setStyleSheet("font-weight: 700; font-size: 14px; color: #10b981;")
        c1_layout.addWidget(self.lbl_sec_appearance)

        # Theme
        theme_row = QHBoxLayout()
        self.lbl_theme = QLabel(i18n.t("theme_label"))
        self.combo_theme = QComboBox()
        self.combo_theme.addItem(i18n.t("theme_dark"), "dark")
        self.combo_theme.addItem(i18n.t("theme_light"), "light")
        self.combo_theme.setCurrentText(
            i18n.t("theme_dark") if settings.get_theme() == "dark" else i18n.t("theme_light")
        )
        self.combo_theme.currentIndexChanged.connect(self._on_theme_changed)
        theme_row.addWidget(self.lbl_theme)
        theme_row.addWidget(self.combo_theme)
        theme_row.addStretch()
        c1_layout.addLayout(theme_row)

        # Language
        lang_row = QHBoxLayout()
        self.lbl_lang = QLabel(i18n.t("language_label"))
        self.combo_lang = QComboBox()
        self.combo_lang.addItem(i18n.t("lang_en"), "en")
        self.combo_lang.addItem(i18n.t("lang_ar"), "ar")
        self.combo_lang.setCurrentIndex(0 if settings.get_language() == "en" else 1)
        self.combo_lang.currentIndexChanged.connect(self._on_language_changed)
        lang_row.addWidget(self.lbl_lang)
        lang_row.addWidget(self.combo_lang)
        lang_row.addStretch()
        c1_layout.addLayout(lang_row)

        layout.addWidget(card1)

        # CARD 2: About TreeForge
        card2 = create_card_frame(self)
        c2_layout = QVBoxLayout(card2)
        c2_layout.setContentsMargins(16, 16, 16, 16)
        c2_layout.setSpacing(10)

        self.lbl_about_title = QLabel(i18n.t("about_title"))
        self.lbl_about_title.setStyleSheet("font-weight: 700; font-size: 14px; color: #38bdf8;")
        c2_layout.addWidget(self.lbl_about_title)

        self.lbl_about_text = QLabel(i18n.t("about_text"))
        self.lbl_about_text.setStyleSheet("color: #9ca3af; line-height: 1.5;")
        self.lbl_about_text.setWordWrap(True)
        c2_layout.addWidget(self.lbl_about_text)

        layout.addWidget(card2)
        layout.addStretch()

    def _on_theme_changed(self) -> None:
        selected_theme = self.combo_theme.currentData()
        if selected_theme:
            settings.set_theme(selected_theme)
            theme.set_theme(selected_theme)
            show_toast(self, f"Theme set to {selected_theme}", "info")

    def _on_language_changed(self) -> None:
        selected_lang = self.combo_lang.currentData()
        if selected_lang:
            settings.set_language(selected_lang)
            i18n.set_language(selected_lang)
            # RTL layout application
            app = QApplication.instance()
            if app:
                if selected_lang == "ar":
                    app.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
                else:
                    app.setLayoutDirection(Qt.LayoutDirection.LeftToRight)
            show_toast(self, "Language changed successfully", "success")

    def retranslate_ui(self) -> None:
        self.lbl_sec_appearance.setText(i18n.t("section_appearance"))
        self.lbl_theme.setText(i18n.t("theme_label"))
        self.lbl_lang.setText(i18n.t("language_label"))
        self.lbl_about_title.setText(i18n.t("about_title"))
        self.lbl_about_text.setText(i18n.t("about_text"))
