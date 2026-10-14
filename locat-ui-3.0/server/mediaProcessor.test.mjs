import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, open, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Writable } from 'node:stream';
import { createServer } from 'node:http';
import { playbackStrategy, probeMedia, createMediaProcessor } from './mediaProcessor.mjs';
const exec = promisify(execFile);
test('original compatibility recommendations distinguish remux, conversion and missing video', () => {
  assert.equal(playbackStrategy('mov,mp4', 'h264', 'aac').strategy, 'direct');
  assert.equal(playbackStrategy('matroska,webm', 'h264', 'aac').strategy, 'remux');
  assert.equal(playbackStrategy('matroska,webm', 'hevc', 'aac').strategy, 'transcode');
  assert.equal(playbackStrategy('mp4', 'av1', 'aac').strategy, 'transcode');
  assert.equal(playbackStrategy('matroska', null, 'aac').strategy, 'unsupported');
});
test('real FFprobe/FFmpeg process authorized open files, preserve selected audio and release capacity', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'locat-processor-'));
  const source = join(dir, 'source.mkv');
  let server;
  try {
    await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=160x90:rate=10', '-f', 'lavfi', '-i', 'sine=frequency=440', '-f', 'lavfi', '-i', 'sine=frequency=880', '-t', '1', '-map', '0:v', '-map', '1:a', '-map', '2:a', '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-y', source]);
    const fd = await open(source, 'r');
    let probe;
    try { probe = await probeMedia(fd); } finally { await fd.close(); }
    assert.equal(probe.strategy, 'remux'); assert.equal(probe.audioTracks.length, 2);
    assert.equal(probe.width, 160);
    const processor = createMediaProcessor();
    server = createServer(async (req, res) => {
      const fd = await open(source, 'r');
      try { await processor.stream(fd, res, { transcode: req.url === '/transcode', audioIndex: probe.audioTracks[1].index }); }
      catch (error) { if (!res.headersSent) { res.writeHead(error.status ?? 500); res.end(); } else res.destroy(); }
      finally { await fd.close(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    for (const mode of ['remux', 'transcode']) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/${mode}`);
      assert.equal(response.status, 200);
      const output = join(dir, mode + '.mp4'); await writeFile(output, Buffer.from(await response.arrayBuffer()));
      assert.ok((await readFile(output)).length > 1000);
      const result = JSON.parse((await exec('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height', '-of', 'json', output])).stdout);
      assert.equal(result.streams.filter(stream => stream.codec_type === 'audio').length, 1);
      const outputVideo = result.streams.find(stream => stream.codec_type === 'video');
      assert.equal(outputVideo.codec_name, 'h264'); assert.equal(outputVideo.width, 160); assert.equal(outputVideo.height, 90);
      const pcm = (await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', output, '-ss', '0.1', '-t', '0.5', '-map', '0:a:0', '-ac', '1', '-ar', '8000', '-f', 's16le', 'pipe:1'], { encoding: 'buffer' })).stdout;
      let crossings = 0, previous = 0;
      for (let i = 0; i + 1 < pcm.length; i += 2) { const value = pcm.readInt16LE(i); const sign = value > 20 ? 1 : value < -20 ? -1 : previous; if (previous && sign !== previous) crossings++; previous = sign; }
      const frequency = crossings / 2 / (pcm.length / 2 / 8000);
      assert.ok(frequency > 850 && frequency < 910, 'selected second audio must contain the 880 Hz fixture tone');

    }
    assert.equal(processor.active, 0);
    const bounded = createMediaProcessor({ maximum: 1 });
    const sink = new Writable({ write(_chunk, _encoding, done) { done(); } });
    sink.writeHead = () => {};
    const boundedFd = await open(source, 'r');
    try {
      const running = bounded.stream(boundedFd, sink);
      await assert.rejects(bounded.stream(null, null), /capacity/);
      await running;
      assert.equal(bounded.active, 0);
    } finally { await boundedFd.close(); }
    const missing = createMediaProcessor({ executable: join(dir, 'missing-ffmpeg') });
    const rejected = await open(source, 'r');
    try { await assert.rejects(missing.stream(rejected, { once() {}, off() {}, writableFinished: false }), /unavailable/); } finally { await rejected.close(); }
    assert.equal(missing.active, 0);
    const limited = createMediaProcessor({ maximum: 0 });
    await assert.rejects(limited.stream(null, null), /capacity/);
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await rm(dir, { recursive: true, force: true });
  }
});
