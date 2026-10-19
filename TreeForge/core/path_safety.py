"""Portable path validation shared by all filesystem entry points.

Resolved containment prevents escaping through existing symlinks. This application
assumes no hostile process is concurrently replacing destination directories.
"""
from pathlib import Path, PureWindowsPath
import re

_RESERVED = re.compile(r"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$", re.I)


def validate_relative_path(value: str) -> str:
    if not isinstance(value, str) or not value or value.startswith(("/", "\\")) or PureWindowsPath(value).drive:
        raise ValueError("An explicit relative path is required")
    normalized = value.replace("\\", "/")
    for part in normalized.split("/"):
        if (not part or part in (".", "..") or part.endswith((".", " "))
                or any(ord(c) < 32 or c in '<>:"|?*' for c in part)
                or _RESERVED.fullmatch(part.split(".")[0])):
            raise ValueError(f"Unsafe path component: {part!r}")
    return normalized


def safe_target(base: Path, relative: str) -> Path:
    relative = validate_relative_path(relative)
    root = Path(base).resolve()
    target = (root / relative).resolve()
    if not target.is_relative_to(root) or target == root:
        raise ValueError("Path escapes the project directory")
    return target
