import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'www');

const WEB_ENTRIES = [
  'index.html',
  'privacy.html',
  'manifest.webmanifest',
  'sw.js',
  'css',
  'js',
  'assets',
];

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

for (const entry of WEB_ENTRIES) {
  const src = resolve(root, entry);
  const dst = resolve(outDir, entry);
  if (existsSync(src)) {
    cpSync(src, dst, { recursive: true });
  }
}

console.log(`Prepared clean web bundle in ${outDir}`);
