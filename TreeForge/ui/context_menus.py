"""Context menu factories for TreeForge PyQt6 widgets.

Provides bespoke, accessible, fully localized context menus with keyboard
accessibility (Shift+F10 / Menu Key) across all input fields, trees, tables,
and editors.
"""

from pathlib import Path
from typing import Optional, Callable
from PyQt6.QtCore import Qt, QPoint, QUrl
from PyQt6.QtGui import QDesktopServices, QClipboard, QKeySequence
from PyQt6.QtWidgets import (
    QWidget, QTextEdit, QPlainTextEdit, QLineEdit, QTreeWidget,
    QTreeWidgetItem, QTableWidget, QApplication, QInputDialog
)

from .widgets.themed_menu import ThemedMenu
from ..services.i18n_service import i18n
from ..services.icon_service import icon_service


def attach_text_context_menu(widget: QWidget) -> None:
    """Attach customized context menu to text inputs replacing English native menu."""
    if isinstance(widget, QTextEdit):
        widget.setAcceptRichText(False)

    widget.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
    widget.customContextMenuRequested.connect(lambda pos: _show_text_context_menu(widget, pos))


def _show_text_context_menu(widget: QWidget, pos: QPoint) -> None:
    menu = ThemedMenu("", widget)
    clipboard = QApplication.clipboard()
    clip_text = clipboard.text() if clipboard else ""

    # Selection & undo state
    has_selection = False
    is_undo_avail = False
    is_redo_avail = False

    if isinstance(widget, (QTextEdit, QPlainTextEdit)):
        has_selection = bool(widget.textCursor().hasSelection())
        doc = widget.document()
        is_undo_avail = doc.isUndoAvailable() if doc else False
        is_redo_avail = doc.isRedoAvailable() if doc else False
    elif isinstance(widget, QLineEdit):
        has_selection = widget.hasSelectedText()
        is_undo_avail = widget.isUndoAvailable()
        is_redo_avail = widget.isRedoAvailable()

    # Undo / Redo
    menu.add_action("undo", icon_name="undo-2", shortcut="Ctrl+Z", slot=widget.undo, enabled=is_undo_avail)
    menu.add_action("redo", icon_name="refresh-cw", shortcut="Ctrl+Y", slot=widget.redo, enabled=is_redo_avail)
    menu.addSeparator()

    # Cut / Copy / Paste / Paste as Plain
    menu.add_action("cut", icon_name="x", shortcut="Ctrl+X", slot=widget.cut, enabled=has_selection and not widget.isReadOnly())
    menu.add_action("copy", icon_name="copy", shortcut="Ctrl+C", slot=widget.copy, enabled=has_selection)
    menu.add_action("paste", icon_name="save", shortcut="Ctrl+V", slot=widget.paste, enabled=bool(clip_text) and not widget.isReadOnly())

    def paste_plain():
        if isinstance(widget, (QTextEdit, QPlainTextEdit)):
            widget.insertPlainText(clip_text)
        elif isinstance(widget, QLineEdit):
            widget.insert(clip_text)

    menu.add_action("paste_plain", icon_name="file-text", shortcut="Ctrl+Shift+V", slot=paste_plain, enabled=bool(clip_text) and not widget.isReadOnly())

    def delete_selection():
        if isinstance(widget, (QTextEdit, QPlainTextEdit)):
            widget.textCursor().removeSelectedText()
        elif isinstance(widget, QLineEdit):
            widget.del_()

    menu.add_action("delete", icon_name="trash-2", shortcut="Del", slot=delete_selection, enabled=has_selection and not widget.isReadOnly(), danger=True)
    menu.addSeparator()

    menu.add_action("select_all", icon_name="list-checks", shortcut="Ctrl+A", slot=widget.selectAll, enabled=True)
    menu.exec_at(widget, pos)


def create_tree_input_context_menu(
    widget: QTextEdit,
    pos: QPoint,
    on_load_example: Callable,
    on_clear: Callable
) -> None:
    """Rich context menu for Builder Tree Input with branch insertion shortcuts."""
    widget.setAcceptRichText(False)
    menu = ThemedMenu("", widget)

    # Standard edit actions
    clipboard = QApplication.clipboard()
    clip_text = clipboard.text() if clipboard else ""
    has_sel = widget.textCursor().hasSelection()

    menu.add_action("undo", icon_name="undo-2", shortcut="Ctrl+Z", slot=widget.undo, enabled=widget.document().isUndoAvailable())
    menu.add_action("redo", icon_name="refresh-cw", shortcut="Ctrl+Y", slot=widget.redo, enabled=widget.document().isRedoAvailable())
    menu.addSeparator()
    menu.add_action("cut", icon_name="x", shortcut="Ctrl+X", slot=widget.cut, enabled=has_sel)
    menu.add_action("copy", icon_name="copy", shortcut="Ctrl+C", slot=widget.copy, enabled=has_sel)
    menu.add_action("paste", icon_name="save", shortcut="Ctrl+V", slot=widget.paste, enabled=bool(clip_text))
    menu.add_action("paste_plain", icon_name="file-text", shortcut="Ctrl+Shift+V", slot=lambda: widget.insertPlainText(clip_text), enabled=bool(clip_text))
    menu.addSeparator()

    # Specialized Builder features
    menu.add_action("load_example", icon_name="wand-sparkles", slot=on_load_example)
    
    # Insert branch symbol submenu
    sub = menu.add_submenu("insert_branch", icon_name="folder-tree")
    sub.add_action("branch_tee", icon_name="chevron-right", slot=lambda: widget.insertPlainText("├── "))
    sub.actions()[-1].setText("├── (Branch)")
    sub.add_action("branch_corner", icon_name="chevron-down", slot=lambda: widget.insertPlainText("└── "))
    sub.actions()[-1].setText("└── (Last Item)")
    sub.add_action("branch_pipe", icon_name="minus", slot=lambda: widget.insertPlainText("│   "))
    sub.actions()[-1].setText("│   (Vertical Guide)")
    sub.add_action("branch_indent", icon_name="arrow-right", slot=lambda: widget.insertPlainText("    "))
    sub.actions()[-1].setText("Indent (4 spaces)")

    menu.addSeparator()
    menu.add_action("clear_input", icon_name="eraser", slot=on_clear, danger=True)
    menu.exec_at(widget, pos)


def create_code_editor_context_menu(
    editor: QPlainTextEdit,
    pos: QPoint,
    file_name: str,
    on_save: Optional[Callable] = None,
    on_add_queue: Optional[Callable] = None
) -> None:
    """Rich context menu for Content Code Editor with code block formatting & line jumps."""
    menu = ThemedMenu("", editor)
    clipboard = QApplication.clipboard()
    clip_text = clipboard.text() if clipboard else ""
    has_sel = editor.textCursor().hasSelection()

    # Base editing actions
    menu.add_action("undo", icon_name="undo-2", shortcut="Ctrl+Z", slot=editor.undo, enabled=editor.document().isUndoAvailable())
    menu.add_action("redo", icon_name="refresh-cw", shortcut="Ctrl+Y", slot=editor.redo, enabled=editor.document().isRedoAvailable())
    menu.addSeparator()
    menu.add_action("cut", icon_name="x", shortcut="Ctrl+X", slot=editor.cut, enabled=has_sel)
    menu.add_action("copy", icon_name="copy", shortcut="Ctrl+C", slot=editor.copy, enabled=has_sel)
    menu.add_action("paste", icon_name="save", shortcut="Ctrl+V", slot=editor.paste, enabled=bool(clip_text))
    menu.add_action("paste_plain", icon_name="file-text", shortcut="Ctrl+Shift+V", slot=lambda: editor.insertPlainText(clip_text), enabled=bool(clip_text))
    menu.addSeparator()

    # Go to line dialog
    def go_to_line():
        line_num, ok = QInputDialog.getInt(
            editor, i18n.t("go_to_line"), "Line:",
            1, 1, max(1, editor.blockCount())
        )
        if ok:
            block = editor.document().findBlockByNumber(line_num - 1)
            cursor = editor.textCursor()
            cursor.setPosition(block.position())
            editor.setTextCursor(cursor)
            editor.centerCursor()

    menu.add_action("go_to_line", icon_name="search", slot=go_to_line)

    # Word wrap toggle
    is_wrap = (editor.lineWrapMode() != QPlainTextEdit.LineWrapMode.NoWrap)
    def toggle_wrap():
        new_mode = QPlainTextEdit.LineWrapMode.NoWrap if is_wrap else QPlainTextEdit.LineWrapMode.WidgetWidth
        editor.setLineWrapMode(new_mode)

    menu.add_action("word_wrap", checkable=True, checked=is_wrap, slot=toggle_wrap)

    # Copy as code block
    def copy_as_code_block():
        selected_content = editor.textCursor().selectedText().replace("\u2029", "\n") if has_sel else editor.toPlainText()
        fence = f"```{Path(file_name).suffix.lstrip('.')}\n# {file_name}\n{selected_content}\n```"
        if clipboard:
            clipboard.setText(fence)

    menu.add_action("copy_code_block", icon_name="file-code", slot=copy_as_code_block)
    menu.addSeparator()

    if on_save:
        menu.add_action("save_file_menu", icon_name="save", shortcut="Ctrl+S", slot=on_save)
    if on_add_queue:
        menu.add_action("add_queue_menu", icon_name="list-plus", slot=on_add_queue)

    menu.exec_at(editor, pos)


def create_structure_tree_context_menu(
    tree: QTreeWidget,
    pos: QPoint,
    last_built_dir: Optional[Path] = None
) -> None:
    """Context menu for Builder Structure Preview Tree."""
    item = tree.itemAt(pos)
    menu = ThemedMenu("", tree)

    if item:
        node = item.data(0, Qt.ItemDataRole.UserRole)
        is_checked = (item.checkState(0) == Qt.CheckState.Checked)

        def toggle_branch():
            new_state = Qt.CheckState.Unchecked if is_checked else Qt.CheckState.Checked
            item.setCheckState(0, new_state)

        menu.add_action(
            "exclude_branch" if is_checked else "include_branch",
            icon_name="minus" if is_checked else "check",
            slot=toggle_branch
        )
        menu.addSeparator()

        if item.childCount() > 0:
            menu.add_action("expand_branch", icon_name="chevron-down", slot=lambda: item.setExpanded(True))
            menu.add_action("collapse_branch", icon_name="chevron-right", slot=lambda: item.setExpanded(False))
            menu.addSeparator()

        # Copy Name / Path
        name = item.text(0)
        clipboard = QApplication.clipboard()
        menu.add_action("copy_name", icon_name="copy", slot=lambda: clipboard.setText(name))

    # Global entries
    menu.add_action("expand_all", icon_name="chevron-down", slot=tree.expandAll)
    menu.add_action("collapse_all", icon_name="chevron-right", slot=tree.collapseAll)
    menu.addSeparator()

    # Show in file explorer if project exists on disk
    if last_built_dir and last_built_dir.exists():
        menu.add_action(
            "show_in_explorer",
            icon_name="external-link",
            slot=lambda: QDesktopServices.openUrl(QUrl.fromLocalFile(str(last_built_dir)))
        )

    menu.exec_at(tree, pos)


def create_project_files_context_menu(
    tree: QTreeWidget,
    pos: QPoint,
    root_dir: Optional[Path],
    on_open_file: Optional[Callable] = None,
    on_refresh: Optional[Callable] = None
) -> None:
    """Context menu for Content Project Files Tree."""
    item = tree.itemAt(pos)
    menu = ThemedMenu("", tree)
    path_str = item.data(0, Qt.ItemDataRole.UserRole) if item else None
    target_path = Path(path_str) if path_str else None
    clipboard = QApplication.clipboard()

    if target_path and target_path.exists():
        if target_path.is_file():
            if on_open_file:
                menu.add_action("open_in_editor", icon_name="file-code", slot=lambda: on_open_file(item))
            menu.addSeparator()

        # Copy relative / full path
        if root_dir and root_dir.exists():
            try:
                rel = str(target_path.relative_to(root_dir)).replace("\\", "/")
                menu.add_action("copy_rel_path", icon_name="copy", slot=lambda: clipboard.setText(rel))
            except Exception:
                pass
        menu.add_action("copy_full_path", icon_name="copy", slot=lambda: clipboard.setText(str(target_path)))

        # Show in file explorer
        folder_to_open = target_path if target_path.is_dir() else target_path.parent
        menu.add_action(
            "show_in_explorer",
            icon_name="external-link",
            slot=lambda: QDesktopServices.openUrl(QUrl.fromLocalFile(str(folder_to_open)))
        )
        menu.addSeparator()

    menu.add_action("expand_all", icon_name="chevron-down", slot=tree.expandAll)
    menu.add_action("collapse_all", icon_name="chevron-right", slot=tree.collapseAll)

    if on_refresh:
        menu.addSeparator()
        menu.add_action("refresh", icon_name="refresh-cw", slot=on_refresh)

    menu.exec_at(tree, pos)


def create_batch_table_context_menu(
    table: QTableWidget,
    pos: QPoint,
    chunks: list,
    on_update_table: Optional[Callable] = None
) -> None:
    """Context menu for Content Batch Splitter Table with candidate target selection."""
    row = table.rowAt(pos.y())
    menu = ThemedMenu("", table)

    if 0 <= row < len(chunks):
        chunk = chunks[row]
        
        def toggle_row():
            chunk.included = not chunk.included
            if on_update_table:
                on_update_table()

        menu.add_action("include_row" if not chunk.included else "exclude_row", slot=toggle_row)

        if chunk.candidate_paths:
            target_sub = menu.add_submenu("change_target", icon_name="folder-tree")
            for cand in chunk.candidate_paths:
                is_cur = (cand == chunk.resolved_path)
                target_sub.add_action(
                    cand,
                    icon_name="check" if is_cur else "file",
                    checkable=True,
                    checked=is_cur,
                    slot=lambda c=cand: [setattr(chunk, "resolved_path", c), on_update_table() if on_update_table else None]
                )

        menu.addSeparator()

    def set_all_included(status: bool):
        for c in chunks:
            c.included = status
        if on_update_table:
            on_update_table()

    menu.add_action("include_matched", icon_name="check", slot=lambda: set_all_included(True))
    menu.add_action("exclude_missing", icon_name="minus", slot=lambda: set_all_included(False))

    menu.exec_at(table, pos)
