import {FAIRIES,WEAPONS,weaponInfo} from './data.js';
export function fairySVG(id,small=false){
 const f=FAIRIES.find(f=>f.id===id)||FAIRIES[0],c=f.color,h=f.hair,skin=f.skin;
 const hair=id==='musa'?'<ellipse cx="73" cy="104" rx="17" ry="43"/><ellipse cx="127" cy="104" rx="17" ry="43"/>':id==='tecna'?'<path d="M69 82Q67 40 104 43Q139 44 133 91L119 74L83 79Z"/>':'<path d="M70 73Q55 105 65 160L83 148L100 162L120 146L138 154Q145 105 130 70Z"/>';
 return '<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="g'+id+'"><stop stop-color="'+c+'" stop-opacity=".28"/><stop offset="1" stop-color="'+c+'" stop-opacity="0"/></radialGradient><linearGradient id="w'+id+'" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="'+c+'" stop-opacity=".18"/></linearGradient></defs><circle cx="100" cy="120" r="98" fill="url(#g'+id+')"/><g fill="url(#w'+id+')" stroke="'+c+'" stroke-width="1"><path d="M93 115C30 17 0 54 37 113Q59 145 93 132Z"/><path d="M107 115C170 17 200 54 163 113Q141 145 107 132Z"/><path d="M90 123C20 122 33 194 68 173Q89 161 95 136Z"/><path d="M110 123C180 122 167 194 132 173Q111 161 105 136Z"/></g><g fill="none" stroke="'+c+'" opacity=".5"><path d="M90 124L28 61M93 128L47 160M110 124L172 61M107 128L153 160"/><circle cx="100" cy="117" r="88" stroke-dasharray="2 9"/></g><g fill="'+h+'">'+hair+'</g><path d="M91 158L86 211L93 213L104 167L109 211L117 211L111 155" fill="'+skin+'"/><path d="M86 202L82 219L95 219L96 205M108 202L107 219L121 219L118 204" fill="'+c+'"/><path d="M86 107L65 138L49 128L45 133L66 150L92 125M114 107L135 138L151 128L155 133L134 150L108 125" fill="'+skin+'"/><path d="M88 104L112 104L117 133L125 164Q102 176 77 163L84 133Z" fill="'+c+'"/><path d="M84 139Q100 148 117 139" fill="none" stroke="#fff" opacity=".7"/><path d="M96 91L95 108Q101 114 106 106L105 91" fill="'+skin+'"/><ellipse cx="100" cy="76" rx="25" ry="29" fill="'+skin+'"/><path d="M74 76Q65 46 101 43Q137 44 128 79L116 64L89 70L83 80L81 64Z" fill="'+h+'"/><g fill="#30243c"><ellipse cx="91" cy="79" rx="2.5" ry="3.7"/><ellipse cx="110" cy="79" rx="2.5" ry="3.7"/></g><path d="M96 92Q101 96 106 91" fill="none" stroke="#b15f71" stroke-width="1.7"/><circle cx="100" cy="55" r="3" fill="'+c+'"/><g fill="#fff2d3"><path d="M34 30L37 39L46 42L37 45L34 54L31 45L22 42L31 39ZM165 165L167 171L173 173L167 175L165 181L163 175L157 173L163 171Z"/><circle cx="158" cy="37" r="2"/><circle cx="30" cy="178" r="2"/></g></svg>';
}
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera={x:1100,y:1100};this.last=0;}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(2,globalThis.devicePixelRatio||1);if(this.canvas.width!==Math.round(r.width*d)||this.canvas.height!==Math.round(r.height*d)){this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);}this.w=r.width;this.h=r.height;this.dpr=d;}
 fairy(p,t){
  const c=this.ctx,f=FAIRIES.find(f=>f.id===p.fairy)||FAIRIES[0],bob=Math.sin(t*4+p.id)*2;
  c.save();c.translate(p.x,p.y+bob);if(p.down){c.globalAlpha=.5;}
  if(p.shield>0){c.strokeStyle='#bde8ff';c.lineWidth=2;c.beginPath();c.arc(0,0,28,0,Math.PI*2);c.stroke();}
  c.fillStyle='#0004';c.beginPath();c.ellipse(0,21-bob,15,5,0,0,Math.PI*2);c.fill();
  c.globalAlpha=p.down?.4:.8;c.fillStyle=f.color;c.strokeStyle='#ffffffb0';c.lineWidth=.7;
  const flap=1+Math.sin(t*9)*.15;
  for(const side of [-1,1]){c.save();c.scale(side*flap,1);c.beginPath();c.ellipse(16,-9,11+(p.transform?4:0),19,-.7,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.ellipse(13,8,9,12,.6,0,Math.PI*2);c.fill();c.stroke();c.restore();}
  c.globalAlpha=p.down?.5:p.inv>0&&Math.floor(t*12)%2?.5:1;c.fillStyle=f.hair;c.beginPath();c.ellipse(0,-10,10,15,0,0,Math.PI*2);c.fill();
  c.fillStyle=f.skin;c.fillRect(-4,8,3,12);c.fillRect(2,8,3,12);c.fillStyle=f.color;c.beginPath();c.moveTo(-5,-5);c.lineTo(5,-5);c.lineTo(8,12);c.lineTo(-8,12);c.closePath();c.fill();
  c.fillStyle=f.skin;c.beginPath();c.arc(0,-13,7.7,0,Math.PI*2);c.fill();
  c.fillStyle=f.hair;c.beginPath();c.arc(0,-16,8,Math.PI,Math.PI*2);c.fill();c.fillRect(-8,-16,3,8);
  c.fillStyle='#30243c';c.fillRect(-4,-14,1.5,2);c.fillRect(3,-14,1.5,2);
  if(p.transform){c.fillStyle='#ffe6a3';c.beginPath();c.arc(0,-26,2.5,0,Math.PI*2);c.fill();}
  if(p.down){c.strokeStyle='#ffceda';c.lineWidth=3;c.beginPath();c.arc(0,0,30,-Math.PI/2,-Math.PI/2+Math.PI*2*p.revive/3);c.stroke();}
  for(const w of p.weapons.filter(w=>w.id==='moon'||w.id==='galaxy')){const color=weaponInfo(w.id).color;c.strokeStyle=color;c.lineWidth=w.evolved?4:2;for(let k=0;k<3;k++){const a=t*2+k*Math.PI*2/3;c.beginPath();c.arc(Math.cos(a)*75,Math.sin(a)*75,7,0,Math.PI*1.5);c.stroke();}}
  c.restore();
 }
 draw(s,local=0,theme='magix'){
  this.resize();const c=this.ctx,w=this.w,h=this.h,d=this.dpr;if(!w||!h)return;
  const p=s.players[local]||s.players[0],t=s.time;
  this.camera.x+=(p.x-this.camera.x)*.15;this.camera.y+=(p.y-this.camera.y)*.15;
  c.setTransform(d,0,0,d,0,0);c.fillStyle=theme==='lunar'?'#1d2437':'#152e2b';c.fillRect(0,0,w,h);
  const zoom=w<500?.94:1.05;c.save();c.translate(w/2,h/2+10);c.scale(zoom,zoom);c.translate(-this.camera.x,-this.camera.y);
  const left=this.camera.x-w/zoom/2-100,right=this.camera.x+w/zoom/2+100,top=this.camera.y-h/zoom/2-100,bottom=this.camera.y+h/zoom/2+100;
  for(let x=Math.floor(left/100);x<=Math.ceil(right/100);x++)for(let y=Math.floor(top/100);y<=Math.ceil(bottom/100);y++){
   const n=hash(x,y),px=x*100+n*65,py=y*100+hash(y,x)*65;
   c.fillStyle=theme==='lunar'?(n>.5?'#283049':'#242c42'):(n>.5?'#1c3b31':'#19372f');c.beginPath();c.ellipse(px,py,34+n*25,17+n*17,n*3,0,Math.PI*2);c.fill();
   if(n>.68){c.strokeStyle=theme==='lunar'?'#7b719b':'#54735a';c.lineWidth=1;c.beginPath();c.moveTo(px,py);c.lineTo(px-3,py-9);c.moveTo(px,py);c.lineTo(px+5,py-6);c.stroke();}
   if(n>.9){c.fillStyle='#f2bfdd';c.beginPath();c.arc(px,py-9,2,0,Math.PI*2);c.fill();}
   if(n<.1){c.fillStyle='#263d36';c.beginPath();c.ellipse(px,py,16,10,.3,0,Math.PI*2);c.fill();c.strokeStyle='#496559';c.stroke();}
  }
  c.strokeStyle='#d5d4a51a';c.lineWidth=16;c.beginPath();c.arc(1100,1100,175,0,Math.PI*2);c.stroke();c.lineWidth=2;c.strokeStyle='#b8c9a52a';c.beginPath();c.arc(1100,1100,155,0,Math.PI*2);c.stroke();
  c.strokeStyle='#adb98155';c.lineWidth=4;c.strokeRect(10,10,2180,2180);
  for(const g of s.gems){c.fillStyle=g.v>=12?'#ffd9a1':'#9cdaef';c.beginPath();c.moveTo(g.x,g.y-6);c.lineTo(g.x+4,g.y);c.lineTo(g.x,g.y+6);c.lineTo(g.x-4,g.y);c.closePath();c.fill();}
  for(const chest of s.chests){c.shadowColor='#ffdc83';c.shadowBlur=14;c.fillStyle='#d4a75a';c.fillRect(chest.x-11,chest.y-8,22,17);c.shadowBlur=0;c.strokeStyle='#ffe3a3';c.lineWidth=2;c.strokeRect(chest.x-11,chest.y-8,22,17);c.fillStyle='#563646';c.fillRect(chest.x-2,chest.y-1,4,6);}
  if(s.players.length===2&&!s.players.some(p=>p.down)&&Math.hypot(s.players[0].x-s.players[1].x,s.players[0].y-s.players[1].y)<220){c.strokeStyle='#ffc6e750';c.lineWidth=2;c.setLineDash([5,7]);c.beginPath();c.moveTo(s.players[0].x,s.players[0].y);c.lineTo(s.players[1].x,s.players[1].y);c.stroke();c.setLineDash([]);}
  for(const e of s.enemies){if(e.x<left||e.x>right||e.y<top||e.y>bottom)continue;
   c.save();c.translate(e.x,e.y);c.fillStyle='#0004';c.beginPath();c.ellipse(0,e.r*.8,e.r*.9,5,0,0,Math.PI*2);c.fill();
   c.fillStyle=e.frozen>0?'#9fd5e5':e.burn>0?'#ba654f':e.boss?'#64465f':e.elite?'#766075':['#6f7597','#777862','#6a7b75'][e.type];
   if(e.boss){c.beginPath();c.moveTo(0,-40);c.lineTo(34,29);c.lineTo(-34,29);c.closePath();c.fill();c.fillStyle='#b990bd';c.beginPath();c.arc(0,-10,14,0,Math.PI*2);c.fill();c.fillStyle='#372c4c';c.beginPath();c.moveTo(0,-43);c.lineTo(25,-10);c.lineTo(-24,-10);c.fill();}
   else{c.beginPath();c.moveTo(-e.r,e.r*.6);c.quadraticCurveTo(-e.r*1.1,-e.r*1.5,0,-e.r);c.quadraticCurveTo(e.r*1.3,-e.r,e.r,e.r*.6);c.lineTo(e.r*.4,e.r*.4);c.lineTo(0,e.r*.8);c.lineTo(-e.r*.5,e.r*.4);c.closePath();c.fill();}
   c.fillStyle='#e6d9ed';c.fillRect(-6,-3,3,4);c.fillRect(3,-3,3,4);
   if(e.hp<e.maxHp){c.fillStyle='#111a';c.fillRect(-e.r,-e.r-12,e.r*2,3);c.fillStyle=e.boss?'#e8a0c3':'#c3b2da';c.fillRect(-e.r,-e.r-12,e.r*2*e.hp/e.maxHp,3);}
   if(e.root>0){c.strokeStyle='#a6d8a2';c.lineWidth=2;c.beginPath();c.ellipse(0,9,e.r+4,6,0,0,Math.PI*2);c.stroke();}
   c.restore();
  }
  for(const b of s.shots){c.fillStyle=b.color;c.shadowColor=b.color;c.shadowBlur=b.evolved?12:5;c.beginPath();c.arc(b.x,b.y,b.radius,0,Math.PI*2);c.fill();c.shadowBlur=0;c.fillStyle='#fff8';c.beginPath();c.arc(b.x-2,b.y-2,b.radius*.35,0,Math.PI*2);c.fill();}
  for(const b of s.projectiles){c.fillStyle='#e5a0ce';c.beginPath();c.arc(b.x,b.y,6,0,Math.PI*2);c.fill();}
  for(const player of s.players)this.fairy(player,t);
  for(const fx of s.fx){c.save();c.globalAlpha=Math.min(1,fx.ttl*2);c.fillStyle=fx.color;c.strokeStyle=fx.color;
   if(fx.kind==='ring'){c.lineWidth=3;c.beginPath();c.arc(fx.x,fx.y,fx.r*(1-fx.ttl*.7),0,Math.PI*2);c.stroke();}
   else if(fx.kind==='line'){c.lineWidth=3;c.beginPath();c.moveTo(fx.x,fx.y);c.lineTo(fx.x2,fx.y2);c.stroke();}
   else{c.font=(fx.kind==='burst'?'bold 16px':'bold 11px')+' sans-serif';c.textAlign='center';c.fillText(fx.text,fx.x,fx.y-(1.1-fx.ttl)*20);}
   c.restore();
  }
  c.restore();const gradient=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.15,w/2,h/2,Math.max(w,h)*.7);gradient.addColorStop(0,'#060c1200');gradient.addColorStop(1,'#03081688');c.fillStyle=gradient;c.fillRect(0,0,w,h);
 }
}
