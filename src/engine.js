import {FAIRIES,WEAPONS,PASSIVES,FUSIONS,weaponInfo,ARENAS,LOOT} from './data.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const caps={w:2200,h:2200};
export class Game {
 constructor({fairies=['bloom'],names=['Tu'],upgrades={},unlocks=[],runId='local',random=Math.random,arena='forest'}={}){
  this.random=random;this.id=0;this.spawn=0;this.bosses=new Set();this.weaponClocks={};this.in={};
  this.s={version:1,runId,arena:ARENAS.some(a=>a.id===arena)?arena:'forest',lootSeq:0,time:0,level:1,xp:0,xpNeed:20,kills:0,coins:0,bossKills:0,bond:0,bondBursts:0,over:false,won:false,pause:null,guestAck:0,unlocks:[...unlocks],players:[],enemies:[],shots:[],gems:[],chests:[],pickups:[],fx:[],projectiles:[]};
  this.upgrades=upgrades;
  fairies.forEach((id,i)=>{const f=FAIRIES.find(f=>f.id===id)||FAIRIES[0];const max=100+(upgrades.vigor||0)*8;
   this.s.players.push({id:i,name:String(names[i]||('Fada '+(i+1))).slice(0,24),fairy:f.id,x:1100+i*70,y:1100,hp:max,maxHp:max,down:false,revive:0,shield:0,barrier:0,barrierTtl:0,motion:0,cast:0,hit:0,viewW:640,viewH:900,inv:0,ultimate:0,weapons:[{id:f.weapon,level:1,evolved:false}],passives:{},evolvedEver:[],fusionEver:[],transform:0,stats:{gems:0,healed:0,sonicKills:0,droneKills:0,waterHits:0,boss:0},rerolls:2});
  });
  const starter=[['coins',115,-75],['heal',-160,85],['magnet',250,40],['nova',-250,-190],['shield',220,240]];
  for(const [type,dx,dy] of starter)this.dropPickup(type,1100+dx,1100+dy);
  for(let i=0;i<18;i++){const type=i%7===0?'nova':i%5===0?'magnet':i%3===0?'heal':'coins';this.dropPickup(type,this.rand(200,2000),this.rand(200,2000));}
 }
 save(){return JSON.parse(JSON.stringify({state:this.s,id:this.id,spawn:this.spawn,bosses:[...this.bosses],clocks:this.weaponClocks,upgrades:this.upgrades}));}
 static restore(raw){
  if(!raw?.state||raw.state.version!==1||raw.state.players?.length!==1||raw.state.over||!Array.isArray(raw.state.enemies)||raw.state.enemies.length>200)throw new Error('Partida guardada inválida.');
  const g=new Game({fairies:raw.state.players.map(p=>p.fairy),runId:raw.state.runId,upgrades:raw.upgrades||{}});
  g.s=raw.state;g.s.pickups=Array.isArray(g.s.pickups)?g.s.pickups:[];g.s.lootSeq=g.s.lootSeq||0;g.s.arena=ARENAS.some(a=>a.id===g.s.arena)?g.s.arena:'forest';g.id=Number(raw.id)||0;g.spawn=Number(raw.spawn)||0;g.bosses=new Set(raw.bosses||[]);g.weaponClocks=raw.clocks||{};if(g.s.pause?.kind==='menu')g.s.pause=null;return g;
 }
 setView(i,w,h){const p=this.s.players[i];if(p){p.viewW=clamp(Number(w)||640,220,1600);p.viewH=clamp(Number(h)||900,300,2200);}}
 visible(item,p,pad=0){return Math.abs(item.x-p.x)<(p.viewW||640)/2+pad&&Math.abs(item.y-p.y)<(p.viewH||900)/2+pad;}
 dropPickup(type,x,y){
  if(!LOOT[type]||this.s.pickups.length>=56)return null;
  const q={id:this.next(),type,x:clamp(x,35,caps.w-35),y:clamp(y,35,caps.h-35),ttl:100,born:this.s.time};
  this.s.pickups.push(q);return q;
 }
 collectPickup(q,i){
  const p=this.s.players[i];if(!p||p.down||q.collected||!LOOT[q.type])return false;
  q.collected=true;this.s.lootSeq++;const def=LOOT[q.type];
  this.s.fx.push({id:this.next(),kind:'pickup',loot:q.type,x:p.x,y:p.y-20,text:q.type==='heal'?'+30':q.type==='coins'?'+20':'',color:def.color,ttl:1.2});
  p.cast=Math.max(p.cast||0,.25);
  if(q.type==='heal')this.heal(p,30);
  if(q.type==='coins')this.s.coins+=20;
  if(q.type==='shield')p.shield=Math.max(p.shield,5);
  if(q.type==='magnet'){
   for(const gem of this.s.gems)if(gem.v>0&&this.visible(gem,p))gem.vacuum=i;
   for(const item of this.s.pickups)if(!item.collected&&item.id!==q.id&&this.visible(item,p))item.vacuum=i;
   for(const chest of this.s.chests)if(this.visible(chest,p))chest.vacuum=i;
   this.s.fx.push({id:this.next(),kind:'magnet',x:p.x,y:p.y,r:Math.max(p.viewW||640,p.viewH||900)*.55,color:def.color,ttl:1.1});
  }
  if(q.type==='nova'){
   this.s.fx.push({id:this.next(),kind:'nova',x:p.x,y:p.y,r:Math.max(p.viewW||640,p.viewH||900)*.7,color:def.color,ttl:.9});
   for(const e of [...this.s.enemies])if(e.hp>0&&this.visible(e,p,30))this.hurt(e,e.boss?e.maxHp*.22:e.hp+5,p,'nova');
   this.s.projectiles=this.s.projectiles.filter(b=>!this.visible(b,p,30));
  }
  return true;
 }
 next(){return ++this.id;}
 rand(a,b){return a+this.random()*(b-a);}
 input(i,x,y){const len=Math.hypot(Number(x)||0,Number(y)||0)||1;this.in[i]={x:clamp((Number(x)||0)/Math.max(1,len),-1,1),y:clamp((Number(y)||0)/Math.max(1,len),-1,1)};}
 options(i){
  const p=this.s.players[i];let list=[];
  for(const [id,w] of Object.entries(WEAPONS)){
   const current=p.weapons.find(x=>x.id===id);
   if(current&&!current.evolved&&current.level<8)list.push({id:'w:'+id,kind:'weapon',name:w.name,icon:w.icon,level:current.level+1,text:'Mais dano, alcance e projéteis.'});
   else if(!current&&p.weapons.length<4)list.push({id:'w:'+id,kind:'weapon',name:w.name,icon:w.icon,level:1,text:'Nova arma · '+w.effect});
  }
  for(const [id,a] of Object.entries(PASSIVES)){
   const level=p.passives[id]||0;
   if(level<5&&(level>0||Object.keys(p.passives).length<4))list.push({id:'p:'+id,kind:'passive',name:a.name,icon:a.icon,level:level+1,text:a.text});
  }
  // Keep companion accessories reachable instead of repeatedly offering unrelated items.
  const preferred=list.filter(o=>o.kind==='passive'&&p.weapons.some(w=>WEAPONS[w.id]?.passive===o.id.slice(2)));
  const shuffled=list.map(o=>({o,n:this.random()})).sort((a,b)=>a.n-b.n).map(x=>x.o);
  let result=shuffled.slice(0,3);
  if(preferred.length&&this.random()<.65&&!result.some(o=>preferred.some(a=>a.id===o.id)))result[2]=preferred[Math.floor(this.random()*preferred.length)];
  const equipped=shuffled.filter(o=>o.kind==='weapon'&&p.weapons.some(w=>w.id===o.id.slice(2)));if(equipped.length)result[0]=equipped[0];if(preferred.length)result[1]=preferred[Math.floor(this.random()*preferred.length)];result=[...new Map(result.map(o=>[o.id,o])).values()];for(const o of shuffled){if(result.length>=3)break;if(!result.some(r=>r.id===o.id))result.push(o);}
  if(!result.length)result=[{id:'heal',name:'Sopro de vida',icon:'♥',level:1,text:'Recupera 40 de vida e ganha 15 moedas.'}];
  return result;
 }
 levelUp(){
  const s=this.s;s.level++;s.xp-=s.xpNeed;s.xpNeed=20+s.level*4;
  s.pause={id:this.next(),kind:'upgrade',choices:s.players.map((p,i)=>p.down?[]:this.options(i)),picked:s.players.map(p=>p.down),ready:s.players.map(()=>false)};
 }
 choice(i,id){
  const pause=this.s.pause,p=this.s.players[i];if(!pause||pause.kind!=='upgrade'||pause.picked[i]||!p)return false;
  const o=pause.choices[i].find(x=>x.id===id);if(!o)return false;
  if(id.startsWith('w:')){let w=p.weapons.find(w=>w.id===id.slice(2));if(w)w.level++;else p.weapons.push({id:id.slice(2),level:1,evolved:false});}
  else if(id.startsWith('p:'))p.passives[id.slice(2)]=(p.passives[id.slice(2)]||0)+1;
  else{this.heal(p,40);this.s.coins+=15;}
  pause.picked[i]=true;p.cast=.7;this.effect(p.x,p.y,'','#dfb5ff','level');this.checkTransform(p);
  if(pause.picked.every(Boolean))this.s.pause=null;return true;
 }
 reroll(i){const p=this.s.players[i],pause=this.s.pause;if(!p||!pause||pause.kind!=='upgrade'||pause.picked[i]||p.rerolls<=0)return false;p.rerolls--;pause.choices[i]=this.options(i);return true;}
 pause(){if(!this.s.pause&&!this.s.over)this.s.pause={id:this.next(),kind:'menu',ready:this.s.players.map(p=>p.down)};}
 resume(i){const p=this.s.pause;if(p?.kind==='menu'){p.ready[i]=true;if(p.ready.every(Boolean))this.s.pause=null;}}
 command(i,c){
  if(!c)return;
  if(i===1&&c.seq<=this.s.guestAck)return;
  if(i===1)this.s.guestAck=c.seq;
  if(c.type==='choice')this.choice(i,c.value);
  if(c.type==='reroll')this.reroll(i);
  if(c.type==='pause')this.pause();
  if(c.type==='resume')this.resume(i);
  if(c.type==='ultimate')this.ultimate(i);
  if(c.type==='leave')this.finish(false);
 }
 effect(x,y,text,color='#ead5ff',kind='text'){this.s.fx.push({id:this.next(),x,y,text,color,kind,ttl:1.1});if(this.s.fx.length>45)this.s.fx.shift();}
 heal(p,n){if(n<=0||p.down)return;const amount=Math.min(n,Math.max(0,p.maxHp-p.hp));p.hp+=amount;p.stats.healed+=amount;if(p.fairy==='flora'&&p.transform>0&&n>1&&n>amount){p.barrier=Math.min(20,(p.barrier||0)+n-amount);p.barrierTtl=5;}}
 damagePlayer(p,n){const absorbed=Math.min(p.barrier||0,n);p.barrier=Math.max(0,(p.barrier||0)-absorbed);p.hp=Math.max(0,p.hp-n+absorbed);p.hit=.22;if(p.hp<=0)p.down=true;}
 stats(p){
  const a=p.passives,u=this.upgrades;return{power:(1+.08*(a.heart||0)+.06*(u.power||0))*(1+p.transform*.2),
   haste:1+.06*(a.core||0)+.03*(u.haste||0),area:1+.06*(a.fork||0),speed:165*(1+.05*(a.pearl||0)),
   regen:.12*(u.recovery||0)+.25*(a.seed||0),magnet:125+22*(a.magnet||0)+12*(u.reach||0)+(p.weapons.some(w=>w.id==='stars'&&w.evolved)?60:0),
   crit:.05+.05*(a.prism||0),resist:.04*(a.moonstone||0),duration:1+.1*(a.hourglass||0)};
 }
 checkTransform(p){
  const s=this.s,f=FAIRIES.find(x=>x.id===p.fairy),st=p.stats;
  const valid=p.evolvedEver.includes(f.weapon)&&({bloom:st.boss>=1,stella:st.gems>=100,flora:st.healed>=200,musa:st.sonicKills>=50,tecna:st.droneKills>=100,aisha:st.waterHits>=50}[p.fairy]);
  const key='enchantix:'+p.fairy;if(valid&&!s.unlocks.includes(key)){s.unlocks.push(key);this.effect(p.x,p.y-35,'ENCHANTIX',f.color,'transform');}
  p.transform=s.level>=20&&s.unlocks.includes('believix:'+p.fairy)?2:s.level>=10&&s.unlocks.includes(key)?1:0;
 }
 evolve(p){
  const s=this.s;
  const fusion=FUSIONS.find(f=>p.weapons.some(w=>w.id===f.a&&w.evolved)&&p.weapons.some(w=>w.id===f.b&&w.evolved));
  if(fusion){p.weapons=p.weapons.filter(w=>w.id!==fusion.a&&w.id!==fusion.b);p.weapons.push({id:fusion.id,level:1,evolved:true});p.fusionEver.push(fusion.id);const key='fusion:'+fusion.id;if(!s.unlocks.includes(key))s.unlocks.push(key);this.effect(p.x,p.y-35,fusion.name,fusion.color,'fusion');return fusion.id;}
  const w=p.weapons.find(w=>!w.evolved&&w.level===8&&(p.passives[WEAPONS[w.id]?.passive]||0)>=5);
  if(w){w.evolved=true;p.evolvedEver.push(w.id);this.effect(p.x,p.y-35,WEAPONS[w.id].evolution,WEAPONS[w.id].color,'fusion');this.checkTransform(p);return w.id;}
  this.heal(p,20);s.coins+=20;return null;
 }
 nearest(p,range=420){let nearest=null,d=range;for(const e of this.s.enemies){const dd=distance(e,p);if(e.hp>0&&dd<d){d=dd;nearest=e;}}return nearest;}
 hurt(e,amount,p,weapon,tag=true){
  if(e.hp<=0)return;const st=this.stats(p),crit=this.random()<st.crit,damage=amount*(crit?1.7:1)*(e.sonic>0?1.18:1);
  e.hp-=damage;if(crit&&p.fairy==='stella'&&p.transform>0&&weapon!=='stella-bonus'){const other=this.s.enemies.find(n=>n!==e&&n.hp>0&&distance(n,e)<150);if(other)this.hurt(other,amount*.3,p,'stella-bonus');}if(damage>=2){e.hit=.14;if(crit)this.effect(e.x,e.y-15,Math.round(damage).toString(),'#ffe6a3');else this.effect(e.x,e.y,'',weaponInfo(weapon)?.color||'#dcc5ff','hit');}
  if(e.hp>0||!tag)return;
  const s=this.s;s.kills++;s.xp+=1;p.ultimate=Math.min(100,p.ultimate+2.5);
  if(e.sonic>0)p.stats.sonicKills++;if(['discs','orchestra'].includes(weapon))p.stats.droneKills++;
  s.gems.push({id:this.next(),x:e.x,y:e.y,v:e.boss?60:e.elite?12:3});
  this.effect(e.x,e.y,'',e.boss?'#ffdb99':'#cd9bf7','death');
  if(!e.boss&&this.random()<(e.elite?.6:.11)){const low=s.players.some(a=>!a.down&&a.hp<a.maxHp*.45),roll=this.random();const type=roll<(low?.42:.18)?'heal':roll<.7?'coins':roll<.83?'magnet':roll<.94?'shield':'nova';this.dropPickup(type,e.x,e.y);}
  if(e.boss){s.bossKills++;for(const ally of s.players)ally.stats.boss++;s.chests.push({id:this.next(),x:e.x,y:e.y});this.effect(e.x,e.y,'','#ffdfa2','boss');if(e.final)this.finish(true);}
  if(e.frozen>0){for(const n of s.enemies)if(n!==e&&n.hp>0&&distance(e,n)<85){this.hurt(n,18*st.power,p,weapon);}}
  if(e.burn>0&&s.players.some(a=>a.transform>0&&a.fairy==='bloom'))for(const n of s.enemies)if(n.hp>0&&distance(e,n)<100){n.burn=Math.max(n.burn,2);n.burnOwner=p.id;}
 }
 attack(p,w,dt){
  const key=p.id+':'+w.id;this.weaponClocks[key]=(this.weaponClocks[key]||0)-dt;if(this.weaponClocks[key]>0)return;
  const target=this.nearest(p);if(!target)return;
  const def=weaponInfo(w.id),st=this.stats(p),fusion=!WEAPONS[w.id];p.cast=.18;
  const bonus=(1+(w.level-1)*.21)*(w.evolved&&!fusion?2.1:1);
  p.beat=(p.beat||0)+1;this.weaponClocks[key]=p.fairy==='musa'&&p.transform>0&&p.beat%5===0?.1:def.rate/st.haste;
  const angle=Math.atan2(target.y-p.y,target.x-p.x),count=['sun','discs','orchestra'].includes(w.id)?1+Math.floor(w.level/3)+(w.evolved?2:0)+(p.fairy==='tecna'&&p.transform>0?1:0):1+(w.level>=6?1:0);
  if(['lightning','polar'].includes(w.id)){
   let previous=p;const hit=new Set();for(let n=0;n<2+(p.passives.conductor||0)+(w.evolved?2:0);n++){
    let next=null,best=360;for(const e of this.s.enemies)if(e.hp>0&&!hit.has(e.id)){const d=distance(previous,e);if(d<best){best=d;next=e;}}
    if(!next)break;hit.add(next.id);const wet=next.wet>0;this.s.fx.push({id:this.next(),kind:'line',x:previous.x,y:previous.y,x2:next.x,y2:next.y,color:def.color,ttl:.2});
    this.hurt(next,def.damage*bonus*st.power*(wet?1.6:1),p,w.id);if(w.id==='polar')next.frozen=1.5*st.duration;previous=next;
   }return;
  }
  if(['vines','sound','eden'].includes(w.id)){
   const r=(w.id==='sound'?180:150)*st.area*(w.evolved?1.35:1);
   this.s.fx.push({id:this.next(),kind:'spell',weapon:w.id,evolved:w.evolved,x:p.x,y:p.y,r,color:def.color,ttl:.55});
   for(const e of this.s.enemies)if(e.hp>0&&distance(e,p)<r){if(w.id==='sound')e.sonic=3*st.duration;else e.root=1.5*st.duration;
    if(w.id==='sound'&&e.burn>0){e.burn=Math.max(e.burn,3);for(const n of this.s.enemies)if(n.hp>0&&distance(n,e)<85){n.burn=Math.max(n.burn,2);n.burnOwner=e.burnOwner;}}
    if(w.id==='vines'&&e.frozen>0)e.frozen+=.6;
    this.hurt(e,def.damage*bonus*st.power,p,w.id);
   }
   if((w.id==='vines'&&w.evolved)||w.id==='eden')for(const ally of this.s.players)if(!ally.down&&distance(ally,p)<r)this.heal(ally,w.id==='eden'?5:2);
   return;
  }
  if(w.id==='moon'){
   const r=90*st.area;for(const e of this.s.enemies)if(e.hp>0&&distance(e,p)<r)this.hurt(e,def.damage*bonus*st.power,p,w.id);
   if(w.evolved)this.s.projectiles=this.s.projectiles.filter(b=>distance(b,p)>r);return;
  }
  if(w.id==='galaxy'){const r=110*st.area;for(const e of this.s.enemies)if(e.hp>0&&distance(e,p)<r)this.hurt(e,def.damage*bonus*st.power*.5,p,w.id);this.s.projectiles=this.s.projectiles.filter(b=>distance(b,p)>r);}
  for(let n=0;n<count;n++){
   const a=angle+(n-(count-1)/2)*.19;
   this.s.shots.push({id:this.next(),x:p.x,y:p.y,vx:Math.cos(a)*def.speed,vy:Math.sin(a)*def.speed,ttl:2.1,
    owner:p.id,weapon:w.id,damage:def.damage*bonus*st.power,evolved:w.evolved,color:def.color,
    radius:(['water','phoenix'].includes(w.id)?15:7)*st.area,pierce:w.evolved?6:1,hit:[]});
  }
 }
 spawnEnemy(boss=false,final=false){
  const s=this.s,alive=s.players.filter(p=>!p.down);if(!alive.length)return;
  const target=alive[Math.floor(this.random()*alive.length)],a=this.rand(0,Math.PI*2),d=boss?430:470;
  const tier=Math.floor(s.time/70),elite=!boss&&this.random()<.08;const health=(boss?400+s.time*3:elite?55:22)*(1+tier*.28)*(s.players.length===2?1.45:1);
  s.enemies.push({id:this.next(),x:clamp(target.x+Math.cos(a)*d,35,caps.w-35),y:clamp(target.y+Math.sin(a)*d,35,caps.h-35),
   hp:health,maxHp:health,boss,final,elite,r:boss?35:elite?19:13,speed:boss?48:45+tier*5+(elite?12:0),type:boss?'boss':Math.floor(this.rand(0,3)),
   hit:0,art:boss?(final?6:tier%2?5:4):elite?3:null,burn:0,frozen:0,root:0,wet:0,sonic:0,shotClock:boss?3:8,inv:0});
 }
 ultimate(i){
  const p=this.s.players[i];if(!p||p.down||p.ultimate<100||this.s.pause||this.s.over)return false;p.ultimate=0;
  const st=this.stats(p),f=FAIRIES.find(f=>f.id===p.fairy);p.cast=1;this.effect(p.x,p.y,'',f.color,'ultimate');
  this.s.fx.push({id:this.next(),kind:'ring',x:p.x,y:p.y,r:380,color:f.color,ttl:.8});
  for(const e of this.s.enemies)if(e.hp>0&&distance(e,p)<380)this.hurt(e,90*st.power,p,'ultimate');
  this.heal(p,12);p.shield=Math.max(p.shield,2);return true;
 }
 finish(won){
  if(this.s.over)return;this.s.over=true;this.s.won=won;this.s.pause=null;
  if(won)for(const p of this.s.players)if(p.transform>0&&p.fusionEver.length){const key='believix:'+p.fairy;if(!this.s.unlocks.includes(key))this.s.unlocks.push(key);}
 }
 result(){const s=this.s;return{run_id:s.runId,duration:Math.floor(s.time),kills:s.kills,won:s.won,coop:s.players.length===2,unlocks:s.unlocks,bonus:s.coins};}
 step(dt){
  const s=this.s;if(s.over||s.pause)return;dt=clamp(dt,0,.05);s.time+=dt;
  for(const fx of s.fx)fx.ttl-=dt;s.fx=s.fx.filter(f=>f.ttl>0);
  for(const p of s.players){
   if(p.down)continue;const st=this.stats(p),input=this.in[p.id]||{x:0,y:0};
   p.x=clamp(p.x+input.x*st.speed*dt,25,caps.w-25);p.y=clamp(p.y+input.y*st.speed*dt,25,caps.h-25);
   p.cast=Math.max(0,(p.cast||0)-dt);p.hit=Math.max(0,(p.hit||0)-dt);p.inv=Math.max(0,p.inv-dt);p.shield=Math.max(0,p.shield-dt);p.barrierTtl=Math.max(0,(p.barrierTtl||0)-dt);if(!p.barrierTtl)p.barrier=0;this.heal(p,st.regen*dt);
   if(p.fairy==='aisha'&&p.transform>0){p.motion=(p.motion||0)+Math.hypot(input.x,input.y)*st.speed*dt;if(p.motion>=250){p.motion=0;p.shield=1;this.s.fx.push({id:this.next(),kind:'ring',x:p.x,y:p.y,r:150,color:'#7cdbef',ttl:.5});for(const e of s.enemies)if(e.hp>0&&distance(e,p)<150){e.wet=3;this.hurt(e,25*st.power,p,'water');}}}
   for(const w of p.weapons)this.attack(p,w,dt);
   this.checkTransform(p);
  }
  const living=s.players.filter(p=>!p.down);
  for(const p of s.players.filter(p=>p.down)){
   const near=living.some(a=>distance(a,p)<105);p.revive=near?p.revive+dt:Math.max(0,p.revive-dt);
   if(p.revive>=3){p.down=false;p.hp=p.maxHp*.45;p.inv=3;p.revive=0;this.effect(p.x,p.y,'','#9fe2b3','revive');}
  }
  if(!living.length){this.finish(false);return;}
  if(s.players.length===2&&living.length===2&&distance(living[0],living[1])<220){
   s.bond=Math.min(100,s.bond+dt*6);
   if(s.bond>=100){s.bond=0;s.bondBursts++;const center={x:(living[0].x+living[1].x)/2,y:(living[0].y+living[1].y)/2};
    this.effect(center.x,center.y,'','#ffc6e7','bond');
    s.fx.push({id:this.next(),kind:'ring',...center,r:340,color:'#ffc6e7',ttl:.7});
    for(const e of s.enemies)if(e.hp>0&&distance(e,center)<340)this.hurt(e,100*this.stats(living[0]).power,living[0],'bond');
    for(const p of living){this.heal(p,15);p.shield=2;}
   }
  }
  this.spawn-=dt;if(this.spawn<=0&&s.enemies.length<105){this.spawn=Math.max(.19,.85-s.time/700);this.spawnEnemy();if(s.time>120)this.spawnEnemy();}
  for(const minute of [60,150,240,330,420,450])if(s.time>=minute&&!this.bosses.has(minute)){this.bosses.add(minute);this.spawnEnemy(true,minute===450);}
  for(const e of s.enemies){
   if(e.hp<=0)continue;for(const k of ['frozen','root','wet','sonic','inv','hit'])e[k]=Math.max(0,e[k]-dt);
   if(e.burn>0){e.burn=Math.max(0,e.burn-dt);const owner=s.players[e.burnOwner]||s.players[0];this.hurt(e,9*dt*this.stats(owner).power,owner,'flame');if(e.hp<=0)continue;}
   let target=living[0];for(const p of living)if(distance(e,p)<distance(e,target))target=p;
   const d=distance(e,target)||1,slow=e.frozen>0?0:e.root>0?.1:1;
   e.x+=(target.x-e.x)/d*e.speed*slow*dt;e.y+=(target.y-e.y)/d*e.speed*slow*dt;
   if(d<e.r+15&&target.inv<=0&&target.shield<=0){this.damagePlayer(target,(e.boss?18:9)*(1-this.stats(target).resist));target.inv=.7;this.effect(target.x,target.y-25,'−'+(e.boss?18:9),'#ff94a7');if(target.hp<=0){target.hp=0;target.down=true;}}
   if(e.boss&&e.frozen<=0){e.shotClock-=dt;if(e.shotClock<=0){e.shotClock=3;for(let k=0;k<8;k++){const a=k*Math.PI/4+s.time*.2;s.projectiles.push({id:this.next(),x:e.x,y:e.y,vx:Math.cos(a)*110,vy:Math.sin(a)*110,ttl:4});}}}
  }
  for(const b of s.shots){
   b.ttl-=dt;
   if(['discs','orchestra'].includes(b.weapon)){const target=this.nearest(b,250);if(target){const a=Math.atan2(target.y-b.y,target.x-b.x);b.vx+=(Math.cos(a)*390-b.vx)*dt*4;b.vy+=(Math.sin(a)*390-b.vy)*dt*4;}}
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   for(const e of s.enemies)if(e.hp>0&&!b.hit.includes(e.id)&&distance(e,b)<e.r+b.radius){
    b.hit.push(e.id);const p=s.players[b.owner];
    if(['flame','phoenix'].includes(b.weapon)){e.burn=3*this.stats(p).duration;e.burnOwner=p.id;}
    if(['ice','polar'].includes(b.weapon))e.frozen=1.2*this.stats(p).duration+(e.root>0?.8:0);
    if(b.weapon==='water'){e.wet=3;e.x+=b.vx*.08;e.y+=b.vy*.08;p.stats.waterHits++;}
    this.hurt(e,b.damage,p,b.weapon);
    if((b.evolved&&['flame','stars'].includes(b.weapon))||b.weapon==='phoenix'){this.s.fx.push({id:this.next(),kind:'ring',x:e.x,y:e.y,r:75,color:b.color,ttl:.25});for(const n of s.enemies)if(n!==e&&n.hp>0&&distance(n,e)<75)this.hurt(n,b.damage*.35,p,b.weapon);}
    if(b.evolved&&b.weapon==='sun'){const next=s.enemies.filter(n=>n.hp>0&&!b.hit.includes(n.id)&&distance(n,e)<350).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(next){const a=Math.atan2(next.y-b.y,next.x-b.x),speed=Math.hypot(b.vx,b.vy);b.vx=Math.cos(a)*speed;b.vy=Math.sin(a)*speed;}}
    b.pierce--;if(b.pierce<=0){b.ttl=0;break;}
   }
  }
  for(const b of s.projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.ttl-=dt;
   for(const p of living)if(p.inv<=0&&p.shield<=0&&distance(p,b)<20){this.damagePlayer(p,8);p.inv=.6;b.ttl=0;if(p.hp<=0){p.hp=0;p.down=true;}}
  }
  for(const gem of s.gems){let p=typeof gem.vacuum==='number'&&!s.players[gem.vacuum]?.down?s.players[gem.vacuum]:living[0];if(typeof gem.vacuum!=='number')for(const a of living)if(distance(a,gem)<distance(p,gem))p=a;
   const d=distance(gem,p);if(d<this.stats(p).magnet||typeof gem.vacuum==='number'){gem.x+=(p.x-gem.x)*Math.min(1,dt*(typeof gem.vacuum==='number'?13:9));gem.y+=(p.y-gem.y)*Math.min(1,dt*(typeof gem.vacuum==='number'?13:9));}
   if(d<22){s.xp+=gem.v;p.stats.gems++;gem.v=0;}
  }
  for(const item of [...s.pickups]){
   if(item.collected)continue;item.ttl-=dt;
   let p=typeof item.vacuum==='number'&&!s.players[item.vacuum]?.down?s.players[item.vacuum]:living[0];
   if(typeof item.vacuum!=='number')for(const a of living)if(distance(a,item)<distance(p,item))p=a;
   const d=distance(item,p);if(typeof item.vacuum==='number'){item.x+=(p.x-item.x)*Math.min(1,dt*11);item.y+=(p.y-item.y)*Math.min(1,dt*11);}
   if(d<30)this.collectPickup(item,p.id);
  }
  s.pickups=s.pickups.filter(q=>!q.collected&&q.ttl>0);
  for(const c of s.chests)if(typeof c.vacuum==='number'){const owner=s.players[c.vacuum];if(owner&&!owner.down){c.x+=(owner.x-c.x)*Math.min(1,dt*10);c.y+=(owner.y-c.y)*Math.min(1,dt*10);}}
  for(const c of s.chests)if(living.some(p=>distance(p,c)<55)){c.open=true;this.effect(c.x,c.y,'','#ffdb9a','chest');for(const p of s.players)if(!p.down)this.evolve(p);s.xp+=35;}
  s.enemies=s.enemies.filter(e=>e.hp>0);s.shots=s.shots.filter(b=>b.ttl>0);s.projectiles=s.projectiles.filter(b=>b.ttl>0);
  s.gems=s.gems.filter(g=>g.v>0).slice(-300);s.chests=s.chests.filter(c=>!c.open);
  s.fx=s.fx.slice(-80);if(!s.over&&s.players.every(p=>p.down)){this.finish(false);return;}
  if(!s.over&&s.xp>=s.xpNeed)this.levelUp();
  if(s.time>=540)this.finish(false);
 }
}
