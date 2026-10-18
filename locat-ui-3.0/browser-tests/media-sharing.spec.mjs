import {test,expect} from '@playwright/test';
import {startBrowserFixture} from '../tools/browser-fixture.mjs';
let fixture;
test.beforeAll(async()=>{fixture=await startBrowserFixture({media:true,mediaOwnership:true});});
test.afterAll(async()=>{await fixture?.stop();});
test('owned Cinema library requires a configured accepted friend and disappears after removal',async({browser})=>{
 const contexts=[];
 try{
  async function client(account){const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});contexts.push(context);const page=await context.newPage();await page.goto(fixture.origin);await page.getByTestId('login-username').fill(account.username);await page.getByTestId('login-password').fill(account.password);await page.getByTestId('login-submit').click();await expect(page.getByTestId('entry-flow')).toHaveCount(0);await page.goto(fixture.origin+'/cinema');return page;}
  async function api(page,path,body){return page.evaluate(async({path,body})=>{const response=await fetch(path,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};},{path,body});}
  const [owner,friend,outsider]=await Promise.all(fixture.mediaAccounts.map(client));
  await expect(owner.getByRole('button').filter({hasText:'Browser-H264.mkv'})).toBeVisible();
  await expect(friend.getByRole('button').filter({hasText:'Browser-H264.mkv'})).toHaveCount(0);expect((await api(outsider,'/api/media')).data.items).toEqual([]);
  const snapshot=await api(owner,'/api/media'),movie=snapshot.data.items.find(item=>item.name==='Browser-H264.mkv');
  expect((await api(friend,movie.streamUrl.replace('/stream/','/probe/'))).status).toBe(404);
  expect((await api(owner,'/api/contacts/request',{userId:fixture.mediaAccounts[1].id})).status).toBe(200);
  expect((await api(friend,'/api/contacts/respond',{userId:fixture.mediaAccounts[0].id,accept:true})).status).toBe(200);
  await friend.reload();await friend.getByRole('button').filter({hasText:'Browser-H264.mkv'}).click();await friend.getByTestId('video-player').hover();await friend.getByRole('button',{name:'Playback options',exact:true}).click();await friend.getByRole('dialog',{name:'Playback compatibility'}).getByRole('button',{name:'Convert to H.264/AAC · up to 1080p'}).click();
  await expect.poll(()=>friend.locator('video').evaluate(v=>v.readyState>=2&&v.videoWidth===160&&v.currentTime>0.1)).toBe(true);
  const blue=await friend.locator('video').evaluate(v=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.drawImage(v,0,0,1,1);return ctx.getImageData(0,0,1,1).data[2];});expect(blue).toBeGreaterThan(200);
  await friend.getByRole('button',{name:'Close player'}).click();
  await owner.getByRole('button',{name:'Library sharing',exact:true}).click();
  const sharing=owner.getByRole('dialog',{name:'Library sharing'});
  await sharing.getByRole('button',{name:/Revoke access/}).click();
  await expect(sharing.getByText(/Library access revoked/)).toBeVisible();
  expect((await api(friend,movie.streamUrl.replace('/stream/','/probe/'))).status).toBe(404);
  await sharing.getByRole('button',{name:/Grant access/}).click();
  await expect(sharing.getByText('Library access granted.')).toBeVisible();
  expect((await api(friend,movie.streamUrl.replace('/stream/','/probe/'))).status).toBe(200);
  expect((await api(owner,'/api/contacts/remove',{userId:fixture.mediaAccounts[1].id})).status).toBe(200);
  await friend.reload();await expect(friend.getByRole('button').filter({hasText:'Browser-H264.mkv'})).toHaveCount(0);expect((await api(friend,movie.streamUrl.replace('/stream/','/probe/'))).status).toBe(404);
  expect((await api(outsider,'/api/media')).data.items).toEqual([]);
 }finally{await Promise.all(contexts.map(context=>context.close()));}
});
