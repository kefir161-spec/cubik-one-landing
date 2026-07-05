from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_stage_sections_are_not_hidden_in_production() -> None:
    index_html = read_text("index.html")
    styles_css = read_text("css/styles.css")

    assert 'class="landing-hide-stage-blocks"' not in index_html
    assert "body.landing-hide-stage-blocks #assembly" not in styles_css
    assert "body.landing-hide-stage-blocks #construction" not in styles_css
    assert '<a href="#assembly">Assembly</a>' in index_html
    assert '<a href="#construction">Clips</a>' in index_html


def test_contact_mailto_preserves_user_draft() -> None:
    app_js = read_text("js/app.js")

    contact_section = app_js[app_js.index("// Contact") :]
    assert "mailto:hello@cubik.one" in contact_section
    assert "form.reset()" not in contact_section


def test_pages_deploys_only_from_main_branch() -> None:
    workflow = read_text(".github/workflows/deploy-pages.yml")

    assert "- main" in workflow
    assert "feature/landing-share" not in workflow
