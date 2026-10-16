"""Main application window for TreeForge with sidebar navigation and page stack."""

from pathlib import Path
from typing import Optional
from PyQt6.QtCore import Qt, QSize, QPoint
from PyQt6.QtGui import QIcon, QDragEnterEvent, QDropEvent
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QPushButton, QStackedWidget, QLabel, QStatusBar,
    QFrame, QApplication
)

from ..services.i18n_service import i18n
from ..services.theme_service import theme
from ..services.settings_service import settings
from ..services.icon_service import icon_service
from .builder_page import BuilderPage
from .content_page import ContentPage
from .settings_page import SettingsPage
from .toast import show_toast
from .styles import set_button_text
from .widgets.themed_menu import ThemedMenu


class MainWindow(QMainWindow):
    """TreeForge Desktop Application Window."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("TreeForge — Project Scaffolder & Batch Code Injector")
        self.resize(1180, 780)
        self.setMinimumSize(960, 640)
        self.setAcceptDrops(True)

        self._active_workspace: str = ""
        self._init_ui()
        self.retranslate_ui()
        
        # Apply Windows 10/11 dark title bar & propagate theme updates
        theme.apply_titlebar_theme(self)
        theme.theme_changed.connect(self._on_theme_changed)
        i18n.language_changed.connect(self.retranslate_ui)

    def _init_ui(self) -> None:
        central_widget = QWidget(self)
        central_widget.setObjectName("centralWidget")
        self.setCentralWidget(central_widget)

        root_layout = QHBoxLayout(central_widget)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # 1. SIDEBAR NAVIGATION
        self.sidebar = QWidget()
        self.sidebar.setObjectName("sidebar")
        self.sidebar.setFixedWidth(230)
        sidebar_layout = QVBoxLayout(self.sidebar)
        sidebar_layout.setContentsMargins(16, 20, 16, 20)
        sidebar_layout.setSpacing(8)

        # Brand header block
        brand_box = QHBoxLayout()
        brand_box.setSpacing(10)
        self.logo_lbl = QLabel()
        self.logo_lbl.setPixmap(icon_service.icon("folder-tree", size=28, role="accent").pixmap(28, 28))
        self.brand_title = QLabel("TreeForge")
        self.brand_title.setObjectName("brandTitle")
        brand_box.addWidget(self.logo_lbl)
        brand_box.addWidget(self.brand_title)
        brand_box.addStretch()
        sidebar_layout.addLayout(brand_box)

        self.brand_sub = QLabel(i18n.t("brand_sub"))
        self.brand_sub.setObjectName("brandSub")
        sidebar_layout.addWidget(self.brand_sub)
        sidebar_layout.addSpacing(12)

        # Nav buttons (Tagged with nav="true" for QSS styling and escaping '&')
        self.btn_nav_builder = QPushButton()
        self.btn_nav_builder.setProperty("nav", "true")
        self.btn_nav_builder.setIcon(icon_service.icon("folder-tree", size=18))
        self.btn_nav_builder.setIconSize(QSize(18, 18))
        self.btn_nav_builder.setCheckable(True)
        self.btn_nav_builder.setChecked(True)
        self.btn_nav_builder.clicked.connect(lambda: self._switch_page(0))
        sidebar_layout.addWidget(self.btn_nav_builder)

        self.btn_nav_content = QPushButton()
        self.btn_nav_content.setProperty("nav", "true")
        self.btn_nav_content.setIcon(icon_service.icon("file-pen-line", size=18))
        self.btn_nav_content.setIconSize(QSize(18, 18))
        self.btn_nav_content.setCheckable(True)
        self.btn_nav_content.clicked.connect(lambda: self._switch_page(1))
        sidebar_layout.addWidget(self.btn_nav_content)

        sidebar_layout.addStretch()

        self.btn_nav_settings = QPushButton()
        self.btn_nav_settings.setProperty("nav", "true")
        self.btn_nav_settings.setIcon(icon_service.icon("sliders-horizontal", size=18))
        self.btn_nav_settings.setIconSize(QSize(18, 18))
        self.btn_nav_settings.setCheckable(True)
        self.btn_nav_settings.clicked.connect(lambda: self._switch_page(2))
        sidebar_layout.addWidget(self.btn_nav_settings)

        # Version caption
        self.lbl_version = QLabel(i18n.t("version_caption"))
        self.lbl_version.setObjectName("caption")
        sidebar_layout.addWidget(self.lbl_version)

        root_layout.addWidget(self.sidebar)

        # 2. MAIN CONTENT STACK
        self.stack = QStackedWidget(self)
        self.builder_page = BuilderPage(self)
        self.content_page = ContentPage(self)
        self.settings_page = SettingsPage(self)

        self.stack.addWidget(self.builder_page)
        self.stack.addWidget(self.content_page)
        self.stack.addWidget(self.settings_page)

        root_layout.addWidget(self.stack, 1)

        # Connect builder page output directly to content page
        self.builder_page.tree_built.connect(self._on_tree_built)

        # 3. STATUS BAR with Context Menu
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.status_bar.customContextMenuRequested.connect(self._on_status_bar_context_menu)
        self.status_bar.showMessage(i18n.t("ready"))

    def _switch_page(self, index: int) -> None:
        self.stack.setCurrentIndex(index)
        self.btn_nav_builder.setChecked(index == 0)
        self.btn_nav_content.setChecked(index == 1)
        self.btn_nav_settings.setChecked(index == 2)

    def _on_tree_built(self, root_dir_str: str, root_node) -> None:
        self._active_workspace = root_dir_str
        self.content_page.load_tree_from_disk(root_dir_str, root_node)
        self._switch_page(1)
        show_toast(self, i18n.t("toast_build_ok", count=1), "success")
        self.status_bar.showMessage(f"Active workspace: {root_dir_str}")

    def _on_status_bar_context_menu(self, pos: QPoint) -> None:
        if self._active_workspace:
            menu = ThemedMenu("", self.status_bar)
            menu.add_action(
                "copy_workspace_path",
                icon_name="copy",
                slot=lambda: QApplication.clipboard().setText(self._active_workspace)
            )
            menu.exec_at(self.status_bar, pos)

    def dragEnterEvent(self, event: QDragEnterEvent) -> None:
        if event.mimeData().hasUrls():
            event.acceptProposedAction()

    def dropEvent(self, event: QDropEvent) -> None:
        for url in event.mimeData().urls():
            file_path = Path(url.toLocalFile())
            if file_path.is_dir():
                self.builder_page.dest_combo.setEditText(str(file_path))
                self.content_page.load_tree_from_disk(str(file_path))
                show_toast(self, i18n.t("toast_loaded_dir", name=file_path.name), "info")
                break
            elif file_path.is_file() and file_path.suffix.lower() in (".txt", ".md", ".tree"):
                try:
                    content = file_path.read_text(encoding="utf-8", errors="replace")
                    self.builder_page.tree_input.setPlainText(content)
                    self._switch_page(0)
                    show_toast(self, i18n.t("toast_loaded_tree", name=file_path.name), "info")
                except Exception as e:
                    show_toast(self, i18n.t("toast_read_error", error=str(e)), "error")
                break

    def _on_theme_changed(self, theme_name: str = "") -> None:
        """Handle theme change event and propagate to child views."""
        theme.apply_titlebar_theme(self)
        self.logo_lbl.setPixmap(icon_service.icon("folder-tree", size=28, role="accent").pixmap(28, 28))
        if hasattr(self, "builder_page") and hasattr(self.builder_page, "_on_theme_changed"):
            self.builder_page._on_theme_changed(theme_name)
        if hasattr(self, "content_page") and hasattr(self.content_page, "_on_theme_changed"):
            self.content_page._on_theme_changed(theme_name)

    def retranslate_ui(self) -> None:
        """Live updates for localized texts, brand subtitle, and B7 RTL nav indicator."""
        is_rtl = i18n.is_rtl()
        rtl_str = "true" if is_rtl else "false"
        self.sidebar.setProperty("rtl", rtl_str)
        style = self.sidebar.style()
        if style:
            style.unpolish(self.sidebar)
            style.polish(self.sidebar)

        for btn in (self.btn_nav_builder, self.btn_nav_content, self.btn_nav_settings):
            btn.setProperty("rtl", rtl_str)
            btn_style = btn.style()
            if btn_style:
                btn_style.unpolish(btn)
                btn_style.polish(btn)

        self.brand_sub.setText(i18n.t("brand_sub"))
        set_button_text(self.btn_nav_builder, i18n.t("nav_builder"))
        set_button_text(self.btn_nav_content, i18n.t("nav_content"))
        set_button_text(self.btn_nav_settings, i18n.t("nav_settings"))
        self.lbl_version.setText(i18n.t("version_caption"))
        if not self._active_workspace:
            self.status_bar.showMessage(i18n.t("ready"))
