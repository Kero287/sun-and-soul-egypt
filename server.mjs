import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './lib/api.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const uploads = resolve(process.env.UPLOAD_DIR || 'uploads');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const publicFiles = new Set(['/index.html', '/style.css', '/script.js', '/admin.html', '/admin.css', '/admin.js', '/data/trips.json']);
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return handleApi(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  try {
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    if (path === '/admin' || path === '/admin/') path = '/admin.html';
    const isUpload = /^\/uploads\/[a-f0-9-]+(?:-thumb)?\.(webp|png|jpg|mp4|webm)$/.test(path);
    if (!publicFiles.has(path) && !path.startsWith('/images/') && !isUpload) throw new Error();
    const base = isUpload ? uploads : root;
    const target = resolve(base, isUpload ? path.slice(9) : `.${path}`);
    if (!target.startsWith(`${resolve(base)}${sep}`)) throw new Error();
    const content = await readFile(target);
    res.setHeader('Content-Type', types[extname(target)] || 'application/octet-stream');
    res.setHeader('Cache-Control', path.startsWith('/admin') || path.endsWith('.json') ? 'no-store' : 'no-cache');
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); }
});
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => console.log(`Sun & Soul Egypt: http://${host}:${port}\nAdmin: http://${host}:${port}/admin`));
