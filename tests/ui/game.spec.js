import {test,expect} from '@playwright/test';
async function setup(page,name='Daniel'){
 await page.goto('/?test=1');await page.locator('#profile-form input[name="name"]').fill(name);await page.locator('#profile-form button').click();await expect(page.getByRole('button',{name:'Aventura a solo',exact:false})).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.MagixTest.artReady),{timeout:12000}).toBe(true);
}
test('Mobile home, movement, pause and full recipe book',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
 await expect(page.locator('.fairy-card')).toHaveCount(6);await page.screenshot({path:'qa/home.png'});
 await page.locator('[data-action="solo"]').click();
 const before=await page.evaluate(()=>window.MagixTest.world.players[0].x);await page.keyboard.down('d');await expect.poll(()=>page.evaluate(()=>window.MagixTest.world.players[0].x)).toBeGreaterThan(before+45);await page.keyboard.up('d');
 await page.evaluate(()=>{const g=window.MagixTest.game;for(let i=0;i<1200&&!g.s.over;i++){if(g.s.pause?.kind==='upgrade')g.choice(0,g.s.pause.choices[0][0].id);g.step(1/60);}if(g.s.pause?.kind==='upgrade')g.choice(0,g.s.pause.choices[0][0].id);g.s.xp=0;});await expect.poll(()=>page.evaluate(()=>window.MagixTest.world?.time)).toBeGreaterThan(18);await page.screenshot({path:'qa/game.png'});await page.locator('[data-action="pause"]').click();await expect(page.getByRole('heading',{name:'Pausa',exact:true})).toBeVisible();
 const paused=await page.evaluate(()=>window.MagixTest.world.time);await page.locator('[data-action="pause-book"]').click();await page.locator('#book-search').fill('Supernova');await expect(page.locator('.recipe')).toHaveCount(1);await expect(page.locator('.recipe').getByRole('img',{name:'Prisma de Luz',exact:true})).toBeVisible();await expect(page.locator('.recipe .spell-art')).toHaveCount(3);await page.locator('[data-action="pin"]').click();
 await page.screenshot({path:'qa/book.png'});expect(await page.evaluate(()=>window.MagixTest.world.time)).toBe(paused);
 await page.locator('[data-action="pause-book-back"]').click();await page.locator('[data-action="resume-game"]').click();await expect.poll(()=>page.evaluate(()=>window.MagixTest.world.pause)).toBeNull();expect(errors).toEqual([]);
});
test('Level-up choices apply and the game resumes',async({page})=>{
 await setup(page);await page.locator('[data-action="solo"]').click();await page.evaluate(()=>{window.MagixTest.game.s.xp=30;});
 await expect(page.locator('[data-action="choice"]').first()).toBeVisible();await page.locator('[data-action="choice"]').first().click();await expect.poll(()=>page.evaluate(()=>window.MagixTest.world.pause)).toBeNull();
 expect(await page.evaluate(()=>window.MagixTest.world.level)).toBe(2);
});
test('Two peers share a host world, pause together and deduplicate the result',async({page,context})=>{
 await setup(page,'Daniel');await page.locator('[data-action="arena"][data-value="crystal"]').click();await page.locator('[data-action="duo"]').click();await page.locator('[data-action="host"]').click();await expect(page.locator('.invite')).toBeVisible();const invite=await page.locator('.invite').textContent();
 const guest=await context.newPage();await guest.goto('/?test=1');
 await guest.locator('[data-action="duo"]').click();await guest.locator('[data-action="join"]').click();await guest.locator('#join-form input').fill(invite);await guest.locator('#join-form button').click();
 await expect(page.locator('[data-action="start-duo"]')).toBeEnabled();await page.locator('[data-action="start-duo"]').click();
 await expect.poll(()=>guest.evaluate(()=>window.MagixTest.world?.players.length)).toBe(2);expect(await guest.evaluate(()=>window.MagixTest.world.arena)).toBe('crystal');
 await guest.locator('[data-action="pause"]').click();await expect(page.getByRole('heading',{name:'Pausa',exact:true})).toBeVisible();await expect(guest.getByRole('heading',{name:'Pausa',exact:true})).toBeVisible();
 await guest.locator('[data-action="resume-game"]').click();expect(await page.evaluate(()=>!!window.MagixTest.world.pause)).toBe(true);
 await page.locator('[data-action="resume-game"]').click();await expect.poll(()=>guest.evaluate(()=>window.MagixTest.world.pause)).toBeNull();
 await page.evaluate(()=>{const g=window.MagixTest.game,p=g.s.players[1];g.dropPickup('coins',p.x,p.y);});await expect.poll(()=>guest.evaluate(()=>window.MagixTest.world.coins)).toBeGreaterThan(0);
 await page.evaluate(()=>{window.MagixTest.game.s.time=12;window.MagixTest.game.finish(true);});
 await expect(page.getByText('A magia venceu.',{exact:true})).toBeVisible();await expect(guest.getByText('A magia venceu.',{exact:true})).toBeVisible();
 const a=await page.evaluate(()=>window.MagixTest.derive()),b=await guest.evaluate(()=>window.MagixTest.derive());expect(a.runs).toBe(1);expect(b.runs).toBe(1);expect(a.coins).toBe(b.coins);await guest.close();
});
test('Cloud username accounts and recovery codes keep passwords out of saves',async({page})=>{
 let doc=null;
 await page.route('https://atsfnttvxhjqhmtqmtgj.supabase.co/**',async route=>{
  const url=route.request().url();let result={};
  if(url.includes('/functions/v1/magix-account'))result={ok:true,username:'test_account',recovery_code:'1234567890123456789012345678901234567890'};
  if(url.includes('grant_type=password'))result={access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'test-user',email:'test_account@accounts.magix.invalid',user_metadata:{magix_username:'test_account'}}};
  if(url.includes('/magix_dashboard'))result=doc?{team:doc,code:'ABCDEF123456',members:[{id:'test-user',name:'Daniel'}]}:null;
  if(url.includes('/magix_create_team')){doc=JSON.parse(route.request().postData()).p_doc;result={team:doc,code:'ABCDEF123456',members:[{id:'test-user',name:'Daniel'}]};}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await setup(page);await page.locator('[data-action="page"][data-value="team"]').click();await page.locator('[data-action="cloud"]').click();
 await page.locator('#auth-form input[name="username"]').fill('test_account');await page.locator('#auth-form input[name="password"]').fill('OnlyForThisTest123!');
 await page.locator('#auth-form button[value="signup"]').click();await expect(page.getByText('Guarda este código.',{exact:true})).toBeVisible();await page.locator('[data-action="cloud-continue"]').click();await expect(page.locator('[data-action="cloud-create"]')).toBeVisible();
 await page.locator('[data-action="cloud-create"]').click();await expect(page.locator('.invite')).toContainText('ABCDEF123456');
 expect(await page.evaluate(()=>JSON.stringify(window.MagixTest.state))).not.toContain('OnlyForThisTest123!');
});

test('Image-first recipe book exposes fusions and all five map consumables',async({page})=>{
 await setup(page);await page.locator('[data-action="page"][data-value="book"]').click();await page.locator('[data-action="book-tab"][data-value="fusions"]').click();await expect(page.locator('.recipe')).toHaveCount(5);
 await expect(page.locator('.recipe').first().getByRole('img',{name:'Fénix Celestial',exact:true})).toBeVisible();await page.screenshot({path:'qa/fusions.png'});
 await page.locator('[data-action="book-tab"][data-value="loot"]').click();await expect(page.locator('.loot-recipe')).toHaveCount(5);await expect(page.getByText('Estrela Nova',{exact:true})).toBeVisible();await page.screenshot({path:'qa/pickups.png'});
});
test('Solo save-and-leave resumes the same game instead of ending the run',async({page})=>{
 await setup(page);await page.locator('[data-action="solo"]').click();await page.evaluate(()=>{window.MagixTest.game.s.time=22;});const run=await page.evaluate(()=>window.MagixTest.world.runId);
 await page.locator('[data-action="pause"]').click();await expect(page.locator('[data-action="save-leave"]')).toBeVisible();await page.locator('[data-action="save-leave"]').click();
 await expect(page.locator('[data-action="continue-run"]')).toBeVisible();await page.locator('[data-action="continue-run"]').click();
 expect(await page.evaluate(()=>window.MagixTest.world.runId)).toBe(run);expect(await page.evaluate(()=>window.MagixTest.world.time)).toBeGreaterThanOrEqual(22);
});
test('Pickups are visible, collectible and illustrated in the pause book',async({page})=>{
 await setup(page);await page.locator('[data-action="solo"]').click();
 await page.evaluate(()=>{const g=window.MagixTest.game,p=g.s.players[0];p.hp=50;g.dropPickup('heal',p.x,p.y);});
 await expect.poll(()=>page.evaluate(()=>window.MagixTest.world.players[0].hp)).toBeGreaterThanOrEqual(80);
 expect(await page.evaluate(()=>window.MagixTest.world.lootSeq)).toBeGreaterThan(0);
 await page.locator('[data-action="pause"]').click();await page.locator('[data-action="pause-book"]').click();await page.locator('[data-action="book-tab"][data-value="loot"]').click();await expect(page.locator('.loot-recipe')).toHaveCount(5);
});
test('Reduced-motion setting disables decorative animation without disabling combat',async({page})=>{
 await setup(page);await page.locator('[data-action="settings"]').click();await page.locator('[data-action="toggle"][data-value="motion"]').click();await expect(page.locator('body')).toHaveClass(/reduce-motion/);await page.locator('[data-action="close"]').click();await page.locator('[data-action="solo"]').click();
 expect(await page.evaluate(()=>window.MagixTest.renderer.motion)).toBe(false);await expect.poll(()=>page.evaluate(()=>window.MagixTest.world.time)).toBeGreaterThan(.15);
});
