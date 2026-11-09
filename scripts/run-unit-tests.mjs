#!/usr/bin/env node
// Runs headless scripts/test-*.mjs sequentially.
// Uses Node type-stripping so tests can import TypeScript modules under src/.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(root)
  .filter((name) => /^test-.*\.mjs$/.test(name))
  .sort()
  .map((name) => join(root, name));

if (!tests.length) {
  console.error('No scripts/test-*.mjs files found.');
  process.exit(1);
}

let failed = 0;
for (const file of tests) {
  console.log(`\n=== ${file} ===`);
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', file],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAIL: ${file} (exit ${result.status})`);
  }
}

if (failed) {
  console.error(`\n${failed} test script(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${tests.length} unit test scripts passed.`);
