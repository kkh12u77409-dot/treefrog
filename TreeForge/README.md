# 🌲 TreeForge — Desktop Project & Code Scaffolder

**TreeForge** is a modern, high-performance desktop application built with **Python 3.11+** and **PyQt6 (6.x)**. It bridges the gap between text-based architectural plans and physical software projects in two core workflows:

1. **Tree to Folders & Files**: Turns any pasted project tree (box-drawing characters, ASCII branches, indentation, or inline groups) into real directories and starter files.
2. **Text to Files (Single & Batch Mode)**: Enables instant single-file editing and bulk multi-file code injection using intelligent marker detection and fuzzy path resolution.

---

## 🌟 Key Features

### 📁 Part 1: Tree to Folders & Files
- **Rich Syntax Tolerance**:
  - Box-drawing branches (`├──`, `└──`, `│`)
  - ASCII trees (`|--`, ``--`, `+--`)
  - Indentation levels (2 spaces, 4 spaces, tabs, or markdown lists `-`, `*`)
  - Trailing slash detection (`dir/` is always a folder)
  - Nested paths on a single line (`assets/icons/` creates each directory)
  - Inline child groups: `ui/ (main_window.py, spinner.py, styles.py)`
  - Extensionless files recognized (`LICENSE`, `Makefile`, `Dockerfile`, `.gitignore`)
  - Full Unicode and Arabic support (`المشروع/ (الرئيسية.py)`)
- **Strict Safety Engine**:
  - Blocks path traversal (`..`), absolute paths, and drive letters.
  - Rejects Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).
  - Flags illegal filesystem characters (`< > : " | ? *`).
  - Reports line numbers for any validation errors.
- **Generation Options**:
  - Existing item collision policy: **Skip** (default, strictly non-destructive), **Overwrite**, or **Auto-Rename** (`file (1).py`).
  - Auto-generate `__init__.py` for Python package folders.
  - Starter template generation (`.py`, `.md`, `.gitignore`, `.json`, `.toml`).
  - **Dry-Run mode** for safe simulation without touching disk.
  - Non-blocking background worker (`QThread`) with live progress and cancel support.

### 📝 Part 2: Text to Files (Single & Batch Mode)
- **Single Mode**:
  - File tree browser with custom code editor (monospace font, line number gutter, current line highlight, syntax highlighting for Python/JSON/Markdown).
  - Quick save with `Ctrl+S`.
- **Batch Smart Splitter**:
  - Ingests large multi-file text separated by markers:
    - `### path/to/file.py`
    - `=== path/to/file.py ===`
    - `--- path/to/file.py ---`
    - `// FILE: path/to/file.py`
    - `# FILE: path/to/file.py`
    - Markdown headings or bold names followed by code fences
    - Fenced code block info strings (````python:path/to/file.py```` or ````python title="path/to/file.py"````)
  - **3-Tier Matcher Engine**:
    1. Exact relative path
    2. Unique filename resolution (e.g., `styles.py` -> `SumMaster/ui/styles.py`)
    3. Fuzzy string matching (`difflib`) with ambiguous resolution dropdown
  - Interactive preview table with include checkboxes, status badges, line counts, and size metrics.
  - **Atomic Writes & Safe Undo**:
    - Writes to temporary files before replacement.
    - Automatic `.bak` backups before overwriting.
    - One-click **"Undo Last Batch"** to restore previous file states.
  - Configurable line endings (LF, CRLF, Keep original) and optional UTF-8 BOM.
- **Queue Mode**:
  - Add files one by one and commit them all in a single batch.

### 🎨 Part 3 & 4: Modern UI/UX & Bilingual Internationalization
- **Modern Design**: Card-based layouts, responsive splitters, subtle state transitions, status bar, and non-intrusive floating toasts.
- **Dark & Light Themes**: Central design token palette applied through Qt Fusion style and dynamic QSS.
- **Bilingual (English + Arabic)**: Instant runtime language toggle without restart. Arabic mode activates true right-to-left layout (`QApplication.setLayoutDirection(Qt.LayoutDirection.RightToLeft)`) while maintaining LTR code editors and file paths for optimal developer ergonomics.

---

## 🏗️ Architecture

```
TreeForge/
├── main.py                  # Application entry point, icon loading & Qt bootstrapping
├── make_zip.py              # Distribution packager
├── requirements.txt         # Pinned dependencies (PyQt6, PyQt6-QtSvg)
├── README.md                # Documentation & build guide
├── assets/
│   ├── logo.svg             # Original TreeForge brand mark & vector icon
│   └── icons/               # Lucide SVG icon collection & ISC license
├── core/
│   ├── models.py            # Typed dataclasses (TreeNode, FileChunk, BuildStats)
│   ├── tree_parser.py       # Pure Python tree syntax parser & safety validator
│   ├── tree_builder.py      # Pure Python filesystem generator & templates
│   ├── content_splitter.py  # Pure Python multi-file marker splitter & fuzzy matcher
│   ├── file_writer.py       # Pure Python atomic writes, backup & undo engine
│   └── worker.py            # PyQt6 background QThread workers
├── services/
│   ├── theme_tokens.py      # Design tokens (Dark & Light) & WCAG contrast engine
│   ├── theme_service.py     # Modular QSS generation, Windows title bar chrome, & styles
│   ├── icon_service.py      # HiDPI vector rendering, IconBinder, & file_icon_for
│   ├── i18n_service.py      # Bilingual internationalization (EN/AR) & Qt translators
│   └── settings_service.py  # QSettings persistence (theme, language, policy, recents)
├── ui/
│   ├── main_window.py       # Shell with sidebar navigation, brand header & status bar
│   ├── builder_page.py      # Tree input, live preview tree, & generation controls
│   ├── content_page.py      # Single editor, batch smart splitter & multi-file queue
│   ├── settings_page.py     # Self-labelled language & System/Dark/Light theme selector
│   ├── code_editor.py       # Theme-token code editor with line gutter & syntax colors
│   ├── toast.py             # Stackable floating toasts with semantic edge & hover pause
│   ├── styles.py            # SectionHeader (live retranslation) & card helpers
│   ├── context_menus.py     # Bespoke context menu factories for all inputs, trees, tables
│   └── widgets/
│       ├── themed_menu.py   # ThemedMenu with soft shadow, card geometry & bidi shortcuts
│       └── themed_combo.py  # ThemedComboBox, PathComboBox, & ComboItemDelegate
└── tests/
    ├── test_tree_parser.py          # Tree syntax & security validation tests
    ├── test_content_splitter.py     # Splitter & fuzzy matching tests
    ├── test_file_writer.py          # Atomic write, backup & collision policy tests
    ├── test_theme_contrast.py       # WCAG 2.1 AA contrast ratio tests for all tokens
    ├── test_no_hardcoded_colors.py  # Zero-hex enforcement test across ui/*.py
    ├── test_i18n_keys.py            # EN/AR dictionary parity and completeness tests
    ├── test_context_menus.py        # Context menu action mapping & bidi isolates
    └── test_combos.py               # ComboBox data preservation & MRU deduplication
```

---

## 🚀 Installation & Running

### Prerequisites
- Python 3.10, 3.11, 3.12, or 3.13 (**Python 3.11 or 3.12 strongly recommended**)
  *Note: Python 3.14 is not yet supported by PyQt6 C++ wheels on PyPI.*
- `pip` package manager
- Windows users: [Microsoft Visual C++ 2015-2022 Redistributable (x64)](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### 1. Set Up Virtual Environment
```bash
# Create virtual environment (make sure to specify Python 3.11 or 3.12)
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate

# On Windows:
.venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Desktop Application
```bash
python main.py
```

### 4. Run Test Suite (22 Tests Passing)
```bash
python -m unittest discover -s tests -p "test_*.py"
```

### ⚠️ Troubleshooting on Windows: "DLL load failed while importing QtCore"
If you encounter `ImportError: DLL load failed while importing QtCore: The specified procedure could not be found`:
1. **Python Version**: Check your python version with `python --version`. If it is **Python 3.14**, PyQt6 will fail to load because official precompiled wheels are only available for Python 3.8 through 3.13. Install and use **Python 3.11 or 3.12**.
2. **Missing C++ Runtime**: Install the [Microsoft Visual C++ 2015–2022 Redistributable (x64)](https://aka.ms/vs/17/release/vc_redist.x64.exe) to provide `vcruntime140.dll` and `msvcp140.dll`.

---

## 📦 Building a Standalone Executable (Windows / Linux / macOS)

Using **PyInstaller**:

```bash
# Windows Single-File EXE with Icon & Assets (without console window)
pyinstaller --noconsole --onefile --name TreeForge \
  --icon assets/app.ico \
  --add-data "assets;assets" \
  main.py

# Linux / macOS Binary
pyinstaller --noconsole --onefile --name TreeForge \
  --add-data "assets:assets" \
  main.py
```

---

## 📜 Credits & Licensing
- **TreeForge Application**: MIT License.
- **Icons**: [Lucide Icons](https://lucide.dev) licensed under ISC / MIT (`assets/icons/LICENSE`).
- **Brand Mark**: Original TreeForge vector artwork (`assets/logo.svg`).
