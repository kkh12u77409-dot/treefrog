"""Builder page for TreeForge: transforms text trees into physical directory structures."""

from pathlib import Path
from typing import Optional
from PyQt6.QtCore import Qt, pyqtSignal, QUrl
from PyQt6.QtGui import QDesktopServices
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QTextEdit,
    QPushButton, QFileDialog, QCheckBox, QSplitter,
    QProgressBar, QTreeWidget, QTreeWidgetItem, QFrame,
    QHeaderView
)

from ..core.tree_parser import TreeParser
from ..core.tree_builder import TreeBuilder
from ..core.models import TreeNode, ItemPolicy, BuildStats
from ..core.worker import BuilderWorker
from ..services.i18n_service import i18n
from ..services.theme_service import theme, set_variant
from ..services.icon_service import icon_service
from ..services.settings_service import settings
from .toast import show_toast
from .styles import create_card_frame, create_section_header, set_button_text
from .widgets.themed_combo import ThemedComboBox, PathComboBox
from .context_menus import create_tree_input_context_menu, create_structure_tree_context_menu


EXAMPLE_TREE = """SumMaster/
├── main.py
├── make_zip.py
├── requirements.txt
├── README.md
├── assets/icons/
├── ui/  (main_window.py, spinner.py, styles.py)
├── core/ (calculator.py, worker.py)
├── services/ (settings_service.py)
└── tests/ (test_calculator.py, test_worker.py)"""


class BuilderPage(QWidget):
    """View for parsing text trees and generating directories and files."""

    tree_built = pyqtSignal(str, object)  # (root_dir_path, root_TreeNode)

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.parser = TreeParser()
        self.current_parsed_root: Optional[TreeNode] = None
        self.worker: Optional[BuilderWorker] = None
        self.last_built_dir: Optional[Path] = None

        self._setup_ui()
        self.retranslate_ui()
        i18n.language_changed.connect(self.retranslate_ui)
        theme.theme_changed.connect(self._on_theme_changed)

    def _setup_ui(self) -> None:
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(24, 20, 24, 20)
        main_layout.setSpacing(16)

        # 1. Page Header (Dynamic SectionHeader for live retranslation)
        self.header = create_section_header(
            i18n.t("builder_title"),
            i18n.t("builder_desc")
        )
        main_layout.addWidget(self.header)

        # 2. Main Horizontal Splitter
        splitter = QSplitter(Qt.Orientation.Horizontal, self)
        splitter.setChildrenCollapsible(False)
        splitter.setHandleWidth(12)

        # LEFT PANEL: Tree input & destination
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        left_layout.setContentsMargins(0, 0, 8, 0)
        left_layout.setSpacing(10)

        left_card = create_card_frame(left_widget)
        card_layout = QVBoxLayout(left_card)
        card_layout.setContentsMargins(16, 16, 16, 16)
        card_layout.setSpacing(12)

        # Toolbar above tree text input
        action_row = QHBoxLayout()
        self.lbl_tree_input = QLabel(i18n.t("nav_builder"))
        self.lbl_tree_input.setObjectName("sectionTitle")
        action_row.addWidget(self.lbl_tree_input)
        action_row.addStretch()

        self.btn_load_example = QPushButton()
        self.btn_load_example.setIcon(icon_service.icon("wand-sparkles", size=14))
        set_variant(self.btn_load_example, "ghost")
        self.btn_load_example.clicked.connect(self._load_example)
        action_row.addWidget(self.btn_load_example)

        self.btn_clear = QPushButton()
        self.btn_clear.setIcon(icon_service.icon("eraser", size=14))
        set_variant(self.btn_clear, "ghost")
        self.btn_clear.clicked.connect(self._clear_input)
        action_row.addWidget(self.btn_clear)
        card_layout.addLayout(action_row)

        # Tree text input (Plain text only, LTR direction)
        self.tree_input = QTextEdit()
        self.tree_input.setAcceptRichText(False)
        self.tree_input.setLayoutDirection(Qt.LayoutDirection.LeftToRight)
        self.tree_input.textChanged.connect(self._on_text_changed)
        self.tree_input.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.tree_input.customContextMenuRequested.connect(
            lambda pos: create_tree_input_context_menu(
                self.tree_input, pos, self._load_example, self._clear_input
            )
        )
        card_layout.addWidget(self.tree_input, 1)

        # Destination folder label & joined input
        self.lbl_dest = QLabel()
        self.lbl_dest.setObjectName("sectionTitle")
        card_layout.addWidget(self.lbl_dest)

        dest_row = QHBoxLayout()
        dest_row.setSpacing(6)
        self.dest_combo = PathComboBox()
        self._populate_recent_paths()
        dest_row.addWidget(self.dest_combo, 1)

        self.btn_browse = QPushButton()
        self.btn_browse.setIcon(icon_service.icon("folder-open", size=16))
        self.btn_browse.setFixedHeight(36)
        self.btn_browse.clicked.connect(self._browse_destination)
        dest_row.addWidget(self.btn_browse)
        card_layout.addLayout(dest_row)

        left_layout.addWidget(left_card)
        splitter.addWidget(left_widget)

        # RIGHT PANEL: Structure preview & options
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        right_layout.setContentsMargins(8, 0, 0, 0)
        right_layout.setSpacing(10)

        right_card = create_card_frame(right_widget)
        right_card_layout = QVBoxLayout(right_card)
        right_card_layout.setContentsMargins(16, 16, 16, 16)
        right_card_layout.setSpacing(12)

        # Preview header row with badge counters
        prev_head_row = QHBoxLayout()
        self.lbl_preview_title = QLabel()
        self.lbl_preview_title.setObjectName("sectionTitle")
        prev_head_row.addWidget(self.lbl_preview_title)
        prev_head_row.addStretch()

        self.lbl_stats = QLabel("0 folders, 0 files")
        self.lbl_stats.setObjectName("statLabel")
        prev_head_row.addWidget(self.lbl_stats)
        right_card_layout.addLayout(prev_head_row)

        # Live TreeView with semantic icons and custom context menu
        self.tree_view = QTreeWidget()
        self.tree_view.setHeaderLabels([i18n.t("col_item"), i18n.t("col_type")])
        self.tree_view.header().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.tree_view.itemChanged.connect(self._on_tree_item_changed)
        self.tree_view.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.tree_view.customContextMenuRequested.connect(
            lambda pos: create_structure_tree_context_menu(self.tree_view, pos, self.last_built_dir)
        )
        right_card_layout.addWidget(self.tree_view, 1)

        # Selection shortcuts
        sel_row = QHBoxLayout()
        self.btn_select_all = QPushButton()
        self.btn_select_all.setIcon(icon_service.icon("list-checks", size=14))
        set_variant(self.btn_select_all, "ghost")
        self.btn_select_all.clicked.connect(lambda: self._set_all_checked(True))

        self.btn_deselect_all = QPushButton()
        self.btn_deselect_all.setIcon(icon_service.icon("square-dashed", size=14))
        set_variant(self.btn_deselect_all, "ghost")
        self.btn_deselect_all.clicked.connect(lambda: self._set_all_checked(False))

        sel_row.addWidget(self.btn_select_all)
        sel_row.addWidget(self.btn_deselect_all)
        sel_row.addStretch()
        right_card_layout.addLayout(sel_row)

        # Themed Generation Options Soft Panel (Resolves L2 dark slab bug)
        options_box = QFrame()
        options_box.setObjectName("optionsBox")
        opt_layout = QVBoxLayout(options_box)
        opt_layout.setContentsMargins(12, 12, 12, 12)
        opt_layout.setSpacing(10)

        # Policy row with rich ThemedComboBox
        policy_row = QHBoxLayout()
        self.lbl_policy = QLabel()
        self.lbl_policy.setObjectName("caption")
        
        self.combo_policy = ThemedComboBox()
        self.combo_policy.add_themed_item(
            ItemPolicy.SKIP, "policy_skip", "shield-check",
            "policy_skip_desc", i18n.t("badge_default")
        )
        self.combo_policy.add_themed_item(
            ItemPolicy.OVERWRITE, "policy_overwrite", "triangle-alert",
            "policy_overwrite_desc", None
        )
        self.combo_policy.add_themed_item(
            ItemPolicy.AUTO_RENAME, "policy_auto_rename", "copy-plus",
            "policy_rename_desc", None
        )
        saved_pol = settings.get_policy()
        idx = self.combo_policy.findData(saved_pol)
        if idx >= 0:
            self.combo_policy.setCurrentIndex(idx)
        self.combo_policy.activated.connect(self._on_policy_changed)

        policy_row.addWidget(self.lbl_policy)
        policy_row.addWidget(self.combo_policy, 1)
        opt_layout.addLayout(policy_row)

        # Switch checkboxes
        self.chk_add_init = QCheckBox()
        self.chk_add_init.setChecked(settings.get_bool("builder/add_init", True))
        self.chk_add_init.toggled.connect(lambda c: settings.set_bool("builder/add_init", c))
        opt_layout.addWidget(self.chk_add_init)

        self.chk_starter = QCheckBox()
        self.chk_starter.setChecked(settings.get_bool("builder/starter_content", True))
        self.chk_starter.toggled.connect(lambda c: settings.set_bool("builder/starter_content", c))
        opt_layout.addWidget(self.chk_starter)

        self.chk_dry_run = QCheckBox()
        opt_layout.addWidget(self.chk_dry_run)

        right_card_layout.addWidget(options_box)

        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        right_card_layout.addWidget(self.progress_bar)

        # Primary Action Row (44px height Build button)
        btn_action_row = QHBoxLayout()
        self.btn_build = QPushButton()
        self.btn_build.setObjectName("btnBuild")
        self.btn_build.setFixedHeight(44)
        self.btn_build.setIcon(icon_service.icon("hammer", size=18, role="on_accent"))
        set_variant(self.btn_build, "primary")
        set_button_text(self.btn_build, i18n.t("build_button"))
        self.btn_build.clicked.connect(self._build_tree)

        self.btn_cancel = QPushButton()
        self.btn_cancel.setFixedHeight(44)
        self.btn_cancel.setVisible(False)
        set_variant(self.btn_cancel, "ghost")
        self.btn_cancel.clicked.connect(self._cancel_build)

        self.btn_open_folder = QPushButton()
        self.btn_open_folder.setFixedHeight(44)
        self.btn_open_folder.setIcon(icon_service.icon("folder-open", size=16))
        self.btn_open_folder.setVisible(False)
        self.btn_open_folder.clicked.connect(self._open_created_folder)

        btn_action_row.addWidget(self.btn_build, 2)
        btn_action_row.addWidget(self.btn_cancel, 1)
        btn_action_row.addWidget(self.btn_open_folder, 1)
        right_card_layout.addLayout(btn_action_row)

        right_layout.addWidget(right_card)
        splitter.addWidget(right_widget)

        splitter.setSizes([480, 520])
        main_layout.addWidget(splitter, 1)

    def _on_policy_changed(self) -> None:
        pol = self.combo_policy.currentData()
        if pol:
            settings.set_policy(pol)

    def _load_example(self) -> None:
        self.tree_input.setPlainText(EXAMPLE_TREE)
        self._on_text_changed()

    def _clear_input(self) -> None:
        self.tree_input.clear()
        self.tree_view.clear()
        self.lbl_stats.setText("0 folders, 0 files")
        self.current_parsed_root = None

    def _populate_recent_paths(self) -> None:
        recents = settings.get_recent_paths()
        if not recents:
            home_dir = str(Path.home() / "Projects")
            recents = [home_dir]
        self.dest_combo.set_recent_paths(recents)

    def _browse_destination(self) -> None:
        chosen = QFileDialog.getExistingDirectory(
            self, i18n.t("select_folder"), self.dest_combo.currentText()
        )
        if chosen:
            self.dest_combo.setEditText(chosen)
            settings.add_recent_path(chosen)
            self._populate_recent_paths()

    def _on_text_changed(self) -> None:
        text = self.tree_input.toPlainText().strip()
        if not text:
            self.tree_view.clear()
            self.lbl_stats.setText("0 folders, 0 files")
            self.current_parsed_root = None
            return

        result = self.parser.parse(text)
        if result.root:
            self.current_parsed_root = result.root
            self._render_tree_view(result.root)
            self.lbl_stats.setText(i18n.t("items_count", folders=result.total_folders, files=result.total_files))

    def _render_tree_view(self, root: TreeNode) -> None:
        self.tree_view.blockSignals(True)
        self.tree_view.clear()

        def add_items(parent_widget, node: TreeNode) -> None:
            item = QTreeWidgetItem(parent_widget)
            item.setText(0, node.name)
            item.setText(1, i18n.t("type_folder") if node.is_dir else i18n.t("type_file"))
            item.setCheckState(0, Qt.CheckState.Checked if node.enabled else Qt.CheckState.Unchecked)
            item.setData(0, Qt.ItemDataRole.UserRole, node)

            # High-fidelity semantic Lucide icon
            item.setIcon(0, icon_service.file_icon_for(node.name, is_dir=node.is_dir))

            for child in node.children:
                add_items(item, child)

        add_items(self.tree_view, root)
        self.tree_view.expandAll()
        self.tree_view.blockSignals(False)

    def _on_tree_item_changed(self, item: QTreeWidgetItem, column: int) -> None:
        if column == 0:
            node: Optional[TreeNode] = item.data(0, Qt.ItemDataRole.UserRole)
            if node:
                node.enabled = (item.checkState(0) == Qt.CheckState.Checked)

    def _set_all_checked(self, checked: bool) -> None:
        state = Qt.CheckState.Checked if checked else Qt.CheckState.Unchecked

        def update_item(item: QTreeWidgetItem) -> None:
            item.setCheckState(0, state)
            node: Optional[TreeNode] = item.data(0, Qt.ItemDataRole.UserRole)
            if node:
                node.enabled = checked
            for i in range(item.childCount()):
                update_item(item.child(i))

        for i in range(self.tree_view.topLevelItemCount()):
            update_item(self.tree_view.topLevelItem(i))

    def _build_tree(self) -> None:
        if not self.current_parsed_root:
            show_toast(self, i18n.t("toast_parse_err", count=1), "warning")
            return

        dest_text = self.dest_combo.currentText().strip()
        if not dest_text:
            show_toast(self, "Please select a destination directory first", "error")
            return

        dest_path = Path(dest_text).resolve()
        policy = self.combo_policy.currentData() or ItemPolicy.SKIP
        add_init = self.chk_add_init.isChecked()
        starter = self.chk_starter.isChecked()
        dry_run = self.chk_dry_run.isChecked()

        builder = TreeBuilder(
            policy=policy,
            add_init_py=add_init,
            create_starter_content=starter,
            dry_run=dry_run
        )

        self.btn_build.setEnabled(False)
        self.btn_cancel.setVisible(True)
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)

        self.worker = BuilderWorker(builder, self.current_parsed_root, dest_path)
        self.worker.progress.connect(self._on_worker_progress)
        self.worker.finished_build.connect(self._on_worker_finished)
        self.worker.error_occurred.connect(self._on_worker_error)
        self.worker.start()

    def _on_worker_progress(self, current: int, total: int, item_name: str) -> None:
        percent = int((current / max(1, total)) * 100)
        self.progress_bar.setValue(percent)

    def _on_worker_finished(self, stats: BuildStats) -> None:
        self.btn_build.setEnabled(True)
        self.btn_cancel.setVisible(False)
        self.progress_bar.setVisible(False)

        dest_dir = Path(self.dest_combo.currentText()).resolve()
        settings.add_recent_path(str(dest_dir))
        self.last_built_dir = dest_dir / self.current_parsed_root.name

        if self.chk_dry_run.isChecked():
            show_toast(self, i18n.t("toast_dry_ok", count=stats.total_created), "info")
        else:
            show_toast(self, i18n.t("toast_build_ok", count=stats.total_created), "success")
            self.btn_open_folder.setVisible(True)
            self.tree_built.emit(str(self.last_built_dir), self.current_parsed_root)

    def _on_worker_error(self, err_msg: str) -> None:
        self.btn_build.setEnabled(True)
        self.btn_cancel.setVisible(False)
        self.progress_bar.setVisible(False)
        show_toast(self, f"Build error: {err_msg}", "error")

    def _cancel_build(self) -> None:
        if self.worker:
            self.worker.cancel()
            show_toast(self, "Cancelling generation...", "warning")

    def _open_created_folder(self) -> None:
        if self.last_built_dir and self.last_built_dir.exists():
            QDesktopServices.openUrl(QUrl.fromLocalFile(str(self.last_built_dir)))

    def _on_theme_changed(self, theme_name: str = "") -> None:
        """Refresh icons and button styles on theme change."""
        self.btn_build.setIcon(icon_service.icon("hammer", size=18, role="on_accent"))
        set_variant(self.btn_build, "primary")

    def retranslate_ui(self) -> None:
        """Live translation updates for all labels and controls."""
        self.header.set_texts(i18n.t("builder_title"), i18n.t("builder_desc"))
        self.lbl_tree_input.setText(i18n.t("nav_builder"))
        set_button_text(self.btn_load_example, i18n.t("load_example"))
        set_button_text(self.btn_clear, i18n.t("clear_input"))
        self.lbl_dest.setText(i18n.t("dest_folder"))
        set_button_text(self.btn_browse, i18n.t("browse"))
        self.lbl_preview_title.setText(i18n.t("preview_title"))
        self.tree_view.setHeaderLabels([i18n.t("col_item"), i18n.t("col_type")])
        set_button_text(self.btn_select_all, i18n.t("select_all"))
        set_button_text(self.btn_deselect_all, i18n.t("deselect_all"))
        self.lbl_policy.setText(i18n.t("policy_label"))
        self.combo_policy.retranslate()
        self.chk_add_init.setText(i18n.t("opt_add_init"))
        self.chk_starter.setText(i18n.t("opt_starter_content"))
        self.chk_dry_run.setText(i18n.t("opt_dry_run"))
        set_button_text(self.btn_build, i18n.t("build_button"))
        self.btn_build.setIcon(icon_service.icon("hammer", size=18, role="on_accent"))
        set_button_text(self.btn_cancel, i18n.t("cancel"))
        set_button_text(self.btn_open_folder, i18n.t("open_folder"))
        self.tree_input.setPlaceholderText(i18n.t("tree_input_placeholder"))
