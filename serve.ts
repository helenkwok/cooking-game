// Serves game/ on http://localhost:8080 (or --port N) so Steam Lantern can be played locally with
// no build step: `node serve.ts`. Node 22, standard library only; a development convenience that
// refuses any path outside game/.
import { createReadStream, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/** A static server for directory `dir` on `port` (0 picks a free one). */
export function serveGame(dir: string, port: number): Server {
  const base = resolve(dir);
  return createServer((req, res) => {
    let path: string;
    try {
      path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('bad request');
      return;
    }
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(join(base, normalize(path)));
    if (file !== base && !file.startsWith(base + sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      const info = statSync(file);
      if (!info.isFile()) throw new Error('not a file');
      res.writeHead(200, {
        'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'content-length': info.size,
        'cache-control': 'no-store',
      });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404).end('not found');
    }
  }).listen(port, '127.0.0.1');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flag = process.argv.indexOf('--port');
  const port = flag === -1 ? 8080 : Number(process.argv[flag + 1]);
  const server = serveGame(fileURLToPath(new URL('./game', import.meta.url)), port);
  server.on('listening', () => console.log(`Steam Lantern is on http://localhost:${port}`));
}
