import path from 'node:path';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import createJiti from 'jiti';
import sucrase from 'sucrase';

const rootDir = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(rootDir, 'src');

globalThis.__TEST_HARNESS__ = { describe, it, assert };

const jiti = createJiti(import.meta.filename, {
  alias: {
    '@': srcDir,
  },
  extensions: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json'],
  transform(opts) {
    return sucrase.transform(opts.source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      filePath: opts.filename,
    });
  },
});

function findTestFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(full));
    } else if (entry.isFile() && /\.test\.ts$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const filterArg = process.argv[2];
const allTests = findTestFiles(srcDir).filter((f) =>
  filterArg ? f.replace(/\\/g, '/').includes(filterArg.replace(/\\/g, '/')) : true
);

if (allTests.length === 0) {
  console.error('No test files matched:', filterArg || '(all)');
  process.exit(1);
}

for (const file of allTests) {
  jiti(file);
}
