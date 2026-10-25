import {UPGRADES} from './data.js';
export const uid=()=>globalThis.crypto?.randomUUID?.()||'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export function freshTeam(name='A nossa equipa',device=''){return{version:1,id:uid(),name:String(name).trim().slice(0,40)||'A nossa equipa',creator:device,events:[]};}
function cleanEvent(e){
 if(!e||typeof e!=='object'||typeof e.id!=='string'||e.id.length>100)return null;
 const base={id:e.id,type:e.type,order:Math.max(0,Math.min(1e12,Math.floor(Number(e.order)||0))),device:String(e.device||'').slice(0,100)};
 if(e.type==='run')return{...base,duration:Math.max(0,Math.min(540,Math.floor(Number(e.duration)||0))),kills:Math.max(0,Math.min(10000,Math.floor(Number(e.kills)||0))),coins:Math.max(0,Math.min(15000,Math.floor(Number(e.coins)||0))),won:!!e.won,coop:!!e.coop,unlocks:Array.isArray(e.unlocks)?[...new Set(e.unlocks.filter(x=>typeof x==='string'&&/^(enchantix|believix|fusion):[a-z]+$/.test(x)))].sort().slice(0,30):[]};
 if(e.type==='buy'&&UPGRADES.some(u=>u.id===e.upgrade))return{...base,upgrade:e.upgrade};
 if(e.type==='cancel'&&typeof e.target==='string')return{...base,target:e.target.slice(0,100)};
 return null;
}
export function validateTeam(raw){
 if(!raw||raw.version!==1||typeof raw.id!=='string'||raw.id.length>100||!Array.isArray(raw.events)||raw.events.length>15000)throw new Error('Esta cópia de segurança não é uma equipa Magix Duet válida.');
 return{version:1,id:raw.id,name:String(raw.name||'A nossa equipa').slice(0,40),creator:String(raw.creator||'').slice(0,100),events:raw.events.map(cleanEvent).filter(Boolean)};
}
function compareEvents(a,b){const av=[a.type==='run'?a.duration:0,a.order||0,String(a.device||''),a.coins||0,JSON.stringify(a)],bv=[b.type==='run'?b.duration:0,b.order||0,String(b.device||''),b.coins||0,JSON.stringify(b)];for(let i=0;i<av.length;i++){if(av[i]>bv[i])return 1;if(av[i]<bv[i])return -1;}return 0;}
export function mergeTeam(a,b){
 a=validateTeam(a);b=validateTeam(b);if(a.id!==b.id)throw new Error('Estas equipas são diferentes.');
 const map=new Map();for(const e of [...a.events,...b.events]){
  const old=map.get(e.id);
  if(!old||compareEvents(e,old)>0)map.set(e.id,e);
 }
 return{...a,name:[a.name,b.name].sort()[0],creator:[a.creator,b.creator].sort()[0],events:[...map.values()].sort((x,y)=>x.id.localeCompare(y.id))};
}
export function derive(team){
 const events=validateTeam(team).events,runs=events.filter(e=>e.type==='run'),canceled=new Set(events.filter(e=>e.type==='cancel').map(e=>e.target));
 const p={coins:0,kills:0,runs:runs.length,wins:0,coop_wins:0,unlocks:[],upgrades:{},pending:[],accepted:[]};
 for(const r of runs){p.coins+=r.coins;p.kills+=r.kills;if(r.won)p.wins++;if(r.won&&r.coop)p.coop_wins++;p.unlocks.push(...r.unlocks);}
 p.unlocks=[...new Set(p.unlocks)].sort();
 const purchases=events.filter(e=>e.type==='buy'&&!canceled.has(e.id)).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 for(const e of purchases){const level=p.upgrades[e.upgrade]||0,cost=100*(level+1);
  if(level>=10)continue;
  if(p.coins>=cost){p.coins-=cost;p.upgrades[e.upgrade]=level+1;p.accepted.push(e.id);}else p.pending.push(e.id);
 }
 return p;
}
export function addEvent(team,event,device=''){
 const order=Math.max(0,...team.events.map(e=>e.order||0))+1;
 return mergeTeam(team,{...team,events:[{id:uid(),order,device,...event}]});
}
export function finishRun(team,result,device=''){
 if(result.duration<5)return team;
 const stats=derive(team),fortune=result.fortune??(stats.upgrades.fortune||0);
 const coins=Math.floor((result.kills*.6+result.duration/8+(result.won?200:0)+(result.coop?25:0)+(result.bonus||0))*(1+.05*fortune));
 return addEvent(team,{id:result.run_id,type:'run',duration:result.duration,kills:result.kills,won:result.won,coop:result.coop,coins,unlocks:result.unlocks||[]},device);
}
export function buy(team,id,device=''){
 const p=derive(team),u=UPGRADES.find(u=>u.id===id),level=p.upgrades[id]||0;
 if(!u||level>=u.max)throw new Error('Esta melhoria já está no nível máximo.');
 if(p.coins<100*(level+1))throw new Error('Ainda não há moedas suficientes.');
 return addEvent(team,{type:'buy',upgrade:id},device);
}
export function cancelPending(team,id,device=''){const p=derive(team);if(!p.pending.includes(id))return team;return addEvent(team,{type:'cancel',target:id},device);}
