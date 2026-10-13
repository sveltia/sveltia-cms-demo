/**
 * Serve the demo locally: `npm run dev`. The seed manifest is generated on every request rather
 * than read from the disk, so it lists the files currently in `seed/`. Set `CMS_URL` to load
 * another build of Sveltia CMS than the latest release on unpkg, e.g. one served by `pnpm preview`
 * in the CMS repository: `CMS_URL=http://localhost:4173/sveltia-cms.js npm run dev`. Set `PORT` to
 * change the port, 8080 by default. Only the files the build deploys are served, so the preview
 * matches the live site.
 */

import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, sep } from 'node:path';

import { getManifest, manifestPath } from './manifest.js';
import { root, SITE_FILES } from './site.js';

const port = Number(process.env.PORT ?? 8080);
const cmsURL = process.env.CMS_URL;
const UNPKG_URL = 'https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js';

/**
 * Public URL paths served from the seed files, like the site’s own public folders, keyed by the URL
 * prefix. Keep in sync with `_redirects`.
 */
const REWRITES = {
  '/images/': '/seed/static/images/',
  '/files/': '/seed/static/files/',
};

const MEDIA_TYPES = {
  '.gpx': 'application/gpx+xml',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.toml': 'application/toml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.yml': 'application/yaml; charset=utf-8',
};

createServer(async (req, res) => {
  let path = '';

  try {
    // A malformed escape sequence throws, and is answered with a 404 like a missing file
    let { pathname } = new URL(req.url, 'http://localhost');
    const prefix = Object.keys(REWRITES).find((key) => pathname.startsWith(key));

    if (prefix) {
      pathname = `${REWRITES[prefix]}${pathname.slice(prefix.length)}`;
    }

    path = normalize(join(root, decodeURIComponent(pathname)));

    if (!relative(root, path)) {
      path = join(root, 'index.html');
    }

    const [topLevel] = relative(root, path).split(sep);

    // Like the build, only serve the site files and the seed directory
    if (!SITE_FILES.includes(topLevel) && topLevel !== 'seed') {
      throw new Error('Not deployed');
    }

    if (path === manifestPath) {
      res.writeHead(200, { 'Content-Type': MEDIA_TYPES['.json'] }).end(await getManifest());

      return;
    }

    if (!(await stat(path)).isFile()) {
      throw new Error('Not a file');
    }
  } catch {
    res
      .writeHead(404, { 'Content-Type': MEDIA_TYPES['.html'] })
      .end(await readFile(join(root, '404.html')).catch(() => 'Not Found'));

    return;
  }

  const headers = { 'Content-Type': MEDIA_TYPES[extname(path)] ?? 'application/octet-stream' };

  if (cmsURL && path === join(root, 'index.html')) {
    res.writeHead(200, headers).end((await readFile(path, 'utf8')).replace(UNPKG_URL, cmsURL));

    return;
  }

  createReadStream(path)
    .on('open', () => res.writeHead(200, headers))
    .on('error', () => (res.headersSent ? res.destroy() : res.writeHead(500).end()))
    .pipe(res);
}).listen(port, () => {
  console.info(`Demo: http://localhost:${port}/`);
  console.info(`CMS: ${cmsURL ?? UNPKG_URL}`);
});
