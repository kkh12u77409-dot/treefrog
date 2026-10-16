"""Settings and preferences view for TreeForge with self-labelled language selector
and System / Light / Dark theme preview tiles.
"""

from typing import Optional
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QFrame, QApplication
)

from ..services.i18n_service import i18n
from ..services.theme_service import theme, set_variant
from ..services.settings_service import settings
from ..services.icon_service import icon_service
from .toast import show_toast
from .styles import create_card_frame, create_section_header
from .widgets.themed_combo import ThemedComboBox


class SettingsPage(QWidget):
    """View for controlling appearance, language, and default behaviors."""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._setup_ui()
        self.retranslate_ui()
        i18n.language_changed.connect(self.retranslate_ui)

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 20, 24, 20)
        layout.setSpacing(16)

        # 1. Page Header (Dynamic SectionHeader for live retranslation)
        self.header = create_section_header(
            i18n.t("settings_title"),
            i18n.t("settings_desc")
        )
        layout.addWidget(self.header)

        # CARD 1: Appearance & Language
        card1 = create_card_frame(self)
        c1_layout = QVBoxLayout(card1)
        c1_layout.setContentsMargins(18, 18, 18, 18)
        c1_layout.setSpacing(16)

        self.lbl_sec_appearance = QLabel()
        self.lbl_sec_appearance.setObjectName("sectionTitle")
        c1_layout.addWidget(self.lbl_sec_appearance)

        # Theme Selector (System, Dark, Light)
        theme_row = QHBoxLayout()
        self.lbl_theme = QLabel()
        self.lbl_theme.setObjectName("caption")

        self.combo_theme = ThemedComboBox()
        self.combo_theme.add_themed_item("system", "theme_system", "monitor")
        self.combo_theme.add_themed_item("dark", "theme_dark", "moon")
        self.combo_theme.add_themed_item("light", "theme_light", "sun")

        current_pref = settings.get_theme()
        idx = self.combo_theme.findData(current_pref)
        if idx >= 0:
            self.combo_theme.setCurrentIndex(idx)
        self.combo_theme.activated.connect(self._on_theme_activated)

        theme_row.addWidget(self.lbl_theme)
        theme_row.addWidget(self.combo_theme, 1)
        c1_layout.addLayout(theme_row)

        # Language Selector (Self-labelled: English & العربية with badges)
        lang_row = QHBoxLayout()
        self.lbl_lang = QLabel()
        self.lbl_lang.setObjectName("caption")

        self.combo_lang = ThemedComboBox()
        # Self-labelled: English with EN badge, العربية with ع badge
        self.combo_lang.add_themed_item("en", "English", "languages", badge_text="EN")
        self.combo_lang.add_themed_item("ar", "العربية", "languages", badge_text="ع")

        current_lang = settings.get_language()
        idx_lang = self.combo_lang.findData(current_lang)
        if idx_lang >= 0:
            self.combo_lang.setCurrentIndex(idx_lang)
        self.combo_lang.activated.connect(self._on_language_activated)

        lang_row.addWidget(self.lbl_lang)
        lang_row.addWidget(self.combo_lang, 1)
        c1_layout.addLayout(lang_row)

        layout.addWidget(card1)

        # CARD 2: About TreeForge
        card2 = create_card_frame(self)
        c2_layout = QVBoxLayout(card2)
        c2_layout.setContentsMargins(18, 18, 18, 18)
        c2_layout.setSpacing(12)

        about_head = QHBoxLayout()
        self.logo_about = QLabel()
        self.logo_about.setPixmap(icon_service.icon("folder-tree", size=24, role="accent").pixmap(24, 24))
        self.lbl_about_title = QLabel()
        self.lbl_about_title.setObjectName("sectionTitle")
        about_head.addWidget(self.logo_about)
        about_head.addWidget(self.lbl_about_title)
        about_head.addStretch()
        c2_layout.addLayout(about_head)

        self.lbl_about_text = QLabel()
        self.lbl_about_text.setObjectName("caption")
        self.lbl_about_text.setWordWrap(True)
        c2_layout.addWidget(self.lbl_about_text)

        btn_row = QHBoxLayout()
        self.btn_reset = QPushButton()
        self.btn_reset.setIcon(icon_service.icon("refresh-cw", size=14))
        set_variant(self.btn_reset, "ghost")
        self.btn_reset.clicked.connect(self._reset_defaults)
        btn_row.addWidget(self.btn_reset)
        btn_row.addStretch()
        c2_layout.addLayout(btn_row)

        layout.addWidget(card2)
        layout.addStretch()

    def _on_theme_activated(self) -> None:
        selected_theme = self.combo_theme.currentData()
        if selected_theme:
            settings.set_theme(selected_theme)
            theme.set_theme(selected_theme)
            show_toast(self, f"Theme set to {selected_theme}", "info")

    def _on_language_activated(self) -> None:
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

    def _reset_defaults(self) -> None:
        settings.set_theme("dark")
        settings.set_language("en")
        settings.set_policy("skip")
        theme.set_theme("dark")
        i18n.set_language("en")
        app = QApplication.instance()
        if app:
            app.setLayoutDirection(Qt.LayoutDirection.LeftToRight)
        self.combo_theme.setCurrentIndex(self.combo_theme.findData("dark"))
        self.combo_lang.setCurrentIndex(self.combo_lang.findData("en"))
        show_toast(self, "Preferences reset to defaults", "info")

    def retranslate_ui(self) -> None:
        """Live updates for localized texts."""
        self.header.set_texts(i18n.t("settings_title"), i18n.t("settings_desc"))
        self.lbl_sec_appearance.setText(i18n.t("section_appearance"))
        self.lbl_theme.setText(i18n.t("theme_label"))
        self.combo_theme.retranslate()
        self.lbl_lang.setText(i18n.t("language_label"))
        self.lbl_about_title.setText(i18n.t("about_title"))
        self.lbl_about_text.setText(i18n.t("about_text"))
        self.btn_reset.setText(i18n.t("reset_defaults"))
