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
  if(i%600===0){assert.ok(g.s.enemies.length<=110);assert.ok(g.s.gems.length<=300);assert.ok(g.s.shots.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)));}
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
