import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

// The caller owns the authorized handle. Destroying a FileHandle ReadStream
// closes that handle even with autoClose:false; probing must leave it usable.
function mediaInput(fd) {
  return Readable.from((async function* () {
    let position = 0;
    while (true) {
      const buffer = Buffer.allocUnsafe(64 * 1024);
      const { bytesRead } = await fd.read(buffer, 0, buffer.length, position);
      if (!bytesRead) return;
      position += bytesRead;
      yield buffer.subarray(0, bytesRead);
    }
  })());
}

/** Original Locat mediaProbe policy. A recommendation never guarantees client decoder support. */
export function playbackStrategy(container, videoCodec, audioCodec) {
  const name = container.toLowerCase().split(',')[0], video = videoCodec?.toLowerCase(), audio = audioCodec?.toLowerCase();
  if (!video) return { strategy: 'unsupported', reason: 'No video stream detected' };
  if (['mov', 'mp4', 'm4a', '3gp', '3g2', 'mj2'].includes(name) && video === 'h264' && (!audio || ['aac', 'mp3'].includes(audio))) return { strategy: 'direct', reason: 'Browser-friendly MP4/H.264 stream' };
  if (['matroska', 'webm'].includes(name) && video === 'vp9' && (!audio || ['opus', 'vorbis'].includes(audio))) return { strategy: 'direct', reason: 'WebM-compatible streams; client support varies' };
  if (video === 'h264' && (!audio || ['aac', 'mp3', 'alac'].includes(audio))) return { strategy: 'remux', reason: 'Compatible streams can be copied into MP4; client support varies' };
  return { strategy: 'transcode', reason: 'H.264/AAC conversion is recommended' };
}
const unavailable = message => Object.assign(new Error(message), { status: 503 });
/** Feed only a previously authorized OPEN file: no child can reopen a replaced pathname. */
let activeProbes = 0;
export async function probeMedia(fd, { executable = process.env.LOCAT_FFPROBE_PATH ?? 'ffprobe', timeoutMs = 8000 } = {}) {
  if (activeProbes >= 2) throw unavailable('Media inspection capacity reached');
  activeProbes++;
  try { return await new Promise((resolve, reject) => {
    const child = spawn(executable, ['-v', 'error', '-show_entries', 'format=format_name,duration:stream=index,codec_type,codec_name,width,height:stream_tags=language,title', '-of', 'json', '-i', 'pipe:0'], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const input = mediaInput(fd);
    let output = '', stderrBytes = 0, settled = false;
    function finish(error, value) { if (settled) return; settled = true; clearTimeout(timer); input.destroy(); if (error) { child.kill(); reject(error); } else resolve(value); }
    const timer = setTimeout(() => finish(unavailable('Media inspection timed out')), timeoutMs);
    child.stdin.on('error', () => {}); // ffprobe may stop reading after its header inspection.
    input.on('error', () => finish(unavailable('Could not read media')));
    input.pipe(child.stdin);
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 256000) finish(unavailable('Media metadata exceeded its limit')); });
    child.stderr.on('data', chunk => { stderrBytes += chunk.length; if (stderrBytes > 16000) finish(unavailable('Media inspection failed')); });
    child.on('error', () => finish(unavailable('FFprobe is unavailable')));
    child.on('close', code => {
      if (settled) return;
      if (code !== 0) return finish(unavailable('Media inspection failed; progressive input may not support this container'));
      try {
        const data = JSON.parse(output), streams = Array.isArray(data.streams) ? data.streams : [];
        const video = streams.find(stream => stream.codec_type === 'video'), audio = streams.find(stream => stream.codec_type === 'audio');
        const duration = Number(data.format?.duration), container = String(data.format?.format_name ?? 'unknown');
        const audioTracks = streams.filter(stream => stream.codec_type === 'audio').slice(0, 32).map(stream => ({ index: stream.index, codec: stream.codec_name ?? 'unknown', language: stream.tags?.language ?? 'und', title: String(stream.tags?.title ?? '').slice(0, 100) }));
        finish(null, { container, videoCodec: video?.codec_name ?? null, audioCodec: audio?.codec_name ?? null, durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : null, width: video?.width ?? null, height: video?.height ?? null, audioTracks, ...playbackStrategy(container, video?.codec_name, audio?.codec_name) });
      } catch { finish(unavailable('Invalid media metadata')); }
    });
  }); } finally { activeProbes--; }
}
export function createMediaProcessor({ maximum = 2, timeoutMs = 4 * 60 * 60 * 1000, executable = process.env.LOCAT_FFMPEG_PATH ?? 'ffmpeg' } = {}) {
  let active = 0;
  return {
    get active() { return active; },
    async stream(fd, res, { transcode = false, audioIndex = null, startSeconds = 0 } = {}) {
      if (!Number.isSafeInteger(startSeconds) || startSeconds < 0 || startSeconds > 86400) throw Object.assign(new Error('Invalid conversion start position'), { status: 400 });
      if(startSeconds&&!transcode)throw Object.assign(new Error('Remux seeking requires H.264/AAC conversion'),{status:400});
      if (active >= maximum) throw Object.assign(unavailable('Media conversion capacity reached'), { retryAfter: 10 });
      active++;
      let child, input, timer, killTimer;
      try {
        // Linux can seek the inherited, already-authorized inode, without reopening
        // its original pathname. Other hosts retain bounded sequential pipe input.
        const inherited=process.platform==='linux';
        const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-threads', '2', ...(inherited&&startSeconds?['-ss',String(startSeconds)]:[]), '-i', inherited?'/proc/self/fd/3':'pipe:0', ...(!inherited&&startSeconds ? ['-ss', String(startSeconds)] : []), '-map', '0:v:0', '-map', audioIndex === null ? '0:a:0?' : `0:${audioIndex}`, ...(transcode ? ['-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-vf', "scale=w=\'min(1920,iw)\':h=\'min(1080,ih)\':force_original_aspect_ratio=decrease:force_divisible_by=2", '-c:a', 'aac', '-b:a', '160k'] : ['-c', 'copy']), '-sn', '-dn', '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1'];
        child = spawn(executable, args, { shell: false, windowsHide: true, stdio: inherited?['ignore','pipe','pipe',fd.fd]:['pipe', 'pipe', 'pipe'] });
        const closed = new Promise(resolve => { child.once('error', () => resolve({ error: true })); child.once('close', code => resolve({ code })); });
        function cancel() { child.kill(); killTimer ??= setTimeout(() => child.kill('SIGKILL'), 1000); input?.destroy(); }
        timer = setTimeout(cancel, timeoutMs);
        res.once('close', cancel);
        try {
          await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', () => reject(unavailable('FFmpeg is unavailable'))); });
          if(!inherited){input = mediaInput(fd);input.on('error', cancel); child.stdin.on('error', () => {}); input.pipe(child.stdin);}
          child.stderr.resume();
          // Do not commit HTTP 200 for a worker that exits before producing any MP4 bytes.
          const first=await new Promise((resolve,reject)=>{
            const startup=setTimeout(()=>{cleanup();cancel();reject(unavailable('FFmpeg did not produce a stream within 30 seconds. Try a compatible preconverted file.'));},30000);
            const cleanup=()=>{clearTimeout(startup);child.stdout.off('data',ready);};
            const ready=chunk=>{child.stdout.pause();cleanup();resolve(chunk);};
            child.stdout.once('data',ready);
            void closed.then(()=>{cleanup();reject(unavailable('FFmpeg could not produce an MP4 stream. Check the source format and host conversion support.'));});
          });
          child.stdout.unshift(first);
          res.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Disposition': 'inline' });
          await pipeline(child.stdout, res, { end: false });
          const result = await closed;
          if (result.code !== 0) { res.destroy(new Error('Media conversion failed')); return; }
          res.end();
        } finally { res.off('close', cancel); if (!res.writableFinished) cancel(); await closed; }
      } finally {
        if (timer) clearTimeout(timer); if (killTimer) clearTimeout(killTimer);
        input?.destroy(); active--;
      }
    },
  };
}
