'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const crypto = require('crypto');

function isV93Archive(archivePath) {
  const fd = fs.openSync(archivePath, 'r');
  try {
    const header = Buffer.alloc(8);
    if (fs.readSync(fd, header, 0, 8, 0) !== 8) return false;
    return header.toString('ascii', 0, 4) === 'FDIR' && header[4] === 9 && header[5] === 3;
  } finally { fs.closeSync(fd); }
}

function runBackend(toolPath, args, oodlePath = '') {
  if (!fs.existsSync(toolPath)) throw new Error('The included WWE 2K25 FDIR 9.3 backend is missing.');
  const env = { ...process.env };
  if (oodlePath) env.AURORA_OODLE_PATH = oodlePath;
  const run = cp.spawnSync(toolPath, args, { encoding: 'utf8', windowsHide: true, env, maxBuffer: 256 * 1024 * 1024 });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(String(run.stderr || run.stdout || `FDIR 9.3 backend exited with code ${run.status}.`).trim());
  return String(run.stdout || '');
}

function openArchive(archivePath, toolPath) {
  const selected = path.resolve(archivePath);
  if (!isV93Archive(selected)) throw new Error('This archive is not FDIR 9.3.');
  const output = runBackend(toolPath, ['catalog-json', '-i', selected]);
  const marker = 'AURORA_CATALOG_JSON=';
  const line = output.split(/\r?\n/).find((value) => value.startsWith(marker));
  if (!line) throw new Error('The FDIR 9.3 backend did not return a readable catalog.');
  const catalog = JSON.parse(line.slice(marker.length));
  const archiveSize = fs.statSync(selected).size;
  return {
    archiveName: path.basename(selected), archivePath: selected, archiveSize,
    versionMajor: catalog.versionMajor, versionMinor: catalog.versionMinor,
    format: 'FDIR 9.3', game: 'WWE 2K25', key: catalog.archiveKey, keyRecovered: false,
    folders: catalog.folders.map((folder) => ({ ...folder, path: folder.name })),
    files: catalog.files.map((file) => ({
      ...file, protected: file.protectedPayload, nativeName: file.name, nativeNameVerified: true,
      folderName: catalog.folders[file.folderIndex]?.name || path.posix.dirname(String(file.name || '').replace(/\\/g, '/')),
      nameResolved: true, availability: file.extractable ? 'ready' : 'external-reference', sourceArchivePath: selected,
      sourceArchiveName: path.basename(selected), sourceArchiveKey: catalog.archiveKey
    })),
    warnings: [], backend: 'v93'
  };
}

function extractAll(archivePath, outputRoot, toolPath, oodlePath) {
  return runBackend(toolPath, ['unpack-cak', '-i', archivePath, '-o', outputRoot, '--no-convert-dds'], oodlePath);
}

function extractFile(archivePath, relativePath, outputRoot, toolPath, oodlePath) {
  return runBackend(toolPath, ['unpack-file', '-i', archivePath, '-f', relativePath, '-o', outputRoot, '--no-convert-dds'], oodlePath);
}

function buildCak(sourceRoot, outputPath, toolPath, oodlePath) {
  return runBackend(toolPath, ['pack', '-i', sourceRoot, '-v', '9.3', '-o', outputPath, '--encrypt-header'], oodlePath);
}

function walk(root, current = root, output = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (['.aurora-cak-manifest.json', '.aurora-cak-external-references.json', 'Aurora_Forge_Extraction_Report.txt'].includes(entry.name)) continue;
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(root, full, output);
    else if (entry.isFile()) output.push({ full, relative: path.relative(root, full).replace(/\\/g, '/') });
  }
  return output;
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function archiveRelativePath(sourceRelative) {
  return sourceRelative.toLowerCase().endsWith('.dds')
    ? sourceRelative.slice(0, -4) + '.tex'
    : sourceRelative;
}

function verifyCak(archivePath, sourceRoot, toolPath, oodlePath) {
  const catalog = openArchive(archivePath, toolPath);
  const expected = walk(path.resolve(sourceRoot));
  const sourceHasTextureDatabase = expected.some((file) => file.relative.toLowerCase() === '_textures.tdb');
  const sourceHasDds = expected.some((file) => file.relative.toLowerCase().endsWith('.dds'));
  const generatedTextureDatabases = catalog.files.filter((file) => String(file.name).toLowerCase() === '_textures.tdb');
  if (generatedTextureDatabases.length !== (sourceHasDds && !sourceHasTextureDatabase ? 1 : 0)) {
    throw new Error(`FDIR 9.3 rebuild produced an unexpected _textures.tdb count: ${generatedTextureDatabases.length}.`);
  }
  const expectedArchiveFiles = expected.length + generatedTextureDatabases.length;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-v93-verify-'));
  try {
    extractAll(archivePath, temporary, toolPath, oodlePath);
    const actual = walk(temporary);
    if (catalog.files.length !== expectedArchiveFiles || actual.length !== expectedArchiveFiles) throw new Error(`FDIR 9.3 rebuild count mismatch: source ${expected.length}, generated metadata ${generatedTextureDatabases.length}, catalog ${catalog.files.length}, reopened ${actual.length}.`);
    if (generatedTextureDatabases.length && !actual.some((file) => file.relative.toLowerCase() === '_textures.tdb')) {
      throw new Error('FDIR 9.3 rebuild omitted generated _textures.tdb during reopen verification.');
    }
    for (const file of expected) {
      const recovered = path.join(temporary, ...archiveRelativePath(file.relative).split('/'));
      if (!fs.existsSync(recovered)) throw new Error(`FDIR 9.3 rebuild omitted ${file.relative}.`);
      if (file.relative.toLowerCase().endsWith('.dds')) {
        if (fs.statSync(recovered).size === 0) throw new Error(`FDIR 9.3 converted texture is empty: ${file.relative}.`);
      } else if (fs.statSync(file.full).size !== fs.statSync(recovered).size || sha256(file.full) !== sha256(recovered)) {
        throw new Error(`FDIR 9.3 byte verification failed for ${file.relative}.`);
      }
    }
    const convertedTextureCount = expected.filter((file) => file.relative.toLowerCase().endsWith('.dds')).length;
    return { verified: true, payloadVerified: true, fileCount: catalog.files.length, sourceFileCount: expected.length, convertedTextureCount, folderCount: catalog.folders.length, bytes: fs.statSync(archivePath).size, gameCompatibilityProfile: 'WWE 2K25 FDIR 9.3 (Experimental until in-game mount confirmation)' };
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

module.exports = { isV93Archive, openArchive, extractAll, extractFile, buildCak, verifyCak };
