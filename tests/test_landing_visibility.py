import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class LandingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.section_ids = set()
        self.nav_hrefs = set()
        self._inside_nav = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "nav":
            self._inside_nav = True
        if tag == "section" and attrs.get("id"):
            self.section_ids.add(attrs["id"])
        if self._inside_nav and tag == "a" and attrs.get("href"):
            self.nav_hrefs.add(attrs["href"])

    def handle_endtag(self, tag):
        if tag == "nav":
            self._inside_nav = False


class LandingVisibilityTests(unittest.TestCase):
    def test_assembly_and_construction_are_shipped_visible(self):
        index_html = (ROOT / "index.html").read_text(encoding="utf-8")
        styles_css = (ROOT / "css" / "styles.css").read_text(encoding="utf-8")

        parser = LandingParser()
        parser.feed(index_html)

        self.assertIn("assembly", parser.section_ids)
        self.assertIn("construction", parser.section_ids)
        self.assertIn("#assembly", parser.nav_hrefs)
        self.assertIn("#construction", parser.nav_hrefs)

        self.assertNotIn("landing-hide-stage-blocks", index_html)
        self.assertNotIn("landing-hide-stage-blocks", styles_css)
        self.assertIsNone(
            re.search(
                r"#(?:assembly|construction)\s*\{[^}]*display\s*:\s*none",
                styles_css,
                flags=re.IGNORECASE | re.DOTALL,
            )
        )


if __name__ == "__main__":
    unittest.main()
