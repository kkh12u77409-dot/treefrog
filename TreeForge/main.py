"""TreeForge — Desktop Application Entry Point.

Crafted with Python 3.11+ and PyQt6.
Features bilingual LTR/RTL support, dynamic theming, and modern design tokens.
"""

# Check Python version compatibility early
if sys.version_info >= (3, 14):
    print("!" * 72)
    print("WARNING: You are running Python 3.14+.")
    print("PyQt6 binary wheels on PyPI currently officially support Python 3.8 to 3.13.")
    print("Running PyQt6 on Python 3.14 often triggers:")
    print("  'ImportError: DLL load failed while importing QtCore'")
    print("Recommendation: Please run with Python 3.11 or 3.12.")
    print("!" * 72)

try:
    from PyQt6.QtCore import Qt
    from PyQt6.QtWidgets import QApplication
except ImportError as err:
    print("=" * 72)
    print(f"Error initializing PyQt6: {err}")
    if "DLL load failed" in str(err) or "could not be found" in str(err):
        print("\nTroubleshooting 'DLL load failed while importing QtCore':")
        print("1. Unsupported Python version: You appear to be running Python 3.14.")
        print("   PyQt6 requires Python 3.10 - 3.13 (Python 3.11 or 3.12 recommended).")
        print("2. Missing Visual C++ Runtime: On Windows, install Microsoft Visual C++")
        print("   2015-2022 Redistributable (x64): https://aka.ms/vs/17/release/vc_redist.x64.exe")
    else:
        print("\nPlease install required dependencies: pip install -r requirements.txt")
    print("=" * 72)
    sys.exit(1)

# Ensure TreeForge root package directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR.parent) not in sys.path:
    sys.path.insert(0, str(BASE_DIR.parent))

from TreeForge.services.settings_service import settings
from TreeForge.services.theme_service import theme
from TreeForge.services.i18n_service import i18n
from TreeForge.services.icon_service import icon_service
from TreeForge.ui.main_window import MainWindow


def main() -> None:
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

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
