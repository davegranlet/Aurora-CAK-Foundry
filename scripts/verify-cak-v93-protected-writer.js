'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const backend = require('../electron/cak-v93-backend');

const gameRoot = process.env.AURORA_WWE2K25_DIR;
if (!gameRoot || !fs.existsSync(gameRoot)) throw new Error('Set AURORA_WWE2K25_DIR to a WWE 2K25 installation folder.');
const oodle = path.join(gameRoot, 'oo2core_9_win64.dll');
if (!fs.existsSync(oodle)) throw new Error('The WWE 2K25 Oodle library was not found.');
const tool = path.join(__dirname, '..', 'app', 'tools', 'cak-v93', 'CakeTool.exe');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-v93-protected-writer-'));

try {
  const source = path.join(temporary, 'source');
  fs.mkdirSync(path.join(source, 'Folder'), { recursive: true });
  fs.writeFileSync(path.join(source, 'Folder', 'sample.txt'), 'Aurora protected FDIR 9.3 writer regression fixture.\n');
  const output = path.join(temporary, 'Aurora-v93-protected-test.cak');
  backend.buildCak(source, output, tool, oodle);

  const prefix = fs.readFileSync(output).subarray(0, 12);
  if (prefix.toString('ascii', 0, 4) !== 'FDIR' || prefix[4] !== 9 || prefix[5] !== 3) throw new Error('Protected writer emitted the wrong FDIR version.');
  if ((prefix.readUInt16LE(6) & 0x8000) === 0) throw new Error('Protected writer omitted the encrypted-header flag.');
  if (prefix.readUInt32LE(8) === 1) throw new Error('Protected writer left the one-file catalog header in plain form.');

  const verification = backend.verifyCak(output, source, tool, oodle);
  if (!verification.verified || !verification.payloadVerified || verification.fileCount !== 1) throw new Error('Protected writer did not pass payload verification.');
  console.log(JSON.stringify({ ok: true, encryptedHeader: true, catalogPlaintextRejected: true, payloadsVerified: verification.fileCount }));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
