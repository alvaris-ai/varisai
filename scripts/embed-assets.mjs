import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.join('public', 'index.html'), 'utf-8');
const css = fs.readFileSync(path.join('public', 'style.css'), 'utf-8');
const js = fs.readFileSync(path.join('public', 'app.js'), 'utf-8');

const output = `// Auto-generated static assets embedded for zero-latency serverless delivery
export const HTML_CONTENT = ${JSON.stringify(html)};
export const CSS_CONTENT = ${JSON.stringify(css)};
export const JS_CONTENT = ${JSON.stringify(js)};
`;

fs.writeFileSync(path.join('src', 'assets.mjs'), output, 'utf-8');
console.log('src/assets.mjs successfully created. Bytes:', output.length);
