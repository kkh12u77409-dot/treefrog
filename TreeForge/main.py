"""TreeForge — Desktop & CLI Application Entry Point.

Crafted with Python 3.10–3.13 and PyQt6.
Features bilingual LTR/RTL support, dynamic theming, pure Python core parser,
and standalone CLI scaffolding.
"""

import os
import sys
import argparse
from pathlib import Path

# Suppress benign Windows Qt QPA monitor interface query warning
os.environ.setdefault("QT_LOGGING_RULES", "qt.qpa.screen=false")

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent if BASE_DIR.name == "TreeForge" else BASE_DIR

# Ensure TreeForge root package directory is in sys.path
for candidate in (str(ROOT_DIR), str(BASE_DIR)):
    if candidate not in sys.path:
        sys.path.insert(0, candidate)


def run_tests() -> int:
    """Run all TreeForge core unit tests using standard library unittest."""
    import unittest
    tests_dir = BASE_DIR / "tests" if (BASE_DIR / "tests").exists() else ROOT_DIR / "TreeForge" / "tests"
    print(f"🧪 Running TreeForge Unit Tests from '{tests_dir}'...\n")
    loader = unittest.TestLoader()
    suite = loader.discover(str(tests_dir), pattern="test_*.py")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return 0 if result.wasSuccessful() else 1


def run_cli_scaffold(tree_input: str, output_dir: str = "./scaffolded_project", content_input: str = None, dry_run: bool = False) -> int:
    """Scaffold a project on disk using TreeForge's pure-Python core engine."""
    from TreeForge.core.tree_parser import TreeParser
    from TreeForge.core.tree_builder import TreeBuilder
    from TreeForge.core.content_splitter import ContentSplitter
    from TreeForge.core.file_writer import FileWriter
    from TreeForge.core.models import ItemPolicy, MatchStatus
    from TreeForge.core.path_safety import safe_target

    # Resolve tree content from argument or file
    tree_text = tree_input
    if "\n" not in tree_input and len(tree_input) < 240 and Path(tree_input).is_file():
        try:
            tree_text = Path(tree_input).read_text(encoding="utf-8")
        except Exception as e:
            print(f"❌ Error reading tree file '{tree_input}': {e}")
            return 1

    print("🌲 Parsing Project Tree Structure...")
    parser = TreeParser()
    result = parser.parse(tree_text)

    if result.errors:
        print(f"⚠️ Encountered {len(result.errors)} syntax warnings/errors during parsing:")
        for err in result.errors:
            print(f"   - Line {err.line_number}: {err.message}")

    if result.errors or not result.root:
        print("❌ Could not determine a valid project root from the provided text.")
        return 1

    print(f"✅ Parsed tree successfully: '{result.root.name}' ({result.total_folders} folders, {result.total_files} files)")

    dest_path = Path(output_dir).resolve()
    print(f"📁 Scaffolding directory structure to: {dest_path} {'[DRY RUN]' if dry_run else ''}")

    builder = TreeBuilder(
        policy=ItemPolicy.SKIP,
        add_init_py=True,
        create_starter_content=True,
        dry_run=dry_run
    )

    stats = builder.build(result.root, dest_path)
    print(f"✨ Scaffold complete: {len(stats.created_folders)} folders created, {len(stats.created_files)} files created, {len(stats.skipped_items)} skipped.")

    if stats.failed_items:
        for path, error in stats.failed_items:
            print(f"❌ {path}: {error}")
        return 1

    # Process content injection if provided
    if content_input:
        content_text = content_input
        if "\n" not in content_input and len(content_input) < 240 and Path(content_input).is_file():
            try:
                content_text = Path(content_input).read_text(encoding="utf-8")
            except Exception as e:
                print(f"⚠️ Error reading content file: {e}")
                content_text = ""

        if content_text.strip():
            print("\n📝 Injecting batch content into files...")
            splitter = ContentSplitter()
            chunks = splitter.split(content_text, [n.relative_path for n in result.root.get_all_files()])
            writer = FileWriter(policy=ItemPolicy.OVERWRITE, destination_dir=dest_path)
            injected_count = 0

            for chunk in chunks:
                if chunk.resolved_path and chunk.match_status == MatchStatus.MATCHED:
                    target_file = safe_target(dest_path, chunk.resolved_path)
                    if not dry_run:
                        success, message, _ = writer.write_file(target_file, chunk.content)
                        if not success:
                            print(f"❌ {message}")
                            return 1
                    print(f"   [+] Wrote {len(chunk.content)} chars -> {chunk.resolved_path}")
                    injected_count += 1
                else:
                    print(f"   [-] Unmatched chunk: {chunk.raw_target_path}")

            print(f"🎉 Injected content into {injected_count}/{len(chunks)} target files.")
            if injected_count != len(chunks):
                return 1

    return 0


def run_gui() -> int:
    """Launch the PyQt6 Desktop Graphical Application."""
    try:
        from PyQt6.QtCore import Qt
        from PyQt6.QtWidgets import QApplication
    except ImportError as err:
        print("=" * 72)
        print("🌲 TreeForge — Desktop & Web Scaffolding Suite")
        print("=" * 72)
        print(f"Note: PyQt6 is not installed in this environment ({err}).\n")
        print("To run the Desktop GUI on your machine (Windows / macOS / Linux):")
        print("  1. Ensure you have Python 3.10–3.13 installed")
        print("  2. pip install -r requirements.txt")
        print("  3. python main.py\n")
        print("🌐 Alternatively, the Web Application can be started separately:")
        print("  Start it separately with: npm run dev (http://localhost:3000)\n")
        print("💻 Or use the built-in CLI engine (no PyQt6 required):")
        print("  python main.py --help")
        print("  python main.py --test")
        print("  python main.py --cli \"MyProject/\\n  ├── main.py\\n  └── utils.py\"")
        print("=" * 72)
        return 1

    from TreeForge.services.settings_service import settings
    from TreeForge.services.theme_service import theme
    from TreeForge.services.i18n_service import i18n
    from TreeForge.services.icon_service import icon_service
    from TreeForge.ui.main_window import MainWindow

    app = QApplication(sys.argv)
    app.setApplicationName("TreeForge")
    app.setOrganizationName("TreeForgeOrg")
    app.setApplicationVersion("1.0.0")

    # Set Window Icon
    logo_path = BASE_DIR / "assets" / "logo.svg"
    if logo_path.exists():
        from PyQt6.QtGui import QIcon
        app.setWindowIcon(QIcon(str(logo_path)))
    else:
        app.setWindowIcon(icon_service.icon("folder-tree", size=32, role="accent"))

    # Load persisted language
    saved_lang = settings.get_language()
    i18n.set_language(saved_lang)
    if saved_lang == "ar":
        app.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
    else:
        app.setLayoutDirection(Qt.LayoutDirection.LeftToRight)

    # Load persisted theme
    saved_theme = settings.get_theme()
    theme.set_theme(saved_theme)

    window = MainWindow()
    window.show()

    return app.exec()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="TreeForge — Text-to-Project Scaffolding Engine & Desktop GUI"
    )
    parser.add_argument(
        "--cli",
        metavar="TREE_OR_FILE",
        nargs="?",
        const="DEFAULT",
        help="Run in headless CLI mode to scaffold a project from a tree file or text string",
    )
    parser.add_argument(
        "--out",
        metavar="DIR",
        default="./scaffolded_project",
        help="Destination directory for scaffolding (default: ./scaffolded_project)",
    )
    parser.add_argument(
        "--content",
        metavar="CONTENT_OR_FILE",
        help="Optional multi-file batch code to inject into scaffolded files",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate scaffolding without creating actual files on disk",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run the complete TreeForge unit test suite",
    )
    parser.add_argument(
        "--gui",
        action="store_true",
        help="Explicitly force launching the PyQt6 GUI",
    )

    args, unknown = parser.parse_known_args()

    if args.test:
        sys.exit(run_tests())

    if args.cli:
        tree_input = args.cli
        if tree_input == "DEFAULT":
            tree_input = "SampleApp/\n├── main.py\n├── core/\n│   ├── __init__.py\n│   └── engine.py\n└── README.md"
            print("No tree file specified. Using demo structure:\n" + tree_input + "\n")
        sys.exit(run_cli_scaffold(tree_input, args.out, args.content, args.dry_run))

    if args.gui:
        sys.exit(run_gui())

    # If no flags passed:
    # Check if a display exists (for X11/Linux) or if we are headless
    is_headless = sys.platform.startswith("linux") and not os.environ.get("DISPLAY") and not os.environ.get("WAYLAND_DISPLAY")
    if is_headless:
        print("=" * 72)
        print("🌲 TreeForge — Desktop & Web Scaffolding Suite")
        print("=" * 72)
        print("Headless Linux container detected (no active X11/Wayland display server).\n")
        print("🌐 1. Live Web Interface:")
        print("   The TreeForge web application uses port 3000 when started:")
        print("   Start it separately with: npm run dev (http://localhost:3000)\n")
        print("🖥️ 2. Desktop PyQt6 GUI App:")
        print("   To launch the native desktop GUI on Windows / macOS / Linux desktop:")
        print("     pip install -r requirements.txt")
        print("     python main.py --gui\n")
        print("⚡ 3. Pure Python CLI Mode (Works in this terminal immediately!):")
        print("   Scaffold demo project:      python main.py --cli")
        print("   Scaffold from a file:       python main.py --cli my_tree.txt --out ./my_app")
        print("   Run unit test suite:        python main.py --test")
        print("=" * 72)
        sys.exit(0)

    sys.exit(run_gui())


if __name__ == "__main__":
    main()
