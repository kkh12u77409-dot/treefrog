"""Builder page for TreeForge: transforms text trees into physical directory structures."""

from pathlib import Path
from typing import Optional, Dict
from PyQt6.QtCore import Qt, pyqtSignal, QUrl
from PyQt6.QtGui import QDesktopServices, QIcon
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QTextEdit,
    QPushButton, QFileDialog, QComboBox, QCheckBox, QSplitter,
    QProgressBar, QTreeWidget, QTreeWidgetItem, QFrame, QMessageBox,
    QHeaderView
)

from ..core.tree_parser import TreeParser
from ..core.tree_builder import TreeBuilder
from ..core.models import TreeNode, ItemPolicy, BuildStats
from ..core.worker import BuilderWorker
from ..services.i18n_service import i18n
from ..services.theme_service import theme
from ..services.settings_service import settings
from .toast import show_toast
from .styles import create_card_frame, create_section_header


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

    def _setup_ui(self) -> None:
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(16)

        # Header
        self.header = create_section_header(
            i18n.t("builder_title"),
            i18n.t("builder_desc")
        )
        main_layout.addWidget(self.header)

        # Splitter: Left is Tree input & controls, Right is Live preview & options
        splitter = QSplitter(Qt.Orientation.Horizontal, self)
        splitter.setChildrenCollapsible(False)

        # LEFT PANEL: Tree input
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        left_layout.setContentsMargins(0, 0, 8, 0)
        left_layout.setSpacing(10)

        left_card = create_card_frame(left_widget)
        card_layout = QVBoxLayout(left_card)
        card_layout.setContentsMargins(14, 14, 14, 14)
        card_layout.setSpacing(10)

        # Action row above text area
        action_row = QHBoxLayout()
        self.btn_load_example = QPushButton()
        self.btn_load_example.clicked.connect(self._load_example)
        self.btn_clear = QPushButton()
        self.btn_clear.clicked.connect(self._clear_input)
        action_row.addWidget(self.btn_load_example)
        action_row.addWidget(self.btn_clear)
        action_row.addStretch()
        card_layout.addLayout(action_row)

        # Text input
        self.tree_input = QTextEdit()
        self.tree_input.setPlaceholderText(i18n.t("tree_input_placeholder"))
        self.tree_input.setFontFamily("Consolas")
        self.tree_input.textChanged.connect(self._on_text_changed)
        card_layout.addWidget(self.tree_input)

        # Destination folder picker
        dest_label = QLabel(i18n.t("dest_folder"))
        dest_label.setStyleSheet("font-weight: 600;")
        card_layout.addWidget(dest_label)

        dest_row = QHBoxLayout()
        self.dest_combo = QComboBox()
        self.dest_combo.setEditable(True)
        self.dest_combo.lineEdit().setPlaceholderText("/path/to/destination")
        self._populate_recent_paths()
        dest_row.addWidget(self.dest_combo, 1)

        self.btn_browse = QPushButton()
        self.btn_browse.clicked.connect(self._browse_destination)
        dest_row.addWidget(self.btn_browse)
        card_layout.addLayout(dest_row)

        left_layout.addWidget(left_card)
        splitter.addWidget(left_widget)

        # RIGHT PANEL: Preview & options
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        right_layout.setContentsMargins(8, 0, 0, 0)
        right_layout.setSpacing(10)

        right_card = create_card_frame(right_widget)
        right_card_layout = QVBoxLayout(right_card)
        right_card_layout.setContentsMargins(14, 14, 14, 14)
        right_card_layout.setSpacing(12)

        # Preview header & counts
        prev_head_row = QHBoxLayout()
        self.lbl_preview_title = QLabel(i18n.t("preview_title"))
        self.lbl_preview_title.setStyleSheet("font-weight: 600; font-size: 14px;")
        self.lbl_stats = QLabel("0 Folders, 0 Files")
        self.lbl_stats.setStyleSheet("color: #10b981; font-weight: 500;")
        prev_head_row.addWidget(self.lbl_preview_title)
        prev_head_row.addStretch()
        prev_head_row.addWidget(self.lbl_stats)
        right_card_layout.addLayout(prev_head_row)

        # Live TreeView with checkboxes
        self.tree_view = QTreeWidget()
        self.tree_view.setHeaderLabels(["Item", "Type"])
        self.tree_view.header().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.tree_view.itemChanged.connect(self._on_tree_item_changed)
        right_card_layout.addWidget(self.tree_view, 1)

        # Selection shortcuts
        sel_row = QHBoxLayout()
        self.btn_select_all = QPushButton(i18n.t("select_all"))
        self.btn_select_all.clicked.connect(lambda: self._set_all_checked(True))
        self.btn_deselect_all = QPushButton(i18n.t("deselect_all"))
        self.btn_deselect_all.clicked.connect(lambda: self._set_all_checked(False))
        sel_row.addWidget(self.btn_select_all)
        sel_row.addWidget(self.btn_deselect_all)
        sel_row.addStretch()
        right_card_layout.addLayout(sel_row)

        # Options Group
        options_box = QFrame()
        options_box.setStyleSheet("background-color: #182232; border-radius: 6px; padding: 10px;")
        opt_layout = QVBoxLayout(options_box)
        opt_layout.setSpacing(8)

        # Policy row
        policy_row = QHBoxLayout()
        self.lbl_policy = QLabel(i18n.t("policy_label"))
        self.combo_policy = QComboBox()
        self.combo_policy.addItem(i18n.t("policy_skip"), ItemPolicy.SKIP)
        self.combo_policy.addItem(i18n.t("policy_overwrite"), ItemPolicy.OVERWRITE)
        self.combo_policy.addItem(i18n.t("policy_auto_rename"), ItemPolicy.AUTO_RENAME)
        policy_row.addWidget(self.lbl_policy)
        policy_row.addWidget(self.combo_policy)
        policy_row.addStretch()
        opt_layout.addLayout(policy_row)

        self.chk_add_init = QCheckBox(i18n.t("opt_add_init"))
        self.chk_add_init.setChecked(settings.get_bool("builder/add_init", True))
        opt_layout.addWidget(self.chk_add_init)

        self.chk_starter = QCheckBox(i18n.t("opt_starter_content"))
        self.chk_starter.setChecked(settings.get_bool("builder/starter_content", True))
        opt_layout.addWidget(self.chk_starter)

        self.chk_dry_run = QCheckBox(i18n.t("opt_dry_run"))
        opt_layout.addWidget(self.chk_dry_run)

        right_card_layout.addWidget(options_box)

        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        right_card_layout.addWidget(self.progress_bar)

        # Action buttons
        btn_action_row = QHBoxLayout()
        self.btn_build = QPushButton(i18n.t("build_button"))
        self.btn_build.setProperty("class", "primary")
        self.btn_build.clicked.connect(self._build_tree)

        self.btn_cancel = QPushButton(i18n.t("cancel"))
        self.btn_cancel.setVisible(False)
        self.btn_cancel.clicked.connect(self._cancel_build)

        self.btn_open_folder = QPushButton(i18n.t("open_folder"))
        self.btn_open_folder.setVisible(False)
        self.btn_open_folder.clicked.connect(self._open_created_folder)

        btn_action_row.addWidget(self.btn_build, 2)
        btn_action_row.addWidget(self.btn_cancel, 1)
        btn_action_row.addWidget(self.btn_open_folder, 1)
        right_card_layout.addLayout(btn_action_row)

        right_layout.addWidget(right_card)
        splitter.addWidget(right_widget)

        splitter.setSizes([450, 550])
        main_layout.addWidget(splitter, 1)

    def _load_example(self) -> None:
        self.tree_input.setPlainText(EXAMPLE_TREE)
        self._on_text_changed()

    def _clear_input(self) -> None:
        self.tree_input.clear()
        self.tree_view.clear()
        self.lbl_stats.setText("0 Folders, 0 Files")
        self.current_parsed_root = None

    def _populate_recent_paths(self) -> None:
        self.dest_combo.clear()
        recents = settings.get_recent_paths()
        if not recents:
            # Default to home directory / Projects
            home_dir = str(Path.home())
            recents = [home_dir]
        for p in recents:
            self.dest_combo.addItem(p)

    def _browse_destination(self) -> None:
        chosen = QFileDialog.getExistingDirectory(self, i18n.t("select_folder"), self.dest_combo.currentText())
        if chosen:
            self.dest_combo.insertItem(0, chosen)
            self.dest_combo.setCurrentIndex(0)
            settings.add_recent_path(chosen)

    def _on_text_changed(self) -> None:
        text = self.tree_input.toPlainText().strip()
        if not text:
            self.tree_view.clear()
            self.lbl_stats.setText("0 Folders, 0 Files")
            self.current_parsed_root = None
            return

        result = self.parser.parse(text)
        if result.errors:
            first_err = result.errors[0]
            # Don't show toast on every keystroke, but can log
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
            item.setText(1, "Folder" if node.is_dir else "File")
            item.setCheckState(0, Qt.CheckState.Checked if node.enabled else Qt.CheckState.Unchecked)
            item.setData(0, Qt.ItemDataRole.UserRole, node)
            
            icon_name = "folder" if node.is_dir else ("python" if node.name.endswith(".py") else "file")
            item.setIcon(0, theme.get_icon(icon_name))

            for child in node.children:
                add_items(item, child)

        add_items(self.tree_view, root)
        self.tree_view.expandAll()
        self.tree_view.blockSignals(False)

    def _on_tree_item_changed(self, item: QTreeWidgetItem, column: int) -> None:
        if column == 0:
            node: Optional[TreeNode] = item.data(0, Qt.ItemDataRole.UserRole)
            if node:
                is_checked = (item.checkState(0) == Qt.CheckState.Checked)
                node.enabled = is_checked

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
            # Emit signal to notify content page
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

    def retranslate_ui(self) -> None:
        self.btn_load_example.setText(i18n.t("load_example"))
        self.btn_clear.setText(i18n.t("clear_input"))
        self.btn_browse.setText(i18n.t("browse"))
        self.lbl_preview_title.setText(i18n.t("preview_title"))
        self.btn_select_all.setText(i18n.t("select_all"))
        self.btn_deselect_all.setText(i18n.t("deselect_all"))
        self.lbl_policy.setText(i18n.t("policy_label"))
        self.chk_add_init.setText(i18n.t("opt_add_init"))
        self.chk_starter.setText(i18n.t("opt_starter_content"))
        self.chk_dry_run.setText(i18n.t("opt_dry_run"))
        self.btn_build.setText(i18n.t("build_button"))
        self.btn_cancel.setText(i18n.t("cancel"))
        self.btn_open_folder.setText(i18n.t("open_folder"))
