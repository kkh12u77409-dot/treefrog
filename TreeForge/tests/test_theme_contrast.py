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

        # On blue text on blue_solid (>= 4.5:1)
        cr_blue = calculate_contrast(LIGHT_TOKENS["on_blue"], LIGHT_TOKENS["blue_solid"])
        self.assertGreaterEqual(cr_blue, 4.5, f"Light on-blue button text contrast too low: {cr_blue:.2f}")

    def test_green_and_blue_primary_tokens(self):
        """Assert both Green and Blue palettes meet WCAG AA requirements across surfaces."""
        for name, tokens in [("dark", DARK_TOKENS), ("light", LIGHT_TOKENS)]:
            # Green solid contrast with on_accent text
            cr_green_solid = calculate_contrast(tokens["on_accent"], tokens["accent_solid"])
            self.assertGreaterEqual(cr_green_solid, 4.5, f"{name} on_accent on accent_solid too low: {cr_green_solid:.2f}")

            # Blue solid contrast with on_blue text
            cr_blue_solid = calculate_contrast(tokens["on_blue"], tokens["blue_solid"])
            self.assertGreaterEqual(cr_blue_solid, 4.5, f"{name} on_blue on blue_solid too low: {cr_blue_solid:.2f}")

            # Green text contrast on card surface
            cr_green_text = calculate_contrast(tokens["accent_text"], tokens["bg_card"])
            self.assertGreaterEqual(cr_green_text, 4.5, f"{name} accent_text on bg_card too low: {cr_green_text:.2f}")

            # Blue text contrast on card surface
            cr_blue_text = calculate_contrast(tokens["blue_text"], tokens["bg_card"])
            self.assertGreaterEqual(cr_blue_text, 4.5, f"{name} blue_text on bg_card too low: {cr_blue_text:.2f}")

    def test_icon_svg_stroke_width_uniformity(self):
        """Assert all Lucide SVGs define uniform 2px stroke width."""
        from TreeForge.services.icon_service import LUCIDE_SVGS
        self.assertGreater(len(LUCIDE_SVGS), 25, "LUCIDE_SVGS dictionary should contain all icons")
        for icon_name, svg_content in LUCIDE_SVGS.items():
            self.assertIn('stroke-width="2"', svg_content, f"Icon '{icon_name}' does not have uniform stroke-width=2")
            self.assertIn('viewBox="0 0 24 24"', svg_content, f"Icon '{icon_name}' does not have 24x24 viewBox")

    def test_button_spacing_directional_alignment(self):
        """Assert set_button_text provides consistent non-breaking spacing respecting RTL and LTR."""
        from TreeForge.ui.styles import set_button_text
        from TreeForge.services.i18n_service import i18n

        class MockButton:
            def __init__(self):
                self._text = ""
                self._has_icon = True
            def icon(self):
                return self
            def isNull(self):
                return not self._has_icon
            def setText(self, t):
                self._text = t
            def text(self):
                return self._text

        btn = MockButton()

        # In Arabic (RTL), space should be added at the end before icon on the right
        i18n.set_language("ar")
        set_button_text(btn, "بناء المشروع")
        self.assertTrue(btn.text().endswith("\u00A0\u00A0"), "RTL button text should end with fixed spacing")
        self.assertEqual(btn.text().replace("\u00A0", "").strip(), "بناء المشروع")

        # In English (LTR), space should be added at the beginning after icon on the left
        i18n.set_language("en")
        set_button_text(btn, "Build Project")
        self.assertTrue(btn.text().startswith("\u00A0\u00A0"), "LTR button text should start with fixed spacing")
        self.assertEqual(btn.text().replace("\u00A0", "").strip(), "Build Project")

        # Reset language to Arabic default
        i18n.set_language("ar")


if __name__ == "__main__":
    unittest.main()

