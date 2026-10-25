import {FAIRIES,WEAPONS,PASSIVES,FUSIONS,weaponInfo} from './data.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const caps={w:2200,h:2200};
export class Game {
 constructor({fairies=['bloom'],names=['Tu'],upgrades={},unlocks=[],runId='local',random=Math.random}={}){
  this.random=random;this.id=0;this.spawn=0;this.bosses=new Set();this.weaponClocks={};this.in={};
  this.s={version:1,runId,time:0,level:1,xp:0,xpNeed:20,kills:0,coins:0,bossKills:0,bond:0,bondBursts:0,over:false,won:false,pause:null,guestAck:0,unlocks:[...unlocks],players:[],enemies:[],shots:[],gems:[],chests:[],fx:[],projectiles:[]};
  this.upgrades=upgrades;
  fairies.forEach((id,i)=>{const f=FAIRIES.find(f=>f.id===id)||FAIRIES[0];const max=100+(upgrades.vigor||0)*8;
   this.s.players.push({id:i,name:String(names[i]||('Fada '+(i+1))).slice(0,24),fairy:f.id,x:1100+i*70,y:1100,hp:max,maxHp:max,down:false,revive:0,shield:0,inv:0,ultimate:0,weapons:[{id:f.weapon,level:1,evolved:false}],passives:{},evolvedEver:[],fusionEver:[],transform:0,stats:{gems:0,healed:0,sonicKills:0,droneKills:0,waterHits:0,boss:0},rerolls:2});
  });
 }
 save(){return JSON.parse(JSON.stringify({state:this.s,id:this.id,spawn:this.spawn,bosses:[...this.bosses],clocks:this.weaponClocks,upgrades:this.upgrades}));}
 static restore(raw){
  if(!raw?.state||raw.state.version!==1||raw.state.players?.length!==1||raw.state.over||!Array.isArray(raw.state.enemies)||raw.state.enemies.length>200)throw new Error('Partida guardada inválida.');
  const g=new Game({fairies:raw.state.players.map(p=>p.fairy),runId:raw.state.runId,upgrades:raw.upgrades||{}});
  g.s=raw.state;g.id=Number(raw.id)||0;g.spawn=Number(raw.spawn)||0;g.bosses=new Set(raw.bosses||[]);g.weaponClocks=raw.clocks||{};if(g.s.pause?.kind==='menu')g.s.pause=null;return g;
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
  pause.picked[i]=true;this.checkTransform(p);
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
 heal(p,n){const amount=Math.min(n,p.maxHp-p.hp);p.hp+=amount;p.stats.healed+=amount;}
 stats(p){
  const a=p.passives,u=this.upgrades;return{power:(1+.08*(a.heart||0)+.06*(u.power||0))*(1+p.transform*.2),
   haste:1+.06*(a.core||0)+.03*(u.haste||0),area:1+.06*(a.fork||0),speed:165*(1+.05*(a.pearl||0)),
   regen:.12*(u.recovery||0)+.25*(a.seed||0),magnet:125+22*(a.magnet||0)+12*(u.reach||0),
   crit:.05+.05*(a.prism||0),resist:.04*(a.moonstone||0),duration:1+.1*(a.hourglass||0)};
 }
 checkTransform(p){
  const s=this.s,f=FAIRIES.find(x=>x.id===p.fairy),st=p.stats;
  const valid=p.evolvedEver.includes(f.weapon)&&({bloom:st.boss>=1,stella:st.gems>=100,flora:st.healed>=200,musa:st.sonicKills>=50,tecna:st.droneKills>=100,aisha:st.waterHits>=50}[p.fairy]);
  const key='enchantix:'+p.fairy;if(valid&&!s.unlocks.includes(key)){s.unlocks.push(key);this.effect(p.x,p.y-35,'ENCHANTIX',f.color,'burst');}
  p.transform=s.level>=20&&s.unlocks.includes('believix:'+p.fairy)?2:s.level>=10&&s.unlocks.includes(key)?1:0;
 }
 evolve(p){
  const s=this.s;
  const fusion=FUSIONS.find(f=>p.weapons.some(w=>w.id===f.a&&w.evolved)&&p.weapons.some(w=>w.id===f.b&&w.evolved));
  if(fusion){p.weapons=p.weapons.filter(w=>w.id!==fusion.a&&w.id!==fusion.b);p.weapons.push({id:fusion.id,level:1,evolved:true});p.fusionEver.push(fusion.id);const key='fusion:'+fusion.id;if(!s.unlocks.includes(key))s.unlocks.push(key);this.effect(p.x,p.y-35,fusion.name.toUpperCase(),fusion.color,'burst');return fusion.id;}
  const w=p.weapons.find(w=>!w.evolved&&w.level===8&&(p.passives[WEAPONS[w.id]?.passive]||0)>=5);
  if(w){w.evolved=true;p.evolvedEver.push(w.id);this.effect(p.x,p.y-35,WEAPONS[w.id].evolution,WEAPONS[w.id].color,'burst');this.checkTransform(p);return w.id;}
  this.heal(p,20);s.coins+=20;return null;
 }
 nearest(p,range=800){let nearest=null,d=range;for(const e of this.s.enemies){const dd=distance(e,p);if(e.hp>0&&dd<d){d=dd;nearest=e;}}return nearest;}
 hurt(e,amount,p,weapon,tag=true){
  if(e.hp<=0)return;const st=this.stats(p),crit=this.random()<st.crit,damage=amount*(crit?1.7:1)*(e.sonic>0?1.18:1);
  e.hp-=damage;this.effect(e.x,e.y-15,Math.round(damage).toString(),crit?'#ffe6a3':'#e9dfff');
  if(e.hp>0||!tag)return;
  const s=this.s;s.kills++;s.xp+=1;p.ultimate=Math.min(100,p.ultimate+2.5);
  if(e.sonic>0)p.stats.sonicKills++;if(['discs','orchestra'].includes(weapon))p.stats.droneKills++;
  s.gems.push({id:this.next(),x:e.x,y:e.y,v:e.boss?60:e.elite?12:3});
  if(e.boss){s.bossKills++;for(const ally of s.players)ally.stats.boss++;s.chests.push({id:this.next(),x:e.x,y:e.y});this.effect(e.x,e.y,'BOSS DERROTADO','#ffdfa2','burst');if(e.final)this.finish(true);}
  if(e.frozen>0){for(const n of s.enemies)if(n!==e&&n.hp>0&&distance(e,n)<85){this.hurt(n,18*st.power,p,weapon);}}
  if(e.burn>0&&s.players.some(a=>a.transform>0&&a.fairy==='bloom'))for(const n of s.enemies)if(n.hp>0&&distance(e,n)<100){n.burn=Math.max(n.burn,2);n.burnOwner=p.id;}
 }
 attack(p,w,dt){
  const key=p.id+':'+w.id;this.weaponClocks[key]=(this.weaponClocks[key]||0)-dt;if(this.weaponClocks[key]>0)return;
  const target=this.nearest(p);if(!target)return;
  const def=weaponInfo(w.id),st=this.stats(p),fusion=!WEAPONS[w.id];
  const bonus=(1+(w.level-1)*.21)*(w.evolved&&!fusion?2.1:1);
  this.weaponClocks[key]=def.rate/st.haste*(p.fairy==='musa'&&p.transform>0&&this.random()<.2?.25:1);
  const angle=Math.atan2(target.y-p.y,target.x-p.x),count=['sun','discs','orchestra'].includes(w.id)?1+Math.floor(w.level/3)+(w.evolved?2:0):1+(w.level>=6?1:0);
  if(['lightning','polar'].includes(w.id)){
   let previous=p;const hit=new Set();for(let n=0;n<2+(p.passives.conductor||0)+(w.evolved?2:0);n++){
    let next=null,best=360;for(const e of this.s.enemies)if(e.hp>0&&!hit.has(e.id)){const d=distance(previous,e);if(d<best){best=d;next=e;}}
    if(!next)break;hit.add(next.id);const wet=next.wet>0;this.s.fx.push({id:this.next(),kind:'line',x:previous.x,y:previous.y,x2:next.x,y2:next.y,color:def.color,ttl:.2});
    this.hurt(next,def.damage*bonus*st.power*(wet?1.6:1),p,w.id);if(w.id==='polar')next.frozen=1.5*st.duration;previous=next;
   }return;
  }
  if(['vines','sound','eden'].includes(w.id)){
   const r=(w.id==='sound'?180:150)*st.area*(w.evolved?1.35:1);
   this.s.fx.push({id:this.next(),kind:'ring',x:p.x,y:p.y,r,color:def.color,ttl:.45});
   for(const e of this.s.enemies)if(e.hp>0&&distance(e,p)<r){if(w.id==='sound')e.sonic=3*st.duration;else e.root=1.5*st.duration;
    if(w.id==='sound'&&e.burn>0)e.burn=Math.max(e.burn,3);
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
  for(let n=0;n<count;n++){
   const a=angle+(n-(count-1)/2)*.19;
   this.s.shots.push({id:this.next(),x:p.x,y:p.y,vx:Math.cos(a)*def.speed,vy:Math.sin(a)*def.speed,ttl:2.1,
    owner:p.id,weapon:w.id,damage:def.damage*bonus*st.power,evolved:w.evolved,color:def.color,
    radius:(['water','phoenix'].includes(w.id)?15:7)*st.area,pierce:w.evolved?6:1,hit:[]});
  }
 }
 spawnEnemy(boss=false,final=false){
  const s=this.s,alive=s.players.filter(p=>!p.down);if(!alive.length)return;
  const target=alive[Math.floor(this.random()*alive.length)],a=this.rand(0,Math.PI*2),d=boss?490:570;
  const tier=Math.floor(s.time/70),elite=!boss&&this.random()<.08;const health=(boss?400+s.time*3:elite?55:22)*(1+tier*.28)*(s.players.length===2?1.45:1);
  s.enemies.push({id:this.next(),x:clamp(target.x+Math.cos(a)*d,35,caps.w-35),y:clamp(target.y+Math.sin(a)*d,35,caps.h-35),
   hp:health,maxHp:health,boss,final,elite,r:boss?35:elite?19:13,speed:boss?48:45+tier*5+(elite?12:0),type:boss?'boss':Math.floor(this.rand(0,3)),
   burn:0,frozen:0,root:0,wet:0,sonic:0,shotClock:boss?3:8,inv:0});
 }
 ultimate(i){
  const p=this.s.players[i];if(!p||p.down||p.ultimate<100||this.s.pause||this.s.over)return false;p.ultimate=0;
  const st=this.stats(p),f=FAIRIES.find(f=>f.id===p.fairy);this.effect(p.x,p.y,f.name+' · MAGIA MÁXIMA',f.color,'burst');
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
   p.inv=Math.max(0,p.inv-dt);p.shield=Math.max(0,p.shield-dt);this.heal(p,st.regen*dt);
   for(const w of p.weapons)this.attack(p,w,dt);
   this.checkTransform(p);
  }
  const living=s.players.filter(p=>!p.down);
  for(const p of s.players.filter(p=>p.down)){
   const near=living.some(a=>distance(a,p)<105);p.revive=near?p.revive+dt:Math.max(0,p.revive-dt);
   if(p.revive>=3){p.down=false;p.hp=p.maxHp*.45;p.inv=3;p.revive=0;this.effect(p.x,p.y,'JUNTOS OUTRA VEZ','#9fe2b3');}
  }
  if(!living.length){this.finish(false);return;}
  if(s.players.length===2&&living.length===2&&distance(living[0],living[1])<220){
   s.bond=Math.min(100,s.bond+dt*6);
   if(s.bond>=100){s.bond=0;s.bondBursts++;const center={x:(living[0].x+living[1].x)/2,y:(living[0].y+living[1].y)/2};
    this.effect(center.x,center.y,'LIGAÇÃO DE FADAS','#ffc6e7','burst');
    s.fx.push({id:this.next(),kind:'ring',...center,r:340,color:'#ffc6e7',ttl:.7});
    for(const e of s.enemies)if(e.hp>0&&distance(e,center)<340)this.hurt(e,100*this.stats(living[0]).power,living[0],'bond');
    for(const p of living){this.heal(p,15);p.shield=2;}
   }
  }
  this.spawn-=dt;if(this.spawn<=0&&s.enemies.length<105){this.spawn=Math.max(.19,.85-s.time/700);this.spawnEnemy();if(s.time>120)this.spawnEnemy();}
  for(const minute of [60,150,240,330,420,450])if(s.time>=minute&&!this.bosses.has(minute)){this.bosses.add(minute);this.spawnEnemy(true,minute===450);}
  for(const e of s.enemies){
   if(e.hp<=0)continue;for(const k of ['frozen','root','wet','sonic','inv'])e[k]=Math.max(0,e[k]-dt);
   if(e.burn>0){e.burn=Math.max(0,e.burn-dt);const owner=s.players[e.burnOwner]||s.players[0];this.hurt(e,9*dt*this.stats(owner).power,owner,'flame');if(e.hp<=0)continue;}
   let target=living[0];for(const p of living)if(distance(e,p)<distance(e,target))target=p;
   const d=distance(e,target)||1,slow=e.frozen>0?0:e.root>0?.1:1;
   e.x+=(target.x-e.x)/d*e.speed*slow*dt;e.y+=(target.y-e.y)/d*e.speed*slow*dt;
   if(d<e.r+15&&target.inv<=0&&target.shield<=0){target.hp-= (e.boss?18:9)*(1-this.stats(target).resist);target.inv=.7;this.effect(target.x,target.y-25,'−'+(e.boss?18:9),'#ff94a7');if(target.hp<=0){target.hp=0;target.down=true;}}
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
    this.hurt(e,b.damage,p,b.weapon);b.pierce--;if(b.pierce<=0){b.ttl=0;break;}
   }
  }
  for(const b of s.projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.ttl-=dt;
   for(const p of living)if(p.inv<=0&&p.shield<=0&&distance(p,b)<20){p.hp-=8;p.inv=.6;b.ttl=0;if(p.hp<=0){p.hp=0;p.down=true;}}
  }
  for(const gem of s.gems){let p=living[0];for(const a of living)if(distance(a,gem)<distance(p,gem))p=a;
   const d=distance(gem,p);if(d<this.stats(p).magnet){gem.x+=(p.x-gem.x)*Math.min(1,dt*9);gem.y+=(p.y-gem.y)*Math.min(1,dt*9);}
   if(d<22){s.xp+=gem.v;p.stats.gems++;gem.v=0;}
  }
  for(const c of s.chests)if(living.some(p=>distance(p,c)<55)){c.open=true;for(const p of s.players)if(!p.down)this.evolve(p);s.xp+=35;}
  s.enemies=s.enemies.filter(e=>e.hp>0);s.shots=s.shots.filter(b=>b.ttl>0);s.projectiles=s.projectiles.filter(b=>b.ttl>0);
  s.gems=s.gems.filter(g=>g.v>0).slice(-300);s.chests=s.chests.filter(c=>!c.open);
  if(!s.over&&s.xp>=s.xpNeed)this.levelUp();
  if(s.time>=540)this.finish(false);
 }
}
