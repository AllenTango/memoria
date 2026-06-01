#!/usr/bin/env node
/**
 * Unified esbuild compilation - all TS → ESM output
 * Replaces: npx tsc (CJS) + esbuild (bin+hub bundles)
 */
import * as esbuild from 'esbuild';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const OUT = path.join(rootDir, 'dist');

// Shared esbuild options for library compilation (no bundle, ESM output)
const libOptions = {
  platform: 'node',
  target: 'node18',
  format: 'esm',
  packages: 'external',
  jsx: 'automatic',
  jsxImportSource: 'react',
  banner: { js: '' },
  inject: [path.join(rootDir, 'esbuild-shim.js')],
};

/**
 * Compile a directory of .ts files to ESM .js in dist/
 * Handles __dirname/__filename via inject shim
 */
async function compileDir(entryDir, outSubdir) {
  const entries = [];
  const absSrc = path.join(rootDir, entryDir);

  // Find all .ts files recursively (exclude tui which is handled separately)
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        if (entry !== 'tui') walk(full);
      } else if (entry.endsWith('.ts') && !entry.startsWith('.')) {
        entries.push(full);
      }
    }
  }
  walk(absSrc);

  const outDir = path.join(OUT, outSubdir);
  fs.mkdirSync(outDir, { recursive: true });

  // Compile each entry individually
  for (const entry of entries) {
    const rel = path.relative(absSrc, entry);
    const outFile = path.join(outDir, rel.replace(/\.ts$/, '.js'));

    // Ensure output subdir exists
    const entryOutDir = path.dirname(outFile);
    fs.mkdirSync(entryOutDir, { recursive: true });

    await esbuild.build({
      entryPoints: [entry],
      outfile: outFile,
      ...libOptions,
    });
  }

  console.log(`✓ ${entryDir} → ${outSubdir}/ (${entries.length} files)`);
}

// ── 1. lib/ → dist/lib/ (ESM) ────────────────────────────────────────────
await compileDir('lib', 'lib');

// ── 2. src/ → dist/src/ (ESM, excluding tui) ─────────────────────────────
await compileDir('src', 'src');

// ── 3. bin/ → dist/bin/ (ESM bundle, external node_modules) ────────────────
await esbuild.build({
  entryPoints: [path.join(rootDir, 'bin/memoria.ts')],
  bundle: true,
  outfile: path.join(OUT, 'bin/memoria.js'),
  platform: 'node',
  target: 'node18',
  format: 'esm',
  packages: 'external',
  jsx: 'automatic',
  jsxImportSource: 'react',
  inject: [path.join(rootDir, 'esbuild-shim.js')],
});
console.log('✓ bin/memoria.ts → dist/bin/memoria.js (ESM bundle)');

// ── 4. src/tui/hub.tsx → dist/src/tui/hub.js (ESM bundle with ink+react) ───
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/tui/hub.tsx')],
  bundle: true,
  outfile: path.join(OUT, 'src/tui/hub.js'),
  platform: 'node',
  target: 'node18',
  format: 'esm',
  packages: 'bundle',
  jsx: 'automatic',
  jsxImportSource: 'react',
  banner: { js: '#!/usr/bin/env node' },
  external: ['react-devtools-core'],
});
console.log('✓ src/tui/hub.tsx → dist/src/tui/hub.js (ESM + ink bundle)');

console.log('\n✅ Build complete!');
console.log('  dist/lib/           — ESM');
console.log('  dist/src/           — ESM (excl tui)');
console.log('  dist/bin/memoria.js — ESM bundle');
console.log('  dist/src/tui/hub.js — ESM + ink bundle');
