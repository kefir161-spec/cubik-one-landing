import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_repo_file(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


class LandingCriticalRegressionTests(unittest.TestCase):
    def test_stage_sections_are_not_hidden_in_production(self):
        index = read_repo_file("index.html")
        styles = read_repo_file("css/styles.css")

        self.assertNotIn("landing-hide-stage-blocks", index)
        self.assertNotIn("landing-hide-stage-blocks", styles)

    def test_pages_deploy_only_runs_from_main(self):
        workflow = read_repo_file(".github/workflows/deploy-pages.yml")

        self.assertIn("- main", workflow)
        self.assertNotIn("feature/landing-share", workflow)

    def test_contact_mailto_preserves_user_draft(self):
        app = read_repo_file("js/app.js")

        self.assertIn("window.location.href = `mailto:hello@cubik.one?", app)
        self.assertNotIn("form.reset()", app)

    def test_late_hero_model_load_restores_canvas_after_static_fallback(self):
        app = read_repo_file("js/app.js")
        match = re.search(r"function restoreHeroCanvasAfterStaticFallback\(\) \{(?P<body>.*?)\n\}", app, re.S)

        self.assertIsNotNone(match)
        body = match.group("body")
        self.assertIn("canvasWrap.classList.remove('has-static-fallback')", body)
        self.assertIn("canvas.classList.remove('visually-hidden')", body)
        self.assertIn("canvas.removeAttribute('aria-hidden')", body)
        self.assertIn("canvasWrap.querySelector('.hero-static-fallback')?.remove()", body)

        on_load = re.search(r"function onHeroModelLoaded\(index\) \{(?P<body>.*?)\n\}", app, re.S)
        self.assertIsNotNone(on_load)
        self.assertIn("restoreHeroCanvasAfterStaticFallback()", on_load.group("body"))


if __name__ == "__main__":
    unittest.main()
