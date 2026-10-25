import {FAIRIES,WEAPONS,PASSIVES,FUSIONS,UPGRADES,ARENAS,LOOT} from './data.js';
import {spellIcon,fairyPortrait,arenaArt,chestIcon,symbol,escArt as esc} from './visual-assets.js';
const img=(kind,id,evolved=false,size=52)=>spellIcon(kind,id,{evolved,size});
export function homeUI(state,progress){
 const f=FAIRIES.find(f=>f.id===state.fairy)||FAIRIES[0],rank=progress.unlocks.includes('believix:'+f.id)?'Believix':progress.unlocks.includes('enchantix:'+f.id)?'Enchantix':'';
 return '<section class="fairy-stage" style="--selected-color:'+f.color+'">'+arenaArt(state.arena,'stage-backdrop')+'<div class="stage-haze"></div><div class="stage-copy"><span class="stage-eyebrow">MAGIX DUET</span><h1>Duas magias.<br>Uma equipa.</h1><div class="hero-power">'+img('weapon',f.weapon,false,44)+'<span><strong>'+f.name+'</strong><small>'+f.element+'</small></span></div>'+(rank?'<span class="transformation-tag">✦ '+rank+'</span>':'')+'</div><div class="stage-character">'+fairyPortrait(f.id)+'</div><div class="stage-dust" aria-hidden="true">✦ · ✧ · ✦</div></section>'+
 '<div class="section-title compact-title"><h2>A tua fada</h2><span class="selected-label" style="color:'+f.color+'">'+f.name+'</span></div><div class="fairy-row">'+FAIRIES.map(x=>'<button class="fairy-card '+(x.id===f.id?'active':'')+'" data-action="fairy" data-value="'+x.id+'" style="--fairy:'+x.color+'" aria-label="Escolher '+x.name+'" aria-pressed="'+(x.id===f.id)+'">'+fairyPortrait(x.id,true)+'<strong>'+x.name+'</strong></button>').join('')+'</div>'+
 '<div class="section-title compact-title"><h2>O vosso mundo</h2><span class="muted">4 arenas</span></div><div class="world-row">'+ARENAS.map(a=>'<button class="world-card '+(a.id===state.arena?'active':'')+'" data-action="arena" data-value="'+a.id+'" aria-label="Escolher '+a.name+'" aria-pressed="'+(a.id===state.arena)+'">'+arenaArt(a.id)+'<strong>'+a.short+'</strong>'+(a.id===state.arena?'<i>✓</i>':'')+'</button>').join('')+'</div>'+
 '<div class="play-actions visual-play"><button class="button duo-button" data-action="duo">'+symbol('team')+' Jogar a dois '+symbol('arrow')+'</button><button class="button secondary" data-action="solo">'+symbol('play')+' Aventura a solo</button></div>'+
 (state.checkpoint?'<button class="button secondary full compact spaced" data-action="continue-run">↻ Retomar aventura</button>':'')+
 '<div class="team-strip"><span>'+symbol('team')+' '+esc(state.team.name)+'</span><button data-action="page" data-value="team" aria-label="Abrir equipa">'+(state.auth?'☁':'◇')+' '+(state.auth?'Cloud ligada':'Equipa')+' ›</button></div>';
}
function ingredient(kind,id,level,max,done=false,evolved=false){
 const label=level===null?String(max):String(level)+'/'+max;
 return '<span class="ingredient-visual '+(done?'complete':'')+'">'+img(kind,id,evolved,50)+'<small class="recipe-count" aria-label="Nível '+label+'">'+label+'</small></span>';
}
function recipeCard({id,title,inputs,result,done,ready=false}){
 return '<article class="recipe visual-recipe '+(ready?'recipe-ready':'')+'" aria-label="'+esc(title)+'"><header><h3>'+title+'</h3><button class="recipe-info" data-action="recipe-info" data-value="'+id+'" aria-label="Detalhes de '+esc(title)+'">ⓘ</button></header><div class="recipe-visual">'+inputs+'<span class="recipe-arrow">'+symbol('arrow')+'</span><span class="evolution-result">'+result+'</span></div><div class="recipe-footer"><span class="recipe-state '+(done?'unlocked':'')+'" aria-label="'+(done?'Desbloqueada':ready?'Pronta para evoluir':'Receita disponível')+'">'+(done?'✓':ready?'✦':'◇')+'</span><button class="pin-recipe" data-action="pin" data-value="'+id+'" aria-label="Fixar receita '+esc(title)+'">'+symbol('pin')+'</button></div></article>';
}
export function bookUI({state,progress,player:p=null,tab='weapons',query=''}){
 const tabs=[['weapons','Armas','weapon','flame'],['fusions','Fusões','weapon','phoenix'],['fairies','Fadas','passive','seed'],['combos','Dupla','passive','heart'],['loot','Achados','loot','heal']];
 const contains=(...values)=>!query||values.join(' ').toLocaleLowerCase('pt-PT').includes(query.toLocaleLowerCase('pt-PT'));
 let body='';
 if(tab==='weapons')body=Object.entries(WEAPONS).filter(([id,w])=>contains(w.name,w.evolution,PASSIVES[w.passive].name)).map(([id,w])=>{
  const weapon=p?.weapons.find(x=>x.id===id),a=p?.passives[w.passive]||0,done=!!weapon?.evolved||!!p?.evolvedEver.includes(id),ready=!done&&weapon?.level===8&&a>=5;
  const inputs=ingredient('weapon',id,p?(weapon?.level||0):null,8,done||weapon?.level===8)+'<b class="recipe-plus">+</b>'+ingredient('passive',w.passive,p?a:null,5,a>=5)+'<b class="recipe-plus">+</b><span class="ingredient-visual chest-ingredient">'+chestIcon(38)+'<small aria-label="Baú de boss">✦</small></span>';
  return recipeCard({id:'w:'+id,title:w.evolution,inputs,result:img('weapon',id,true,70),done,ready});
 }).join('');
 if(tab==='fusions')body=FUSIONS.filter(f=>contains(f.name,WEAPONS[f.a].evolution,WEAPONS[f.b].evolution)).map(f=>{
  const a=!!p?.weapons.some(w=>w.id===f.a&&w.evolved),b=!!p?.weapons.some(w=>w.id===f.b&&w.evolved),done=progress.unlocks.includes('fusion:'+f.id);
  return recipeCard({id:'f:'+f.id,title:f.name,inputs:'<span class="ingredient-visual '+(a?'complete':'')+'">'+img('weapon',f.a,true,52)+'<small>✦</small></span><b class="recipe-plus">+</b><span class="ingredient-visual '+(b?'complete':'')+'">'+img('weapon',f.b,true,52)+'<small>✦</small></span><b class="recipe-plus">+</b><span class="ingredient-visual chest-ingredient">'+chestIcon(36)+'<small>✦</small></span>',result:img('weapon',f.id,true,70),done,ready:a&&b});
 }).join('');
 if(tab==='fairies')body=FAIRIES.filter(f=>contains(f.name,f.element,'Enchantix','Believix')).map(f=>'<article class="recipe visual-recipe transform-recipe"><header><h3>'+f.name+'</h3><button class="recipe-info" data-action="recipe-info" data-value="c:'+f.id+'" aria-label="Detalhes de '+f.name+'">ⓘ</button></header><div class="transform-path">'+[0,1,2].map((rank,i)=>'<div class="transform-step tier-'+rank+' '+(rank>0&&!progress.unlocks.includes((rank===1?'enchantix:':'believix:')+f.id)?'locked':'')+'">'+fairyPortrait(f.id,true)+'<span>'+['Base','Enchantix','Believix'][i]+'</span></div>'+(i<2?'<span class="path-arrow">›</span>':'')).join('')+'</div></article>').join('');
 if(tab==='combos'){
  const combos=[
   ['Fogo em harmonia','weapon','flame','weapon','sound','Espalha fogo','As ondas sonoras prolongam e espalham queimaduras.'],
   ['Maré elétrica','weapon','water','weapon','lightning','+60% dano','Relâmpagos causam mais 60% de dano a inimigos molhados.'],
   ['Jardim de cristal','weapon','vines','weapon','ice','+0,8s gelo','As raízes prolongam o congelamento.'],
   ['Ligação de fadas','passive','heart','passive','heart','Cura + proteção','Fiquem próximos para carregar a ligação.'],
   ['Juntos outra vez','loot','shield','loot','heal','Reanima em 3s','Fica perto da outra fada caída durante três segundos.']
  ];
  body=combos.filter(c=>contains(...c)).map((c,i)=>'<article class="recipe visual-recipe combo-recipe"><header><h3>'+c[0]+'</h3><button class="recipe-info" data-action="recipe-info" data-value="d:'+i+'" aria-label="'+c[6]+'">ⓘ</button></header><div class="combo-pictures">'+img(c[1],c[2],false,65)+'<b>+</b>'+img(c[3],c[4],false,65)+'<span class="combo-burst">✦</span></div><strong class="combo-caption">'+c[5]+'</strong></article>').join('');
 }
 if(tab==='loot')body=Object.entries(LOOT).filter(([id,l])=>contains(l.name,l.description)).map(([id,l])=>'<article class="recipe visual-recipe loot-recipe">'+img('loot',id,false,100)+'<h3>'+l.name+'</h3><p>'+l.description+'</p></article>').join('');
 const html='<div class="book-tabs visual-tabs">'+tabs.map(([id,name,kind,icon])=>'<button data-action="book-tab" data-value="'+id+'" class="'+(tab===id?'active':'')+'">'+img(kind,icon,false,26)+'<span>'+name+'</span></button>').join('')+'</div><input class="book-search" id="book-search" type="search" placeholder="Procurar…" value="'+esc(query)+'" aria-label="Procurar uma combinação"><div class="recipe-grid">'+(body||'<div class="empty">Sem resultados.</div>')+'</div>';
 return html.replaceAll('data-value="'+esc(state.pin)+'" aria-label="Fixar','data-value="'+esc(state.pin)+'" aria-pressed="true" aria-label="Fixar');
}
export function choiceUI(choices,p){
 return choices.map(o=>{const kind=o.id.startsWith('p:')?'passive':o.id==='heal'?'loot':'weapon',id=o.id==='heal'?'heal':o.id.slice(2),max=kind==='loot'?1:kind==='passive'?5:8;
  return '<button class="choice visual-choice" data-action="choice" data-value="'+o.id+'" aria-label="'+esc(o.name+' nível '+o.level+'. '+o.text)+'">'+img(kind,id,false,66)+'<span><strong>'+o.name+'</strong><span class="choice-dots">'+Array.from({length:max},(_,i)=>'<i class="'+(i<o.level?'on':'')+'"></i>').join('')+'</span><small>'+o.level+'/'+max+'</small></span><span class="choice-plus">+</span></button>';
 }).join('');
}
export function shopUI(p){
 return '<div class="eyebrow">MAGIA DA EQUIPA</div><h1 class="page-title">Atelier</h1><div class="upgrade-grid">'+UPGRADES.map(u=>{const level=p.upgrades[u.id]||0,cost=100*(level+1);return '<article class="upgrade visual-upgrade">'+spellIcon('upgrade',u.id,{size:66,label:u.name})+'<h3>'+u.name+'</h3><p>'+u.text+'</p><div class="dots">'+Array.from({length:10},(_,i)=>'<i class="'+(i<level?'on':'')+'"></i>').join('')+'</div><small>'+level+'/10</small><button class="button compact" data-action="buy" data-value="'+u.id+'" '+(level>=10||p.coins<cost?'disabled':'')+'>'+(level>=10?'✓':img('loot','coins',false,20)+' '+cost)+'</button></article>';}).join('')+'</div>'+
 (p.pending.length?'<div class="notice">'+p.pending.length+' compra(s) pendente(s). <button class="danger-link" data-action="cancel-pending">Cancelar</button></div>':'');
}
