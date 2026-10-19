"""Modern theme-aware icon management service for TreeForge.

Provides resolution-independent Lucide SVG icons rendered crisply across HiDPI
and automatically updated upon theme/language transitions with uniform 2px stroke
thickness, standardized sizes, and design token integration for Green & Blue palettes.
"""

from typing import Dict, Optional, Tuple, Any
import weakref
import re

try:
    from PyQt6.QtCore import QObject, QByteArray, Qt, QSize
    from PyQt6.QtGui import QIcon, QPixmap, QPainter, QTransform, QColor
    from PyQt6.QtSvg import QSvgRenderer
    HAS_PYQT6 = True
except ImportError:
    HAS_PYQT6 = False
    class QObject:
        def __init__(self, *args, **kwargs): pass
    class QIcon:
        class Mode:
            Normal = 0
            Disabled = 1
            Active = 2
            Selected = 3
        class State:
            Off = 0
            On = 1
        def __init__(self, *args, **kwargs): pass
        def isNull(self): return False
        def pixmap(self, *args): return QPixmap()
        def addPixmap(self, *args): pass
    class QPixmap:
        def __init__(self, *args, **kwargs): pass
        def fill(self, *args): pass
        def setDevicePixelRatio(self, *args): pass
        def transformed(self, *args): return self
        def rect(self):
            class Rect:
                def __init__(self): pass
            return Rect()
    class QByteArray:
        def __init__(self, *args, **kwargs): pass
    class Qt:
        class GlobalColor:
            transparent = 0
    class QPainter:
        class CompositionMode:
            CompositionMode_SourceIn = 0
        def __init__(self, *args, **kwargs): pass
        def setCompositionMode(self, *args): pass
        def fillRect(self, *args): pass
        def end(self): pass
    class QTransform:
        def scale(self, *args): return self
    class QColor:
        def __init__(self, *args, **kwargs): pass
    class QSvgRenderer:
        def __init__(self, *args, **kwargs): pass
        def render(self, *args): pass
    class QSize:
        def __init__(self, w=0, h=0): self._w, self._h = w, h
        def width(self): return self._w
        def height(self): return self._h
        def isValid(self): return True

from .theme_tokens import get_theme_tokens


LUCIDE_SVGS: Dict[str, str] = {
    # Navigation
    "folder-tree": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.53l-.42-.85a1 1 0 0 0-.9-.62H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M3 5v14a2 2 0 0 0 2 2h3"/><path d="M8 5h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M3 12h9"/></svg>""",
    "file-pen-line": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 5-3-3H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"/><path d="M8 18h1"/><path d="M18.4 9.6a2 2 0 1 1 3 3L16 18l-4 1 1-4Z"/></svg>""",
    "sliders-horizontal": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>""",
    "sun": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>""",
    "moon": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>""",
    "monitor": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>""",
    "languages": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>""",

    # Actions
    "wand-sparkles": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>""",
    "eraser": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>""",
    "folder-open": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>""",
    "list-checks": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>""",
    "square-dashed": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></svg>""",
    "hammer": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.242-1.758H11l2 2v1.172a2 2 0 0 1-.586 1.414L10.5 9.5"/></svg>""",
    "x": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>""",
    "save": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>""",
    "save-all": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v3a1 1 0 0 0 1 1h5"/><path d="M18 18v-6a1 1 0 0 0-1-1h-5a1 1 0 0 0-1 1v6"/><path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="M8 18a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4H8Z"/></svg>""",
    "list-plus": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>""",
    "split": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/></svg>""",
    "undo-2": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>""",
    "trash-2": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>""",
    "copy": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>""",
    "external-link": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>""",
    "chevron-down": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>""",
    "chevron-right": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>""",
    "chevron-left": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>""",
    "chevron-up": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>""",
    "check": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>""",
    "minus": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>""",
    "search": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>""",

    # Status
    "circle-check": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>""",
    "info": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>""",
    "triangle-alert": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>""",
    "circle-x": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>""",

    # File and Tree Types
    "folder": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>""",
    "file": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>""",
    "file-code": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/></svg>""",
    "file-text": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>""",
    "file-json": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"/><path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"/></svg>""",
    "book-open": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>""",
    "package": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>""",
    "git-branch": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>""",
    "settings-2": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>""",
    "file-cog": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><circle cx="12" cy="14" r="2"/><path d="M12 10.5v1"/><path d="M12 16.5v1"/><path d="m14.5 11.5-.7.7"/><path d="m10.2 15.8-.7.7"/><path d="M15.5 14h-1"/><path d="M9.5 14h-1"/><path d="m14.5 16.5-.7-.7"/><path d="m10.2 12.2-.7-.7"/></svg>""",
    "image": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>""",
    "flask-conical": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v4.5l-6.5 10.5A2 2 0 0 0 5.2 20h13.6a2 2 0 0 0 1.7-3L14 6.5V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>""",
    "layout-dashboard": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>""",
    "cpu": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>""",
    "plug": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/></svg>""",
    "scale": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>""",
    "shield-check": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>""",
    "copy-plus": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="15" x2="15" y1="12" y2="18"/><line x1="12" x2="18" y1="15" y2="15"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>""",
    "arrow-right": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>""",
    "arrow-left": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>""",
    "refresh-cw": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>""",
    "columns-3": """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>""",
}


class IconService(QObject):
    """Central dynamic icon rendering and cache service."""

    def __init__(self):
        super().__init__()
        self._cache: Dict[Tuple[str, str, str, int, bool], QIcon] = {}
        self._bound_widgets: list = []

    def clear(self) -> None:
        """Clear cache on theme changes."""
        self._cache.clear()
        self._refresh_bound_widgets()

    def _refresh_bound_widgets(self) -> None:
        from .i18n_service import i18n
        is_rtl = i18n.is_rtl()
        alive_bindings = []
        for ref, icon_name, role, size, mirror in self._bound_widgets:
            widget = ref()
            if widget is not None:
                alive_bindings.append((ref, icon_name, role, size, mirror))
                try:
                    ic = self.icon(icon_name, size=size, role=role, mirror_in_rtl=mirror)
                    if hasattr(widget, "setIcon"):
                        widget.setIcon(ic)
                        if hasattr(widget, "text") and widget.text():
                            txt = widget.text().replace("\u00A0", "").strip()
                            if is_rtl:
                                widget.setText(f"{txt}\u00A0\u00A0")
                            else:
                                widget.setText(f"\u00A0\u00A0{txt}")
                    elif hasattr(widget, "setPixmap"):
                        widget.setPixmap(ic.pixmap(size, size))
                except Exception:
                    pass
        self._bound_widgets = alive_bindings

    def bind_icon(self, widget: Any, icon_name: str, role: str = "default", size: int = 16, mirror_in_rtl: bool = False) -> None:
        """Register a widget to dynamically recolor and maintain contrast when theme changes."""
        ref = weakref.ref(widget)
        self._bound_widgets.append((ref, icon_name, role, size, mirror_in_rtl))
        ic = self.icon(icon_name, size=size, role=role, mirror_in_rtl=mirror_in_rtl)
        if hasattr(widget, "setIcon"):
            widget.setIcon(ic)
        elif hasattr(widget, "setPixmap"):
            widget.setPixmap(ic.pixmap(size, size))

    def icon(self, name: str, *, size: int = 16, role: str = "default", mirror_in_rtl: bool = False, theme_override: Optional[str] = None) -> QIcon:
        """Build HiDPI crisp QIcon from Lucide SVG templates with state roles and 2px stroke."""
        from .theme_service import theme
        current_theme = theme_override or theme.current_theme
        
        # Determine RTL mirroring
        from .i18n_service import i18n
        is_rtl = i18n.is_rtl() if mirror_in_rtl else False

        cache_key = (name, current_theme, role, size, is_rtl)
        if cache_key in self._cache:
            return self._cache[cache_key]

        tokens = get_theme_tokens(current_theme)

        # Resolve colors per role with Green & Blue primary palette support
        role_colors = {
            "default": tokens["text_secondary"],
            "hover": tokens["text_primary"],
            "active": tokens["accent_text"],
            "disabled": tokens["disabled_text"],
            "on_accent": tokens["on_accent"],
            "on_blue": tokens.get("on_blue", tokens["on_accent"]),
            "white": tokens["on_accent"],
            "danger": tokens["error"],
            "success": tokens["success"],
            "warning": tokens["warning"],
            "info": tokens["info"],
            "accent": tokens["accent_text"],
            "green": tokens.get("accent_text", tokens["success"]),
            "blue": tokens.get("blue_text", tokens["info"]),
            "primary": tokens["accent_text"],
            "primary_green": tokens.get("accent_text", tokens["success"]),
            "primary_blue": tokens.get("blue_text", tokens["info"]),
        }
        base_color = role_colors.get(role, tokens["text_secondary"])

        def _build_svg_string(raw: str, c: str) -> str:
            # Replace {color} with concrete token color
            replaced = raw.replace("{color}", c)
            # Normalize stroke-width to uniform 2px thickness matching modern Lucide spec
            replaced = re.sub(r'stroke-width="[^"]*"', 'stroke-width="2"', replaced)
            if "<svg" in replaced:
                idx = replaced.find(">")
                if idx != -1:
                    open_tag = replaced[:idx + 1]
                    body = replaced[idx + 1:]
                    if body.endswith("</svg>"):
                        body = body[:-6]
                    return f'{open_tag}<g stroke="{c}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>'
            return replaced

        svg_text = LUCIDE_SVGS.get(name, LUCIDE_SVGS.get("file", ""))
        colored_svg = _build_svg_string(svg_text, base_color)

        if not HAS_PYQT6:
            # Return placeholder QIcon in headless environments
            icon = QIcon()
            self._cache[cache_key] = icon
            return icon

        icon = QIcon()
        # HiDPI rendering: generate standard (1x) and retina (2x) pixmaps
        for dpr in (1.0, 2.0):
            pix_size = int(size * dpr)
            renderer = QSvgRenderer(QByteArray(colored_svg.encode("utf-8")))
            pixmap = QPixmap(pix_size, pix_size)
            pixmap.fill(Qt.GlobalColor.transparent)
            painter = QPainter(pixmap)
            renderer.render(painter)
            # Tint rendered pixels with base_color to guarantee 100% color accuracy in Qt
            painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceIn)
            painter.fillRect(pixmap.rect(), QColor(base_color))
            painter.end()
            pixmap.setDevicePixelRatio(dpr)

            if is_rtl:
                pixmap = pixmap.transformed(QTransform().scale(-1, 1))

            icon.addPixmap(pixmap, QIcon.Mode.Normal)
            icon.addPixmap(pixmap, QIcon.Mode.Selected)

        # Also add Hover and Disabled states
        hover_color = tokens["on_accent"] if role in ("on_accent", "on_blue", "white") else (tokens["text_primary"] if role == "default" else base_color)
        hover_svg = _build_svg_string(svg_text, hover_color)
        hover_renderer = QSvgRenderer(QByteArray(hover_svg.encode("utf-8")))
        hover_pix = QPixmap(size * 2, size * 2)
        hover_pix.fill(Qt.GlobalColor.transparent)
        p = QPainter(hover_pix)
        hover_renderer.render(p)
        p.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceIn)
        p.fillRect(hover_pix.rect(), QColor(hover_color))
        p.end()
        hover_pix.setDevicePixelRatio(2.0)
        if is_rtl:
            hover_pix = hover_pix.transformed(QTransform().scale(-1, 1))
        icon.addPixmap(hover_pix, QIcon.Mode.Active)

        # Explicitly register Disabled mode pixmaps using tokens["disabled_text"]
        # so button icons automatically match disabled text color across light and dark themes
        disabled_color = tokens["disabled_text"]
        disabled_svg = _build_svg_string(svg_text, disabled_color)
        for dpr in (1.0, 2.0):
            dis_pix_size = int(size * dpr)
            dis_renderer = QSvgRenderer(QByteArray(disabled_svg.encode("utf-8")))
            dis_pix = QPixmap(dis_pix_size, dis_pix_size)
            dis_pix.fill(Qt.GlobalColor.transparent)
            dp = QPainter(dis_pix)
            dis_renderer.render(dp)
            dp.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceIn)
            dp.fillRect(dis_pix.rect(), QColor(disabled_color))
            dp.end()
            dis_pix.setDevicePixelRatio(dpr)
            if is_rtl:
                dis_pix = dis_pix.transformed(QTransform().scale(-1, 1))
            icon.addPixmap(dis_pix, QIcon.Mode.Disabled)

        self._cache[cache_key] = icon
        return icon

    def get_indicator_svg_urls(self, theme_name: str) -> Dict[str, str]:
        """Generate indicator check and indeterminate SVG files for QSS image: url(...)."""
        import tempfile
        from pathlib import Path
        cache_dir = Path(tempfile.gettempdir()) / "treeforge_indicators" / theme_name
        cache_dir.mkdir(parents=True, exist_ok=True)

        tokens = get_theme_tokens(theme_name)
        on_accent = tokens["on_accent"]
        disabled_text = tokens["disabled_text"]

        check_svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{on_accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        minus_svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{on_accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>'
        check_dis_svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{disabled_text}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        minus_dis_svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{disabled_text}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>'

        files = {
            "check": cache_dir / "check.svg",
            "minus": cache_dir / "minus.svg",
            "check_disabled": cache_dir / "check_disabled.svg",
            "minus_disabled": cache_dir / "minus_disabled.svg",
        }
        files["check"].write_text(check_svg, encoding="utf-8")
        files["minus"].write_text(minus_svg, encoding="utf-8")
        files["check_disabled"].write_text(check_dis_svg, encoding="utf-8")
        files["minus_disabled"].write_text(minus_dis_svg, encoding="utf-8")

        return {k: v.as_posix() for k, v in files.items()}

    def file_icon_for(self, path_or_name: str, is_dir: bool = False, expanded: bool = False) -> QIcon:
        """Map extension or folder name to a semantic Lucide file icon."""
        if is_dir:
            return self.icon("folder-open" if expanded else "folder", size=16, role="accent")

        name = path_or_name.lower().split("/")[-1].split("\\")[-1]
        if name == "__init__.py":
            return self.icon("file-cog", size=16, role="info")
        elif name == "requirements.txt":
            return self.icon("package", size=16, role="warning")
        elif name.startswith(".git"):
            return self.icon("git-branch", size=16, role="default")
        elif name in ("readme.md", "license", "license.txt", "notice"):
            return self.icon("book-open", size=16, role="info")
        elif name.endswith(".py"):
            return self.icon("file-code", size=16, role="accent")
        elif name.endswith(".json"):
            return self.icon("file-json", size=16, role="warning")
        elif name.endswith((".toml", ".ini", ".cfg", ".yaml", ".yml")):
            return self.icon("settings-2", size=16, role="default")
        elif name.endswith((".png", ".jpg", ".jpeg", ".ico", ".svg")):
            return self.icon("image", size=16, role="info")
        elif name.endswith((".txt", ".log")):
            return self.icon("file-text", size=16, role="default")
        else:
            return self.icon("file", size=16, role="default")


# Global singleton instance
icon_service = IconService()
