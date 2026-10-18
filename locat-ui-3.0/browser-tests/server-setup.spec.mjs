import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {startBrowserFixture} from '../tools/browser-fixture.mjs';
let first,second;
test.beforeAll(async()=>{first=await startBrowserFixture();second=await startBrowserFixture({hostname:'localhost'});});
test.afterAll(async()=>{await second?.stop();await first?.stop();});
test('server selection keeps strict CSP, reviews another origin before navigation and checks discovery on the selected origin',async({browser})=>{
 const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'}),page=await context.newPage(),secondRequests=[];
 const allowed=new Set([first.origin,second.origin]),external=[];
 await context.route('**/*',route=>{const origin=new URL(route.request().url()).origin;if(allowed.has(origin))return route.continue();external.push(origin);return route.abort();});
 context.on('request',request=>{if(new URL(request.url()).origin===second.origin)secondRequests.push(request);});
 try{
  const response=await page.goto(first.origin);expect(response.headers()['content-security-policy']).toContain("connect-src 'self'");
  await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByTestId('welcome-server').click();
  await page.evaluate(()=>document.addEventListener('securitypolicyviolation',event=>{document.documentElement.dataset.qaConnectBlocked=event.violatedDirective;}));
  const marker=randomBytes(24).toString('hex');await context.addCookies([{name:'locat_origin_probe',value:marker,url:first.origin,httpOnly:true,secure:true,sameSite:'Strict'}]);await page.evaluate(marker=>localStorage.setItem('locat-origin-probe',marker),marker);
  await page.getByLabel('Server address',{exact:true}).fill(second.origin);await page.getByRole('button',{name:'Check server',exact:true}).click();
  await expect(page.getByText('Address not checked',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Open this address',exact:true})).toBeEnabled();expect(secondRequests).toEqual([]);expect(await page.evaluate(()=>document.documentElement.dataset.qaConnectBlocked)).toBeUndefined();
  await page.getByRole('button',{name:'Open this address',exact:true}).click();await expect(page).toHaveURL(second.origin+'/');await expect(page.getByTestId('login-submit')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('locat-origin-probe'))).toBeNull();const headers=await Promise.all(secondRequests.map(request=>request.allHeaders()));expect(headers.every(value=>!value.cookie?.includes(marker)&&(!value.referer||new URL(value.referer).origin===second.origin))).toBe(true);
  await context.addCookies([{name:'locat_destination_probe',value:marker,url:second.origin,httpOnly:true,secure:true,sameSite:'Strict'}]);
  await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByTestId('welcome-server').click();await page.getByRole('button',{name:'Check server',exact:true}).click();await expect(page.getByText(/Instance ID:/)).toBeVisible();
  const discovery=secondRequests.find(request=>new URL(request.url()).pathname==='/.well-known/locat');expect(discovery).toBeDefined();expect((await discovery.allHeaders()).cookie).toBeUndefined();expect(external).toEqual([]);
 }catch(error){console.log('Server setup CSP directive',await page.evaluate(()=>document.documentElement.dataset.qaConnectBlocked));console.log('Server setup failure alerts',await page.getByRole('alert').allTextContents());throw error;}finally{await context.close();}
});
