"""TreeForge — Desktop Application Entry Point.

Crafted with Python 3.11+ and PyQt6.
Features bilingual LTR/RTL support, dynamic theming, and modern design tokens.
"""

import sys
from pathlib import Path
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QApplication

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
