/**
 * Generate the manifest of the sample content: the list of files in `seed/` that Sveltia CMS copies
 * to the browser’s storage when a visitor first signs in to the demo. It’s served at
 * `/seed/manifest.json`, written to `dist/` by `scripts/build.js` and generated on every request by
 * `scripts/serve.js`.
 */

import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const seedDir = join(import.meta.dirname, '..', 'seed');

/**
 * Path where the manifest is served from, relative to `seed/`.
 */
export const manifestPath = join(seedDir, 'manifest.json');

/**
 * Get the manifest content: the paths of the files in `seed/`, except dotfiles like `.DS_Store`.
 * @returns {Promise<string>} JSON.
 */
export const getManifest = async () => {
  const files = (await readdir(seedDir, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => relative(seedDir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter((path) => path !== 'manifest.json')
    .sort();

  return `${JSON.stringify({ files }, null, 2)}\n`;
};
