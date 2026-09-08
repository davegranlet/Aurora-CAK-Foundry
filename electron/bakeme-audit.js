'use strict';

const fs = require('fs');
const path = require('path');

const MAX_DEPTH = 4;
const GAME_ROOT_NAMES = new Set([
  'characters', 'logo', 'arena', 'assets', 'data', 'movies', 'sound', 'ui', 'render', 'shaders'
]);

function auditBakeSource(sourcePath, maxDepth = MAX_DEPTH) {
  const root = path.resolve(String(sourcePath || ''));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory())
    throw new Error('Choose a readable mod folder first.');
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > MAX_DEPTH)
    throw new Error(`BakeMe audit depth must be between 1 and ${MAX_DEPTH}.`);

  let files = 0; let bytes = 0; let skippedLinks = 0; let deepest = 0;
  const candidates = [];
  function walk(directory, depth) {
    deepest = Math.max(deepest, depth);
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    const recognisedChildren = entries.filter((entry) => entry.isDirectory() && GAME_ROOT_NAMES.has(entry.name.toLowerCase()));
    if (recognisedChildren.length) {
      candidates.push({
        path: directory,
        relative: path.relative(root, directory).replace(/\\/g, '/') || '.',
        recognisedRoots: recognisedChildren.map((entry) => entry.name),
        depth
      });
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) { skippedLinks += 1; continue; }
      if (entry.isFile()) {
        const size = fs.statSync(target).size;
        files += 1; bytes += size;
      } else if (entry.isDirectory() && depth < maxDepth) {
        walk(target, depth + 1);
      }
    }
  }
  walk(root, 0);
  if (!files) throw new Error(`No files were found within ${maxDepth} folder levels.`);

  const warnings = [];
  if (!candidates.length) {
    warnings.push(`No recognizable game-root folder was found within ${maxDepth} levels. Do not flatten “Texture 001” or similarly named folders: choose the folder that already starts with the real in-game path.`);
  } else if (candidates.length > 1) {
    warnings.push('More than one possible virtual root was found. Choose one manually; Aurora Forge will not guess between them.');
  }
  if (skippedLinks) warnings.push(`${skippedLinks} symbolic-link entr${skippedLinks === 1 ? 'y was' : 'ies were'} ignored for safety.`);
  return {
    root, maxDepth, files, bytes, deepestDepth: deepest, skippedLinks,
    candidates, suggestedRoot: candidates.length === 1 ? candidates[0].path : '', warnings
  };
}

module.exports = { MAX_DEPTH, auditBakeSource };
