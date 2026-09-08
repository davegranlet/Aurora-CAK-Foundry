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

function prepareBakeMeCopy(sourcePath, destinationParent) {
  const audit = auditBakeSource(sourcePath);
  if (!audit.suggestedRoot)
    throw new Error('Aurora Forge could not identify one safe game-relative root. Select the folder whose direct children are the real game folders, then inspect it again.');
  const destination = path.resolve(String(destinationParent || ''), 'BakeMe');
  if (destination === audit.suggestedRoot || destination.startsWith(audit.suggestedRoot + path.sep))
    throw new Error('Choose an output folder outside the source mod folder.');
  if (fs.existsSync(destination))
    throw new Error(`Refusing to overwrite the existing BakeMe folder: ${destination}`);

  let copiedFiles = 0; let copiedBytes = 0; const blocked = [];
  function copyTree(from, to, depth) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const source = path.join(from, entry.name); const target = path.join(to, entry.name);
      if (entry.isSymbolicLink()) { blocked.push(`${entry.name}: symbolic link`); continue; }
      if (entry.isFile()) {
        fs.copyFileSync(source, target); copiedFiles += 1; copiedBytes += fs.statSync(source).size;
      } else if (entry.isDirectory()) {
        if (depth >= audit.maxDepth) { blocked.push(`${path.relative(audit.suggestedRoot, source).replace(/\\/g, '/')}: beyond ${audit.maxDepth}-level limit`); continue; }
        copyTree(source, target, depth + 1);
      }
    }
  }
  try {
    copyTree(audit.suggestedRoot, destination, 0);
    if (!copiedFiles) throw new Error('The selected game-relative root contains no copyable files within the depth limit.');
    return { ...audit, sourceRoot: audit.suggestedRoot, destination, copiedFiles, copiedBytes, blocked };
  } catch (error) {
    fs.rmSync(destination, { recursive: true, force: true });
    throw error;
  }
}

module.exports = { MAX_DEPTH, auditBakeSource, prepareBakeMeCopy };
