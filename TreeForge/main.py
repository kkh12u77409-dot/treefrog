"""TreeForge — Desktop Application Entry Point.

Crafted with Python 3.11+ and PyQt6.
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
from TreeForge.ui.main_window import MainWindow


def main() -> None:
    # High-DPI support is enabled by default in PyQt6
    app = QApplication(sys.argv)
    app.setApplicationName("TreeForge")
    app.setOrganizationName("TreeForgeOrg")
    app.setApplicationVersion("1.0.0")

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
