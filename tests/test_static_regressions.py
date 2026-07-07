from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


class StaticRegressionTests(unittest.TestCase):
    def test_stage_sections_are_not_hidden_in_production(self) -> None:
        index = read_text("index.html")
        styles = read_text("css/styles.css")

        body_match = re.search(r"<body\b([^>]*)>", index)
        self.assertIsNotNone(body_match)
        self.assertNotIn("landing-hide-stage-blocks", body_match.group(1))
        self.assertNotIn("landing-hide-stage-blocks", styles)

    def test_contact_mailto_keeps_user_draft(self) -> None:
        app = read_text("js/app.js")

        self.assertIn("window.location.href = `mailto:hello@cubik.one", app)
        self.assertNotIn("form.reset()", app)

    def test_late_hero_model_load_restores_canvas(self) -> None:
        app = read_text("js/app.js")

        self.assertIn("function showHeroCanvas()", app)
        self.assertIn("canvasWrap.classList.remove('has-static-fallback')", app)
        self.assertIn("canvas.classList.remove('visually-hidden')", app)
        self.assertIn("canvas.removeAttribute('aria-hidden')", app)
        self.assertIn("canvasWrap.querySelector('.hero-static-fallback')?.remove()", app)

    def test_pages_deploy_only_runs_from_main(self) -> None:
        workflow = read_text(".github/workflows/deploy-pages.yml")

        self.assertIn("- main", workflow)
        self.assertNotIn("feature/landing-share", workflow)


if __name__ == "__main__":
    unittest.main()
