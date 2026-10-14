/**
 * Files making up the site, shared by the build and the local preview server so they serve the same
 * files.
 */

import { join } from 'node:path';

/**
 * Root directory of the repository.
 */
export const root = join(import.meta.dirname, '..');

/**
 * Files at the root of the repository to be deployed, along with the `seed/` directory.
 */
export const SITE_FILES = [
  'index.html',
  'api.js',
  '404.html',
  'config.yml',
  'logo.svg',
  '_headers',
  '_redirects',
];
