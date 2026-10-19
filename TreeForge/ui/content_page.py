"""Content workspace for TreeForge: Single file editing and batch multi-file injection."""

from pathlib import Path
from typing import Optional, List, Tuple
from PyQt6.QtCore import Qt, pyqtSignal, QUrl
from PyQt6.QtGui import QKeySequence, QShortcut, QDesktopServices
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QSplitter, QTreeWidget, QTreeWidgetItem, QTableWidget,
    QTableWidgetItem, QCheckBox, QTabWidget,
    QTextEdit, QProgressBar, QMessageBox, QHeaderView, QFrame
)

from ..core.models import TreeNode, FileChunk, MatchStatus, ItemPolicy, NewlineMode, BuildStats
from ..core.content_splitter import ContentSplitter
from ..core.file_writer import FileWriter
from ..core.worker import BatchWriterWorker
from ..services.i18n_service import i18n
from ..services.theme_service import theme, set_variant
from ..services.icon_service import icon_service
from .code_editor import CodeEditor
from .toast import show_toast
from .styles import create_card_frame, create_section_header, set_button_text
from .widgets.themed_combo import ThemedComboBox
from .context_menus import (
    attach_text_context_menu,
    create_project_files_context_menu,
    create_batch_table_context_menu
)


class ContentPage(QWidget):
    """View for single file editing, batch code splitting, and multi-file queue."""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.current_root_dir: Optional[Path] = None
        self.tree_files: List[str] = []
        self.chunks: List[FileChunk] = []
        self.queue: List[Tuple[str, str]] = []  # (rel_path, content)
        self.file_writer = FileWriter(policy=ItemPolicy.OVERWRITE, create_backups=True)
        self.worker: Optional[BatchWriterWorker] = None

        self._setup_ui()
        self.retranslate_ui()
        i18n.language_changed.connect(self.retranslate_ui)
        theme.theme_changed.connect(self._on_theme_changed)

    def _setup_ui(self) -> None:
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(24, 20, 24, 20)
        main_layout.setSpacing(14)

        # 1. Page Header (Dynamic SectionHeader for live retranslation)
        self.header = create_section_header(
            i18n.t("content_title"),
            i18n.t("content_desc")
        )
        main_layout.addWidget(self.header)

        # 2. Modern Tab Widget
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)

        # TAB 1: Single File Editor (B9: Unified matching cards and empty states)
        tab_single = QWidget()
        single_layout = QHBoxLayout(tab_single)
        single_layout.setContentsMargins(12, 12, 12, 12)

        single_splitter = QSplitter(Qt.Orientation.Horizontal)
        single_splitter.setHandleWidth(12)

        # Left Panel: Project Files Tree inside card
        left_card = create_card_frame(tab_single)
        left_card_l = QVBoxLayout(left_card)
        left_card_l.setContentsMargins(14, 12, 14, 14)
        left_card_l.setSpacing(8)

        tree_bar = QHBoxLayout()
        self.lbl_tree = QLabel(i18n.t("project_files"))
        self.lbl_tree.setObjectName("sectionTitle")
        tree_bar.addWidget(self.lbl_tree)
        tree_bar.addStretch()

        self.btn_refresh_tree = QPushButton()
        self.btn_refresh_tree.setIcon(icon_service.icon("refresh-cw", size=14))
        self.btn_refresh_tree.setFixedSize(28, 28)
        self.btn_refresh_tree.setToolTip(i18n.t("refresh"))
        set_variant(self.btn_refresh_tree, "ghost")
        self.btn_refresh_tree.clicked.connect(self._on_refresh_clicked)
        tree_bar.addWidget(self.btn_refresh_tree)
        left_card_l.addLayout(tree_bar)

        # B9: Left Tree Empty State
        self.left_empty_state = self._create_empty_state_widget(
            "folder-open", "empty_files_title", "empty_files_desc"
        )
        left_card_l.addWidget(self.left_empty_state, 1)

        self.single_tree = QTreeWidget()
        self.single_tree.setHeaderHidden(True)
        self.single_tree.setVisible(False)
        self.single_tree.itemClicked.connect(self._on_single_file_selected)
        self.single_tree.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.single_tree.customContextMenuRequested.connect(
            lambda pos: create_project_files_context_menu(
                self.single_tree, pos, self.current_root_dir,
                on_open_file=self._on_single_file_selected,
                on_refresh=self._on_refresh_clicked
            )
        )
        left_card_l.addWidget(self.single_tree, 1)
        single_splitter.addWidget(left_card)

        # Right Panel: Editor Workspace inside matching card
        ed_card = create_card_frame(tab_single)
        ed_card_l = QVBoxLayout(ed_card)
        ed_card_l.setContentsMargins(14, 12, 14, 14)
        ed_card_l.setSpacing(8)

        # Action toolbar above editor
        ed_bar = QHBoxLayout()
        self.lbl_current_file = QLabel(i18n.t("no_file_selected"))
        self.lbl_current_file.setObjectName("statLabel")
        ed_bar.addWidget(self.lbl_current_file)
        ed_bar.addStretch()

        self.btn_save_single = QPushButton()
        self.btn_save_single.setObjectName("btnSaveSingle")
        self.btn_save_single.setFixedHeight(36)
        self.btn_save_single.setIcon(icon_service.icon("save", size=16, role="disabled"))
        set_variant(self.btn_save_single, "primary_blue")
        set_button_text(self.btn_save_single, i18n.t("save_file"))
        self.btn_save_single.setEnabled(False)
        self.btn_save_single.clicked.connect(self._save_single_file)
        ed_bar.addWidget(self.btn_save_single)

        self.btn_add_queue = QPushButton()
        self.btn_add_queue.setFixedHeight(36)
        self.btn_add_queue.setIcon(icon_service.icon("list-plus", size=16))
        set_variant(self.btn_add_queue, "secondary")
        set_button_text(self.btn_add_queue, i18n.t("add_to_queue"))
        self.btn_add_queue.setEnabled(False)
        self.btn_add_queue.clicked.connect(self._add_current_to_queue)
        ed_bar.addWidget(self.btn_add_queue)
        ed_card_l.addLayout(ed_bar)

        # B9: Editor Empty State
        self.editor_empty_state = self._create_empty_state_widget(
            "file-code", "empty_editor_title", "empty_editor_desc"
        )
        ed_card_l.addWidget(self.editor_empty_state, 1)

        # Themed Code Editor (Strictly LTR for syntax)
        self.editor = CodeEditor(self)
        self.editor.setLayoutDirection(Qt.LayoutDirection.LeftToRight)
        self.editor.setVisible(False)
        ed_card_l.addWidget(self.editor, 1)

        single_splitter.addWidget(ed_card)
        single_splitter.setSizes([280, 700])
        single_layout.addWidget(single_splitter)
        self.tabs.addTab(tab_single, icon_service.icon("file-pen-line", size=16), i18n.t("tab_single"))

        # TAB 2: Batch Smart Splitter
        tab_batch = QWidget()
        batch_layout = QVBoxLayout(tab_batch)
        batch_layout.setContentsMargins(12, 12, 12, 12)
        batch_layout.setSpacing(12)

        batch_splitter = QSplitter(Qt.Orientation.Vertical)
        batch_splitter.setHandleWidth(12)

        # Top area: Input & formatting controls
        top_batch = QWidget()
        tb_layout = QVBoxLayout(top_batch)
        tb_layout.setContentsMargins(0, 0, 0, 8)
        tb_layout.setSpacing(8)

        opts_row = QHBoxLayout()
        self.chk_strip_fences = QCheckBox(i18n.t("opt_strip_fences"))
        self.chk_strip_fences.setChecked(True)
        self.chk_backups = QCheckBox(i18n.t("opt_backup"))
        self.chk_backups.setChecked(True)
        self.chk_bom = QCheckBox(i18n.t("bom_toggle"))

        self.combo_newline = ThemedComboBox(compact=True)
        self.combo_newline.add_themed_item(NewlineMode.KEEP, "nl_keep")
        self.combo_newline.add_themed_item(NewlineMode.LF, "nl_lf", desc_key="nl_lf_desc")
        self.combo_newline.add_themed_item(NewlineMode.CRLF, "nl_crlf", desc_key="nl_crlf_desc")

        opts_row.addWidget(self.chk_strip_fences)
        opts_row.addWidget(self.chk_backups)
        opts_row.addWidget(self.chk_bom)
        opts_row.addWidget(self.combo_newline)
        opts_row.addStretch()
        tb_layout.addLayout(opts_row)

        self.batch_input = QTextEdit()
        self.batch_input.setLayoutDirection(Qt.LayoutDirection.LeftToRight)
        self.batch_input.setPlaceholderText(i18n.t("batch_input_placeholder"))
        attach_text_context_menu(self.batch_input)
        tb_layout.addWidget(self.batch_input, 1)

        self.btn_parse_batch = QPushButton()
        self.btn_parse_batch.setObjectName("btnParseBatch")
        self.btn_parse_batch.setFixedHeight(36)
        self.btn_parse_batch.setIcon(icon_service.icon("split", size=16, role="on_blue"))
        set_variant(self.btn_parse_batch, "primary_blue")
        set_button_text(self.btn_parse_batch, i18n.t("split_and_match"))
        self.btn_parse_batch.clicked.connect(self._parse_and_match_batch)
        tb_layout.addWidget(self.btn_parse_batch)

        batch_splitter.addWidget(top_batch)

        # Bottom area: Match table & batch execution
        bot_batch = QWidget()
        bb_layout = QVBoxLayout(bot_batch)
        bb_layout.setContentsMargins(0, 8, 0, 0)
        bb_layout.setSpacing(10)

        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels([
            i18n.t("col_include"), i18n.t("col_target"), i18n.t("col_status"),
            i18n.t("col_lines"), i18n.t("col_size"), i18n.t("col_marker")
        ])
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.table.setAlternatingRowColors(True)
        self.table.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.table.customContextMenuRequested.connect(
            lambda pos: create_batch_table_context_menu(self.table, pos, self.chunks, self._render_batch_table)
        )
        bb_layout.addWidget(self.table, 1)

        # Batch Action Row
        action_row = QHBoxLayout()
        self.btn_save_batch = QPushButton()
        self.btn_save_batch.setObjectName("btnSaveBatch")
        self.btn_save_batch.setFixedHeight(36)
        self.btn_save_batch.setIcon(icon_service.icon("save-all", size=16, role="on_blue"))
        set_variant(self.btn_save_batch, "primary_blue")
        set_button_text(self.btn_save_batch, i18n.t("save_selected"))
        self.btn_save_batch.clicked.connect(self._save_selected_batch)

        self.btn_undo = QPushButton()
        self.btn_undo.setFixedHeight(36)
        self.btn_undo.setIcon(icon_service.icon("undo-2", size=16))
        set_button_text(self.btn_undo, i18n.t("undo_batch"))
        self.btn_undo.clicked.connect(self._undo_batch)

        self.batch_progress = QProgressBar()
        self.batch_progress.setObjectName("batchProgress")
        self.batch_progress.setVisible(False)

        action_row.addWidget(self.btn_save_batch, 2)
        action_row.addWidget(self.btn_undo, 1)
        action_row.addWidget(self.batch_progress, 2)
        bb_layout.addLayout(action_row)

        batch_splitter.addWidget(bot_batch)
        batch_splitter.setSizes([260, 360])
        batch_layout.addWidget(batch_splitter)
        self.tabs.addTab(tab_batch, icon_service.icon("split", size=16, role="blue"), i18n.t("tab_batch"))

        # TAB 3: Queue Mode
        tab_queue = QWidget()
        q_layout = QVBoxLayout(tab_queue)
        q_layout.setContentsMargins(12, 12, 12, 12)
        q_layout.setSpacing(12)

        self.lbl_queue_info = QLabel(i18n.t("queue_count", count=0))
        self.lbl_queue_info.setObjectName("sectionTitle")
        q_layout.addWidget(self.lbl_queue_info)

        self.queue_table = QTableWidget()
        self.queue_table.setColumnCount(3)
        self.queue_table.setHorizontalHeaderLabels([i18n.t("col_target"), i18n.t("col_lines"), i18n.t("col_size")])
        self.queue_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        q_layout.addWidget(self.queue_table, 1)

        q_btn_row = QHBoxLayout()
        self.btn_save_queue = QPushButton()
        self.btn_save_queue.setObjectName("btnSaveQueue")
        self.btn_save_queue.setFixedHeight(36)
        self.btn_save_queue.setIcon(icon_service.icon("save-all", size=16, role="on_blue"))
        set_variant(self.btn_save_queue, "primary_blue")
        set_button_text(self.btn_save_queue, i18n.t("save_queue"))
        self.btn_save_queue.clicked.connect(self._save_queue)

        self.btn_clear_queue = QPushButton()
        self.btn_clear_queue.setFixedHeight(36)
        self.btn_clear_queue.setIcon(icon_service.icon("trash-2", size=16, role="danger"))
        set_variant(self.btn_clear_queue, "danger")
        set_button_text(self.btn_clear_queue, i18n.t("clear_queue"))
        self.btn_clear_queue.clicked.connect(self._clear_queue)

        q_btn_row.addWidget(self.btn_save_queue, 2)
        q_btn_row.addWidget(self.btn_clear_queue, 1)
        q_btn_row.addStretch()
        q_layout.addLayout(q_btn_row)

        self.tabs.addTab(tab_queue, icon_service.icon("list-plus", size=16), i18n.t("tab_queue"))

        main_layout.addWidget(self.tabs, 1)

        # Keyboard Shortcut: Ctrl+S
        self.shortcut_save = QShortcut(QKeySequence("Ctrl+S"), self)
        self.shortcut_save.activated.connect(self._save_single_file)

    def _create_empty_state_widget(self, icon_name: str, title_key: str, desc_key: str) -> QWidget:
        """Create clean empty state placeholder with icon, title, and helper description."""
        w = QWidget()
        l = QVBoxLayout(w)
        l.setAlignment(Qt.AlignmentFlag.AlignCenter)
        l.setSpacing(8)

        icon_lbl = QLabel()
        icon_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        icon_lbl.setPixmap(icon_service.icon(icon_name, size=36, role="disabled").pixmap(36, 36))
        l.addWidget(icon_lbl)

        title_lbl = QLabel(i18n.t(title_key))
        title_lbl.setObjectName("sectionTitle")
        title_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        l.addWidget(title_lbl)

        desc_lbl = QLabel(i18n.t(desc_key))
        desc_lbl.setObjectName("caption")
        desc_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        desc_lbl.setWordWrap(True)
        l.addWidget(desc_lbl)

        w.icon_lbl = icon_lbl
        w.title_lbl = title_lbl
        w.desc_lbl = desc_lbl
        w.title_key = title_key
        w.desc_key = desc_key
        w.icon_name = icon_name
        return w

    def load_tree_from_disk(self, root_dir_str: str, root_node: Optional[TreeNode] = None) -> None:
        """Populate project file tree and candidates from active workspace."""
        if self.worker and self.worker.isRunning():
            return
        if self.current_root_dir != Path(root_dir_str).resolve():
            self.file_writer.clear_backup_history()
        self.current_root_dir = Path(root_dir_str).resolve()
        self.file_writer.destination_dir = self.current_root_dir
        self.tree_files.clear()
        self.single_tree.clear()

        if not self.current_root_dir.exists():
            self.left_empty_state.setVisible(True)
            self.single_tree.setVisible(False)
            return

        def populate(parent_item, dir_path: Path) -> None:
            for p in sorted(dir_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
                if p.is_symlink() or p.name.startswith(".tmp_forge_"):
                    continue
                item = QTreeWidgetItem(parent_item)
                item.setText(0, p.name)
                item.setData(0, Qt.ItemDataRole.UserRole, str(p))

                if p.is_dir():
                    item.setIcon(0, icon_service.file_icon_for(p.name, is_dir=True))
                    populate(item, p)
                else:
                    rel = str(p.relative_to(self.current_root_dir)).replace("\\", "/")
                    self.tree_files.append(rel)
                    item.setIcon(0, icon_service.file_icon_for(p.name, is_dir=False))

        root_item = QTreeWidgetItem(self.single_tree)
        root_item.setText(0, self.current_root_dir.name)
        root_item.setData(0, Qt.ItemDataRole.UserRole, str(self.current_root_dir))
        root_item.setIcon(0, icon_service.file_icon_for(self.current_root_dir.name, is_dir=True, expanded=True))
        populate(root_item, self.current_root_dir)
        root_item.setExpanded(True)

        has_items = self.single_tree.topLevelItemCount() > 0
        self.left_empty_state.setVisible(not has_items)
        self.single_tree.setVisible(has_items)

    def _on_refresh_clicked(self) -> None:
        if self.current_root_dir:
            self.load_tree_from_disk(str(self.current_root_dir))
            show_toast(self, i18n.t("refresh"), "info")

    def _on_single_file_selected(self, item: QTreeWidgetItem, *args) -> None:
        path_str = item.data(0, Qt.ItemDataRole.UserRole)
        if not path_str:
            return
        p = Path(path_str)
        if p.is_file():
            rel_name = str(p.relative_to(self.current_root_dir)) if self.current_root_dir else p.name
            self.lbl_current_file.setText(rel_name)
            self.editor.file_name = p.name
            try:
                content = p.read_text(encoding="utf-8", errors="replace")
                self.editor.setPlainText(content)
                self.editor_empty_state.setVisible(False)
                self.editor.setVisible(True)
                self._set_save_single_enabled(True)
                self.btn_add_queue.setEnabled(True)
            except Exception as e:
                show_toast(self, i18n.t("toast_read_error", error=str(e)), "error")

    def _set_save_single_enabled(self, enabled: bool) -> None:
        """Update save button enabled state and icon role so icon color matches text in light and dark themes."""
        self.btn_save_single.setEnabled(enabled)
        role = "on_accent" if enabled else "disabled"
        self.btn_save_single.setIcon(icon_service.icon("save", size=16, role=role))

    def _save_single_file(self) -> None:
        if not self.current_root_dir:
            show_toast(self, i18n.t("toast_no_project"), "warning")
            return
        rel = self.lbl_current_file.text()
        if not rel or rel == i18n.t("no_file_selected"):
            show_toast(self, i18n.t("toast_select_file"), "warning")
            return

        target_path = self.current_root_dir / rel
        content = self.editor.toPlainText()

        # Enforce OVERWRITE policy for the active file editor
        self.file_writer.policy = ItemPolicy.OVERWRITE
        if hasattr(self, "chk_backups"):
            self.file_writer.create_backups = self.chk_backups.isChecked()
        if hasattr(self, "chk_bom"):
            self.file_writer.use_bom = self.chk_bom.isChecked()
        if hasattr(self, "combo_newline") and self.combo_newline.currentData():
            self.file_writer.newline_mode = self.combo_newline.currentData()

        success, msg, _ = self.file_writer.write_file(target_path, content, policy=ItemPolicy.OVERWRITE)
        if success:
            show_toast(self, i18n.t("saved_success"), "success")
        else:
            show_toast(self, i18n.t("toast_save_failed", error=msg), "error")

    def _add_current_to_queue(self) -> None:
        rel = self.lbl_current_file.text()
        if not rel or rel == i18n.t("no_file_selected"):
            show_toast(self, i18n.t("toast_select_file"), "warning")
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

        # Enforce OVERWRITE policy when flushing queue to target files
        self.file_writer.policy = ItemPolicy.OVERWRITE
        if hasattr(self, "chk_backups"):
            self.file_writer.create_backups = self.chk_backups.isChecked()
        if hasattr(self, "chk_bom"):
            self.file_writer.use_bom = self.chk_bom.isChecked()
        if hasattr(self, "combo_newline") and self.combo_newline.currentData():
            self.file_writer.newline_mode = self.combo_newline.currentData()

        self.file_writer.clear_backup_history()
        self.file_writer.destination_dir = self.current_root_dir
        saved_count = 0
        errors = []
        for path, content in self.queue:
            target = self.current_root_dir / path
            success, msg, _ = self.file_writer.write_file(target, content, policy=ItemPolicy.OVERWRITE)
            if success:
                saved_count += 1
            else:
                errors.append(f"{path}: {msg}")

        if errors:
            show_toast(self, i18n.t("toast_save_failed", error=", ".join(errors[:2])), "error")
        else:
            show_toast(self, i18n.t("toast_saved_queue", count=saved_count), "success")
            self._clear_queue()

    def _clear_queue(self) -> None:
        self.queue.clear()
        self._update_queue_ui()

    def _parse_and_match_batch(self) -> None:
        text = self.batch_input.toPlainText()
        if not text.strip():
            show_toast(self, i18n.t("toast_paste_first"), "warning")
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
            # Column 0: Centered Checkbox
            chk_widget = QWidget()
            chk_l = QHBoxLayout(chk_widget)
            chk_l.setContentsMargins(4, 2, 4, 2)
            chk_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
            cb = QCheckBox()
            cb.setChecked(chunk.included)
            cb.toggled.connect(lambda checked, c=chunk: setattr(c, "included", checked))
            chk_l.addWidget(cb)
            self.table.setCellWidget(r, 0, chk_widget)

            # Column 1: Target Path (Compact combo for ambiguous, text otherwise)
            if chunk.match_status == MatchStatus.AMBIGUOUS and chunk.candidate_paths:
                combo = ThemedComboBox(compact=True)
                for cand in chunk.candidate_paths:
                    is_best = (cand == chunk.candidate_paths[0])
                    badge = i18n.t("best_match") if is_best else None
                    combo.add_themed_item(cand, cand, "file", badge_text=badge)
                combo.setCurrentIndex(-1)
                def choose_target(idx, c=chunk, cb_w=combo):
                    c.resolved_path = cb_w.currentData()
                    c.match_status = MatchStatus.MATCHED
                combo.activated.connect(choose_target)
                self.table.setCellWidget(r, 1, combo)
            else:
                self.table.setItem(r, 1, QTableWidgetItem(chunk.resolved_path or chunk.raw_target_path))

            # Column 2: Status Badge (Resolves T2 hardcoded color bug)
            status_map = {
                MatchStatus.MATCHED: (i18n.t("status_matched"), "circle-check", "success"),
                MatchStatus.AMBIGUOUS: (i18n.t("status_ambiguous"), "triangle-alert", "warning"),
                MatchStatus.NOT_FOUND: (i18n.t("status_not_found"), "circle-x", "danger"),
            }
            status_text, icon_name, badge_type = status_map.get(
                chunk.match_status, (i18n.t("status_not_found"), "circle-x", "danger")
            )
            status_item = QTableWidgetItem(status_text)
            status_item.setIcon(icon_service.icon(icon_name, size=14, role=badge_type))
            self.table.setItem(r, 2, status_item)

            # Column 3: Lines
            self.table.setItem(r, 3, QTableWidgetItem(str(chunk.line_count)))

            # Column 4: Size
            self.table.setItem(r, 4, QTableWidgetItem(f"{chunk.size_bytes} B"))

            # Column 5: Marker
            self.table.setItem(r, 5, QTableWidgetItem(chunk.marker_type))

    def _save_selected_batch(self) -> None:
        if not self.current_root_dir:
            show_toast(self, i18n.t("toast_no_project"), "warning")
            return

        selected_chunks = [c for c in self.chunks if c.included and c.resolved_path and c.match_status == MatchStatus.MATCHED]
        if not selected_chunks:
            show_toast(self, i18n.t("toast_no_valid_files"), "warning")
            return

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

        self.file_writer.clear_backup_history()
        self.file_writer = FileWriter(
            destination_dir=self.current_root_dir,
            policy=ItemPolicy.OVERWRITE,
            create_backups=self.chk_backups.isChecked(),
            use_bom=self.chk_bom.isChecked(),
            newline_mode=self.combo_newline.currentData() or NewlineMode.KEEP
        )

        self.setEnabled(False)
        self.btn_save_batch.setEnabled(False)
        self.batch_progress.setVisible(True)
        self.batch_progress.setValue(0)

        self.worker = BatchWriterWorker(self.file_writer, selected_chunks, self.current_root_dir)
        self.worker.progress.connect(lambda cur, tot, name: self.batch_progress.setValue(int((cur / max(1, tot)) * 100)))
        self.worker.finished_batch.connect(self._on_batch_finished)
        self.worker.error_occurred.connect(self._on_batch_error)
        self.worker.start()

    def _on_batch_finished(self, stats: BuildStats) -> None:
        self.setEnabled(True)
        self.btn_save_batch.setEnabled(True)
        self.batch_progress.setVisible(False)
        if stats.failed_items:
            show_toast(self, i18n.t("toast_batch_error", error="; ".join(message for _, message in stats.failed_items)), "error")
        else:
            show_toast(self, i18n.t("toast_saved_files", count=len(stats.created_files)), "success")
        if self.current_root_dir:
            self.load_tree_from_disk(str(self.current_root_dir))

    def _on_batch_error(self, err_msg: str) -> None:
        self.setEnabled(True)
        self.btn_save_batch.setEnabled(True)
        self.batch_progress.setVisible(False)
        show_toast(self, i18n.t("toast_batch_error", error=err_msg), "error")

    def _undo_batch(self) -> None:
        restored, errors = self.file_writer.undo_last_batch()
        if restored > 0:
            show_toast(self, i18n.t("toast_undo_ok", count=restored), "success")
            if self.current_root_dir:
                self.load_tree_from_disk(str(self.current_root_dir))
        else:
            show_toast(self, i18n.t("toast_no_backups"), "info")

    def _on_theme_changed(self, theme_name: str = "") -> None:
        """Refresh icons and button styles on theme change."""
        save_role = "on_accent" if self.btn_save_single.isEnabled() else "disabled"
        self.btn_save_single.setIcon(icon_service.icon("save", size=16, role=save_role))
        self.btn_parse_batch.setIcon(icon_service.icon("split", size=16, role="on_accent"))
        self.btn_save_batch.setIcon(icon_service.icon("save-all", size=16, role="on_accent"))
        self.btn_save_queue.setIcon(icon_service.icon("save-all", size=16, role="on_accent"))
        set_variant(self.btn_save_single, "primary")
        set_variant(self.btn_parse_batch, "primary")
        set_variant(self.btn_save_batch, "primary")
        set_variant(self.btn_save_queue, "primary")

    def retranslate_ui(self) -> None:
        """Live updates for localized texts and headers."""
        self.header.set_texts(i18n.t("content_title"), i18n.t("content_desc"))
        self.tabs.setTabText(0, i18n.t("tab_single"))
        self.tabs.setTabText(1, i18n.t("tab_batch"))
        self.tabs.setTabText(2, i18n.t("tab_queue"))
        self.lbl_tree.setText(i18n.t("project_files"))
        set_button_text(self.btn_save_single, i18n.t("save_file"))
        save_role = "on_accent" if self.btn_save_single.isEnabled() else "disabled"
        self.btn_save_single.setIcon(icon_service.icon("save", size=16, role=save_role))
        set_button_text(self.btn_add_queue, i18n.t("add_to_queue"))
        self.chk_strip_fences.setText(i18n.t("opt_strip_fences"))
        self.chk_backups.setText(i18n.t("opt_backup"))
        self.chk_bom.setText(i18n.t("bom_toggle"))
        self.combo_newline.retranslate()
        set_button_text(self.btn_parse_batch, i18n.t("split_and_match"))
        self.btn_parse_batch.setIcon(icon_service.icon("split", size=16, role="on_accent"))
        self.table.setHorizontalHeaderLabels([
            i18n.t("col_include"), i18n.t("col_target"), i18n.t("col_status"),
            i18n.t("col_lines"), i18n.t("col_size"), i18n.t("col_marker")
        ])
        set_button_text(self.btn_save_batch, i18n.t("save_selected"))
        self.btn_save_batch.setIcon(icon_service.icon("save-all", size=16, role="on_accent"))
        set_button_text(self.btn_undo, i18n.t("undo_batch"))
        self.queue_table.setHorizontalHeaderLabels([
            i18n.t("col_target"), i18n.t("col_lines"), i18n.t("col_size")
        ])
        set_button_text(self.btn_save_queue, i18n.t("save_queue"))
        self.btn_save_queue.setIcon(icon_service.icon("save-all", size=16, role="on_accent"))
        set_button_text(self.btn_clear_queue, i18n.t("clear_queue"))
        self.batch_input.setPlaceholderText(i18n.t("batch_input_placeholder"))
        if self.lbl_current_file.text() in ("No file selected", "لم يتم اختيار أي ملف"):
            self.lbl_current_file.setText(i18n.t("no_file_selected"))

        if hasattr(self, "left_empty_state"):
            self.left_empty_state.title_lbl.setText(i18n.t(self.left_empty_state.title_key))
            self.left_empty_state.desc_lbl.setText(i18n.t(self.left_empty_state.desc_key))
        if hasattr(self, "editor_empty_state"):
            self.editor_empty_state.title_lbl.setText(i18n.t(self.editor_empty_state.title_key))
            self.editor_empty_state.desc_lbl.setText(i18n.t(self.editor_empty_state.desc_key))
