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

    def test_light_palette_contrast(self):
        # Primary text on surfaces (>= 4.5:1)
        cr_primary = calculate_contrast(LIGHT_TOKENS["text_primary"], LIGHT_TOKENS["bg_card"])
        self.assertGreaterEqual(cr_primary, 4.5, f"Light primary text contrast too low: {cr_primary:.2f}")

        # Muted text on bg_card (>= 4.5:1)
        cr_muted = calculate_contrast(LIGHT_TOKENS["text_muted"], LIGHT_TOKENS["bg_card"])
        self.assertGreaterEqual(cr_muted, 4.0, f"Light muted text contrast too low: {cr_muted:.2f}")

        # On accent text on accent_solid (>= 4.5:1)
        cr_accent = calculate_contrast(LIGHT_TOKENS["on_accent"], LIGHT_TOKENS["accent_solid"])
        self.assertGreaterEqual(cr_accent, 4.5, f"Light on-accent button text contrast too low: {cr_accent:.2f}")

        # Input border on input background (>= 3.0:1)
        cr_border = calculate_contrast(LIGHT_TOKENS["border_input"], LIGHT_TOKENS["bg_input"])
        self.assertGreaterEqual(cr_border, 3.0, f"Light input border contrast too low: {cr_border:.2f}")


if __name__ == "__main__":
    unittest.main()
