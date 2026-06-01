#!/usr/bin/env node
/**
 * Build TUI components (hub + bin) as ESM bundles using esbuild.
 * Handles ink's ESM + top-level await requirements.
 */
import * as esbuild from 'esbuild';
import * as path from 'path';
import * as url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Build bin as ESM bundle (external all node_modules except esbuild-shim)
await esbuild.build({
  entryPoints: [path.join(rootDir, 'bin/memoria.ts')],
  bundle: true,
  outfile: path.join(rootDir, 'dist/bin/memoria.js'),
  platform: 'node',
  target: 'node18',
  format: 'esm',
  packages: 'external',
  jsx: 'automatic',
  jsxImportSource: 'react',
  inject: [path.join(rootDir, 'esbuild-shim.js')],
});
console.log('✓ bin built (ESM bundle)');

// Build hub as ESM bundle (bundle everything including ink+react)
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/tui/hub.tsx')],
  bundle: true,
  outfile: path.join(rootDir, 'dist/src/tui/hub.js'),
  platform: 'node',
  target: 'node18',
  format: 'esm',
  packages: 'bundle',
  jsx: 'automatic',
  jsxImportSource: 'react',
  banner: { js: '#!/usr/bin/env node' },
  external: ['react-devtools-core'],
});
console.log('✓ hub built (ESM bundle with ink+react)');

console.log('\n✅ Build complete!');
console.log('  dist/bin/memoria.js    — CLI entry (ESM)');
console.log('  dist/src/tui/hub.js    — TUI hub (ESM, ink+React bundled)');
