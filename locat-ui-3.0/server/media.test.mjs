import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseMediaRange } from './mediaRange.mjs';
import { createMediaLibrary } from './media.mjs';
test('original media byte-range policies, including empty files and malformed ranges', () => {
  assert.deepEqual(parseMediaRange(null, 25000000), { status: 200, start: 0, end: 24999999 });
  assert.deepEqual(parseMediaRange('bytes=100-199', 1000), { status: 206, start: 100, end: 199 });
  assert.deepEqual(parseMediaRange('bytes=500-', 1000), { status: 206, start: 500, end: 999 });
  assert.deepEqual(parseMediaRange('bytes=-200', 1000), { status: 206, start: 800, end: 999 });
  assert.deepEqual(parseMediaRange('bytes=900-5000', 1000), { status: 206, start: 900, end: 999 });
  for (const input of ['bytes=1000-', 'bytes=20-10', 'bytes=-0', 'bytes=0-1,4-5', 'items=0-10', 'bytes=-', 'bytes=9007199254740993-']) assert.equal(parseMediaRange(input, 1000).status, 416);
  assert.equal(parseMediaRange(null, 0).status, 200); assert.equal(parseMediaRange('bytes=0-', 0).status, 416);
});
test('server scans are bounded, read-only, opt-in and omit private paths', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'locat-media-'));
  try {
    await mkdir(join(dir, 'nested')); await writeFile(join(dir, 'one.mp4'), 'video');
    await writeFile(join(dir, 'two.flac'), 'audio'); await writeFile(join(dir, '.private.jpg'), 'hidden');
    await writeFile(join(dir, 'nested', 'three.png'), 'photo'); await writeFile(join(dir, 'page.html'), 'ignored');
    assert.equal((await createMediaLibrary([],{authorize:()=>true}).refresh()).items.length, 0);
    const denied=await createMediaLibrary([dir]).refresh({userId:'unassigned'});assert.deepEqual(denied.items,[]);assert.deepEqual(denied.libraries,[]);
    const result = await createMediaLibrary([dir], { maxFiles: 2,authorize:()=>true }).refresh();
    assert.equal(result.items.length, 2); assert.equal(result.truncated, true);
    assert.ok(!JSON.stringify(result).includes(dir));
    const shallow = await createMediaLibrary([dir], { maxDepth: 0,authorize:()=>true }).refresh();
    assert.equal(shallow.items.length, 2); assert.ok(shallow.items.every(item => !item.name.startsWith('.')));
    const missing = await createMediaLibrary([join(dir, 'missing')],{authorize:()=>true}).refresh();
    assert.equal(missing.libraries[0].available, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('explicit refresh discovers additions and removals without waiting for cache expiry', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'locat-refresh-'));
  try {
    const library = createMediaLibrary([dir], { cacheMs: 3600000,authorize:()=>true });
    assert.equal((await library.refresh()).items.length, 0);
    await writeFile(join(dir, 'new.mp4'), 'synthetic fixture');
    assert.equal((await library.refresh()).items.length, 0);
    const added = await library.refresh({ force: true });
    assert.equal(added.items.length, 1);
    assert.equal(added.items[0].name, 'new.mp4');
    await rm(join(dir, 'new.mp4'));
    assert.equal((await library.refresh({ force: true })).items.length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});


test('snapshot permission checks are bounded by library count rather than file count',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-library-auth-'));
 try{
  await Promise.all(Array.from({length:20},(_,i)=>writeFile(join(dir,i+'.mp4'),'synthetic')));let checks=0;
  const library=createMediaLibrary([dir],{authorize:()=>{checks++;return true;}});
  const view=await library.refresh({userId:'owner'});assert.equal(view.items.length,20);assert.ok(checks<=1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
