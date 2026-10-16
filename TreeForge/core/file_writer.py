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
from .models import ItemPolicy, NewlineMode, BuildStats


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
        newline_mode: NewlineMode = NewlineMode.KEEP
    ):
        self.policy = policy
        self.create_backups = create_backups
        self.use_bom = use_bom
        self.newline_mode = newline_mode
        self._last_backups: List[Tuple[Path, Path]] = []  # (original_path, backup_path)

    def write_file(self, target_path: Path, content: str) -> Tuple[bool, str, Optional[Path]]:
        """Write content to target_path with atomic replacement.
        
        Returns (success, message, final_path_used).
        """
        try:
            target_path = target_path.resolve()
            parent = target_path.parent
            parent.mkdir(parents=True, exist_ok=True)

            final_target = target_path

            if target_path.exists():
                if self.policy == ItemPolicy.SKIP:
                    return False, "File exists (skipped by policy)", target_path
                elif self.policy == ItemPolicy.AUTO_RENAME:
                    final_target = get_unique_filename(target_path)
                elif self.policy == ItemPolicy.OVERWRITE:
                    if self.create_backups:
                        bak_path = target_path.with_suffix(target_path.suffix + ".bak")
                        try:
                            shutil.copy2(target_path, bak_path)
                            self._last_backups.append((target_path, bak_path))
                        except Exception as e:
                            return False, f"Failed creating backup: {e}", target_path

            # Format newlines
            if self.newline_mode == NewlineMode.LF:
                content = content.replace("\r\n", "\n").replace("\r", "\n")
            elif self.newline_mode == NewlineMode.CRLF:
                content = content.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\r\n")

            # Prepare bytes with or without BOM
            encoded_bytes = content.encode("utf-8")
            if self.use_bom:
                encoded_bytes = codecs.BOM_UTF8 + encoded_bytes

            # Atomic write: write to temp file in same directory, then rename
            temp_file = tempfile.NamedTemporaryFile(
                mode="wb",
                dir=str(parent),
                delete=False,
                prefix=".tmp_forge_"
            )
            temp_path = Path(temp_file.name)
            try:
                temp_file.write(encoded_bytes)
                temp_file.flush()
                os.fsync(temp_file.fileno())
                temp_file.close()

                # Atomically replace target
                os.replace(temp_path, final_target)
            except Exception as e:
                if temp_path.exists():
                    temp_path.unlink(missing_ok=True)
                raise e

            return True, "Successfully written", final_target

        except Exception as ex:
            return False, str(ex), target_path

    def undo_last_batch(self) -> Tuple[int, List[str]]:
        """Restore previous state from backups created during the last batch write.
        
        Returns (restored_count, error_messages).
        """
        restored = 0
        errors = []
        for orig, bak in reversed(self._last_backups):
            try:
                if bak.exists():
                    shutil.copy2(bak, orig)
                    bak.unlink()
                    restored += 1
            except Exception as e:
                errors.append(f"Failed restoring {orig.name}: {e}")

        self._last_backups.clear()
        return restored, errors

    def clear_backup_history(self) -> None:
        self._last_backups.clear()


def generate_standalone_installer(files_data: Dict[str, str], project_name: str = "TreeForgeProject") -> str:
    """Generate self-extracting single Python installer script with embedded file data."""
    import json
    data_json = json.dumps(files_data, indent=2, ensure_ascii=False)
    return f'''#!/usr/bin/env python3
"""Standalone Self-Extracting Installer for {project_name}.
Generated automatically by TreeForge Desktop Suite.

Run directly:
    python create_project.py
"""

import sys
from pathlib import Path

PROJECT_NAME = "{project_name}"
FILES_DATA = {data_json}


def main():
    print(f"📦 Extracting & Scaffolding: {{PROJECT_NAME}}")
    print("=" * 50)
    target = Path.cwd() / PROJECT_NAME
    target.mkdir(parents=True, exist_ok=True)

    for rel_path, content in FILES_DATA.items():
        fp = target / rel_path
        fp.parent.mkdir(parents=True, exist_ok=True)
        with open(fp, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  ✓ Created: {{rel_path}}")

    print("=" * 50)
    print(f"✨ Successfully generated {{len(FILES_DATA)}} files in '{{target.resolve()}}'!")


if __name__ == "__main__":
    main()
'''
