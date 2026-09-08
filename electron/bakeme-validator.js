'use strict';

const fs = require('fs');
const path = require('path');

const BOOKKEEPING_FILES = new Set([
  '_textures.tdb',
  '.aurora-cak-manifest.json',
  '.aurora-cak-external-references.json',
  'aurora_forge_extraction_report.txt'
]);

function normaliseGamePath(relativePath) {
  const value = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  // WWE 2K25 packing converts a source DDS to the matching virtual TEX path.
  return value.toLowerCase().endsWith('.dds') ? value.slice(0, -4).toLowerCase() + '.tex' : value.toLowerCase();
}

function findPayloads(root, current = root, payloads = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
    if (entry.isSymbolicLink()) throw new Error(`Cannot bake this folder: symbolic link “${relativePath}” is not allowed. Copy the real file into the BakeMe folder instead.`);
    if (entry.isDirectory()) findPayloads(root, fullPath, payloads);
    else if (entry.isFile() && !BOOKKEEPING_FILES.has(relativePath.toLowerCase())) payloads.push({ fullPath, relativePath, gamePath: normaliseGamePath(relativePath) });
  }
  return payloads;
}

function validateBakeMeRoot(sourcePath, knownGamePaths) {
  const root = path.resolve(String(sourcePath || ''));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error('Choose a readable folder to bake.');
  if (!(knownGamePaths instanceof Set) || !knownGamePaths.size) throw new Error('Cannot verify this BakeMe folder: choose a configured WWE 2K25 game folder first so Foundry can read its CAK catalog.');
  const payloads = findPayloads(root);
  if (!payloads.length) throw new Error('Cannot bake this BakeMe folder: it contains no mod files. Copy modded game files into it, keeping their exact extracted paths.');
  const invalid = payloads.filter((file) => !knownGamePaths.has(file.gamePath));
  if (invalid.length) {
    const examples = invalid.slice(0, 8).map((file) => `“${file.relativePath}”`).join(', ');
    const suffix = invalid.length > 8 ? ` (plus ${invalid.length - 8} more)` : '';
    throw new Error(`Cannot bake this folder: ${invalid.length} file path(s) do not exist in the selected WWE 2K25 CAK catalog: ${examples}${suffix}. Keep each mod file at the exact path it had after extraction.`);
  }
  return { root, fileCount: payloads.length, catalogVerified: true };
}

module.exports = { normaliseGamePath, validateBakeMeRoot };
