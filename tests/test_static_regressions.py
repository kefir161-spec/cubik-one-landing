import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


class LandingCriticalRegressionTests(unittest.TestCase):
    def test_assembly_and_construction_are_not_hidden_in_production(self):
        index = read_text("index.html")
        styles = read_text("css/styles.css")

        body_tag = re.search(r"<body\b[^>]*>", index)
        self.assertIsNotNone(body_tag)
        self.assertNotIn("landing-hide-stage-blocks", body_tag.group(0))
        self.assertNotIn("body.landing-hide-stage-blocks", styles)

    def test_pages_deploys_only_from_main(self):
        workflow = read_text(".github/workflows/deploy-pages.yml")

        self.assertIn("- main", workflow)
        self.assertNotIn("feature/landing-share", workflow)

    def test_contact_mailto_does_not_destroy_user_draft(self):
        app = read_text("js/app.js")

        self.assertIn("window.location.href = `mailto:", app)
        self.assertNotIn("form.reset()", app)

    def test_late_loaded_hero_model_restores_canvas_from_static_fallback(self):
        app = read_text("js/app.js")

        self.assertIn("function restoreHeroCanvasFromStaticFallback()", app)
        restore_body = re.search(
            r"function restoreHeroCanvasFromStaticFallback\(\) \{(?P<body>.*?)\n\}",
            app,
            re.S,
        )
        self.assertIsNotNone(restore_body)
        body = restore_body.group("body")
        self.assertIn("canvasWrap.classList.remove('has-static-fallback')", body)
        self.assertIn("canvas.classList.remove('visually-hidden')", body)
        self.assertIn("canvas.removeAttribute('aria-hidden')", body)
        self.assertIn("canvasWrap.querySelector('.hero-static-fallback')?.remove()", body)

        on_loaded = re.search(
            r"function onHeroModelLoaded\(index\) \{(?P<body>.*?)\n\}",
            app,
            re.S,
        )
        self.assertIsNotNone(on_loaded)
        self.assertIn("restoreHeroCanvasFromStaticFallback()", on_loaded.group("body"))


if __name__ == "__main__":
    unittest.main()
