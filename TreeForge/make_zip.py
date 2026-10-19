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
            dirs[:] = [d for d in dirs if d not in EXCLUDE_NAMES and not d.startswith(".")]

            for file in files:
                file_path = Path(root) / file
                if file in EXCLUDE_NAMES or file_path.suffix in EXCLUDE_EXTENSIONS or file == output_zip:
                    continue

                rel_path = file_path.relative_to(base_dir)
                zf.write(file_path, arcname=str(Path("TreeForge") / rel_path))
                count += 1

    size_kb = out_path.stat().st_size / 1024
    print(f"✅ Successfully archived {count} files ({size_kb:.1f} KB) -> {output_zip}")


if __name__ == "__main__":
    make_zip()
