'use strict';

const fs = require('fs');
const path = require('path');

// These are the real top-level folders in the local WWE 2K25 BakeMe reference.
// A mod may include only some of them, but it must begin at this virtual root.
const WWE2K25_ROOT_FOLDERS = new Set([
  'arena', 'audio', 'belts', 'cas', 'championship_titles', 'characters', 'createshow',
  'cutscene', 'entrances', 'environment', 'gameplay', 'gmmode', 'hide', 'logo',
  'matchcreator', 'movedata', 'movies', 'msc', 'particle', 'props', 'roster', 'sdb',
  'stable', 'ui'
]);
const ROOT_FILES = new Set(['_textures.tdb', '.aurora-cak-manifest.json', '.aurora-cak-external-references.json']);

function validateBakeMeRoot(sourcePath) {
  const root = path.resolve(String(sourcePath || ''));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory())
    throw new Error('Choose a readable folder to bake.');
  const entries = fs.readdirSync(root, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  const links = entries.filter((entry) => entry.isSymbolicLink()).map((entry) => entry.name);
  if (links.length) throw new Error(`Cannot bake this folder: symbolic links are not allowed (${links.join(', ')}). Copy the real files into the folder instead.`);

  const recognisedRoots = entries.filter((entry) => entry.isDirectory() && WWE2K25_ROOT_FOLDERS.has(entry.name.toLowerCase())).map((entry) => entry.name);
  const unknownFolders = entries.filter((entry) => entry.isDirectory() && !WWE2K25_ROOT_FOLDERS.has(entry.name.toLowerCase())).map((entry) => entry.name);
  const unknownFiles = entries.filter((entry) => entry.isFile() && !ROOT_FILES.has(entry.name.toLowerCase())).map((entry) => entry.name);
  if (!recognisedRoots.length) {
    const found = entries.map((entry) => entry.name).slice(0, 8);
    const suffix = entries.length > found.length ? ', …' : '';
    throw new Error(`Cannot verify this BakeMe folder: its top level does not contain a WWE 2K25 game folder. Found: ${found.length ? found.join(', ') + suffix : '(empty folder)'}. Select or arrange the folder so it begins with a real game path such as Characters, Logo, Arena, or UI.`);
  }
  if (unknownFolders.length || unknownFiles.length) {
    const details = [...unknownFolders.map((name) => `folder “${name}”`), ...unknownFiles.map((name) => `file “${name}”`)].join(', ');
    throw new Error(`Cannot verify this BakeMe folder: unrecognized item(s) at its top level: ${details}. Move wrapper folders, readme files, and mod-package files outside the BakeMe root; keep only real WWE 2K25 paths.`);
  }

  let fileCount = 0;
  function countFiles(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const target = path.join(directory, entry.name);
      if (entry.isFile() && !ROOT_FILES.has(path.relative(root, target).replace(/\\/g, '/').toLowerCase())) fileCount += 1;
      else if (entry.isDirectory()) countFiles(target);
    }
  }
  countFiles(root);
  if (!fileCount) throw new Error('Cannot bake this BakeMe folder: it contains no mod files below its recognized game folders.');
  return { root, recognisedRoots, fileCount };
}

module.exports = { validateBakeMeRoot };
