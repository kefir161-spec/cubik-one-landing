import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


class LandingRegressionTests(unittest.TestCase):
    def test_stage_sections_are_not_hidden(self):
        self.assertNotIn("landing-hide-stage-blocks", read("index.html"))
        self.assertNotIn("landing-hide-stage-blocks", read("css/styles.css"))

    def test_late_hero_model_restores_canvas(self):
        app = read("js/app.js")
        handler = app[
            app.index("function onHeroModelLoaded")
            : app.index("function loadHeroModelAt")
        ]

        self.assertIn("classList.remove('has-static-fallback')", handler)
        self.assertIn("classList.remove('visually-hidden')", handler)
        self.assertIn("removeAttribute('aria-hidden')", handler)
        self.assertIn("querySelector('.hero-static-fallback')?.remove()", handler)

    def test_mailto_handoff_preserves_form_draft(self):
        app = read("js/app.js")
        contact = app[
            app.index("(function initContactForm")
            : app.index("// Section titles entrance")
        ]

        self.assertNotIn("form.reset()", contact)

    def test_only_main_can_deploy_to_pages(self):
        workflow = read(".github/workflows/deploy-pages.yml")
        branches = re.search(
            r"push:\s*\n\s+branches:\s*\n(?P<items>(?:\s+- .+\n)+)",
            workflow,
        )

        self.assertIsNotNone(branches)
        self.assertEqual(["main"], re.findall(r"-\s+(\S+)", branches["items"]))

    def test_fixed_assets_are_cache_busted(self):
        html = read("index.html")

        self.assertIn('href="css/styles.css?v=58"', html)
        self.assertIn('src="js/app.js?v=80"', html)


if __name__ == "__main__":
    unittest.main()
