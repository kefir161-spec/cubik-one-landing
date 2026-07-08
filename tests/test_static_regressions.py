import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


class StaticRegressionTests(unittest.TestCase):
    def test_pages_deploys_only_from_main(self):
        workflow = read_text(".github/workflows/deploy-pages.yml")

        self.assertIn("- main", workflow)
        self.assertNotIn("feature/landing-share", workflow)
        self.assertNotRegex(workflow, r"branches:\s*(?:\n\s*-\s*(?!main\b)[^\n]+)+")

    def test_stage_sections_are_not_hidden_in_production_markup(self):
        index = read_text("index.html")
        styles = read_text("css/styles.css")

        self.assertNotIn("landing-hide-stage-blocks", index)
        self.assertNotIn("landing-hide-stage-blocks", styles)

    def test_contact_mailto_preserves_user_draft(self):
        app = read_text("js/app.js")

        contact_block = re.search(
            r"\(function initContactForm\(\) \{.*?form\.addEventListener\('submit'.*?\n\s*\}\);\n\}\)\(\);",
            app,
            re.S,
        )
        self.assertIsNotNone(contact_block)
        self.assertNotIn("form.reset()", contact_block.group(0))

    def test_late_hero_model_restores_canvas_after_static_fallback(self):
        app = read_text("js/app.js")

        self.assertIn("function restoreHeroCanvasAfterFallback()", app)
        restore_block = re.search(
            r"function restoreHeroCanvasAfterFallback\(\) \{(?P<body>.*?)\n\}",
            app,
            re.S,
        )
        self.assertIsNotNone(restore_block)
        body = restore_block.group("body")
        self.assertIn("classList.remove('has-static-fallback')", body)
        self.assertIn("classList.remove('visually-hidden')", body)
        self.assertIn("removeAttribute('aria-hidden')", body)
        self.assertIn("querySelector('.hero-static-fallback')?.remove()", body)

        default_load_path = re.search(
            r"if \(!heroLayoutInitialized\) \{(?P<body>.*?)scheduleRemainingHeroModels\(\);",
            app,
            re.S,
        )
        self.assertIsNotNone(default_load_path)
        self.assertIn("restoreHeroCanvasAfterFallback();", default_load_path.group("body"))


if __name__ == "__main__":
    unittest.main()
