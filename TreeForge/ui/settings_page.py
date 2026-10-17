"""Settings and preferences view for TreeForge with self-labelled language selector
and System / Light / Dark theme options.
"""

from typing import Optional
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QApplication
)

from ..services.i18n_service import i18n
from ..services.theme_service import theme, set_variant
from ..services.settings_service import settings
from ..services.icon_service import icon_service
from .toast import show_toast
from .styles import create_card_frame, create_section_header, set_button_text
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

        # CARD 1: Appearance & Language (B8: Max width 760px)
        card1 = create_card_frame(self)
        card1.setMaximumWidth(760)
        c1_layout = QVBoxLayout(card1)
        c1_layout.setContentsMargins(20, 20, 20, 20)
        c1_layout.setSpacing(16)

        self.lbl_sec_appearance = QLabel()
        self.lbl_sec_appearance.setObjectName("sectionTitle")
        c1_layout.addWidget(self.lbl_sec_appearance)

        # B8: Theme Selector with label above input
        theme_block = QVBoxLayout()
        theme_block.setSpacing(6)

        self.lbl_theme = QLabel()
        lbl_font = QFont()
        lbl_font.setPointSize(10)
        lbl_font.setWeight(QFont.Weight.DemiBold)
        self.lbl_theme.setFont(lbl_font)
        self.lbl_theme.setObjectName("sectionTitle")
        theme_block.addWidget(self.lbl_theme)

        self.combo_theme = ThemedComboBox()
        self.combo_theme.setFixedHeight(36)
        self.combo_theme.add_themed_item("system", "theme_system", "monitor")
        self.combo_theme.add_themed_item("dark", "theme_dark", "moon")
        self.combo_theme.add_themed_item("light", "theme_light", "sun")

        current_pref = settings.get_theme()
        idx = self.combo_theme.findData(current_pref)
        if idx >= 0:
            self.combo_theme.setCurrentIndex(idx)
        self.combo_theme.activated.connect(self._on_theme_activated)
        theme_block.addWidget(self.combo_theme)
        c1_layout.addLayout(theme_block)

        # B8: Language Selector with label above input
        lang_block = QVBoxLayout()
        lang_block.setSpacing(6)

        self.lbl_lang = QLabel()
        self.lbl_lang.setFont(lbl_font)
        self.lbl_lang.setObjectName("sectionTitle")
        lang_block.addWidget(self.lbl_lang)

        self.combo_lang = ThemedComboBox()
        self.combo_lang.setFixedHeight(36)
        self.combo_lang.add_themed_item("en", "English", "languages", badge_text="EN")
        self.combo_lang.add_themed_item("ar", "العربية", "languages", badge_text="ع")

        current_lang = settings.get_language()
        idx_lang = self.combo_lang.findData(current_lang)
        if idx_lang >= 0:
            self.combo_lang.setCurrentIndex(idx_lang)
        self.combo_lang.activated.connect(self._on_language_activated)
        lang_block.addWidget(self.combo_lang)
        c1_layout.addLayout(lang_block)

        layout.addWidget(card1)

        # CARD 2: About TreeForge (B8: Max width 760px)
        card2 = create_card_frame(self)
        card2.setMaximumWidth(760)
        c2_layout = QVBoxLayout(card2)
        c2_layout.setContentsMargins(20, 20, 20, 20)
        c2_layout.setSpacing(14)

        about_head = QHBoxLayout()
        self.logo_about = QLabel()
        self.logo_about.setPixmap(icon_service.icon("folder-tree", size=24, role="accent").pixmap(24, 24))
        self.lbl_about_title = QLabel()
        self.lbl_about_title.setObjectName("sectionTitle")
        about_head.addWidget(self.logo_about)
        about_head.addWidget(self.lbl_about_title)
        about_head.addStretch()
        c2_layout.addLayout(about_head)

        # B8: RLM-safe About description
        self.lbl_about_text = QLabel()
        self.lbl_about_text.setObjectName("caption")
        self.lbl_about_text.setWordWrap(True)
        c2_layout.addWidget(self.lbl_about_text)

        # B8: Clear secondary button with borders instead of transparent ghost
        btn_row = QHBoxLayout()
        self.btn_reset = QPushButton()
        self.btn_reset.setIcon(icon_service.icon("refresh-cw", size=14))
        self.btn_reset.setFixedHeight(36)
        set_variant(self.btn_reset, "secondary")
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
            theme_label = i18n.t(f"theme_{selected_theme}")
            show_toast(self, i18n.t("toast_theme_changed", name=theme_label), "info")

    def _on_language_activated(self) -> None:
        selected_lang = self.combo_lang.currentData()
        if selected_lang:
            settings.set_language(selected_lang)
            i18n.set_language(selected_lang)
            app = QApplication.instance()
            if app:
                if selected_lang == "ar":
                    app.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
                else:
                    app.setLayoutDirection(Qt.LayoutDirection.LeftToRight)
            show_toast(self, i18n.t("toast_lang_changed"), "success")

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
        show_toast(self, i18n.t("toast_reset_done"), "info")

    def retranslate_ui(self) -> None:
        """Live updates for localized texts and proper RTL bidirectional alignment."""
        self.header.set_texts(i18n.t("settings_title"), i18n.t("settings_desc"))
        self.lbl_sec_appearance.setText(i18n.t("section_appearance"))
        self.lbl_theme.setText(i18n.t("theme_label"))
        self.combo_theme.retranslate()
        self.lbl_lang.setText(i18n.t("language_label"))
        self.combo_lang.retranslate()
        is_rtl = i18n.is_rtl()
        self.lbl_about_title.setText(f"حول تطبيق {i18n.isolate_ltr('TreeForge')}" if is_rtl else i18n.t("about_title"))
        about_text = i18n.t("about_text")
        if is_rtl:
            self.lbl_about_text.setAlignment(Qt.AlignmentFlag.AlignRight)
            self.lbl_about_text.setText(f"\u200F{about_text}")
        else:
            self.lbl_about_text.setAlignment(Qt.AlignmentFlag.AlignLeft)
            self.lbl_about_text.setText(about_text)

        set_button_text(self.btn_reset, i18n.t("reset_defaults"))
