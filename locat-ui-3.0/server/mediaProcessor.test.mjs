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
      try { const inspected = await probeMedia(fd); assert.equal(inspected.width,160); assert.ok((await fd.stat()).isFile()); await processor.stream(fd, res, { transcode: req.url === '/transcode', audioIndex: probe.audioTracks[1].index }); }
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

test('a converter that produces no output fails before HTTP success and releases its slot',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-empty-conversion-'));let fd;
 try{
  const file=join(dir,'invalid.mkv');await writeFile(file,'not a video');fd=await open(file,'r');let headers=false;
  const processor=createMediaProcessor({executable:process.execPath});
  const response=new Writable({write(_chunk,_encoding,done){done();}});response.writeHead=()=>{headers=true;};
  await assert.rejects(processor.stream(fd,response),error=>error.status===503&&/could not produce/.test(error.message));assert.equal(headers,false);assert.equal(processor.active,0);
 }finally{await fd?.close();await rm(dir,{recursive:true,force:true});}
});

test('real 4K HEVC/AAC source probes correctly and converts to bounded H264/AAC output',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-hevc-4k-'));let server;
 try{
  const source=join(dir,'hevc.mkv');
  await exec('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=blue:size=3840x2160:rate=2','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1','-c:v','libx265','-threads','1','-preset','ultrafast','-pix_fmt','yuv420p','-x265-params','pools=1:frame-threads=1:log-level=error','-c:a','aac','-y',source],{timeout:30000});
  let fd=await open(source,'r');try{const result=await probeMedia(fd);assert.equal(result.videoCodec,'hevc');assert.equal(result.audioCodec,'aac');assert.equal(result.width,3840);assert.equal(result.height,2160);assert.equal(result.strategy,'transcode');}finally{await fd.close();}
  const processor=createMediaProcessor();server=createServer(async(_req,res)=>{const input=await open(source,'r');try{await processor.stream(input,res,{transcode:true});}catch(error){if(!res.headersSent){res.writeHead(error.status??500);res.end();}else res.destroy();}finally{await input.close();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const response=await fetch('http://127.0.0.1:'+server.address().port);assert.equal(response.status,200);const output=join(dir,'compatible.mp4');await writeFile(output,Buffer.from(await response.arrayBuffer()));
  const result=JSON.parse((await exec('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height','-of','json',output])).stdout);assert.deepEqual(result.streams.find(stream=>stream.codec_type==='video'),{codec_name:'h264',codec_type:'video',width:1920,height:1080});assert.equal(result.streams.find(stream=>stream.codec_type==='audio').codec_name,'aac');assert.equal(processor.active,0);
 }finally{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await rm(dir,{recursive:true,force:true});}
});

test('conversion rejects invalid start positions before allocating a worker',async()=>{
 const processor=createMediaProcessor({maximum:1});
 for(const startSeconds of [-1,86401,1.5,NaN,Infinity]){
  await assert.rejects(processor.stream(null,null,{startSeconds}),error=>error.status===400);
 }
 assert.equal(processor.active,0);
});
