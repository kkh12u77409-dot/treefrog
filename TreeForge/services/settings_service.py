"""Settings persistence service for TreeForge using QSettings."""

from typing import List, Any
from pathlib import Path
from PyQt6.QtCore import QSettings


class SettingsService:
    """Persists user configuration and recent paths."""

    def __init__(self):
        self.settings = QSettings("TreeForgeOrg", "TreeForge")

    def get_theme(self) -> str:
        return str(self.settings.value("appearance/theme", "dark"))

    def set_theme(self, theme_val: str) -> None:
        self.settings.setValue("appearance/theme", theme_val)

    def get_language(self) -> str:
        return str(self.settings.value("appearance/language", "en"))

    def set_language(self, lang_val: str) -> None:
        self.settings.setValue("appearance/language", lang_val)

    def get_recent_paths(self) -> List[str]:
        raw = self.settings.value("paths/recent", [])
        if isinstance(raw, list):
            return [str(p) for p in raw if p]
        return []

    def add_recent_path(self, path_str: str) -> None:
        paths = self.get_recent_paths()
        clean = str(Path(path_str).resolve())
        if clean in paths:
            paths.remove(clean)
        paths.insert(0, clean)
        self.settings.setValue("paths/recent", paths[:10])

    def get_policy(self) -> str:
        return str(self.settings.value("builder/policy", "skip"))

    def set_policy(self, policy: str) -> None:
        self.settings.setValue("builder/policy", policy)

    def get_bool(self, key: str, default: bool = True) -> bool:
        val = self.settings.value(key, default)
        if isinstance(val, bool):
            return val
        return str(val).lower() in ("true", "1", "yes")

    def set_bool(self, key: str, value: bool) -> None:
        self.settings.setValue(key, value)


settings = SettingsService()
