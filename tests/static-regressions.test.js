const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const html = read('index.html');
const css = read('css/styles.css');
const app = read('js/app.js');

assert(!html.includes('landing-hide-stage-blocks'), 'landing must not hide assembly/construction sections');
assert(!css.includes('landing-hide-stage-blocks'), 'unused section-hiding CSS must stay removed');
assert(html.includes('href="#assembly"'), 'navigation should expose the Assembly section');
assert(html.includes('href="#construction"'), 'navigation should expose the Clips section');

const contactStart = app.indexOf('(function initContactForm()');
const contactEnd = app.indexOf('// =============================================', contactStart + 1);
assert(contactStart >= 0 && contactEnd > contactStart, 'contact form initializer should be present');
const contactBlock = app.slice(contactStart, contactEnd);
assert(!contactBlock.includes('form.reset('), 'mailto fallback must preserve user-entered contact details');

console.log('Static regression checks passed.');
