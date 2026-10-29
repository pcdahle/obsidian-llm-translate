import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
await mkdir('.test-build', { recursive: true });
await build({
  entryPoints: ['tests/all.test.mjs'], outfile: '.test-build/all.test.mjs',
  platform: 'node', format: 'esm', target: 'node22', bundle: true,
  packages: 'external', loader: { '.css': 'empty' },
  plugins: [{ name: 'obsidian-test-host', setup(build) {
    build.onResolve({ filter: /^obsidian$/ }, () => ({ path: path.resolve('tests/obsidian-host.mjs') }));
  } }],
});
const result = spawnSync(process.execPath, ['--test', '.test-build/all.test.mjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
