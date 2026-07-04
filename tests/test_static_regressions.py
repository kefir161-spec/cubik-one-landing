import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


class StaticRegressionTests(unittest.TestCase):
    def test_stage_sections_are_not_hidden_in_production(self):
        index = read("index.html")
        styles = read("css/styles.css")

        self.assertNotIn("landing-hide-stage-blocks", index)
        self.assertNotIn("landing-hide-stage-blocks", styles)

    def test_late_hero_model_load_restores_interactive_canvas(self):
        app = read("js/app.js")

        self.assertIn("function restoreHeroCanvasAfterFallback()", app)
        self.assertRegex(
            app,
            re.compile(
                r"heroLayoutInitialized\s*=\s*true;\s*"
                r"loaderEl\?\.classList\.add\('hidden'\);\s*"
                r"restoreHeroCanvasAfterFallback\(\);",
                re.MULTILINE,
            ),
        )
        self.assertIn("canvas?.removeAttribute('aria-hidden')", app)
        self.assertIn("canvasWrap?.querySelector('.hero-static-fallback')?.remove()", app)

    def test_contact_mailto_keeps_user_draft_after_handoff(self):
        app = read("js/app.js")
        contact_code = app.split("function initContactForm()", 1)[1]

        self.assertIn("window.location.href = `mailto:", contact_code)
        self.assertNotIn("form.reset()", contact_code)

    def test_pages_deploy_runs_only_from_main(self):
        workflow = read(".github/workflows/deploy-pages.yml")

        self.assertIn("- main", workflow)
        self.assertNotIn("feature/landing-share", workflow)


if __name__ == "__main__":
    unittest.main()
