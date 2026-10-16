"""Main application window for TreeForge with sidebar navigation and page stack."""

from pathlib import Path
from typing import Optional
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QIcon, QDragEnterEvent, QDropEvent
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QPushButton, QStackedWidget, QLabel, QStatusBar,
    QFrame, QApplication
)

from ..services.i18n_service import i18n
from ..services.theme_service import theme
from ..services.settings_service import settings
from .builder_page import BuilderPage
from .content_page import ContentPage
from .settings_page import SettingsPage
from .toast import show_toast


class MainWindow(QMainWindow):
    """TreeForge Desktop Application Window."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("TreeForge — Project Scaffolder & Batch Code Injector")
        self.resize(1150, 750)
        self.setMinimumSize(850, 580)
        self.setAcceptDrops(True)

        self._init_ui()
        self.retranslate_ui()
        i18n.language_changed.connect(self.retranslate_ui)

    def _init_ui(self) -> None:
        central_widget = QWidget(self)
        central_widget.setObjectName("centralWidget")
        self.setCentralWidget(central_widget)

        root_layout = QHBoxLayout(central_widget)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # SIDEBAR
        self.sidebar = QWidget()
        self.sidebar.setObjectName("sidebar")
        self.sidebar.setFixedWidth(220)
        sidebar_layout = QVBoxLayout(self.sidebar)
        sidebar_layout.setContentsMargins(14, 20, 14, 20)
        sidebar_layout.setSpacing(8)

        # Brand header
        brand_box = QHBoxLayout()
        self.logo_lbl = QLabel()
        self.logo_lbl.setPixmap(theme.get_icon("builder").pixmap(28, 28))
        self.brand_title = QLabel("TreeForge")
        self.brand_title.setStyleSheet("font-size: 18px; font-weight: 800; color: #10b981;")
        brand_box.addWidget(self.logo_lbl)
        brand_box.addWidget(self.brand_title)
        brand_box.addStretch()
        sidebar_layout.addLayout(brand_box)

        self.brand_sub = QLabel("Desktop Suite")
        self.brand_sub.setStyleSheet("font-size: 11px; color: #9ca3af; margin-bottom: 12px;")
        sidebar_layout.addWidget(self.brand_sub)

        # Nav buttons
        self.btn_nav_builder = QPushButton()
        self.btn_nav_builder.setIcon(theme.get_icon("builder"))
        self.btn_nav_builder.setIconSize(QSize(18, 18))
        self.btn_nav_builder.setCheckable(True)
        self.btn_nav_builder.setChecked(True)
        self.btn_nav_builder.clicked.connect(lambda: self._switch_page(0))
        sidebar_layout.addWidget(self.btn_nav_builder)

        self.btn_nav_content = QPushButton()
        self.btn_nav_content.setIcon(theme.get_icon("content"))
        self.btn_nav_content.setIconSize(QSize(18, 18))
        self.btn_nav_content.setCheckable(True)
        self.btn_nav_content.clicked.connect(lambda: self._switch_page(1))
        sidebar_layout.addWidget(self.btn_nav_content)

        sidebar_layout.addStretch()

        self.btn_nav_settings = QPushButton()
        self.btn_nav_settings.setIcon(theme.get_icon("settings"))
        self.btn_nav_settings.setIconSize(QSize(18, 18))
        self.btn_nav_settings.setCheckable(True)
        self.btn_nav_settings.clicked.connect(lambda: self._switch_page(2))
        sidebar_layout.addWidget(self.btn_nav_settings)

        root_layout.addWidget(self.sidebar)

        # MAIN CONTENT STACK
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

        # Status Bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Ready")

    def _switch_page(self, index: int) -> None:
        self.stack.setCurrentIndex(index)
        self.btn_nav_builder.setChecked(index == 0)
        self.btn_nav_content.setChecked(index == 1)
        self.btn_nav_settings.setChecked(index == 2)

    def _on_tree_built(self, root_dir_str: str, root_node) -> None:
        self.content_page.load_tree_from_disk(root_dir_str, root_node)
        self._switch_page(1)  # Automatically move to Content page
        show_toast(self, "Project tree generated and loaded into Content workspace!", "success")
        self.status_bar.showMessage(f"Active workspace: {root_dir_str}")

    def dragEnterEvent(self, event: QDragEnterEvent) -> None:
        if event.mimeData().hasUrls():
            event.acceptProposedAction()

    def dropEvent(self, event: QDropEvent) -> None:
        for url in event.mimeData().urls():
            file_path = Path(url.toLocalFile())
            if file_path.is_dir():
                self.builder_page.dest_combo.insertItem(0, str(file_path))
                self.builder_page.dest_combo.setCurrentIndex(0)
                self.content_page.load_tree_from_disk(str(file_path))
                show_toast(self, f"Loaded directory: {file_path.name}", "info")
                break
            elif file_path.is_file() and file_path.suffix.lower() in (".txt", ".md", ".tree"):
                try:
                    content = file_path.read_text(encoding="utf-8", errors="replace")
                    self.builder_page.tree_input.setPlainText(content)
                    self._switch_page(0)
                    show_toast(self, f"Loaded tree file: {file_path.name}", "info")
                except Exception as e:
                    show_toast(self, f"Error reading dropped file: {e}", "error")
                break

    def retranslate_ui(self) -> None:
        self.btn_nav_builder.setText(i18n.t("nav_builder"))
        self.btn_nav_content.setText(i18n.t("nav_content"))
        self.btn_nav_settings.setText(i18n.t("nav_settings"))
