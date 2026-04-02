#!/usr/bin/env node
/**
 * prepare-agent-export-fixture.mjs
 *
 * Creates a mock agent export fixture used by e2e/agent-export.spec.ts.
 *
 * Usage: node prepare-agent-export-fixture.mjs
 *
 * Produces: e2e/fixtures/agent-export-fixture.zip
 *   - manifest.json
 *   - config/openclaw-agent.json
 *   - skills/ (empty)
 *   - workspace/ (empty)
 *   - import.mjs
 *
 * Requires: archiver (optional — falls back to in-process JSZip via fetch if not installed)
 */
import { createWriteStream } from 'fs';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, '..');
const OUTPUT_PATH = join(FIXTURE_DIR, 'agent-export-fixture.zip');

const MANIFEST = {
  formatVersion: '1.0',
  agentId: 'main',
  exportedAt: new Date().toISOString(),
  workspaceStrategy: 'exclude-skills-subfolder',
  exportedSkills: [],
  pluginPackagedSkillsIncluded: false,
};

const IMPORT_SCRIPT = `// import.mjs — openClaw Agent Import Script
// Run this to import the agent into your openClaw installation:
//
//   openclaw agent import ./import.mjs
//   # or
//   node import.mjs

const response = await fetch(
  'http://localhost:' + (process.env.OPENCLAW_PORT ?? '18789') + '/api/agents/main/export'
);

if (!response.ok) {
  console.error('Failed to export agent:', response.status, await response.text());
  process.exit(1);
}

const zipBuffer = await response.arrayBuffer();
console.log('Agent export zip received, size:', zipBuffer.byteLength, 'bytes');
// In a real import flow, this would be sent to the gateway's import endpoint
console.log('Import complete (stub — implement actual gateway import endpoint)');
`;

async function buildZip() {
  // Try archiver first, fall back to built-in
  let archiver;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    archiver = (await import('archiver')).default;
  } catch {
    // archiver not available — create a minimal valid zip using built-in
    return buildMinimalZip();
  }

  return new Promise((resolve, reject) => {
    const out = createWriteStream(OUTPUT_PATH);
    const zip = archiver('zip', { zlib: { level: 9 } });

    out.on('close', () => resolve(OUTPUT_PATH));
    zip.on('error', reject);

    zip.pipe(out);
    zip.append(JSON.stringify(MANIFEST, null, 2), { name: 'manifest.json' });
    zip.append(JSON.stringify({ agentId: 'main', label: 'Main Agent' }, null, 2), {
      name: 'config/openclaw-agent.json',
    });
    zip.append('', { name: 'skills/.gitkeep' });
    zip.append('', { name: 'workspace/.gitkeep' });
    zip.append(IMPORT_SCRIPT, { name: 'import.mjs' });
    zip.finalize();
  });
}

/**
 * Minimal valid zip file without archiver.
 * Creates a zip containing only manifest.json using the ZIP format.
 */
async function buildMinimalZip() {
  const { crc32 } = await import('./crc32.mjs').catch(() => ({ crc32: fallbackCrc32 }));
  const encoder = new TextEncoder();
  const manifestBytes = encoder.encode(JSON.stringify(MANIFEST, null, 2));

  // Build zip manually (minimal valid zip with one file)
  const chunks = [];

  // Local file header
  const filename = 'manifest.json';
  const filenameBytes = encoder.encode(filename);
  const localHeader = new Uint8Array(30 + filenameBytes.length);
  const view = new DataView(localHeader.buffer, localHeader.byteOffset);

  view.setUint32(0, 0x04034b50, true); // local file header signature
  view.setUint16(4, 20, true); // version needed
  view.setUint16(6, 0, true); // general purpose bit flag
  view.setUint16(8, 0, true); // compression method (store)
  view.setUint16(10, 0, true); // last mod time
  view.setUint16(12, 0, true); // last mod date
  view.setUint32(14, crc32(manifestBytes), true); // crc32
  view.setUint32(18, manifestBytes.length, true); // compressed size
  view.setUint32(22, manifestBytes.length, true); // uncompressed size
  view.setUint16(26, filenameBytes.length, true); // file name length
  view.setUint16(28, 0, true); // extra field length
  localHeader.set(filenameBytes, 30);

  chunks.push(localHeader);
  chunks.push(manifestBytes);

  // Central directory header
  const cdHeader = new Uint8Array(46 + filenameBytes.length);
  const cdView = new DataView(cdHeader.buffer, cdHeader.byteOffset);

  cdView.setUint32(0, 0x02014b50, true); // central directory header signature
  cdView.setUint16(4, 0, true); // version made by
  cdView.setUint16(6, 20, true); // version needed
  cdView.setUint16(8, 0, true); // general purpose bit flag
  cdView.setUint16(10, 0, true); // compression method
  cdView.setUint16(12, 0, true); // last mod time
  cdView.setUint16(14, 0, true); // last mod date
  cdView.setUint32(16, crc32(manifestBytes), true); // crc32
  cdView.setUint32(20, manifestBytes.length, true); // compressed size
  cdView.setUint32(24, manifestBytes.length, true); // uncompressed size
  cdView.setUint16(28, filenameBytes.length, true); // file name length
  cdView.setUint16(30, 0, true); // extra field length
  cdView.setUint16(32, 0, true); // file comment length
  cdView.setUint16(34, 0, true); // disk number start
  cdView.setUint16(36, 0, true); // internal file attributes
  cdView.setUint32(38, 0, true); // external file attributes
  cdView.setUint32(42, 0, true); // relative offset of local header
  cdHeader.set(filenameBytes, 46);

  chunks.push(cdHeader);

  // End of central directory
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer, eocd.byteOffset);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // number of this disk
  eocdView.setUint16(6, 0, true); // disk where central directory starts
  eocdView.setUint16(8, 1, true); // number of central directory records on this disk
  eocdView.setUint16(10, 1, true); // total number of central directory records
  const cdSize = cdHeader.length;
  const cdOffset = localHeader.length + manifestBytes.length;
  eocdView.setUint32(12, cdSize, true); // size of central directory
  eocdView.setUint32(16, cdOffset, true); // offset of start of central directory
  eocdView.setUint16(20, 0, true); // comment length

  chunks.push(eocd);

  const zipBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  const { writeFileSync } = await import('fs');
  writeFileSync(OUTPUT_PATH, zipBuffer);
  return OUTPUT_PATH;
}

function fallbackCrc32(data) {
  let crc = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  for (const byte of data) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (existsSync(OUTPUT_PATH)) {
    rmSync(OUTPUT_PATH);
  }

  mkdirSync(FIXTURE_DIR, { recursive: true });
  console.log('Building agent export fixture zip…');

  const output = await buildZip();
  console.log('Fixture created:', output);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
