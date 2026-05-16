import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesCss = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');

function bodyClassList() {
    const bodyMatch = indexHtml.match(/<body\b([^>]*)>/i);
    assert.ok(bodyMatch, 'index.html must contain a <body> tag');

    const classMatch = bodyMatch[1].match(/\bclass=(["'])(.*?)\1/i);
    return classMatch ? classMatch[2].split(/\s+/).filter(Boolean) : [];
}

test('assembly and construction sections are visible in production markup', () => {
    assert.match(indexHtml, /<section\b[^>]*\bid=["']assembly["']/i);
    assert.match(indexHtml, /<section\b[^>]*\bid=["']construction["']/i);

    assert.doesNotMatch(
        stylesCss,
        /#(?:assembly|construction)\s*\{[^}]*display\s*:\s*none\s*!important/i,
        'key product sections must not be hidden by a production CSS rule',
    );
    assert.ok(
        !bodyClassList().some((className) => /hide.*stage|stage.*hide/.test(className)),
        'body must not enable a stage-hiding feature flag in production',
    );
});

test('primary navigation exposes links to key product sections', () => {
    assert.match(indexHtml, /<a\b[^>]*href=["']#assembly["']/i);
    assert.match(indexHtml, /<a\b[^>]*href=["']#construction["']/i);

    assert.doesNotMatch(
        stylesCss,
        /a\[href=['"]#(?:assembly|construction)['"]\][^{]*\{[^}]*display\s*:\s*none\s*!important/i,
        'primary nav links to key sections must not be hidden by CSS',
    );
});
