import {test,expect} from '@playwright/test';
async function setup(page,name='Daniel'){
 await page.goto('/?test=1');await page.locator('#profile-form input[name="name"]').fill(name);await page.locator('#profile-form button').click();await expect(page.getByRole('button',{name:'Aventura a solo',exact:false})).toBeVisible();
}
test('Mobile home, movement, pause and full recipe book',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
 await expect(page.locator('.fairy-card')).toHaveCount(6);await page.screenshot({path:'qa/home.png'});
 await page.locator('[data-action="solo"]').click();
 const before=await page.evaluate(()=>window.MagixTest.world.players[0].x);await page.keyboard.down('d');await expect.poll(()=>page.evaluate(()=>window.MagixTest.world.players[0].x)).toBeGreaterThan(before+45);await page.keyboard.up('d');
 await page.screenshot({path:'qa/game.png'});await page.locator('[data-action="pause"]').click();await expect(page.getByText('A magia está em pausa.')).toBeVisible();
 const paused=await page.evaluate(()=>window.MagixTest.world.time);await page.locator('[data-action="pause-book"]').click();await page.locator('#book-search').fill('Supernova');await expect(page.locator('.recipe')).toHaveCount(1);await expect(page.locator('.recipe')).toContainText('Prisma de Luz');await page.locator('[data-action="pin"]').click();
 await page.screenshot({path:'qa/book.png'});expect(await page.evaluate(()=>window.MagixTest.world.time)).toBe(paused);
 await page.locator('[data-action="pause-book-back"]').click();await page.locator('[data-action="resume-game"]').click();await expect.poll(()=>page.evaluate(()=>window.MagixTest.world.pause)).toBeNull();expect(errors).toEqual([]);
});
test('Level-up choices apply and the game resumes',async({page})=>{
 await setup(page);await page.locator('[data-action="solo"]').click();await page.evaluate(()=>{window.MagixTest.game.s.xp=30;});
 await expect(page.locator('[data-action="choice"]').first()).toBeVisible();await page.locator('[data-action="choice"]').first().click();await expect.poll(()=>page.evaluate(()=>window.MagixTest.world.pause)).toBeNull();
 expect(await page.evaluate(()=>window.MagixTest.world.level)).toBe(2);
});
test('Two peers share a host world, pause together and deduplicate the result',async({page,context})=>{
 await setup(page,'Daniel');await page.locator('[data-action="duo"]').click();await page.locator('[data-action="host"]').click();await expect(page.locator('.invite')).toBeVisible();const invite=await page.locator('.invite').textContent();
 const guest=await context.newPage();await guest.goto('/?test=1');
 await guest.locator('[data-action="duo"]').click();await guest.locator('[data-action="join"]').click();await guest.locator('#join-form input').fill(invite);await guest.locator('#join-form button').click();
 await expect(page.locator('[data-action="start-duo"]')).toBeEnabled();await page.locator('[data-action="start-duo"]').click();
 await expect.poll(()=>guest.evaluate(()=>window.MagixTest.world?.players.length)).toBe(2);
 await guest.locator('[data-action="pause"]').click();await expect(page.getByText('A magia está em pausa.')).toBeVisible();await expect(guest.getByText('A magia está em pausa.')).toBeVisible();
 await guest.locator('[data-action="resume-game"]').click();expect(await page.evaluate(()=>!!window.MagixTest.world.pause)).toBe(true);
 await page.locator('[data-action="resume-game"]').click();await expect.poll(()=>guest.evaluate(()=>window.MagixTest.world.pause)).toBeNull();
 await page.evaluate(()=>{window.MagixTest.game.s.time=12;window.MagixTest.game.finish(true);});
 await expect(page.getByText('A magia venceu.',{exact:true})).toBeVisible();await expect(guest.getByText('A magia venceu.',{exact:true})).toBeVisible();
 const a=await page.evaluate(()=>window.MagixTest.derive()),b=await guest.evaluate(()=>window.MagixTest.derive());expect(a.runs).toBe(1);expect(b.runs).toBe(1);expect(a.coins).toBe(b.coins);await guest.close();
});
test('Cloud sign-up confirmation and login keep passwords out of saves',async({page})=>{
 let doc=null;
 await page.route('https://atsfnttvxhjqhmtqmtgj.supabase.co/**',async route=>{
  const url=route.request().url();let result={};
  if(url.includes('/signup'))result={user:{id:'test-user'}};
  if(url.includes('grant_type=password'))result={access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'test-user',email:'test@example.invalid'}};
  if(url.includes('/magix_dashboard'))result=doc?{team:doc,code:'ABCDEF123456',members:[{id:'test-user',name:'Daniel'}]}:null;
  if(url.includes('/magix_create_team')){doc=JSON.parse(route.request().postData()).p_doc;result={team:doc,code:'ABCDEF123456',members:[{id:'test-user',name:'Daniel'}]};}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await setup(page);await page.locator('[data-action="page"][data-value="team"]').click();await page.locator('[data-action="cloud"]').click();
 await page.locator('#auth-form input[name="email"]').fill('test@example.invalid');await page.locator('#auth-form input[name="password"]').fill('OnlyForThisTest123!');
 await page.locator('#auth-form button[value="signup"]').click();await expect(page.locator('#auth-error')).toContainText('Confirma');
 await page.locator('#auth-form input[name="password"]').fill('OnlyForThisTest123!');await page.locator('#auth-form button[value="login"]').click();await expect(page.locator('[data-action="cloud-create"]')).toBeVisible();
 await page.locator('[data-action="cloud-create"]').click();await expect(page.locator('.invite')).toContainText('ABCDEF123456');
 expect(await page.evaluate(()=>JSON.stringify(window.MagixTest.state))).not.toContain('OnlyForThisTest123!');
});
