import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(relativePath) {
    return readFileSync(join(root, relativePath), 'utf8');
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

const html = read('index.html');
const css = read('css/styles.css');
const app = read('js/app.js');

assert(
    !/<body[^>]*\blanding-hide-stage-blocks\b/.test(html),
    'Assembly and construction sections must not be hidden by the body class.'
);
assert(html.includes('id="assembly"'), 'Assembly section is missing from index.html.');
assert(html.includes('id="construction"'), 'Construction section is missing from index.html.');
assert(html.includes('href="#assembly"'), 'Assembly navigation link is missing.');
assert(html.includes('href="#construction"'), 'Construction navigation link is missing.');
assert(
    !/body\.landing-hide-stage-blocks/.test(css),
    'CSS must not include the production hide gate for assembly/construction.'
);

const contactFormMatch = app.match(/\(function initContactForm\(\) \{[\s\S]*?\}\)\(\);/);
assert(contactFormMatch, 'Contact form initializer was not found.');
assert(
    !/\bform\.reset\(\)/.test(contactFormMatch[0]),
    'Contact form must preserve entered details after mailto handoff.'
);

console.log('Smoke checks passed.');
