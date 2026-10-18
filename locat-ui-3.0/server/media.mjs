import { createMediaProcessor, probeMedia } from './mediaProcessor.mjs';
import { opendir, realpath, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, extname, resolve, relative, sep, delimiter } from 'node:path';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { parseMediaRange } from './mediaRange.mjs';

// Original Locat api/mediaTypes.ts, excluding SVG/HTML and unsupported HEIF.
const types = {
  '.mp4': ['video', 'video/mp4'], '.m4v': ['video', 'video/mp4'], '.mov': ['video', 'video/quicktime'], '.mkv': ['video', 'video/x-matroska'], '.webm': ['video', 'video/webm'], '.avi': ['video', 'video/x-msvideo'],
  '.mp3': ['audio', 'audio/mpeg'], '.m4a': ['audio', 'audio/mp4'], '.aac': ['audio', 'audio/aac'], '.flac': ['audio', 'audio/flac'], '.wav': ['audio', 'audio/wav'], '.ogg': ['audio', 'audio/ogg'], '.opus': ['audio', 'audio/ogg'],
  '.jpg': ['photo', 'image/jpeg'], '.jpeg': ['photo', 'image/jpeg'], '.png': ['photo', 'image/png'], '.webp': ['photo', 'image/webp'], '.gif': ['photo', 'image/gif'], '.bmp': ['photo', 'image/bmp'], '.avif': ['photo', 'image/avif'],
};
const inside = (root, file) => file.startsWith(root.endsWith(sep) ? root : root + sep);
const problem = (status, message) => Object.assign(new Error(message), { status });
export function createMediaLibrary(roots = (process.env.LOCAT_MEDIA_AUTHORIZED_ROOTS ?? '').split(delimiter).filter(Boolean), { maxFiles = 3000, maxEntries = 20000, maxDepth = 6, cacheMs = 60000 } = {}) {
  if (roots.length > 16) throw new Error('At most 16 media roots can be shared');
  roots = roots.map(root => resolve(root));
  const processor = createMediaProcessor();
  let records = new Map();
  let libraries = [];
  let refreshedAt = 0;
  let pending;
  let truncated = false;
  async function scan() {
    const next = new Map(), status = [];
    let inspected = 0, capped = false;
    for (const [index, configured] of roots.entries()) {
      const root = await realpath(configured).catch(() => null);
      const library = { name: basename(configured), available: !!root, count: 0 };
      status.push(library);
      if (!root) continue;
      const visited = new Set();
      async function walk(directory, depth) {
        if (depth > maxDepth || next.size >= maxFiles || inspected >= maxEntries) { capped = true; return; }
        const actual = await realpath(directory).catch(() => null);
        if (!actual || (actual !== root && !inside(root, actual)) || visited.has(actual)) return;
        visited.add(actual);
        const handle = await opendir(actual).catch(() => null);
        if (!handle) { library.available = false; return; }
        for await (const entry of handle) {
          if (++inspected > maxEntries || next.size >= maxFiles) { capped = true; break; }
          if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
          const path = resolve(actual, entry.name);
          if (entry.isDirectory()) { await walk(path, depth + 1); continue; }
          const type = types[extname(entry.name).toLowerCase()];
          if (!entry.isFile() || !type) continue;
          const file = await realpath(path).catch(() => null);
          if (!file || !inside(root, file)) continue;
          const fd = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)).catch(() => null);
          if (!fd) continue;
          const stat = await fd.stat().catch(() => null); await fd.close();
          if (!stat?.isFile() || !Number.isSafeInteger(stat.size)) continue;
          const id = createHash('sha256').update(JSON.stringify([index, relative(root, file)])).digest('hex');
          next.set(id, { id, name: entry.name, kind: type[0], mime: type[1], size: stat.size, addedAt: stat.mtimeMs, album: library.name, root, configured, file });
          library.count++;
        }
      }
      await walk(root, 0);
    }
    records = next; libraries = status; truncated = capped; refreshedAt = Date.now();
  }
  async function refresh({ force = false } = {}) {
    if (!pending && (force || !refreshedAt || Date.now() - refreshedAt >= cacheMs)) pending = scan().finally(() => { pending = undefined; });
    if (pending) await pending;
    return { libraries, truncated, refreshedAt, items: [...records.values()].map(({ id, name, kind, size, addedAt, album }) => ({ id: 'server:' + id, name, kind, size, addedAt, album, source: 'server', favorite: false, position: 0, streamUrl: '/api/media/stream/' + id })) };
  }
  return {
    refresh,
    async stream(req, res, id, { probeOnly = false, mode = "direct", audioIndex = null } = {}) {
      await refresh();
      const record = records.get(id);
      if (!record) throw problem(404, 'Media not found');
      const root = await realpath(record.configured).catch(() => null);
      const file = await realpath(record.file).catch(() => null);
      if (root !== record.root || !file || !inside(root, file)) throw problem(404, 'Media no longer available');
      const fd = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)).catch(() => null);
      if (!fd) throw problem(404, 'Media no longer available');
      try {
        // Bind containment to the opened inode on Linux, preventing directory-swap races.
        if (process.platform === 'linux') {
          const actual = await realpath('/proc/self/fd/' + fd.fd).catch(() => null);
          if (!actual || !inside(root, actual)) throw problem(404, 'Media no longer available');
        }
        const stat = await fd.stat();
        if (!stat.isFile()) throw problem(404, 'Media no longer available');
        if (probeOnly) return await probeMedia(fd);
        if (mode !== 'direct') {
          if (record.kind !== 'video') throw problem(415, 'Conversion is only available for video');
          if (req.method !== 'GET') throw problem(405, 'Conversion requires GET');
          if (req.headers.range && req.headers.range !== 'bytes=0-') throw problem(416, 'Progressive conversion cannot seek');
          const probe = await probeMedia(fd);
          if (probe.strategy === 'unsupported') throw problem(415, 'No video stream detected');
          if (mode === 'remux' && !['direct', 'remux'].includes(probe.strategy)) throw problem(415, 'This file requires transcoding');
          if (audioIndex !== null && !probe.audioTracks.some(track => track.index === audioIndex)) throw problem(400, 'Audio track not found');
          return await processor.stream(fd, res, { transcode: mode === 'transcode', audioIndex });
        }
        const range = parseMediaRange(req.headers.range ?? null, stat.size);
        const headers = { 'Accept-Ranges': 'bytes', 'Content-Type': record.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Disposition': 'inline' };
        if (range.status === 416) { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` }); res.end(); return; }
        headers['Content-Length'] = String(Math.max(0, range.end - range.start + 1));
        if (range.status === 206) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${stat.size}`;
        res.writeHead(range.status, headers);
        if (req.method === 'HEAD' || stat.size === 0) { res.end(); return; }
        const stream = fd.createReadStream({ start: range.start, end: range.end, autoClose: false });
        const abort = () => stream.destroy(); res.once('close', abort);
        try { await pipeline(stream, res); } catch (error) { if (!res.destroyed) throw error; }
        finally { res.off('close', abort); }
      } finally { await fd.close(); }
    },
  };
}
