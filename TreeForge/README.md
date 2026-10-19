# TreeForge Desktop & CLI

Bilingual (Arabic/English) Python/PyQt6 project scaffolder and batch file editor.

## Run

Python 3.10+ is required; Python 3.11/3.12 is recommended. Create an isolated virtual environment:

```bash
python -m venv .venv
# Linux/macOS
. .venv/bin/activate
# Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
python main.py --gui
```

On Linux, Qt requires system libraries including libGL, libEGL, libxkbcommon and libdbus. On Windows, install the Microsoft Visual C++ Redistributable if Qt reports missing DLLs. Compatibility depends on the pinned wheels and system libraries, not just the Python minor version.

## Headless CLI (Qt not required)

```bash
python main.py --cli tree.txt --out ./workspace --dry-run
python main.py --cli tree.txt --out ./workspace --content batch.txt
```

Tree generation defaults to **Skip**. Supplying `--content` explicitly injects/overwrites matched files with backups. Errors and unresolved chunks return a nonzero status. A failed/cancelled operation can leave partial output; use dry-run and a fresh destination first.

Trees accept box/ASCII branches, indentation, inline child groups, Unicode names and Markdown fence wrappers. File batches accept `### file.py`, `=== file.py ===`, `--- file.py ---`, `# FILE: file.py`, `// FILE: file.py`, and fenced path metadata. Ambiguous/fuzzy matches require manual confirmation; unmatched paths cannot be written automatically.

## Safety and undo

All application write entry points enforce project-relative paths and reject traversal, drive/device names and existing symlink escapes. Do not use a destination concurrently controlled by an untrusted local process.

Writes use same-directory temporary files and atomic replacement. A batch undo journal preserves the **first** pre-batch copy, handles repeated targets, and removes newly created files/empty directories. Disabling backups disables restoration of overwritten files. Undo is available only in the current session; it is not crash recovery.

Standalone Python installers use encoded data, validate destinations and default to Skip. They do not implement undo. Review any generated code and dependency manifests before running them.

## Tests

```bash
python main.py --test
# Linux headless GUI testing
QT_QPA_PLATFORM=offscreen python main.py --test
```

GUI tests skip explicitly when the Qt runtime or system libraries are unavailable. Parser/splitter fixtures are shared with the web application in `tests/fixtures/`.

## Windows build

```bat
python -m pip install -r requirements-dev.txt
build_exe.bat
```

Then compile `TreeForge_Installer.iss` using Inno Setup 6. Build/test on Windows before distributing. `python make_zip.py` regenerates the source ZIP.

## Architecture

`core/` contains the headless parsers, safe filesystem writer, transaction undo, tree builder and background workers. `services/` provides themes, translation, icons and settings. `ui/` contains the Qt views. Runtime dependencies are pinned in `requirements.txt`; test/build dependencies are in `requirements-dev.txt`.

MIT license. Icon notices: `assets/icons/LICENSE`.
