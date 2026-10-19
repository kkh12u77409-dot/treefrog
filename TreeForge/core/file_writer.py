"""Pure Python atomic file writer for TreeForge.

Provides atomic file replacement, backup management, undo restoration,
UTF-8 BOM support, and existing-item collision policies.
"""

import os
import shutil
import tempfile
import codecs
from pathlib import Path
from typing import List, Tuple, Optional, Dict
from .models import ItemPolicy, NewlineMode
from .path_safety import safe_target


def get_unique_filename(target_path: Path) -> Path:
    """Generate a numbered duplicate filename like 'file (1).py' if target already exists."""
    if not target_path.exists():
        return target_path

    parent = target_path.parent
    stem = target_path.stem
    suffix = target_path.suffix
    counter = 1

    while True:
        candidate = parent / f"{stem} ({counter}){suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


class FileWriter:
    """Manages file writing with atomic safety, backups, and undo capabilities."""

    def __init__(
        self,
        policy: ItemPolicy = ItemPolicy.OVERWRITE,
        create_backups: bool = True,
        use_bom: bool = False,
        newline_mode: NewlineMode = NewlineMode.KEEP,
        destination_dir: Optional[Path] = None
    ):
        self.policy = policy
        self.create_backups = create_backups
        self.use_bom = use_bom
        self.newline_mode = newline_mode
        self.destination_dir = Path(destination_dir).resolve() if destination_dir else None
        self._last_backups: Dict[Path, Optional[Path]] = {}
        self._created_dirs: set[Path] = set()

    def write_file(
        self, target_path: Path, content: str, policy: Optional[ItemPolicy] = None
    ) -> Tuple[bool, str, Optional[Path]]:
        """Write atomically; preserve the first pre-batch state and file permissions."""
        backup_path = None
        temp_path = None
        try:
            target_path = Path(target_path)
            if self.destination_dir:
                relative = target_path.absolute().relative_to(self.destination_dir)
                target_path = safe_target(self.destination_dir, relative.as_posix())
            else:
                target_path = target_path.resolve()
            value = policy if policy is not None else self.policy
            effective_policy = ItemPolicy(value.lower() if isinstance(value, str) else value)
            final_target = target_path
            if target_path.exists():
                if effective_policy == ItemPolicy.SKIP:
                    return False, "File exists (skipped by policy)", target_path
                if effective_policy == ItemPolicy.AUTO_RENAME:
                    final_target = get_unique_filename(target_path)
            was_new = not final_target.exists()
            if self.newline_mode == NewlineMode.LF:
                content = content.replace("\r\n", "\n").replace("\r", "\n")
            elif self.newline_mode == NewlineMode.CRLF:
                content = content.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\r\n")
            encoded = content.encode("utf-8")
            if self.use_bom:
                encoded = codecs.BOM_UTF8 + encoded
            parent = final_target.parent
            missing = []
            directory = parent
            while not directory.exists():
                missing.append(directory)
                directory = directory.parent
            parent.mkdir(parents=True, exist_ok=True)
            self._created_dirs.update(missing)
            new_entry = final_target not in self._last_backups
            if new_entry and self.create_backups and not was_new:
                fd, name = tempfile.mkstemp(dir=str(parent), prefix=".tmp_forge_backup_")
                os.close(fd)
                backup_path = Path(name)
                shutil.copy2(final_target, backup_path)
            fd, name = tempfile.mkstemp(dir=str(parent), prefix=".tmp_forge_")
            temp_path = Path(name)
            with os.fdopen(fd, "wb") as stream:
                stream.write(encoded)
                stream.flush()
                os.fsync(stream.fileno())
            if not was_new:
                shutil.copymode(final_target, temp_path)
            if self.destination_dir:
                safe_target(self.destination_dir, final_target.relative_to(self.destination_dir).as_posix())
            if effective_policy == ItemPolicy.OVERWRITE:
                os.replace(temp_path, final_target)
            else:
                # Link is exclusive: SKIP/AUTO_RENAME must never clobber a racing writer.
                os.link(temp_path, final_target)
            if new_entry and (self.create_backups or was_new):
                self._last_backups[final_target] = backup_path
                backup_path = None  # Ownership transferred to the undo journal.
            return True, "Successfully written", final_target
        except Exception as error:
            return False, str(error), target_path
        finally:
            if temp_path:
                temp_path.unlink(missing_ok=True)
            if backup_path:
                backup_path.unlink(missing_ok=True)

    def undo_last_batch(self) -> Tuple[int, List[str]]:
        """Restore previous state from backups created during the last batch write.
        
        Returns (restored_count, error_messages).
        """
        restored = 0
        errors = []
        for orig, bak in reversed(list(self._last_backups.items())):
            try:
                if self.destination_dir:
                    safe_target(self.destination_dir, orig.relative_to(self.destination_dir).as_posix())
                if bak is None:
                    orig.unlink(missing_ok=True)
                else:
                    os.replace(bak, orig)
                restored += 1
                del self._last_backups[orig]
            except Exception as e:
                errors.append(f"Failed restoring {orig.name}: {e}")
        for directory in sorted(self._created_dirs, key=lambda p: len(p.parts), reverse=True):
            try:
                directory.rmdir()  # Only remove empty directories created by this batch.
            except OSError:
                pass
        self._created_dirs.clear()
        return restored, errors

    def clear_backup_history(self) -> None:
        for bak in self._last_backups.values():
            if bak:
                bak.unlink(missing_ok=True)
        self._last_backups.clear()
        self._created_dirs.clear()


def generate_standalone_installer(files_data: Dict[str, str], project_name: str = "TreeForgeProject") -> str:
    """Generate an inert-data, contained, non-destructive Python installer."""
    import base64
    import json
    from .path_safety import validate_relative_path
    from .installer_runtime import RUNTIME
    validate_relative_path(project_name)
    if "/" in project_name or "\\" in project_name:
        raise ValueError("Project name must be one component")
    for path in files_data:
        validate_relative_path(path)
    data = {"projectName": project_name, "files": files_data, "policy": "skip"}
    payload = base64.b64encode(json.dumps(data, ensure_ascii=False).encode("utf-8")).decode("ascii")
    return "#!/usr/bin/env python3\nPAYLOAD = " + repr(payload) + "\n" + RUNTIME
