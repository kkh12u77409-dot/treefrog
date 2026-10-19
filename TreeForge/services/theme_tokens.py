"""Theme tokens and WCAG contrast calculations for TreeForge.

Provides single-source-of-truth design tokens for Dark and Light themes,
metrics, and contrast verification functions.
"""

from typing import Dict, Any, Tuple


DARK_TOKENS: Dict[str, str] = {
    # Surfaces
    "bg_window": "#0b1220",
    "bg_sidebar": "#0f172a",
    "bg_card": "#131c2e",
    "bg_elevated": "#1a2438",
    "bg_input": "#0f1726",
    
    # Borders
    "border": "#40557d",
    "border_subtle": "#25334d",
    "border_input": "#5a6a85",
    "border_focus": "#34d399",
    
    # Text
    "text_primary": "#e6edf7",
    "text_secondary": "#a3b1c6",
    "text_muted": "#8494ab",
    
    # Accents (Green Primary)
    "accent_solid": "#047857",
    "on_accent": "#ffffff",
    "accent_hover": "#059669",
    "accent_pressed": "#064e3b",
    "accent_text": "#34d399",
    "accent_soft": "rgba(4,120,87,0.20)",
    
    # Accents (Blue Primary)
    "blue_solid": "#1d4ed8",
    "on_blue": "#ffffff",
    "blue_hover": "#2563eb",
    "blue_pressed": "#1e40af",
    "blue_text": "#60a5fa",
    "blue_soft": "rgba(29,78,216,0.20)",
    
    # Status
    "success": "#34d399",
    "warning": "#fbbf24",
    "error": "#f87171",
    "info": "#38bdf8",
    
    # Toast Tokens
    "toast_bg": "#1c2840",
    "toast_bg_end": "#16203a",
    "toast_text": "#f8fafc",
    "toast_subtext": "#b6c2d6",
    "toast_success": "#34d399",
    "toast_warning": "#fbbf24",
    "toast_error": "#fb7185",
    "toast_info": "#38bdf8",

    # Disabled State Tokens
    "disabled_bg": "#232f47",
    "disabled_text": "#9aa8be",
    "disabled_border": "#334155",
    
    # Code Editor
    "code_bg": "#0a101c",
    "code_gutter_bg": "#0d1424",
    "code_gutter_text": "#6b7a93",
    "code_current_line": "#172036",
    "syn_keyword": "#7dd3fc",
    "syn_string": "#6ee7b7",
    "syn_comment": "#7d8ba1",
    "syn_heading": "#fbbf24",
    "syn_number": "#fca5a5",
    
    # Shadows & Overlays
    "shadow": "rgba(0,0,0,0.45)",
}

LIGHT_TOKENS: Dict[str, str] = {
    # Surfaces
    "bg_window": "#f3f5f9",
    "bg_sidebar": "#ffffff",
    "bg_card": "#ffffff",
    "bg_elevated": "#eef2f7",
    "bg_input": "#ffffff",
    
    # Borders
    "border": "#b8c5d6",
    "border_subtle": "#e2e8f0",
    "border_input": "#6b7c93",
    "border_focus": "#047857",
    
    # Text
    "text_primary": "#0f172a",
    "text_secondary": "#475569",
    "text_muted": "#556479",
    
    # Accents (Green Primary)
    "accent_solid": "#047857",
    "on_accent": "#ffffff",
    "accent_hover": "#065f46",
    "accent_pressed": "#064e3b",
    "accent_text": "#047857",
    "accent_soft": "rgba(4,120,87,0.10)",
    
    # Accents (Blue Primary)
    "blue_solid": "#1d4ed8",
    "on_blue": "#ffffff",
    "blue_hover": "#1e40af",
    "blue_pressed": "#172554",
    "blue_text": "#1d4ed8",
    "blue_soft": "rgba(29,78,216,0.10)",
    
    # Status
    "success": "#047857",
    "warning": "#b45309",
    "error": "#b91c1c",
    "info": "#0369a1",
    
    # Toast Tokens
    "toast_bg": "#0f172a",
    "toast_bg_end": "#1e293b",
    "toast_text": "#f8fafc",
    "toast_subtext": "#b6c2d6",
    "toast_success": "#34d399",
    "toast_warning": "#fbbf24",
    "toast_error": "#fb7185",
    "toast_info": "#38bdf8",

    # Disabled State Tokens
    "disabled_bg": "#e2e8f0",
    "disabled_text": "#5a687d",
    "disabled_border": "#cbd5e1",
    
    # Code Editor
    "code_bg": "#fbfcfe",
    "code_gutter_bg": "#f1f4f9",
    "code_gutter_text": "#7a889c",
    "code_current_line": "#eef3fb",
    "syn_keyword": "#0369a1",
    "syn_string": "#047857",
    "syn_comment": "#64748b",
    "syn_heading": "#b45309",
    "syn_number": "#b45309",
    
    # Shadows & Overlays
    "shadow": "rgba(15,23,42,0.10)",
}

# Typography, Spacing, and Radii Metrics
METRICS = {
    "radius_control": 8,
    "radius_card": 12,
    "radius_popup": 10,
    "radius_pill": 999,
    "height_control": 36,
    "height_control_compact": 28,
    "height_row": 32,
    "height_menu_item": 34,
    "spacing_xs": 4,
    "spacing_sm": 8,
    "spacing_md": 12,
    "spacing_lg": 16,
    "spacing_xl": 20,
    "spacing_2xl": 24,
    "font_page_title": 22,
    "font_section_title": 15,
    "font_body": 13,
    "font_caption": 12,
    "font_code": 12.5,
}


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Parse hex color like '#0b1220' or '#fff' to (R, G, B)."""
    h = hex_color.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def relative_luminance(rgb: Tuple[int, int, int]) -> float:
    """Calculate WCAG 2.1 relative luminance for an RGB tuple."""
    r, g, b = [x / 255.0 for x in rgb]
    r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
    g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
    b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def calculate_contrast(hex1: str, hex2: str) -> float:
    """Compute WCAG contrast ratio between two hex colors."""
    lum1 = relative_luminance(hex_to_rgb(hex1))
    lum2 = relative_luminance(hex_to_rgb(hex2))
    lighter = max(lum1, lum2)
    darker = min(lum1, lum2)
    return (lighter + 0.05) / (darker + 0.05)


def get_theme_tokens(theme_name: str) -> Dict[str, str]:
    """Return token dictionary for specified theme ('dark' or 'light')."""
    return DARK_TOKENS if theme_name == "dark" else LIGHT_TOKENS
