'use strict';

const fs = require('fs');
const path = require('path');

const roots = ['.next', path.join('node_modules', '.cache')];

for (const dir of roots) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    process.stdout.write(`Removed ${dir}\n`);
  } catch (err) {
    process.stderr.write(`Skip ${dir}: ${err.message}\n`);
  }
}
