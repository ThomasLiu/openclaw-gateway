import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const specDir = join(rootDir, 'docs', 'spec');

const specPath = join(rootDir, 'docs', 'spec.json');
const spec = JSON.parse(readFileSync(specPath, 'utf-8'));

mkdirSync(specDir, { recursive: true });

for (const [filename, content] of Object.entries(spec)) {
  const filePath = join(specDir, filename);
  writeFileSync(filePath, content, 'utf-8');
  console.log(`Generated: ${filePath}`);
}

console.log(`\nDone! Generated ${Object.keys(spec).length} files to ${specDir}`);
