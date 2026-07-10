import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


class StaticLandingRegressionTests(unittest.TestCase):
    def test_stage_sections_are_not_hidden_in_production(self):
        index = read_text("index.html")
        styles = read_text("css/styles.css")

        self.assertNotIn("landing-hide-stage-blocks", index)
        self.assertNotIn("body.landing-hide-stage-blocks", styles)
        self.assertIn('id="assembly"', index)
        self.assertIn('id="construction"', index)
        self.assertIn('href="#assembly"', index)
        self.assertIn('href="#construction"', index)

    def test_pages_deploys_only_from_main(self):
        workflow = read_text(".github/workflows/deploy-pages.yml")

        self.assertIn("- main", workflow)
        self.assertNotIn("feature/landing-share", workflow)

    def test_contact_mailto_preserves_user_draft(self):
        app = read_text("js/app.js")
        contact_section = app.split("function initContactForm", 1)[1]

        self.assertIn("mailto:hello@cubik.one", contact_section)
        self.assertNotIn("form.reset()", contact_section)

    def test_late_hero_model_load_restores_canvas_after_static_fallback(self):
        app = read_text("js/app.js")

        self.assertIn("function restoreHeroCanvasFromStaticFallback()", app)
        self.assertRegex(
            app,
            re.compile(
                r"function restoreHeroCanvasFromStaticFallback\(\) \{"
                r"(?=.*classList\.remove\('has-static-fallback'\))"
                r"(?=.*classList\.remove\('visually-hidden'\))"
                r"(?=.*removeAttribute\('aria-hidden'\))"
                r"(?=.*querySelector\('\.hero-static-fallback'\)\?\.remove\(\))",
                re.DOTALL,
            ),
        )
        self.assertRegex(
            app,
            re.compile(
                r"heroLayoutInitialized = true;"
                r"\s*loaderEl\?\.classList\.add\('hidden'\);"
                r"\s*restoreHeroCanvasFromStaticFallback\(\);"
            ),
        )


if __name__ == "__main__":
    unittest.main()
