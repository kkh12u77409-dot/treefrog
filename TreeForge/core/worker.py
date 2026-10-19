"""Asynchronous background worker for long-running I/O operations in TreeForge.

Uses PyQt6 QThread and signals to keep the interface completely responsive.
"""

from pathlib import Path
from typing import Optional, List
from PyQt6.QtCore import QThread, pyqtSignal, QObject

from .models import TreeNode, BuildStats, FileChunk
from .tree_builder import TreeBuilder
from .file_writer import FileWriter
from .path_safety import safe_target


class BuilderWorker(QThread):
    """Executes tree generation in a separate thread."""

    progress = pyqtSignal(int, int, str)       # (current, total, item_name)
    finished_build = pyqtSignal(object)        # (BuildStats)
    error_occurred = pyqtSignal(str)          # (error_message)

    def __init__(
        self,
        builder: TreeBuilder,
        root_node: TreeNode,
        destination_dir: Path,
        parent: Optional[QObject] = None
    ):
        super().__init__(parent)
        self.builder = builder
        self.root_node = root_node
        self.destination_dir = destination_dir
        self._is_cancelled = False

    def cancel(self) -> None:
        self._is_cancelled = True

    def run(self) -> None:
        try:
            stats = self.builder.build(
                root_node=self.root_node,
                destination_dir=self.destination_dir,
                progress_callback=lambda cur, tot, item: self.progress.emit(cur, tot, item),
                cancel_check=lambda: self._is_cancelled
            )
            self.finished_build.emit(stats)
        except Exception as e:
            self.error_occurred.emit(str(e))


class BatchWriterWorker(QThread):
    """Executes multi-file batch writes in a separate thread."""

    progress = pyqtSignal(int, int, str)
    finished_batch = pyqtSignal(object)        # (BuildStats)
    error_occurred = pyqtSignal(str)

    def __init__(
        self,
        writer: FileWriter,
        chunks: List[FileChunk],
        destination_dir: Path,
        parent: Optional[QObject] = None
    ):
        super().__init__(parent)
        self.writer = writer
        self.chunks = chunks
        self.destination_dir = destination_dir
        self._is_cancelled = False

    def cancel(self) -> None:
        self._is_cancelled = True

    def run(self) -> None:
        stats = BuildStats()
        try:
            included_chunks = [c for c in self.chunks if c.included and c.match_status.value == "matched" and c.resolved_path]
            self.writer.destination_dir = self.destination_dir.resolve()
            self.writer.clear_backup_history()
            total = len(included_chunks)

            for idx, chunk in enumerate(included_chunks, start=1):
                if self._is_cancelled:
                    break

                target_path = safe_target(self.destination_dir, chunk.resolved_path)
                self.progress.emit(idx, total, chunk.resolved_path)

                success, msg, final_path = self.writer.write_file(target_path, chunk.content)
                if success:
                    stats.created_files.append(str(final_path.relative_to(self.destination_dir)))
                else:
                    if "skipped" in msg.lower():
                        stats.skipped_items.append(chunk.resolved_path)
                    else:
                        stats.failed_items.append((chunk.resolved_path, msg))

            self.finished_batch.emit(stats)
        except Exception as e:
            self.error_occurred.emit(str(e))
