import {FAIRIES,WEAPONS,ARENAS,LOOT,weaponInfo} from './data.js';
import {images,drawAtlas,artIndex,fairyPortrait} from './visual-assets.js';
export const fairySVG=fairyPortrait;
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=n=>{const x=Math.sin(n*127.17)*43758.545;return x-Math.floor(x);};
function star(c,x,y,r,color,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle=color;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.4:r;i?c.lineTo(Math.cos(a)*d,Math.sin(a)*d):c.moveTo(Math.cos(a)*d,Math.sin(a)*d);}c.closePath();c.fill();c.restore();}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera={x:1100,y:1100};this.time=0;this.last=performance.now();this.first=true;this.motion=true;this.particles=[];this.seen=new Set();this.previous=new Map();this.shake=0;this.flash=0;this.view={w:640,h:900};this.frame=0;}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(2,globalThis.devicePixelRatio||1);if(this.canvas.width!==Math.round(r.width*d)||this.canvas.height!==Math.round(r.height*d)){this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);}this.w=r.width;this.h=r.height;this.dpr=d;this.zoom=this.w<600?.82:.95;this.view={w:this.w/this.zoom,h:this.h/this.zoom};}
 glow(x,y,r,color,alpha=.25){const c=this.ctx,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color+'00');c.save();c.globalAlpha=alpha;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
 burst(x,y,color,count=15,speed=75){
  if(!this.motion)return;for(let i=0;i<count;i++){const a=i*2.399+this.time,velocity=speed*(.35+rnd(i+x)*.75);this.particles.push({x,y,vx:Math.cos(a)*velocity,vy:Math.sin(a)*velocity-15,ttl:.45+rnd(i+y)*.55,max:1,size:1.2+rnd(i*13+x)*3,color,star:i%3===0});}
  if(this.particles.length>380)this.particles.splice(0,this.particles.length-380);
 }
 ingest(s){
  for(const fx of s.fx){if(this.seen.has(fx.id))continue;this.seen.add(fx.id);
   const big=['nova','ultimate','bond','boss','fusion','transform'].includes(fx.kind);
   if(big){this.burst(fx.x,fx.y,fx.color,35,180);this.shake=this.motion?Math.max(this.shake,fx.kind==='nova'?5:3):0;this.flash=this.motion?Math.max(this.flash,.11):0;}
   else if(['pickup','chest','level','revive','death'].includes(fx.kind))this.burst(fx.x,fx.y,fx.color,fx.kind==='death'?7:17,fx.kind==='pickup'?65:90);
   else if(fx.kind==='hit')this.burst(fx.x,fx.y,fx.color,3,35);
  }
  if(this.seen.size>1400)this.seen=new Set(s.fx.map(f=>f.id));
 }
 map(s,bounds,t){
  const c=this.ctx,a=ARENAS.find(a=>a.id===s.arena)||ARENAS[0];
  if(!drawAtlas(c,'worlds',a.index,0,0,2200,2200)){c.fillStyle='#223e37';c.fillRect(0,0,2200,2200);}
  c.fillStyle=s.arena==='courtyard'?'#2915340c':'#11142a18';c.fillRect(0,0,2200,2200);
  if(this.motion)for(let i=0;i<65;i++){
   const x=(rnd(i*3+14)*2400+t*(i%2?3:-2)+2400)%2400-100,y=(rnd(i*7+16)*2400-t*(3+i%4)+2400)%2400-100;
   if(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)continue;
   c.globalAlpha=.18+.3*(Math.sin(t*1.4+i)+1)/2;
   if(i%4===0)star(c,x,y,2.5,a.color,t*.3+i);else{c.fillStyle=i%2?a.color:'#fff2cb';c.beginPath();c.ellipse(x,y,1.2+i%3,1.3,Math.sin(t+i),0,TAU);c.fill();}
  }
  c.globalAlpha=1;
 }
 fairy(p,t,local){
  const c=this.ctx,f=FAIRIES.find(f=>f.id===p.fairy)||FAIRIES[0],index=FAIRIES.indexOf(f),old=this.previous.get(p.id)||{x:p.x,y:p.y,lean:0};
  const moving=Math.hypot(p.x-old.x,p.y-old.y)>.08,lean=this.motion?lerp(old.lean,Math.max(-.12,Math.min(.12,(p.x-old.x)*.028)),.14):0;
  this.previous.set(p.id,{x:p.x,y:p.y,lean});const bob=this.motion?Math.sin(t*3.8+p.id)*3:0;
  c.fillStyle='#1b102b38';c.beginPath();c.ellipse(p.x,p.y+22,24,7,0,0,TAU);c.fill();
  if(local){c.strokeStyle=f.color+'a0';c.lineWidth=1.5;c.beginPath();c.ellipse(p.x,p.y+21,26,8,0,0,TAU);c.stroke();}
  if(p.transform>0)this.glow(p.x,p.y-24,80,f.color,.18+p.transform*.035);
  if(p.shield>0||p.barrier>0){this.glow(p.x,p.y-23,58,'#a1e6ff',.14);c.save();c.strokeStyle='#c0edffbb';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y-21,36,54,0,0,TAU);c.stroke();c.globalAlpha=.6;for(let i=0;i<4;i++){const a=t*.8+i*TAU/4;star(c,p.x+Math.cos(a)*34,p.y-21+Math.sin(a)*50,3,'#e0fbff',a);}c.restore();}
  c.save();c.translate(p.x,p.y-4+bob);c.rotate(p.down?-.4:lean);
  if(p.down)c.globalAlpha=.38;
  const flap=this.motion?.82+Math.sin(t*8+p.id)*.18:.94,wingScale=1+(p.transform||0)*.13;
  for(const side of [-1,1]){
   c.save();c.translate(0,-28);c.scale(flap*wingScale,wingScale);c.beginPath();c.rect(side<0?-76:0,-65,76,130);c.clip();
   drawAtlas(c,'fairies',index+6,-65,-48,130,88);c.restore();
  }
  if(p.transform===2){c.save();c.globalAlpha=.45;c.translate(0,-23);c.scale(1.2,1.28);c.rotate(Math.sin(t)*.07);drawAtlas(c,'fairies',index+6,-67,-48,134,90);c.restore();}
  if(p.inv>0&&this.motion)c.globalAlpha*=.68+Math.sin(t*25)*.25;
  const stretch=p.cast>0&&this.motion?1+Math.sin(Math.min(1,p.cast)*Math.PI)*.035:1;
  c.scale(stretch,1/stretch);
  const done=drawAtlas(c,'fairies',index,-42,-72,84,112);
  if(!done){c.fillStyle=f.color;c.beginPath();c.ellipse(0,-12,13,26,0,0,TAU);c.fill();}
  if(p.hit>0){c.globalCompositeOperation='screen';c.globalAlpha=.3;drawAtlas(c,'fairies',index,-42,-72,84,112);}
  c.restore();
  if(p.transform){star(c,p.x,p.y-80+bob,p.transform===2?5:3.5,'#fff0b9',t*.4);}
  if(moving&&!p.down&&this.motion&&this.frame%4===0){this.particles.push({x:p.x+(rnd(this.frame)-.5)*18,y:p.y+12,vx:(rnd(this.frame+2)-.5)*8,vy:15,ttl:.5,max:.5,size:2.5,color:f.color,star:true});}
  if(p.down){c.strokeStyle='#ffc3e5';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y-20,43,-Math.PI/2,-Math.PI/2+TAU*p.revive/3);c.stroke();drawAtlas(c,'magic',39,p.x-13,p.y-37,26);}
  for(const w of p.weapons.filter(w=>['moon','galaxy'].includes(w.id))){for(let k=0;k<3;k++){const a=t*1.9+k*TAU/3,r=w.id==='galaxy'?110:90;c.save();c.translate(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);c.rotate(a+Math.PI/2);drawAtlas(c,'magic',artIndex('weapon',w.id,w.evolved),-14,-14,28);c.restore();}}
 }
 enemy(e,t){
  const c=this.ctx,index=e.art??(e.boss?(e.final?6:4):e.elite?3:Number(e.type)||0),size=e.boss?148:e.elite?88:63;
  const bob=this.motion?Math.sin(t*(e.boss?2:4)+e.id)*2.4:0,wobble=this.motion&&!e.boss?Math.sin(t*6+e.id)*.035:0;
  c.fillStyle='#140b2f33';c.beginPath();c.ellipse(e.x,e.y+e.r*.9,size*.28,6+e.r*.1,0,0,TAU);c.fill();
  if(e.boss){c.save();c.strokeStyle=e.final?'#ff82da88':'#d0a0ff66';c.lineWidth=2;c.setLineDash([6,7]);c.beginPath();c.ellipse(e.x,e.y+e.r*.7,size*.38,size*.12,0,0,TAU);c.stroke();c.restore();}
  c.save();c.translate(e.x,e.y+bob);c.rotate(wobble);c.globalAlpha=e.hit>0?.8:1;
  if(!drawAtlas(c,'enemies',index,-size/2,-size*.74,size,size)){c.fillStyle='#573461';c.beginPath();c.arc(0,0,e.r,0,TAU);c.fill();}
  if(e.hit>0){c.globalCompositeOperation='screen';c.globalAlpha=.45;drawAtlas(c,'enemies',index,-size/2,-size*.74,size,size);}
  c.restore();
  if(e.hp<e.maxHp&&!e.boss){const width=e.elite?40:24;c.fillStyle='#201132bb';c.fillRect(e.x-width/2,e.y-size*.7-5,width,3);c.fillStyle='#e8b1ff';c.fillRect(e.x-width/2,e.y-size*.7-5,width*Math.max(0,e.hp/e.maxHp),3);}
  if(e.frozen>0){c.save();c.globalAlpha=.75;drawAtlas(c,'magic',6,e.x-size*.28,e.y-size*.12,size*.56);c.restore();}
  if(e.burn>0){c.save();c.globalAlpha=.65+.15*Math.sin(t*13+e.id);drawAtlas(c,'magic',0,e.x-13,e.y-size*.6,26);c.restore();}
  if(e.root>0){c.strokeStyle='#94e0a4';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y+e.r*.5,e.r+7,6,Math.sin(t)*.1,0,TAU);c.stroke();}
  if(e.wet>0){c.strokeStyle='#a1f0ff88';c.lineWidth=1.5;c.beginPath();c.arc(e.x,e.y,e.r+3,.2,Math.PI*1.7);c.stroke();}
 }
 pickup(q,t){
  const c=this.ctx,def=LOOT[q.type];if(!def)return;const bob=this.motion?Math.sin(t*3+q.id)*4:0,scale=this.motion?1+Math.sin(t*2+q.id)*.035:1;
  c.fillStyle='#21102b3b';c.beginPath();c.ellipse(q.x,q.y+15,17,5,0,0,TAU);c.fill();
  this.glow(q.x,q.y,32,def.color,.13);c.save();c.translate(q.x,q.y-4+bob);c.scale(scale,scale);
  drawAtlas(c,'magic',def.icon,-21,-24,42);c.restore();
  if(this.motion&&q.type!=='coins'){const a=t*1.1+q.id;star(c,q.x+Math.cos(a)*23,q.y-8+Math.sin(a)*15,2.3,def.color,a);}
 }

 shot(b,t){
  const c=this.ctx,a=Math.atan2(b.vy,b.vx),scale=b.evolved?1.25:1,kind=b.weapon;
  c.save();c.globalCompositeOperation='lighter';
  const trail=['flame','phoenix','water','stars','galaxy'].includes(kind)?.11:.055;
  c.strokeStyle=b.color+'8c';c.lineWidth=(b.radius||7)*.8;c.lineCap='round';c.beginPath();c.moveTo(b.x-b.vx*trail,b.y-b.vy*trail);c.lineTo(b.x,b.y);c.stroke();
  c.strokeStyle='#fff4dfaa';c.lineWidth=2;c.beginPath();c.moveTo(b.x-b.vx*trail*.6,b.y-b.vy*trail*.6);c.lineTo(b.x,b.y);c.stroke();c.restore();
  c.save();c.translate(b.x,b.y);
  if(kind==='sun'){c.rotate(t*2);drawAtlas(c,'magic',artIndex('weapon',kind,b.evolved),-17*scale,-17*scale,34*scale);}
  else{c.rotate(['discs','orchestra'].includes(kind)?t*7:a+.25);const size=(['water','phoenix'].includes(kind)?43:kind==='ice'?34:30)*scale;drawAtlas(c,'magic',artIndex('weapon',kind,b.evolved),-size/2,-size/2,size);}
  c.restore();
 }
 fx(s,t,ground=false){
  const c=this.ctx;
  for(const f of s.fx){
   if(!f||f.ttl<=0)continue;const k=f.kind,color=f.color||'#e0b0ff';
   if(ground&&!['ring','spell','magnet','nova','ultimate','bond'].includes(k))continue;
   if(!ground&&['ring','spell','magnet','nova','ultimate','bond','hit','death'].includes(k))continue;
   c.save();c.globalAlpha=Math.min(1,f.ttl*2);
   if(k==='line'){
    const dx=f.x2-f.x,dy=f.y2-f.y;c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(f.x,f.y);
    for(let i=1;i<6;i++)c.lineTo(f.x+dx*i/6+Math.sin(i*13+f.id)*9,f.y+dy*i/6+Math.cos(i*7+f.id)*9);c.lineTo(f.x2,f.y2);c.stroke();c.strokeStyle='#fff7';c.lineWidth=1;c.stroke();
   }else if(['ring','spell'].includes(k)){
    const progress=1-Math.min(1,f.ttl/(k==='spell'?.55:.8)),r=Math.max(1,(f.r||100)*(.55+progress*.45));
    c.strokeStyle=color+'b0';c.lineWidth=2.5;c.beginPath();c.arc(f.x,f.y,r,0,TAU);c.stroke();c.globalAlpha*=.16;
    if(f.weapon)drawAtlas(c,'magic',artIndex('weapon',f.weapon,f.evolved),f.x-r,f.y-r,r*2);
    c.globalAlpha=Math.min(1,f.ttl*1.5);for(let i=0;i<8;i++){const a=i*TAU/8+t*.4;star(c,f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,3,color,a);}
   }else if(['nova','ultimate','bond'].includes(k)){
    const progress=1-Math.min(1,f.ttl/.9),r=Math.max(10,(f.r||330)*progress);
    this.glow(f.x,f.y,r,color,(1-progress)*.18);c.strokeStyle=color;c.lineWidth=5*(1-progress)+1;c.beginPath();c.arc(f.x,f.y,r,0,TAU);c.stroke();
    c.globalAlpha*=.45;c.lineWidth=1.5;c.beginPath();c.arc(f.x,f.y,r*.8,0,TAU);c.stroke();
    for(let i=0;i<12;i++){const a=i*TAU/12+t;star(c,f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,6*(1-progress)+2,'#ffe8b7',a);}
   }else if(k==='magnet'){
    const progress=1-Math.min(1,f.ttl/1.1),r=(f.r||400)*(1-progress);c.strokeStyle=color;c.lineWidth=2;
    for(let j=0;j<3;j++){c.beginPath();for(let i=0;i<30;i++){const a=i/29*TAU*1.2+t*3+j*TAU/3,rr=r*(1-i/40);i?c.lineTo(f.x+Math.cos(a)*rr,f.y+Math.sin(a)*rr):c.moveTo(f.x+Math.cos(a)*rr,f.y+Math.sin(a)*rr);}c.stroke();}
   }else if(k==='pickup'){
    const lift=(1.2-f.ttl)*24,size=30+Math.max(0,f.ttl-.8)*20;drawAtlas(c,'magic',LOOT[f.loot]?.icon??35,f.x-size/2,f.y-30-lift,size);
    if(f.text){c.fillStyle=color;c.font='bold 16px system-ui';c.textAlign='center';c.strokeStyle='#24152a';c.lineWidth=3;c.strokeText(f.text,f.x,f.y-40-lift);c.fillText(f.text,f.x,f.y-40-lift);}
   }else if(['fusion','transform','boss','chest','level','revive','burst'].includes(k)){
    const r=35+(1.1-f.ttl)*55;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(f.x,f.y,r,r*.5,0,0,TAU);c.stroke();
    if(k==='chest')drawAtlas(c,'enemies',7,f.x-25,f.y-60,50);
    else if(k==='revive')drawAtlas(c,'magic',39,f.x-22,f.y-65,44);
    if(f.text){c.font='600 16px Georgia';c.textAlign='center';c.fillStyle='#fff2dd';c.strokeStyle='#24132ddd';c.lineWidth=4;c.strokeText(f.text,f.x,f.y-60-(1.1-f.ttl)*18);c.fillText(f.text,f.x,f.y-60-(1.1-f.ttl)*18);}
   }else if(f.text){c.font='bold 11px system-ui';c.fillStyle=color;c.textAlign='center';c.strokeStyle='#25112a';c.lineWidth=2.5;c.strokeText(f.text,f.x,f.y-(1.1-f.ttl)*23);c.fillText(f.text,f.x,f.y-(1.1-f.ttl)*23);}
   c.restore();
  }
 }
 draw(s,local=0){
  this.resize();const c=this.ctx,w=this.w,h=this.h;if(!w||!h||!s?.players?.length)return;
  const now=performance.now(),dt=Math.min(.05,(now-this.last)/1000);this.last=now;this.time+=dt;this.frame++;const t=this.motion?this.time:0;
  const p=s.players[local]||s.players[0];if(this.first){this.camera.x=p.x;this.camera.y=p.y;this.first=false;}
  this.camera.x=lerp(this.camera.x,p.x,.16);this.camera.y=lerp(this.camera.y,p.y,.16);this.ingest(s);
  this.shake=Math.max(0,this.shake-dt*15);this.flash=Math.max(0,this.flash-dt*.6);
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#16142a';c.fillRect(0,0,w,h);
  const shake=this.motion?this.shake:0;c.save();c.translate(w/2+Math.sin(t*80)*shake,h/2+10+Math.cos(t*73)*shake*.7);c.scale(this.zoom,this.zoom);c.translate(-this.camera.x,-this.camera.y);
  const bounds={left:this.camera.x-this.view.w/2-180,right:this.camera.x+this.view.w/2+180,top:this.camera.y-this.view.h/2-180,bottom:this.camera.y+this.view.h/2+180};
  this.map(s,bounds,t);this.fx(s,t,true);
  for(const g of s.gems){
   const pulse=this.motion?1+Math.sin(t*3+g.id)*.1:1;c.save();c.translate(g.x,g.y);c.scale(pulse,pulse);
   c.fillStyle=g.v>=12?'#ffd7a0':'#c7b8ff';c.strokeStyle=g.v>=12?'#fff1b1':'#eeebff';c.lineWidth=.8;c.beginPath();c.moveTo(0,-6);c.lineTo(4,0);c.lineTo(0,6);c.lineTo(-4,0);c.closePath();c.fill();c.stroke();c.restore();
  }
  for(const q of s.pickups||[])if(q.x>bounds.left&&q.x<bounds.right&&q.y>bounds.top&&q.y<bounds.bottom)this.pickup(q,t);
  for(const chest of s.chests){this.glow(chest.x,chest.y,55,'#ffd78a',.2);const bob=this.motion?Math.sin(t*2)*2:0;drawAtlas(c,'enemies',7,chest.x-28,chest.y-35+bob,56);for(let i=0;i<3;i++){const a=t+i*TAU/3;star(c,chest.x+Math.cos(a)*32,chest.y-10+Math.sin(a)*20,2.5,'#ffe9ae',a);}}
  if(s.players.length===2&&!s.players.some(p=>p.down)&&Math.hypot(s.players[0].x-s.players[1].x,s.players[0].y-s.players[1].y)<220){
   const a=s.players[0],b=s.players[1],x=(a.x+b.x)/2,y=(a.y+b.y)/2-20;
   c.strokeStyle='#ffbbdfaa';c.lineWidth=1.6+s.bond/60;c.beginPath();c.moveTo(a.x,a.y-20);c.quadraticCurveTo(x,y+Math.sin(t*2)*20,b.x,b.y-20);c.stroke();drawAtlas(c,'magic',25,x-10,y-10,20);
  }
  const entities=[...s.enemies.filter(e=>e.x>bounds.left&&e.x<bounds.right&&e.y>bounds.top&&e.y<bounds.bottom).map(e=>({y:e.y,e})),...s.players.map(p=>({y:p.y,p}))].sort((a,b)=>a.y-b.y);
  for(const a of entities)if(a.e)this.enemy(a.e,t);else this.fairy(a.p,t,a.p.id===local);
  for(const b of s.shots)this.shot(b,t);
  for(const b of s.projectiles){c.save();c.translate(b.x,b.y);c.rotate(t*3+b.id);this.glow(0,0,15,'#df68ef',.23);star(c,0,0,8,'#ff9cde',0);star(c,0,0,4,'#fff1ff',0);c.restore();}
  for(const a of this.particles){if(this.motion){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=12*dt;a.ttl-=dt;}else a.ttl=0;if(a.ttl<=0)continue;
   c.save();c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,a.ttl*1.8);if(a.star)star(c,a.x,a.y,a.size,a.color,t);else{c.fillStyle=a.color;c.beginPath();c.arc(a.x,a.y,a.size,0,TAU);c.fill();}c.restore();
  }
  this.particles=this.particles.filter(p=>p.ttl>0);this.fx(s,t,false);c.restore();
  const shade=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.15,w/2,h/2,Math.max(w,h)*.72);shade.addColorStop(0,'#120c2400');shade.addColorStop(1,'#100c294a');c.fillStyle=shade;c.fillRect(0,0,w,h);
  if(this.flash>0&&this.motion){c.fillStyle='rgba(255,226,247,'+this.flash+')';c.fillRect(0,0,w,h);}
 }
}
