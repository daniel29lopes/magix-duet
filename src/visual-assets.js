import {FAIRIES,WEAPONS,PASSIVES,FUSIONS,LOOT,ARENAS} from './data.js';
const paths={fairies:'art/fairies.png',worlds:'art/worlds.png',magic:'art/magic.png',enemies:'art/enemies.png'};
export const images={};
let loading=null;
export function preloadArt(){
 if(loading)return loading;
 if(typeof Image==='undefined')return Promise.resolve(false);
 loading=Promise.all(Object.entries(paths).map(([id,path])=>new Promise(resolve=>{const img=new Image();images[id]=img;img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=path;}))).then(x=>x.every(Boolean));return loading;
}
export const artReady=()=>Object.keys(paths).every(id=>images[id]?.complete&&images[id]?.naturalWidth>0);
if(typeof Image!=='undefined')preloadArt();
export const escArt=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function artIndex(kind,id,evolved=false){
 if(kind==='loot')return LOOT[id]?.icon??35;
 if(kind==='passive')return 25+Math.max(0,Object.keys(PASSIVES).indexOf(id));
 if(kind==='upgrade'){const ids={power:10,vigor:25,haste:29,recovery:27,fortune:36,reach:34};return ids[id]??26;}
 const basic=Object.keys(WEAPONS).indexOf(id);
 if(basic>=0)return basic+(evolved?10:0);
 return 20+Math.max(0,FUSIONS.findIndex(f=>f.id===id));
}
export function spellIcon(kind,id,{evolved=false,size=48,className='',label=''}={}){
 const index=artIndex(kind,id,evolved),name=label||LOOT[id]?.name||PASSIVES[id]?.name||WEAPONS[id]?.[evolved?'evolution':'name']||FUSIONS.find(f=>f.id===id)?.name||id;
 return '<span class="spell-art '+className+'" role="img" aria-label="'+escArt(name)+'" style="--art-size:'+size+'px;background-position:'+((index%8)/7*100)+'% '+(Math.floor(index/8)/4*100)+'%"></span>';
}
export function fairyPortrait(id,small=false){
 const i=Math.max(0,FAIRIES.findIndex(f=>f.id===id)),f=FAIRIES[i];
 return '<span class="fairy-portrait '+(small?'portrait-small':'')+'" role="img" aria-label="'+f.name+'" style="--portrait-x:'+(i/5*100)+'%;--fairy:'+f.color+'"><span class="portrait-wings" aria-hidden="true"></span><span class="portrait-body" aria-hidden="true"></span><span class="portrait-sparkle" aria-hidden="true">✦</span></span>';
}
export function arenaArt(id,className=''){
 const a=ARENAS.find(a=>a.id===id)||ARENAS[0];
 return '<span class="arena-art '+className+'" role="img" aria-label="'+a.name+'" style="background-position:'+(a.index%2*100)+'% '+(Math.floor(a.index/2)*100)+'%"></span>';
}
export function chestIcon(size=36){return '<span class="chest-art" role="img" aria-label="Baú de boss" style="width:'+size+'px;height:'+size+'px"></span>';}
export function atlasRect(name,index){
 const img=images[name];if(!img?.naturalWidth)return null;const w=img.naturalWidth,h=img.naturalHeight;
 if(name==='fairies'){const col=index%6;return index<6?{x:col*w/6,y:0,w:w/6,h:h*.665}:{x:col*w/6,y:h*.66,w:w/6,h:h*.34};}
 const cols=name==='magic'?8:name==='worlds'?2:4,rows=name==='magic'?5:2;
 return{x:(index%cols)*w/cols,y:Math.floor(index/cols)*h/rows,w:w/cols,h:h/rows};
}
export function drawAtlas(ctx,name,index,x,y,w,h=w){
 const r=atlasRect(name,index),img=images[name];if(!r||!img.complete)return false;
 ctx.drawImage(img,r.x,r.y,r.w,r.h,x,y,w,h);return true;
}
export function symbol(id){
 const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
 const paths={home:'<path d="M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7"/>',book:'<path d="M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1v15"/>',shop:'<path d="m12 2 9 10-9 10L3 12 12 2Z"/><path d="m7 6 5 16 5-16M3 12h18"/>',team:'<path d="M12 20S2 14 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-10 12-10 12Z"/>',gear:'<path d="m9 3 1-1h4l1 3 3 1 3 1v4l-2 1-1 3 1 3-3 3-3-1-3 1-3-1-1-3-3-1V8l3-1 1-3Z"/><circle cx="12" cy="12" r="3"/>',pin:'<path d="m14 3 7 7-4 1-4 5-5-5 5-4 1-4ZM3 21l7-7"/>',arrow:'<path d="M3 12h18m-7-7 7 7-7 7"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',pause:'<path d="M8 4v16M16 4v16"/>',butterfly:'<path d="M12 10C2-4-4 8 8 13-3 20 9 27 12 14c3 13 15 6 4-1C28 8 22-4 12 10Z"/>'};
 return '<svg class="ui-symbol" '+common+'>'+(paths[id]||paths.shop)+'</svg>';
}
