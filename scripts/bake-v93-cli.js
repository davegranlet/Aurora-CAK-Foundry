'use strict';

// Headless WWE 2K25 FDIR 9.3 bake using the same backend as the desktop app.
// Usage: node scripts/bake-v93-cli.js --source <folder> --output <file>
const fs = require('fs');
const path = require('path');
const { buildCak, verifyCak } = require('../electron/cak-v93-backend');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const source = path.resolve(arg('--source'));
const output = path.resolve(arg('--output'));
const tool = path.resolve(arg('--tool') || path.join(__dirname, '..', 'app', 'tools', 'cak-v93', 'CakeTool.exe'));
const oodle = arg('--oodle') ? path.resolve(arg('--oodle')) : '';

if (!source || !output || source === path.resolve('.') || !fs.existsSync(source)) {
  throw new Error('Usage: node scripts/bake-v93-cli.js --source <folder> --output <file> [--tool <CakeTool.exe>] [--oodle <oo2core_9_win64.dll>]');
}
if (!fs.existsSync(tool)) throw new Error(`FDIR 9.3 backend not found: ${tool}. Run npm run build:v93 or pass --tool.`);
fs.mkdirSync(path.dirname(output), { recursive: true });

buildCak(source, output, tool, oodle);
const verification = verifyCak(output, source, tool, oodle);
console.log(JSON.stringify({ output, source, ...verification }, null, 2));
