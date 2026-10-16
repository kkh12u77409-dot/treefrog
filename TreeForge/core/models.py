"""Data models for TreeForge."""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Optional, Dict, Any


class ItemPolicy(str, Enum):
    SKIP = "skip"
    OVERWRITE = "overwrite"
    AUTO_RENAME = "auto_rename"


class MatchStatus(str, Enum):
    MATCHED = "matched"
    AMBIGUOUS = "ambiguous"
    NOT_FOUND = "not_found"


class NewlineMode(str, Enum):
    KEEP = "keep"
    LF = "lf"
    CRLF = "crlf"


@dataclass
class ParseError:
    line_number: int
    raw_text: str
    message: str


@dataclass
class TreeNode:
    name: str
    relative_path: str  # e.g. "ui/main_window.py"
    is_dir: bool = False
    children: List["TreeNode"] = field(default_factory=list)
    enabled: bool = True
    content: Optional[str] = None
    line_number: Optional[int] = None

    def add_child(self, child: "TreeNode") -> None:
        self.children.append(child)

    def find_node_by_path(self, target_path: str) -> Optional["TreeNode"]:
        clean_target = target_path.strip().replace("\\", "/").rstrip("/")
        clean_current = self.relative_path.strip().replace("\\", "/").rstrip("/")
        if clean_target == clean_current:
            return self
        for child in self.children:
            found = child.find_node_by_path(target_path)
            if found:
                return found
        return None

    def get_all_files(self) -> List["TreeNode"]:
        files: List[TreeNode] = []
        if not self.is_dir:
            files.append(self)
        for child in self.children:
            files.extend(child.get_all_files())
        return files

    def get_all_nodes(self) -> List["TreeNode"]:
        nodes = [self]
        for child in self.children:
            nodes.extend(child.get_all_nodes())
        return nodes

    def count_items(self) -> tuple[int, int]:
        folders = 1 if self.is_dir else 0
        files = 0 if self.is_dir else 1
        for child in self.children:
            sub_folders, sub_files = child.count_items()
            folders += sub_folders
            files += sub_files
        return folders, files


@dataclass
class ParseResult:
    root: Optional[TreeNode] = None
    errors: List[ParseError] = field(default_factory=list)
    total_folders: int = 0
    total_files: int = 0
    raw_lines_count: int = 0


@dataclass
class FileChunk:
    id: str
    raw_target_path: str
    resolved_path: str
    content: str
    match_status: MatchStatus
    candidate_paths: List[str] = field(default_factory=list)
    line_count: int = 0
    size_bytes: int = 0
    included: bool = True
    marker_type: str = ""


@dataclass
class BuildStats:
    created_folders: List[str] = field(default_factory=list)
    created_files: List[str] = field(default_factory=list)
    skipped_items: List[str] = field(default_factory=list)
    failed_items: List[tuple[str, str]] = field(default_factory=list)  # (path, reason)
    backups_created: List[tuple[str, str]] = field(default_factory=list)  # (target, backup)

    @property
    def total_created(self) -> int:
        return len(self.created_folders) + len(self.created_files)
