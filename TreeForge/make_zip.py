"""Packaging script to create a clean, distributable ZIP archive of TreeForge."""

import os
import zipfile
from pathlib import Path


EXCLUDE_NAMES = {
    "__pycache__",
    ".pytest_cache",
    ".git",
    ".DS_Store",
    "Thumbs.db",
    ".vscode",
    ".idea",
    ".venv",
    "env",
    "dist",
    "build",
}

EXCLUDE_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".bak",
    ".tmp",
    ".zip",
}


def make_zip(output_zip: str = "TreeForge_Package.zip") -> None:
    base_dir = Path(__file__).resolve().parent
    out_path = base_dir / output_zip

    print(f"📦 Packaging TreeForge into '{out_path}'...")
    count = 0

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(base_dir):
            # Prune excluded directories
            dirs[:] = sorted(d for d in dirs if d not in EXCLUDE_NAMES and not d.startswith(".") and not (Path(root) / d).is_symlink())

            for file in sorted(files):
                file_path = Path(root) / file
                if file_path.is_symlink() or file.startswith((".env", ".tmp_forge_")):
                    continue
                if file in EXCLUDE_NAMES or file_path.suffix in EXCLUDE_EXTENSIONS or file == output_zip:
                    continue

                rel_path = file_path.relative_to(base_dir)
                info = zipfile.ZipInfo((Path("TreeForge") / rel_path).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
                info.external_attr = 0o100644 << 16
                zf.writestr(info, file_path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
                count += 1

    size_kb = out_path.stat().st_size / 1024
    print(f"✅ Successfully archived {count} files ({size_kb:.1f} KB) -> {output_zip}")


if __name__ == "__main__":
    make_zip()
