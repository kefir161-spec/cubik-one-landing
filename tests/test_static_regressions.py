import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


class StaticLandingRegressionsTest(unittest.TestCase):
    def test_stage_sections_are_not_hidden_in_production(self):
        index = read_text("index.html")
        styles = read_text("css/styles.css")

        self.assertNotIn("landing-hide-stage-blocks", index)
        self.assertNotIn("landing-hide-stage-blocks", styles)
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

        self.assertIn("window.location.href = `mailto:hello@cubik.one", app)
        self.assertNotIn("form.reset()", app)

    def test_late_hero_load_restores_canvas_after_static_fallback(self):
        app = read_text("js/app.js")
        match = re.search(
            r"function onHeroModelLoaded\(index\) \{(?P<body>.*?)\n\}\n\nfunction loadHeroModelAt",
            app,
            re.S,
        )
        self.assertIsNotNone(match)

        body = match.group("body")
        first_layout = body.index("layoutHeroSingleCubikMode();")
        before_layout = body[:first_layout]

        self.assertIn("canvasWrap.classList.remove('has-static-fallback');", before_layout)
        self.assertIn("canvas.classList.remove('visually-hidden');", before_layout)
        self.assertIn("canvas.removeAttribute('aria-hidden');", before_layout)
        self.assertIn("canvasWrap.querySelector('.hero-static-fallback')?.remove();", before_layout)


if __name__ == "__main__":
    unittest.main()
