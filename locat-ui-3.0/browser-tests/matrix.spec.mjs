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

test('two real browser accounts reject a SAS comparison then mutually verify through the protected gateway',async({browser})=>{
 const contexts=[];
 async function account(name){
  const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});contexts.push(context);await context.route('**/*',route=>new URL(route.request().url()).origin===fixture.origin?route.continue():route.abort());
  const page=await context.newPage(),username='sas_'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('base64url');await page.goto(fixture.origin);await expect(page.getByTestId('login-submit')).toBeVisible();
  const registered=await page.evaluate(async input=>{const response=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});return {status:response.status,data:await response.json()};},{username,password,displayName:name});expect(registered.status,registered.data.error).toBe(201);
  await page.getByTestId('login-username').fill(username);await page.getByTestId('login-password').fill(password);await page.getByTestId('login-submit').click();await expect(page.getByTestId('entry-flow')).toHaveCount(0);
  return {page,user:registered.data.user};
 }
 async function post(page,path,input){const result=await page.evaluate(async({path,input})=>{const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});return {status:response.status,data:await response.json()};},{path,input});expect(result.status,result.data.error).toBe(200);}
 async function bind(value){await value.page.goto(fixture.origin+'/settings');await value.page.getByRole('button',{name:'Set up messaging device',exact:true}).click();const dialog=value.page.getByRole('dialog',{name:'Messaging device setup',exact:true});await dialog.getByRole('button',{name:'Create and bind managed session',exact:true}).click();await expect(dialog.getByText('Device bound and local crypto initialized. Conversation access remains gated.',{exact:true})).toBeVisible({timeout:45000});return dialog;}
 const verified='The SDK reports this exact device signing key as verified. Other devices and future key changes require their own checks.';
 try{
  const alice=await account('Browser SAS Alice'),bob=await account('Browser SAS Bob');
  await post(alice.page,'/api/contacts/request',{userId:bob.user.id});await post(bob.page,'/api/contacts/respond',{userId:alice.user.id,accept:true});
  const a=await bind(alice),b=await bind(bob);
  for(const dialog of [a,b]){await dialog.getByRole('button',{name:'Enable device verification',exact:true}).click();await expect(dialog.getByText(/Verification sync: ready/)).toBeVisible({timeout:30000});}
  await a.getByRole('button',{name:'Browser SAS Bob · '+bob.user.lcCode,exact:true}).click();await b.getByRole('button',{name:'Browser SAS Alice · '+alice.user.lcCode,exact:true}).click();await expect(b.getByRole('button',{name:/^Request verification ·/})).toBeEnabled();
  async function compare(){await a.getByRole('button',{name:/^Request verification ·/}).click();await b.getByRole('button',{name:'Accept verification request',exact:true}).click();const left=a.locator('p.font-mono.text-xl'),right=b.locator('p.font-mono.text-xl');await expect(left).toBeVisible({timeout:30000});await expect(right).toBeVisible({timeout:30000});const code=await left.innerText();expect(code).toMatch(/^\d+ · \d+ · \d+$/);await expect(right).toHaveText(code);}
  await compare();await a.getByRole('button',{name:'Codes differ — reject',exact:true}).click();await expect(a.getByText(verified,{exact:true})).toHaveCount(0);await expect(b.getByText(/Verification sync: ready\. Request: (cancelled|error)\./)).toBeVisible({timeout:30000});await expect(b.getByText(verified,{exact:true})).toHaveCount(0);
  await compare();await a.getByRole('button',{name:'Codes match on both screens',exact:true}).click();await expect(a.getByText(/Verification sync: ready\. Request: checking\./)).toBeVisible();await expect(a.getByText(verified,{exact:true})).toHaveCount(0);await expect(b.getByText(verified,{exact:true})).toHaveCount(0);await b.getByRole('button',{name:'Codes match on both screens',exact:true}).click();await expect(a.getByText(verified,{exact:true})).toBeVisible({timeout:30000});await expect(b.getByText(verified,{exact:true})).toBeVisible({timeout:30000});
  expect(await alice.page.evaluate(async()=>(await fetch('/api/messages')).status)).toBe(501);
 }finally{await Promise.all(contexts.map(context=>context.close()));}
});
