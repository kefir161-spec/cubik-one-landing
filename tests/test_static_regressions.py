from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


class StaticRegressionTests(unittest.TestCase):
    def test_stage_sections_are_not_hidden_in_production(self) -> None:
        index_html = read_text("index.html")
        styles_css = read_text("css/styles.css")

        self.assertNotIn('class="landing-hide-stage-blocks"', index_html)
        self.assertNotIn("body.landing-hide-stage-blocks #assembly", styles_css)
        self.assertNotIn("body.landing-hide-stage-blocks #construction", styles_css)
        self.assertIn('<a href="#assembly">Assembly</a>', index_html)
        self.assertIn('<a href="#construction">Clips</a>', index_html)

    def test_contact_mailto_preserves_user_draft(self) -> None:
        app_js = read_text("js/app.js")

        contact_section = app_js[app_js.index("// Contact") :]
        self.assertIn("mailto:hello@cubik.one", contact_section)
        self.assertNotIn("form.reset()", contact_section)

    def test_pages_deploys_only_from_main_branch(self) -> None:
        workflow = read_text(".github/workflows/deploy-pages.yml")

        self.assertIn("- main", workflow)
        self.assertNotIn("feature/landing-share", workflow)


if __name__ == "__main__":
    unittest.main()
