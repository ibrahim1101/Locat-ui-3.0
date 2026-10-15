import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {startBrowserFixture} from '../tools/browser-fixture.mjs';
let fixture;
test.skip(!process.env.LOCAT_TEST_SYNAPSE_PYTHON,'Requires the pinned isolated Synapse environment; a skip is not Matrix browser acceptance.');
test.beforeAll(async()=>{fixture=await startBrowserFixture({matrix:true});});
test.afterAll(async()=>{await fixture?.stop();});

test('real browser managed Matrix Rust keys reopen, exclude a second writer and confirm server logout',async({browser})=>{
 const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===fixture.origin?route.continue():route.abort());
 const username='matrix_'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('base64url');
 const bound='Device bound and local crypto initialized. Conversation access remains gated.';
 try{
  const page=await context.newPage();await page.goto(fixture.origin);await expect(page.getByTestId('login-submit')).toBeVisible();
  const registered=await page.evaluate(async({username,password})=>{const response=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,displayName:'Synthetic Matrix browser'})});return {status:response.status,data:await response.json()};},{username,password});expect(registered.status,registered.data.error).toBe(201);
  await page.getByTestId('login-username').fill(username);await page.getByTestId('login-password').fill(password);await page.getByTestId('login-submit').click();await expect(page.getByTestId('entry-flow')).toHaveCount(0);
  async function setup(target){await target.goto(fixture.origin+'/settings');await target.getByRole('button',{name:'Set up messaging device',exact:true}).click();const dialog=target.getByRole('dialog',{name:'Messaging device setup',exact:true});await expect(dialog.getByRole('button',{name:'Create and bind managed session',exact:true})).toBeEnabled();return dialog;}
  const first=await setup(page);await first.getByRole('button',{name:'Create and bind managed session',exact:true}).click();await expect(first.getByText(bound,{exact:true})).toBeVisible({timeout:45000});
  const signingKey=await first.getByText(/^Public signing key: /).innerText();expect(signingKey.length).toBeGreaterThan(30);
  const databases=await page.evaluate(()=>indexedDB.databases());expect(databases.some(row=>row.name?.startsWith('locat-ui3-matrix:'))).toBe(true);
  const other=await context.newPage(),second=await setup(other);await second.getByRole('button',{name:'Create and bind managed session',exact:true}).click();await expect(second.getByRole('alert')).toContainText('already open in another tab',{timeout:45000});await expect(second.getByText(bound,{exact:true})).toHaveCount(0);
  await first.getByRole('button',{name:'Close',exact:true}).click();await expect(first).toHaveCount(0);await expect.poll(()=>page.evaluate(async()=>(await navigator.locks.query()).held.filter(lock=>lock.name.startsWith('locat-ui3-matrix:')).length)).toBe(0);
  await second.getByRole('button',{name:'Create and bind managed session',exact:true}).click();await expect(second.getByText(bound,{exact:true})).toBeVisible({timeout:45000});await expect(second.getByText(signingKey,{exact:true})).toBeVisible();
  await second.getByRole('button',{name:'Enable device verification',exact:true}).click();await expect(second.getByText(/Verification sync: ready/)).toBeVisible({timeout:30000});
  await other.reload();await other.getByRole('button',{name:'Set up messaging device',exact:true}).click();const reopened=other.getByRole('dialog',{name:'Messaging device setup',exact:true});await expect(reopened.getByText(signingKey,{exact:true})).toBeVisible();await reopened.getByRole('button',{name:'Create and bind managed session',exact:true}).click();await expect(reopened.getByText(bound,{exact:true})).toBeVisible({timeout:45000});await expect(reopened.getByText(signingKey,{exact:true})).toBeVisible();
  await reopened.getByRole('button',{name:'Sign out current Matrix session',exact:true}).click();await expect(reopened.getByText('Matrix server confirmed sign-out for this session.',{exact:true})).toBeVisible();await expect(reopened.getByText(bound,{exact:true})).toHaveCount(0);
  await reopened.getByRole('button',{name:'Revoke this managed Matrix device',exact:true}).click();await expect(reopened.getByText('Matrix server confirmed revocation of this managed device and its sessions.',{exact:true})).toBeVisible();
 }finally{await context.close();}
});
