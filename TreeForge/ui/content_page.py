"""Content workspace for TreeForge: Single file editing and batch multi-file injection."""

from pathlib import Path
from typing import Optional, List, Dict
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QKeySequence, QShortcut
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QSplitter, QTreeWidget, QTreeWidgetItem, QTableWidget,
    QTableWidgetItem, QComboBox, QCheckBox, QTabWidget,
    QTextEdit, QProgressBar, QMessageBox, QHeaderView
)

from ..core.models import TreeNode, FileChunk, MatchStatus, ItemPolicy, NewlineMode, BuildStats
from ..core.content_splitter import ContentSplitter
from ..core.file_writer import FileWriter
from ..core.worker import BatchWriterWorker
from ..services.i18n_service import i18n
from ..services.theme_service import theme
from ..services.settings_service import settings
from .code_editor import CodeEditor
from .toast import show_toast
from .styles import create_card_frame, create_section_header


class ContentPage(QWidget):
    """View for single file editing and batch multi-file saving."""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.current_root_dir: Optional[Path] = None
        self.tree_files: List[str] = []
        self.chunks: List[FileChunk] = []
        self.queue: List[Tuple[str, str]] = []  # (path, content)
        self.file_writer = FileWriter()
        self.worker: Optional[BatchWriterWorker] = None

        self._setup_ui()
        self.retranslate_ui()
        i18n.language_changed.connect(self.retranslate_ui)

    def _setup_ui(self) -> None:
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(14)

        # Header
        self.header = create_section_header(
            i18n.t("content_title"),
            i18n.t("content_desc")
        )
        main_layout.addWidget(self.header)

        # Top Tabs: Single Editor vs Batch Splitter vs Queue
        self.tabs = QTabWidget()

        # TAB 1: Single File Editor
        tab_single = QWidget()
        single_layout = QHBoxLayout(tab_single)
        single_layout.setContentsMargins(10, 10, 10, 10)

        single_splitter = QSplitter(Qt.Orientation.Horizontal)

        # File Tree Selector
        left_box = QWidget()
        left_l = QVBoxLayout(left_box)
        left_l.setContentsMargins(0, 0, 5, 0)
        self.lbl_tree = QLabel("Project Files")
        self.lbl_tree.setStyleSheet("font-weight: 600;")
        left_l.addWidget(self.lbl_tree)

        self.single_tree = QTreeWidget()
        self.single_tree.setHeaderHidden(True)
        self.single_tree.itemClicked.connect(self._on_single_file_selected)
        left_l.addWidget(self.single_tree, 1)
        single_splitter.addWidget(left_box)

        # Editor Area
        editor_box = QWidget()
        ed_layout = QVBoxLayout(editor_box)
        ed_layout.setContentsMargins(5, 0, 0, 0)
        ed_layout.setSpacing(8)

        ed_bar = QHBoxLayout()
        self.lbl_current_file = QLabel("No file selected")
        self.lbl_current_file.setStyleSheet("font-weight: 600; color: #10b981;")
        ed_bar.addWidget(self.lbl_current_file)
        ed_bar.addStretch()

        self.btn_save_single = QPushButton(i18n.t("save_file"))
        self.btn_save_single.setProperty("class", "primary")
        self.btn_save_single.clicked.connect(self._save_single_file)
        ed_bar.addWidget(self.btn_save_single)

        self.btn_add_queue = QPushButton(i18n.t("add_to_queue"))
        self.btn_add_queue.clicked.connect(self._add_current_to_queue)
        ed_bar.addWidget(self.btn_add_queue)

        ed_layout.addLayout(ed_bar)

        self.editor = CodeEditor()
        # Keep code editor strictly LTR even in Arabic mode
        self.editor.setLayoutDirection(Qt.LayoutDirection.LeftToRight)
        ed_layout.addWidget(self.editor, 1)

        single_splitter.addWidget(editor_box)
        single_splitter.setSizes([260, 640])
        single_layout.addWidget(single_splitter)
        self.tabs.addTab(tab_single, i18n.t("tab_single"))

        # TAB 2: Batch Smart Splitter
        tab_batch = QWidget()
        batch_layout = QVBoxLayout(tab_batch)
        batch_layout.setContentsMargins(10, 10, 10, 10)
        batch_layout.setSpacing(10)

        batch_splitter = QSplitter(Qt.Orientation.Vertical)

        # Top: Batch input text & options
        top_batch = QWidget()
        tb_layout = QVBoxLayout(top_batch)
        tb_layout.setContentsMargins(0, 0, 0, 6)

        opts_row = QHBoxLayout()
        self.chk_strip_fences = QCheckBox(i18n.t("opt_strip_fences"))
        self.chk_strip_fences.setChecked(True)
        self.chk_backups = QCheckBox(i18n.t("opt_backup"))
        self.chk_backups.setChecked(True)
        self.chk_bom = QCheckBox(i18n.t("bom_toggle"))

        self.combo_newline = QComboBox()
        self.combo_newline.addItem(i18n.t("nl_keep"), NewlineMode.KEEP)
        self.combo_newline.addItem(i18n.t("nl_lf"), NewlineMode.LF)
        self.combo_newline.addItem(i18n.t("nl_crlf"), NewlineMode.CRLF)

        opts_row.addWidget(self.chk_strip_fences)
        opts_row.addWidget(self.chk_backups)
        opts_row.addWidget(self.chk_bom)
        opts_row.addWidget(self.combo_newline)
        opts_row.addStretch()
        tb_layout.addLayout(opts_row)

        self.batch_input = QTextEdit()
        self.batch_input.setPlaceholderText(i18n.t("batch_input_placeholder"))
        self.batch_input.setFontFamily("Consolas")
        self.batch_input.setLayoutDirection(Qt.LayoutDirection.LeftToRight)
        tb_layout.addWidget(self.batch_input, 1)

        btn_parse_batch = QPushButton(i18n.t("split_and_match"))
        btn_parse_batch.setProperty("class", "primary")
        btn_parse_batch.clicked.connect(self._parse_and_match_batch)
        tb_layout.addWidget(btn_parse_batch)

        batch_splitter.addWidget(top_batch)

        # Bottom: Match Table Preview & Action Buttons
        bot_batch = QWidget()
        bb_layout = QVBoxLayout(bot_batch)
        bb_layout.setContentsMargins(0, 6, 0, 0)
        bb_layout.setSpacing(8)

        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels([
            i18n.t("col_include"), i18n.t("col_target"), i18n.t("col_status"),
            i18n.t("col_lines"), i18n.t("col_size"), i18n.t("col_marker")
        ])
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.table.setAlternatingRowColors(True)
        bb_layout.addWidget(self.table, 1)

        # Batch Action Row
        action_row = QHBoxLayout()
        self.btn_save_batch = QPushButton(i18n.t("save_selected"))
        self.btn_save_batch.setProperty("class", "primary")
        self.btn_save_batch.clicked.connect(self._save_selected_batch)

        self.btn_undo = QPushButton(i18n.t("undo_batch"))
        self.btn_undo.clicked.connect(self._undo_batch)

        self.btn_export_installer = QPushButton("Export create_project.py")
        self.btn_export_installer.clicked.connect(self._export_standalone_script)

        self.batch_progress = QProgressBar()
        self.batch_progress.setVisible(False)

        action_row.addWidget(self.btn_save_batch, 2)
        action_row.addWidget(self.btn_undo, 1)
        action_row.addWidget(self.btn_export_installer, 1)
        action_row.addWidget(self.batch_progress, 2)
        bb_layout.addLayout(action_row)

        batch_splitter.addWidget(bot_batch)
        batch_splitter.setSizes([280, 360])
        batch_layout.addWidget(batch_splitter)
        self.tabs.addTab(tab_batch, i18n.t("tab_batch"))

        # TAB 3: Queue Mode
        tab_queue = QWidget()
        q_layout = QVBoxLayout(tab_queue)
        q_layout.setContentsMargins(10, 10, 10, 10)
        q_layout.setSpacing(10)

        self.lbl_queue_info = QLabel(i18n.t("queue_count", count=0))
        self.lbl_queue_info.setStyleSheet("font-weight: 600; font-size: 14px;")
        q_layout.addWidget(self.lbl_queue_info)

        self.queue_table = QTableWidget()
        self.queue_table.setColumnCount(3)
        self.queue_table.setHorizontalHeaderLabels(["Target File", "Lines", "Size"])
        self.queue_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        q_layout.addWidget(self.queue_table, 1)

        q_btn_row = QHBoxLayout()
        self.btn_save_queue = QPushButton(i18n.t("save_queue"))
        self.btn_save_queue.setProperty("class", "primary")
        self.btn_save_queue.clicked.connect(self._save_queue)
        self.btn_clear_queue = QPushButton(i18n.t("clear_queue"))
        self.btn_clear_queue.clicked.connect(self._clear_queue)

        q_btn_row.addWidget(self.btn_save_queue, 2)
        q_btn_row.addWidget(self.btn_clear_queue, 1)
        q_btn_row.addStretch()
        q_layout.addLayout(q_btn_row)

        self.tabs.addTab(tab_queue, i18n.t("tab_queue"))

        main_layout.addWidget(self.tabs, 1)

        # Shortcut Ctrl+S for saving single file
        self.shortcut_save = QShortcut(QKeySequence("Ctrl+S"), self)
        self.shortcut_save.activated.connect(self._save_single_file)

    def load_tree_from_disk(self, root_dir_str: str, root_node: Optional[TreeNode] = None) -> None:
        """Populate file tree and candidate paths from active workspace."""
        self.current_root_dir = Path(root_dir_str).resolve()
        self.tree_files.clear()
        self.single_tree.clear()

        if not self.current_root_dir.exists():
            return

        def populate(parent_item, dir_path: Path) -> None:
            for p in sorted(dir_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
                item = QTreeWidgetItem(parent_item)
                item.setText(0, p.name)
                item.setData(0, Qt.ItemDataRole.UserRole, str(p))

                if p.is_dir():
                    item.setIcon(0, theme.get_icon("folder"))
                    populate(item, p)
                else:
                    rel = str(p.relative_to(self.current_root_dir)).replace("\\", "/")
                    self.tree_files.append(rel)
                    icon_name = "python" if p.name.endswith(".py") else "file"
                    item.setIcon(0, theme.get_icon(icon_name))

        root_item = QTreeWidgetItem(self.single_tree)
        root_item.setText(0, self.current_root_dir.name)
        root_item.setData(0, Qt.ItemDataRole.UserRole, str(self.current_root_dir))
        root_item.setIcon(0, theme.get_icon("folder"))
        populate(root_item, self.current_root_dir)
        root_item.setExpanded(True)

    def _on_single_file_selected(self, item: QTreeWidgetItem, _) -> None:
        path_str = item.data(0, Qt.ItemDataRole.UserRole)
        if not path_str:
            return
        p = Path(path_str)
        if p.is_file():
            self.lbl_current_file.setText(str(p.relative_to(self.current_root_dir)))
            try:
                content = p.read_text(encoding="utf-8", errors="replace")
                self.editor.setPlainText(content)
            except Exception as e:
                show_toast(self, f"Could not read file: {e}", "error")

    def _save_single_file(self) -> None:
        if not self.current_root_dir:
            show_toast(self, "No project folder currently open", "warning")
            return
        rel = self.lbl_current_file.text()
        if not rel or rel == "No file selected":
            show_toast(self, "Please select a file to save into", "warning")
            return

        target_path = self.current_root_dir / rel
        content = self.editor.toPlainText()
        success, msg, _ = self.file_writer.write_file(target_path, content)
        if success:
            show_toast(self, i18n.t("saved_success"), "success")
        else:
            show_toast(self, f"Save failed: {msg}", "error")

    def _add_current_to_queue(self) -> None:
        rel = self.lbl_current_file.text()
        if not rel or rel == "No file selected":
            show_toast(self, "Select a file first", "warning")
            return
        content = self.editor.toPlainText()
        self.queue.append((rel, content))
        self._update_queue_ui()
        show_toast(self, i18n.t("toast_queue_added", name=rel), "info")

    def _update_queue_ui(self) -> None:
        self.lbl_queue_info.setText(i18n.t("queue_count", count=len(self.queue)))
        self.queue_table.setRowCount(len(self.queue))
        for r, (path, content) in enumerate(self.queue):
            self.queue_table.setItem(r, 0, QTableWidgetItem(path))
            self.queue_table.setItem(r, 1, QTableWidgetItem(str(len(content.splitlines()))))
            self.queue_table.setItem(r, 2, QTableWidgetItem(f"{len(content.encode('utf-8'))} B"))

    def _save_queue(self) -> None:
        if not self.current_root_dir or not self.queue:
            return
        for path, content in self.queue:
            target = self.current_root_dir / path
            self.file_writer.write_file(target, content)
        show_toast(self, f"Saved {len(self.queue)} queued files!", "success")
        self._clear_queue()

    def _clear_queue(self) -> None:
        self.queue.clear()
        self._update_queue_ui()

    def _parse_and_match_batch(self) -> None:
        text = self.batch_input.toPlainText()
        if not text.strip():
            show_toast(self, "Please paste batch content first", "warning")
            return

        splitter = ContentSplitter(
            strip_fences=self.chk_strip_fences.isChecked(),
            newline_mode=self.combo_newline.currentData() or NewlineMode.KEEP
        )
        self.chunks = splitter.split(text, available_paths=self.tree_files)
        self._render_batch_table()

    def _render_batch_table(self) -> None:
        self.table.setRowCount(len(self.chunks))
        for r, chunk in enumerate(self.chunks):
            # Column 0: Checkbox
            chk_widget = QWidget()
            chk_l = QHBoxLayout(chk_widget)
            chk_l.setContentsMargins(4, 2, 4, 2)
            chk_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
            cb = QCheckBox()
            cb.setChecked(chunk.included)
            cb.toggled.connect(lambda checked, c=chunk: setattr(c, "included", checked))
            chk_l.addWidget(cb)
            self.table.setCellWidget(r, 0, chk_widget)

            # Column 1: Target path (Dropdown for Ambiguous or Unmatched, Text for Matched)
            if chunk.match_status == MatchStatus.AMBIGUOUS and chunk.candidate_paths:
                combo = QComboBox()
                for cand in chunk.candidate_paths:
                    combo.addItem(cand)
                combo.setCurrentText(chunk.resolved_path)
                combo.currentTextChanged.connect(lambda txt, c=chunk: setattr(c, "resolved_path", txt))
                self.table.setCellWidget(r, 1, combo)
            else:
                self.table.setItem(r, 1, QTableWidgetItem(chunk.resolved_path or chunk.raw_target_path))

            # Column 2: Status
            status_text = {
                MatchStatus.MATCHED: i18n.t("status_matched"),
                MatchStatus.AMBIGUOUS: i18n.t("status_ambiguous"),
                MatchStatus.NOT_FOUND: i18n.t("status_not_found"),
            }.get(chunk.match_status, "Unknown")

            status_item = QTableWidgetItem(status_text)
            if chunk.match_status == MatchStatus.MATCHED:
                status_item.setForeground(theme.palette["success"])
            elif chunk.match_status == MatchStatus.AMBIGUOUS:
                status_item.setForeground(theme.palette["warning"])
            else:
                status_item.setForeground(theme.palette["error"])
            self.table.setItem(r, 2, status_item)

            # Column 3: Lines
            self.table.setItem(r, 3, QTableWidgetItem(str(chunk.line_count)))

            # Column 4: Size
            self.table.setItem(r, 4, QTableWidgetItem(f"{chunk.size_bytes} B"))

            # Column 5: Marker
            self.table.setItem(r, 5, QTableWidgetItem(chunk.marker_type))

    def _save_selected_batch(self) -> None:
        if not self.current_root_dir:
            show_toast(self, "Please select or build a project directory first", "warning")
            return

        selected_chunks = [c for c in self.chunks if c.included and c.resolved_path]
        if not selected_chunks:
            show_toast(self, "No valid files selected for saving", "warning")
            return

        # Confirm overwrite if files exist
        existing = [c.resolved_path for c in selected_chunks if (self.current_root_dir / c.resolved_path).exists()]
        if existing:
            reply = QMessageBox.question(
                self,
                i18n.t("confirm_overwrite_title"),
                i18n.t("confirm_overwrite_msg", count=len(existing)),
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            if reply != QMessageBox.StandardButton.Yes:
                return

        self.file_writer = FileWriter(
            policy=ItemPolicy.OVERWRITE,
            create_backups=self.chk_backups.isChecked(),
            use_bom=self.chk_bom.isChecked(),
            newline_mode=self.combo_newline.currentData() or NewlineMode.KEEP
        )

        self.btn_save_batch.setEnabled(False)
        self.batch_progress.setVisible(True)
        self.batch_progress.setValue(0)

        self.worker = BatchWriterWorker(self.file_writer, selected_chunks, self.current_root_dir)
        self.worker.progress.connect(self._on_batch_progress)
        self.worker.finished_batch.connect(self._on_batch_finished)
        self.worker.error_occurred.connect(self._on_batch_error)
        self.worker.start()

    def _on_batch_progress(self, current: int, total: int, item_name: str) -> None:
        self.batch_progress.setValue(int((current / max(1, total)) * 100))

    def _on_batch_finished(self, stats: BuildStats) -> None:
        self.btn_save_batch.setEnabled(True)
        self.batch_progress.setVisible(False)
        show_toast(self, f"Saved {len(stats.created_files)} files successfully!", "success")
        # Reload tree from disk
        if self.current_root_dir:
            self.load_tree_from_disk(str(self.current_root_dir))

    def _on_batch_error(self, err_msg: str) -> None:
        self.btn_save_batch.setEnabled(True)
        self.batch_progress.setVisible(False)
        show_toast(self, f"Batch save error: {err_msg}", "error")

    def _undo_batch(self) -> None:
        restored, errors = self.file_writer.undo_last_batch()
        if restored > 0:
            show_toast(self, i18n.t("toast_undo_ok", count=restored), "success")
            if self.current_root_dir:
                self.load_tree_from_disk(str(self.current_root_dir))
        else:
            show_toast(self, "No backups available to restore", "info")

    def _export_standalone_script(self) -> None:
        """Export all valid chunks as a single self-extracting create_project.py script."""
        to_export = {c.resolved_path: c.content for c in self.chunks if c.included and c.resolved_path}
        if not to_export:
            show_toast(self, "No valid file chunks to export.", "warning")
            return

        from PyQt6.QtWidgets import QFileDialog
        from ..core.file_writer import generate_standalone_installer
        dest_file, _ = QFileDialog.getSaveFileName(
            self,
            "Save Standalone Installer Script",
            "create_project.py",
            "Python Scripts (*.py)"
        )
        if dest_file:
            script = generate_standalone_installer(to_export, "MyProject")
            try:
                Path(dest_file).write_text(script, encoding="utf-8")
                show_toast(self, "create_project.py saved successfully!", "success")
            except Exception as e:
                show_toast(self, f"Failed saving installer: {e}", "error")

    def retranslate_ui(self) -> None:
        self.tabs.setTabText(0, i18n.t("tab_single"))
        self.tabs.setTabText(1, i18n.t("tab_batch"))
        self.tabs.setTabText(2, i18n.t("tab_queue"))
        self.btn_save_single.setText(i18n.t("save_file"))
        self.btn_add_queue.setText(i18n.t("add_to_queue"))
        self.chk_strip_fences.setText(i18n.t("opt_strip_fences"))
        self.chk_backups.setText(i18n.t("opt_backup"))
        self.chk_bom.setText(i18n.t("bom_toggle"))
        self.btn_save_batch.setText(i18n.t("save_selected"))
        self.btn_undo.setText(i18n.t("undo_batch"))
        self.btn_save_queue.setText(i18n.t("save_queue"))
        self.btn_clear_queue.setText(i18n.t("clear_queue"))
