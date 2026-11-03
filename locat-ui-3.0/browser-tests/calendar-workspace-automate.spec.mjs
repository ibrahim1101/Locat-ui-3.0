import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {startBrowserFixture} from '../tools/browser-fixture.mjs';

let fixture;
test.beforeAll(async()=>{fixture=await startBrowserFixture();});
test.afterAll(async()=>{await fixture?.stop();});

const localDateTime=value=>{
 const date=new Date(value),pad=part=>String(part).padStart(2,'0');
 return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

async function register(page,displayName,prefix){
 const username=prefix+'_'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('base64url');
 await page.goto(fixture.origin);
 await expect(page.getByTestId('login-submit')).toBeVisible();
 const result=await page.evaluate(async input=>{
  const response=await fetch('/api/auth/register',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  return {status:response.status,data:await response.json()};
 },{username,password,displayName});
 expect(result.status,result.data.error).toBe(201);
 return {username,password,user:result.data.user};
}

async function signIn(page,account){
 await page.goto(fixture.origin);
 await page.getByTestId('login-username').fill(account.username);
 await page.getByTestId('login-password').fill(account.password);
 await page.getByTestId('login-submit').click();
 await expect(page.getByTestId('entry-flow')).toHaveCount(0);
}

test('Calendar, Workspace and Automate live flows use account-scoped server data',async({browser})=>{
 test.setTimeout(120000);
 const contexts=[],workspaceName='Browser team '+randomBytes(4).toString('hex'),eventTitle='Shared review '+randomBytes(4).toString('hex'),taskTitle='Review task '+randomBytes(4).toString('hex'),reminderTitle='Private reminder '+randomBytes(4).toString('hex');
 try{
  const ownerContext=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});contexts.push(ownerContext);
  await ownerContext.route('**/*',route=>new URL(route.request().url()).origin===fixture.origin?route.continue():route.abort());
  const ownerPage=await ownerContext.newPage(),owner=await register(ownerPage,'Synthetic workspace owner','owner');
  await signIn(ownerPage,owner);

  const memberContext=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});contexts.push(memberContext);
  await memberContext.route('**/*',route=>new URL(route.request().url()).origin===fixture.origin?route.continue():route.abort());
  const memberPage=await memberContext.newPage(),member=await register(memberPage,'Synthetic workspace member','member');
  await signIn(memberPage,member);

  await test.step('Create workspace, invite a second account and accept the invitation',async()=>{
   await ownerPage.goto(fixture.origin+'/workspace');
   await ownerPage.getByLabel('New workspace name').fill(workspaceName);
   await ownerPage.getByRole('button',{name:'Create workspace',exact:true}).click();
   await expect(ownerPage.getByRole('heading',{name:workspaceName,exact:true})).toBeVisible();
   await ownerPage.getByLabel('Invite a Locat account').fill(member.username);
   await expect(ownerPage.getByText(member.user.displayName+' · '+member.user.lcCode,{exact:true})).toBeVisible();
   await ownerPage.getByText(member.user.displayName+' · '+member.user.lcCode,{exact:true}).click();
   await ownerPage.getByRole('button',{name:'Send invitation',exact:true}).click();
   await expect(ownerPage.getByRole('status')).toHaveText('Invitation sent.');
   await memberPage.goto(fixture.origin+'/workspace');
   await expect(memberPage.getByText('Join '+workspaceName+'?',{exact:true})).toBeVisible();
   await memberPage.getByRole('button',{name:'Accept',exact:true}).click();
   await expect(memberPage.getByRole('heading',{name:workspaceName,exact:true})).toBeVisible();
   await expect(memberPage.getByText('Your role · member',{exact:true})).toBeVisible();
  });

  await test.step('Share a task and verify the member update appears in activity',async()=>{
   await ownerPage.getByLabel('Workspace item type').selectOption('task');
   await ownerPage.getByLabel('Title',{exact:true}).fill(taskTitle);
   await ownerPage.getByLabel('Workspace item details').fill('Verify shared board access and revision updates.');
   await ownerPage.getByRole('button',{name:'Save to board',exact:true}).click();
   await expect(ownerPage.getByRole('heading',{name:taskTitle,exact:true})).toBeVisible();
   await expect(memberPage.getByRole('heading',{name:taskTitle,exact:true})).toBeVisible();
   await memberPage.getByLabel('Status for '+taskTitle).selectOption('in-progress');
   await expect(memberPage.getByRole('status')).toHaveText('Task updated.');
   await ownerPage.reload();
   await expect(ownerPage.getByLabel('Status for '+taskTitle)).toHaveValue('in-progress');
   await expect(ownerPage.getByText('unread updates')).toBeVisible();
   await ownerPage.getByRole('button',{name:'Mark read',exact:true}).click();
   await expect(ownerPage.getByRole('status')).toHaveText('Workspace activity marked read.');
  });

  await test.step('Create a shared recurring Calendar event and read it as the invited member',async()=>{
   await ownerPage.goto(fixture.origin+'/calendar');
   await ownerPage.getByLabel('Calendar scope').selectOption({label:workspaceName+' · shared'});
   await ownerPage.getByRole('button',{name:'New event',exact:true}).click();
   const dialog=ownerPage.getByRole('dialog',{name:'New event',exact:true});
   const start=new Date();start.setDate(1);start.setHours(12,0,0,0);
   const end=new Date(start.getTime()+60*60_000);
   await dialog.getByLabel('Event name').fill(eventTitle);
   await dialog.getByLabel('Starts').fill(localDateTime(start));
   await dialog.getByLabel('Ends').fill(localDateTime(end));
   await dialog.getByLabel('Notes').fill('Shared calendar acceptance marker.');
   await dialog.getByLabel('In-app reminder').selectOption('10');
   await dialog.getByLabel('Repeat event').selectOption('604800000');
   await dialog.getByRole('button',{name:'Save event',exact:true}).click();
   await expect(ownerPage.getByRole('status')).toHaveText('Event saved.');
   await expect(ownerPage.getByRole('heading',{name:eventTitle,exact:true})).toBeVisible();
   await expect(ownerPage.getByText('Repeats every 7 days',{exact:false})).toBeVisible();
   await memberPage.goto(fixture.origin+'/calendar');
   await memberPage.getByLabel('Calendar scope').selectOption({label:workspaceName+' · shared'});
   await expect(memberPage.getByRole('heading',{name:eventTitle,exact:true})).toBeVisible();
   await ownerPage.getByRole('button',{name:'Delete '+eventTitle,exact:true}).click();
   const confirm=ownerPage.getByRole('dialog',{name:'Delete event?',exact:true});
   await expect(confirm).toContainText('every occurrence in this series');
   await confirm.getByRole('button',{name:'Delete series',exact:true}).click();
   await expect(ownerPage.getByRole('status')).toHaveText('Event deleted.');
  });

  await test.step('Schedule, pause and remove a recurring reminder; keep it private to its owner',async()=>{
   await ownerPage.goto(fixture.origin+'/automate');
   await ownerPage.getByRole('button',{name:'New reminder',exact:true}).click();
   const dialog=ownerPage.getByRole('dialog',{name:'New reminder',exact:true});
   await dialog.getByLabel('Reminder title').fill(reminderTitle);
   await dialog.getByLabel('Details').fill('Synthetic reminder details.');
   await dialog.getByLabel('Repeat reminder').selectOption('86400000');
   await dialog.getByRole('button',{name:'Save reminder',exact:true}).click();
   await expect(ownerPage.getByRole('status')).toHaveText('Reminder scheduled.');
   const reminder=ownerPage.locator('article').filter({has:ownerPage.getByRole('heading',{name:reminderTitle,exact:true})});
   await expect(reminder).toContainText('Every 24 hours');
   await memberPage.goto(fixture.origin+'/automate');
   await expect(memberPage.getByText('No scheduled reminders',{exact:true})).toBeVisible();
   await expect(memberPage.getByRole('heading',{name:reminderTitle,exact:true})).toHaveCount(0);
   await reminder.getByRole('button',{name:'Edit',exact:true}).click();
   const edit=ownerPage.getByRole('dialog',{name:'Edit reminder',exact:true});
   await edit.getByLabel('Keep reminder enabled').uncheck();
   await edit.getByRole('button',{name:'Save reminder',exact:true}).click();
   await expect(ownerPage.getByRole('status')).toHaveText('Reminder updated.');
   await expect(reminder).toContainText('Paused');
   await reminder.getByRole('button',{name:'Delete '+reminderTitle,exact:true}).click();
   await ownerPage.getByRole('dialog',{name:'Delete reminder?',exact:true}).getByRole('button',{name:'Delete reminder',exact:true}).click();
   await expect(ownerPage.getByRole('status')).toHaveText('Reminder deleted.');
   await expect(ownerPage.getByRole('heading',{name:reminderTitle,exact:true})).toHaveCount(0);
  });
 }finally{await Promise.all(contexts.map(context=>context.close()));}
});
