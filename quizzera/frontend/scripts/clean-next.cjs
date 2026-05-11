'use strict';

const fs = require('fs');
const path = require('path');

console.warn(
  '[clean-next] Stop any running `next dev` on this app before deleting .next. ' +
    'If the dev server keeps running while .next is removed, the browser gets 404s for ' +
    '`/_next/static/chunks/main-app.js` and pages stay blank.'
);

const roots = ['.next', path.join('node_modules', '.cache')];

for (const dir of roots) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    process.stdout.write(`Removed ${dir}\n`);
  } catch (err) {
    process.stderr.write(`Skip ${dir}: ${err.message}\n`);
  }
}
