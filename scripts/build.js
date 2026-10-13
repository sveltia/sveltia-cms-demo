/**
 * Build the site into `dist/`, which Cloudflare Pages deploys: the admin page and its files, and
 * the sample content in `seed/` with a manifest listing it. Run with `npm run build`.
 */

import { cp, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { getManifest } from './manifest.js';
import { root, SITE_FILES } from './site.js';

const distDir = join(root, 'dist');

await rm(distDir, { recursive: true, force: true });

await Promise.all(SITE_FILES.map((name) => cp(join(root, name), join(distDir, name))));

await cp(join(root, 'seed'), join(distDir, 'seed'), {
  recursive: true,
  // Skip dotfiles like `.DS_Store`, which aren’t listed in the manifest
  filter: (source) => !basename(source).startsWith('.'),
});

const manifest = await getManifest();

await writeFile(join(distDir, 'seed', 'manifest.json'), manifest);
console.info(`Built dist/ with ${JSON.parse(manifest).files.length} seed files`);
