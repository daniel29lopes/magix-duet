import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';import {FAIRIES,WEAPONS,PASSIVES,FUSIONS} from '../src/data.js';
test('Every fairy and evolution has a complete reachable recipe',()=>{
 for(const f of FAIRIES)assert.ok(WEAPONS[f.weapon]);
 for(const w of Object.values(WEAPONS)){assert.ok(PASSIVES[w.passive]);assert.ok(w.damage>0&&w.rate>0);}
 for(const f of FUSIONS){assert.ok(WEAPONS[f.a]&&WEAPONS[f.b]);assert.notEqual(f.a,f.b);}
});
test('Evolution requires level eight and the correct level five accessory',()=>{
 const g=new Game(),p=g.s.players[0];p.weapons[0].level=8;p.passives.heart=4;assert.equal(g.evolve(p),null);assert.equal(p.weapons[0].evolved,false);
 p.passives.heart=5;assert.equal(g.evolve(p),'flame');assert.equal(p.weapons[0].evolved,true);assert.deepEqual(p.evolvedEver,['flame']);
});
test('Fusion consumes both evolved ingredients, frees a slot and records the team unlock',()=>{
 const g=new Game(),p=g.s.players[0];p.weapons=[{id:'flame',level:8,evolved:true},{id:'sun',level:8,evolved:true}];
 assert.equal(g.evolve(p),'phoenix');assert.equal(p.weapons.length,1);assert.equal(p.weapons[0].id,'phoenix');assert.ok(g.s.unlocks.includes('fusion:phoenix'));
});
test('Coop upgrade waits for both players and ignores duplicate guest commands',()=>{
 const g=new Game({fairies:['bloom','flora']});g.s.xp=30;g.step(.016);assert.equal(g.s.pause.kind,'upgrade');
 g.choice(0,g.s.pause.choices[0][0].id);assert.ok(g.s.pause);
 const id=g.s.pause.choices[1][0].id;g.command(1,{seq:1,type:'choice',value:id});assert.equal(g.s.pause,null);
 const count=JSON.stringify(g.s.players[1]);g.command(1,{seq:1,type:'choice',value:id});assert.equal(JSON.stringify(g.s.players[1]),count);
});
test('Both partners explicitly resume a menu pause',()=>{
 const g=new Game({fairies:['bloom','aisha']});g.pause();g.resume(1);g.step(.05);assert.equal(g.s.time,0);g.resume(0);g.step(.05);assert.ok(g.s.time>0);
});
test('A living nearby fairy revives a fallen partner in three seconds',()=>{
 const g=new Game({fairies:['bloom','stella']});g.spawn=1e6;g.s.players[1].down=true;g.s.players[1].hp=0;
 for(let i=0;i<190;i++)g.step(1/60);assert.equal(g.s.players[1].down,false);assert.equal(g.s.players[1].hp,45);
});
test('Solo checkpoints preserve the run and do not generate a second reward identity',()=>{
 const g=new Game({runId:'stable-run'});for(let i=0;i<100;i++)g.step(.02);g.pause();const restored=Game.restore(g.save());assert.equal(restored.s.runId,'stable-run');assert.equal(restored.s.pause,null);assert.equal(restored.s.time,g.s.time);
});
test('Seeded full-length run remains finite, bounded and terminates',()=>{
 let seed=123;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 const g=new Game({random,fairies:['tecna','aisha']});g.s.players.forEach(p=>p.hp=p.maxHp=10000);
 for(let i=0;i<32500&&!g.s.over;i++){
  if(g.s.pause)for(let p=0;p<2&&g.s.pause;p++)if(!g.s.pause.picked[p])g.choice(p,g.s.pause.choices[p][0].id);
  g.input(0,Math.sin(i*.003),Math.cos(i*.003));g.input(1,Math.sin(i*.003+.2),Math.cos(i*.003+.2));g.step(1/60);
  if(i%600===0){assert.ok(g.s.enemies.length<=110);assert.ok(g.s.gems.length<=300);assert.ok(g.s.pickups.length<=56);assert.ok(g.s.shots.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)));}
 }
 assert.equal(g.s.over,true);assert.ok(g.s.time>=450);assert.ok(g.s.kills>100);assert.ok(g.s.level>10);
});

test('Final defeat cannot become stuck behind a level-up dialog',()=>{
 const g=new Game({fairies:['bloom','stella']});g.spawn=1e6;g.s.xp=100;
 for(const p of g.s.players){p.hp=1;g.s.projectiles.push({id:p.id,x:p.x,y:p.y,vx:0,vy:0,ttl:1});}
 g.step(.016);assert.equal(g.s.over,true);assert.equal(g.s.pause,null);
});
test('Flora overheal absorbs damage without granting permanent invulnerability',()=>{
 const g=new Game({fairies:['flora']}),p=g.s.players[0];p.transform=1;g.heal(p,10);assert.equal(p.barrier,10);g.damagePlayer(p,15);assert.equal(p.hp,95);assert.equal(p.barrier,0);
});

test('Heart pickups heal without exceeding maximum HP and cannot be collected twice',()=>{
 const g=new Game(),p=g.s.players[0];p.hp=85;const q=g.dropPickup('heal',p.x,p.y);assert.equal(g.collectPickup(q,0),true);assert.equal(p.hp,100);
 assert.equal(g.collectPickup(q,0),false);assert.equal(g.s.lootSeq,1);
});
test('Cosmic magnet collects gems and consumables in the visible viewport only',()=>{
 const g=new Game(),p=g.s.players[0];g.spawn=1e6;g.s.pickups=[];g.s.gems=[{id:4000,x:p.x+185,y:p.y+15,v:3},{id:4001,x:p.x+270,y:p.y,v:3}];g.s.xpNeed=1e6;g.setView(0,400,500);
 const coin=g.dropPickup('coins',p.x-170,p.y),outside=g.dropPickup('coins',p.x+310,p.y),magnet=g.dropPickup('magnet',p.x,p.y);g.collectPickup(magnet,0);
 for(let i=0;i<100;i++)g.step(1/60);
 assert.equal(g.s.coins,20);assert.equal(g.s.xp,3);assert.ok(coin.collected);assert.equal(outside.collected,undefined);assert.equal(g.s.gems.length,1);assert.equal(g.s.gems[0].id,4001);
});
test('Nova clears visible enemies and hostile projectiles, damages bosses, and leaves distant enemies alone',()=>{
 const g=new Game({random:()=>.9}),p=g.s.players[0];g.setView(0,400,500);g.s.enemies=[];
 g.spawnEnemy();const near=g.s.enemies.at(-1);near.x=p.x+80;near.y=p.y;near.hp=near.maxHp=50;
 g.spawnEnemy();const far=g.s.enemies.at(-1);far.x=p.x+650;far.y=p.y;far.hp=far.maxHp=50;
 g.spawnEnemy(true);const boss=g.s.enemies.at(-1);boss.x=p.x+100;boss.y=p.y+100;boss.hp=boss.maxHp=1000;
 g.s.projectiles=[{id:1,x:p.x+20,y:p.y,vx:0,vy:0,ttl:1},{id:2,x:p.x+700,y:p.y,vx:0,vy:0,ttl:1}];
 g.collectPickup(g.dropPickup('nova',p.x,p.y),0);
 assert.ok(near.hp<=0);assert.equal(far.hp,50);assert.equal(boss.hp,780);assert.equal(g.s.projectiles.length,1);assert.equal(g.s.projectiles[0].id,2);assert.ok(g.s.fx.some(f=>f.kind==='nova'));
});
test('The host awards one shared coin pickup even when both players overlap it',()=>{
 const g=new Game({fairies:['bloom','flora']}),p=g.s.players[0];g.s.players[1].x=p.x;g.s.players[1].y=p.y;
 const q=g.dropPickup('coins',p.x,p.y);g.collectPickup(q,1);g.collectPickup(q,0);assert.equal(g.s.coins,20);assert.equal(g.s.lootSeq,1);
});
test('Shield pickups expire and are preserved by solo save and resume',()=>{
 const g=new Game();g.spawn=1e6;g.collectPickup(g.dropPickup('shield',1100,1100),0);const restored=Game.restore(g.save());
 assert.equal(restored.s.players[0].shield,5);for(let i=0;i<110;i++)restored.step(.05);assert.equal(restored.s.players[0].shield,0);
});
test('Pre-art-update saves migrate without duplicating loot or changing run identity',()=>{
 const g=new Game({runId:'older-checkpoint'}),raw=g.save();delete raw.state.pickups;delete raw.state.arena;delete raw.state.lootSeq;
 const restored=Game.restore(raw);assert.equal(restored.s.runId,'older-checkpoint');assert.deepEqual(restored.s.pickups,[]);assert.equal(restored.s.arena,'forest');
});

test('Cosmic magnet also retrieves a visible boss chest and evolves both partners once',()=>{
 const g=new Game({fairies:['bloom','flora']}),a=g.s.players[0],b=g.s.players[1];g.spawn=1e6;g.s.pickups=[];g.setView(0,500,700);
 a.weapons[0].level=8;a.passives.heart=5;b.weapons[0].level=8;b.passives.seed=5;
 g.s.chests=[{id:9000,x:a.x+220,y:a.y}];g.collectPickup(g.dropPickup('magnet',a.x,a.y),0);
 for(let i=0;i<100;i++)g.step(1/60);
 assert.equal(g.s.chests.length,0);assert.equal(a.weapons[0].evolved,true);assert.equal(b.weapons[0].evolved,true);
});
