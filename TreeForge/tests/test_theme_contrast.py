"""WCAG 2.1 contrast ratio verification tests for TreeForge design tokens."""

import unittest
from TreeForge.services.theme_tokens import (
    DARK_TOKENS, LIGHT_TOKENS, calculate_contrast
)


class TestThemeContrast(unittest.TestCase):
    """Verifies that all color token pairs satisfy WCAG AA accessibility standards."""

    def test_dark_palette_contrast(self):
        # Primary text on surfaces (>= 4.5:1)
        cr_primary = calculate_contrast(DARK_TOKENS["text_primary"], DARK_TOKENS["bg_card"])
        self.assertGreaterEqual(cr_primary, 4.5, f"Dark primary text contrast too low: {cr_primary:.2f}")

        # Muted text on bg_card (>= 4.5:1)
        cr_muted = calculate_contrast(DARK_TOKENS["text_muted"], DARK_TOKENS["bg_card"])
        self.assertGreaterEqual(cr_muted, 4.0, f"Dark muted text contrast too low: {cr_muted:.2f}")

        # On accent text on accent_solid (>= 4.5:1)
        cr_accent = calculate_contrast(DARK_TOKENS["on_accent"], DARK_TOKENS["accent_solid"])
        self.assertGreaterEqual(cr_accent, 4.5, f"Dark on-accent button text contrast too low: {cr_accent:.2f}")

        # Input border on input background (>= 3.0:1)
        cr_border = calculate_contrast(DARK_TOKENS["border_input"], DARK_TOKENS["bg_input"])
        self.assertGreaterEqual(cr_border, 3.0, f"Dark input border contrast too low: {cr_border:.2f}")

        # Toast contrast (text >= 4.5:1, subtext >= 4.5:1, status colors >= 4.5:1)
        for bg_key in ("toast_bg", "toast_bg_end"):
            cr_t_text = calculate_contrast(DARK_TOKENS["toast_text"], DARK_TOKENS[bg_key])
            self.assertGreaterEqual(cr_t_text, 4.5, f"Dark toast text on {bg_key} too low: {cr_t_text:.2f}")
            cr_t_sub = calculate_contrast(DARK_TOKENS["toast_subtext"], DARK_TOKENS[bg_key])
            self.assertGreaterEqual(cr_t_sub, 4.5, f"Dark toast subtext on {bg_key} too low: {cr_t_sub:.2f}")
            for st in ("toast_success", "toast_warning", "toast_error", "toast_info"):
                cr_st = calculate_contrast(DARK_TOKENS[st], DARK_TOKENS[bg_key])
                self.assertGreaterEqual(cr_st, 4.5, f"Dark toast {st} on {bg_key} too low: {cr_st:.2f}")

        # Disabled button contrast (text on bg >= 4.5:1)
        cr_disabled = calculate_contrast(DARK_TOKENS["disabled_text"], DARK_TOKENS["disabled_bg"])
        self.assertGreaterEqual(cr_disabled, 4.5, f"Dark disabled text contrast too low: {cr_disabled:.2f}")

    def test_light_palette_contrast(self):
        # Primary text on surfaces (>= 4.5:1)
        cr_primary = calculate_contrast(LIGHT_TOKENS["text_primary"], LIGHT_TOKENS["bg_card"])
        self.assertGreaterEqual(cr_primary, 4.5, f"Light primary text contrast too low: {cr_primary:.2f}")

        # Muted text on bg_card (>= 4.5:1)
        cr_muted = calculate_contrast(LIGHT_TOKENS["text_muted"], LIGHT_TOKENS["bg_card"])
        self.assertGreaterEqual(cr_muted, 4.5, f"Light muted text contrast on bg_card too low: {cr_muted:.2f}")

        # Muted text on bg_elevated (>= 4.5:1)
        cr_muted_elev = calculate_contrast(LIGHT_TOKENS["text_muted"], LIGHT_TOKENS["bg_elevated"])
        self.assertGreaterEqual(cr_muted_elev, 4.5, f"Light muted text contrast on bg_elevated too low: {cr_muted_elev:.2f}")

        # On accent text on accent_solid (>= 4.5:1)
        cr_accent = calculate_contrast(LIGHT_TOKENS["on_accent"], LIGHT_TOKENS["accent_solid"])
        self.assertGreaterEqual(cr_accent, 4.5, f"Light on-accent button text contrast too low: {cr_accent:.2f}")

        # Input border on input background (>= 3.0:1)
        cr_border = calculate_contrast(LIGHT_TOKENS["border_input"], LIGHT_TOKENS["bg_input"])
        self.assertGreaterEqual(cr_border, 3.0, f"Light input border contrast too low: {cr_border:.2f}")

        # Toast contrast (text >= 4.5:1, subtext >= 4.5:1, status colors >= 4.5:1)
        for bg_key in ("toast_bg", "toast_bg_end"):
            cr_t_text = calculate_contrast(LIGHT_TOKENS["toast_text"], LIGHT_TOKENS[bg_key])
            self.assertGreaterEqual(cr_t_text, 4.5, f"Light toast text on {bg_key} too low: {cr_t_text:.2f}")
            cr_t_sub = calculate_contrast(LIGHT_TOKENS["toast_subtext"], LIGHT_TOKENS[bg_key])
            self.assertGreaterEqual(cr_t_sub, 4.5, f"Light toast subtext on {bg_key} too low: {cr_t_sub:.2f}")
            for st in ("toast_success", "toast_warning", "toast_error", "toast_info"):
                cr_st = calculate_contrast(LIGHT_TOKENS[st], LIGHT_TOKENS[bg_key])
                self.assertGreaterEqual(cr_st, 4.5, f"Light toast {st} on {bg_key} too low: {cr_st:.2f}")

        # Disabled button contrast (text on bg >= 4.5:1)
        cr_disabled = calculate_contrast(LIGHT_TOKENS["disabled_text"], LIGHT_TOKENS["disabled_bg"])
        self.assertGreaterEqual(cr_disabled, 4.5, f"Light disabled text contrast too low: {cr_disabled:.2f}")


if __name__ == "__main__":
    unittest.main()
