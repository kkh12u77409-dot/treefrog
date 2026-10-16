"""Generates visual validation screenshots for all pages, themes, languages, toasts, and dropdowns."""

import os
import sys
from pathlib import Path

# Force offscreen QPA for headless Linux container
os.environ["QT_QPA_PLATFORM"] = "offscreen"

from PyQt6.QtCore import Qt, QSize, QPoint
from PyQt6.QtWidgets import QApplication, QWidget

# Initialize app
app = QApplication.instance()
if not app:
    app = QApplication(sys.argv)

from TreeForge.services.theme_service import theme
from TreeForge.services.i18n_service import i18n
from TreeForge.ui.main_window import MainWindow
from TreeForge.ui.toast import show_toast, ToastManager
from TreeForge.ui.widgets.themed_combo import ThemedComboBox
from TreeForge.core.models import ItemPolicy

OUTPUT_DIR = Path(__file__).resolve().parent / "screenshots"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def capture_all():
    print(f"📸 Generating screenshots into {OUTPUT_DIR}...")
    window = MainWindow()
    window.resize(1180, 780)
    window.show()

    pages = [
        (0, "builder"),
        (1, "content"),
        (2, "settings"),
    ]
    themes = ["dark", "light"]
    languages = ["ar", "en"]

    for lang in languages:
        i18n.set_language(lang)
        if lang == "ar":
            app.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
        else:
            app.setLayoutDirection(Qt.LayoutDirection.LeftToRight)

        for th in themes:
            theme.set_theme(th)
            window.retranslate_ui()
            app.processEvents()

            for page_idx, page_name in pages:
                window._switch_page(page_idx)
                app.processEvents()

                # Populate example in builder for richer screenshot
                if page_name == "builder" and not window.builder_page.current_parsed_root:
                    window.builder_page._load_example()
                    app.processEvents()

                shot_path = OUTPUT_DIR / f"{page_name}_{th}_{lang}.png"
                pixmap = window.grab()
                pixmap.save(str(shot_path))
                print(f"  ✓ Saved {shot_path.name}")

    # Generate Toast screenshots for all 4 types
    theme.set_theme("dark")
    i18n.set_language("ar")
    app.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
    app.processEvents()

    toast_types = [
        ("success", i18n.t("toast_build_ok", count=12)),
        ("warning", i18n.t("toast_parse_err", count=2)),
        ("error", i18n.t("toast_select_dest")),
        ("info", i18n.t("toast_loaded_tree", name="app_structure.txt")),
    ]

    for t_type, t_msg in toast_types:
        # Clear existing toasts
        for t in list(ToastManager.instance()._active_toasts):
            t.hide()
            t.deleteLater()
        ToastManager.instance()._active_toasts.clear()

        toast = show_toast(window, t_msg, toast_type=t_type)
        if toast:
            if hasattr(toast, "enter_anim_pos"):
                toast.enter_anim_pos.setCurrentTime(220)
            if hasattr(toast, "enter_anim_op"):
                toast.enter_anim_op.setCurrentTime(220)
            if hasattr(toast, "opacity_effect"):
                toast.opacity_effect.setOpacity(1.0)
        app.processEvents()

        shot_path = OUTPUT_DIR / f"toast_{t_type}.png"
        if toast:
            from PyQt6.QtGui import QPixmap
            pix = QPixmap(toast.size())
            pix.fill(Qt.GlobalColor.transparent)
            toast.render(pix)
            pix.save(str(shot_path))
            print(f"  ✓ Saved {shot_path.name}")

    # Generate Opened Combobox Dropdown screenshot
    combo_win = QWidget()
    combo_win.resize(400, 260)
    combo = ThemedComboBox(combo_win)
    combo.setGeometry(20, 20, 360, 36)
    combo.add_themed_item(
        ItemPolicy.SKIP, "policy_skip", "shield-check",
        "policy_skip_desc", i18n.t("badge_default")
    )
    combo.add_themed_item(
        ItemPolicy.OVERWRITE, "policy_overwrite", "triangle-alert",
        "policy_overwrite_desc", None
    )
    combo.add_themed_item(
        ItemPolicy.AUTO_RENAME, "policy_auto_rename", "copy-plus",
        "policy_rename_desc", None
    )
    combo_win.show()
    combo.showPopup()
    app.processEvents()

    view = combo.view()
    if view:
        shot_path = OUTPUT_DIR / "dropdown_opened.png"
        view.grab().save(str(shot_path))
        print(f"  ✓ Saved {shot_path.name}")

    window.close()
    combo_win.close()
    print("✨ All screenshots generated successfully!")


if __name__ == "__main__":
    capture_all()
