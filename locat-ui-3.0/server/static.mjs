import { realpath, readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.wasm':'application/wasm' };
export const contentSecurityPolicy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
export async function serveStatic(req, res, directory) {
  if (!['GET', 'HEAD'].includes(req.method)) return false;
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return false; }
  if (pathname.startsWith('/api/') || pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part === '..' || part.startsWith('.'))) return false;
  const root = await realpath(resolve(directory)).catch(() => null);
  if (!root) return false;
  const requested = resolve(root, '.' + pathname);
  const route = !extname(pathname);
  const target = await realpath(route ? resolve(root, 'index.html') : requested).catch(() => null);
  if (!target || !target.startsWith(root + sep) || !mime[extname(target)]) return false;
  const metadata = await stat(target);
  if (!metadata.isFile() || metadata.size > 16 * 1024 * 1024) return false;
  const data = req.method === 'HEAD' ? null : await readFile(target);
  res.writeHead(200, { 'Content-Type': mime[extname(target)], 'Content-Length': String(metadata.size), 'Cache-Control': extname(target) === '.html' ? 'no-cache' : 'public, max-age=3600', 'Content-Security-Policy': contentSecurityPolicy, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' });
  res.end(data); return true;
}
