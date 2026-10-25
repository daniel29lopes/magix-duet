import {FAIRIES,WEAPONS,PASSIVES,FUSIONS,UPGRADES,ACHIEVEMENTS,THEMES,weaponInfo} from './data.js';
import {Game} from './engine.js';
import {Renderer,fairySVG} from './art.js';
import {uid,freshTeam,validateTeam,mergeTeam,derive,finishRun,buy,cancelPending} from './ledger.js';
import {Lan} from './lan.js';
import {Cloud} from './cloud.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const native=globalThis.MagixAndroid||null,app=$('#app'),modalRoot=$('#modal-root');
let state;
try{const raw=native?.loadState?.()||localStorage.getItem('magix-duet-state');state=raw?JSON.parse(raw):null;if(state?.version!==1)state=null;if(state)state.team=validateTeam(state.team);}catch{state=null;}
if(!state)state={version:1,device:uid(),name:'',fairy:'bloom',theme:'magix',team:null,archives:[],auth:null,sound:true,haptics:true,pin:null,checkpoint:null};
if(!state.team)state.team=freshTeam('A nossa equipa',state.device);
if(!FAIRIES.some(f=>f.id===state.fairy))state.fairy='bloom';
state.archives=state.archives||[];let page='home',bookTab='weapons',bookSearch='',modalName='',pauseBook=false,lastOverlay='',lastHud='',game=null,remote=null,previousRemote=null,remoteAt=0,renderer=null,role='solo',peerProfile=null,connected=false,hostingInfo=null,lastInvite='',cmdSeq=0,commands=[],lastPeer=0,clock=0,sendAt=0,inputAt=0,saveAt=0,hudAt=0,matchMeta={},resultSaved='',stale=false,frameTime=performance.now(),predicted=null,cloudBusy=false,lastCloud=0;
const input={x:0,y:0},keys=new Set();let pointer=null,stickOrigin=null;
let saveTimer;
function persist(){try{const value=JSON.stringify(state);localStorage.setItem('magix-duet-state',value);native?.saveState?.(value);}catch{toast('Não foi possível guardar. Exporta uma cópia de segurança.');}}
function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(persist,250);}
const cloud=new Cloud(state.auth,s=>{state.auth=s;saveSoon();if(page==='team'&&!game&&!remote)render();});
const lan=new Lan(onNetwork);
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4200);}
function vibrate(){if(state.haptics)native?.vibrate?.();}
function sound(kind='tap'){
 if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;sound.ctx=sound.ctx||new C();const ctx=sound.ctx;ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(kind==='level'?660:kind==='end'?440:390,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='level'?990:260,ctx.currentTime+.14);g.gain.setValueAtTime(.045,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);o.start();o.stop(ctx.currentTime+.2);}catch{}
}
function modal(name,html,wide=false){modalName=name;modalRoot.innerHTML='<div class="modal-backdrop"><section class="modal '+(wide?'wide':'')+'" role="dialog" aria-modal="true">'+html+'</section></div>';}
function closeModal(){modalName='';modalRoot.innerHTML='';lastOverlay='';}
const closeButton='<button class="icon-button close" data-action="close" aria-label="Fechar">×</button>';
function header(){
 const p=derive(state.team);
 return '<header class="topbar"><div class="brand"><span class="brand-mark">ʚɞ</span><div>MAGIX DUET<small>FAIRY SURVIVORS</small></div></div><div class="top-right"><div class="currency"><span>✧</span>'+p.coins.toLocaleString('pt-PT')+'</div><button class="icon-button" data-action="settings" aria-label="Definições">⚙</button></div></header>';
}
function nav(){return '<nav class="nav" aria-label="Menu principal">'+[['home','⌂','Aventura'],['book','✧','Grimório'],['shop','◇','Melhorias'],['team','♡','Equipa']].map(([id,icon,name])=>'<button data-action="page" data-value="'+id+'" class="'+(page===id?'active':'')+'"><span>'+icon+'</span>'+name+'</button>').join('')+'</nav>';}
function render(){
 if(game||remote)return;
 let content='';const f=FAIRIES.find(f=>f.id===state.fairy),p=derive(state.team);
 if(page==='home')content='<div class="welcome"><div class="eyebrow">BEM-VIND'+(state.name?'O, '+esc(state.name.toUpperCase()):'OS A MAGIX')+'</div><h1>Uma aventura. A vossa magia.</h1><p>'+esc(state.team.name)+' · '+(cloud.session?'saves locais + cloud':'guardado neste telemóvel')+'</p></div><div class="home-grid"><section class="hero"><div class="hero-copy"><span class="pill">✦ CAPÍTULO I · FLORESTA ENCANTADA</span><h2>A magia é<br>melhor a dois.</h2><p>Sobrevivam às sombras.<br>Combinem poderes.<br>Evoluam juntos.</p><span class="pill green" style="margin-top:18px">♡ COOPERATIVO · 2 FADAS</span></div><div class="hero-art">'+fairySVG(state.fairy)+'</div></section><section><div class="section-title"><h2>Escolhe a tua fada</h2><span class="eyebrow" style="font-size:8px">6 PODERES</span></div><div class="fairy-row">'+FAIRIES.map(x=>'<button class="fairy-card '+(x.id===state.fairy?'active':'')+'" data-action="fairy" data-value="'+x.id+'" style="--fairy:'+x.color+'" aria-label="Escolher '+x.name+'">'+fairySVG(x.id,true)+'<strong>'+x.name+'</strong><small>'+x.element+'</small></button>').join('')+'</div><div class="character-note"><span><b style="color:'+f.color+'">'+f.icon+' '+f.name+'</b> · '+f.description+'</span><span>'+((p.unlocks||[]).includes('enchantix:'+f.id)?'ʚɞ Enchantix':'✧ Base')+'</span></div><div class="play-actions"><button class="button" data-action="duo">♡ Jogar a dois <span>→</span></button><button class="button secondary" data-action="solo">✦ Aventura a solo</button></div>'+(state.checkpoint?'<button class="button secondary full compact spaced" data-action="continue-run">↻ Retomar a partida guardada</button>':'')+'<div class="home-foot"><span>Ataques automáticos</span><span>Sem anúncios</span><span>Sem compras reais</span></div></section></div><div class="section-title"><h2>O vosso caminho</h2><span class="muted">Cada partida conta.</span></div><div class="stats-grid"><div class="stat"><strong>'+p.runs+'</strong><small>AVENTURAS</small></div><div class="stat"><strong>'+p.wins+'</strong><small>VITÓRIAS</small></div><div class="stat"><strong>'+p.unlocks.filter(x=>x.startsWith('fusion:')).length+'/5</strong><small>FUSÕES DESCOBERTAS</small></div></div>';
 if(page==='book')content='<div class="eyebrow">O CONHECIMENTO É MAGIA</div><h1 class="page-title">Grimório de combinações</h1><p class="muted">Todas as receitas, sempre disponíveis. Também no menu de pausa.</p>'+bookHTML();
 if(page==='shop')content='<div class="eyebrow">A VOSSA EVOLUÇÃO PERMANENTE</div><h1 class="page-title">Atelier de magia</h1><p class="muted">Melhorias da equipa. Aplicadas no início da próxima partida.</p><div class="upgrade-grid spaced">'+UPGRADES.map(u=>{const level=p.upgrades[u.id]||0,cost=100*(level+1);return '<article class="upgrade"><div class="symbol">'+u.icon+'</div><h3>'+u.name+'</h3><p>'+u.text+' por nível</p><div class="dots">'+Array.from({length:10},(_,i)=>'<i class="'+(i<level?'on':'')+'"></i>').join('')+'</div><small class="muted">Nível '+level+'/10</small><button class="button compact '+(level>=10?'secondary':'')+'" data-action="buy" data-value="'+u.id+'" '+(level>=10||p.coins<cost?'disabled':'')+'>'+(level>=10?'Concluída':'✧ '+cost+' · Melhorar')+'</button></article>';}).join('')+'</div>'+(p.pending.length?'<div class="notice">'+p.pending.length+' melhoria(s) aguarda(m) moedas após a sincronização de compras offline. <button class="danger-link" data-action="cancel-pending">Cancelar compras pendentes</button></div>':'');
 if(page==='team')content=teamHTML(p);
 app.innerHTML='<main class="shell">'+header()+content+'</main>'+nav();
}
function teamHTML(p){
 return '<div class="eyebrow">UM SÓ CAMINHO, DUAS FADAS</div><h1 class="page-title">'+esc(state.team.name)+'</h1><div class="account-line"><div class="avatar">'+FAIRIES.find(f=>f.id===state.fairy).icon+'</div><div><strong>'+esc(state.name||'O teu perfil')+'</strong><p class="muted">'+(cloud.session?'☁ '+esc(cloud.session.user?.email||'Conta ligada'):'Perfil local · pronto para jogar offline')+'</p></div></div><div class="stats-grid"><div class="stat"><strong>'+p.kills.toLocaleString('pt-PT')+'</strong><small>INIMIGOS DERROTADOS</small></div><div class="stat"><strong>'+p.coop_wins+'</strong><small>VITÓRIAS A DOIS</small></div><div class="stat"><strong>'+ACHIEVEMENTS.filter(a=>a.test(p)).length+'/'+ACHIEVEMENTS.length+'</strong><small>CONQUISTAS</small></div></div><section class="card"><h3>☁ Saves e conquistas na cloud</h3><p class="muted">Cada um pode ter a sua conta e pertencer à mesma equipa. Também podem entrar com a mesma conta nos dois telemóveis.</p>'+(cloud.info?.code?'<div class="invite spaced">Código de equipa: '+esc(cloud.info.code)+'</div><p class="muted spaced">'+(cloud.info.members||[]).map(m=>esc(m.name)).join(' · ')+'</p><div class="row spaced"><button class="button compact" data-action="sync">↻ Sincronizar</button><button class="button secondary compact" data-action="share-team">Partilhar código</button></div><button class="danger-link" data-action="cloud-switch">Entrar noutra equipa com um código</button>':'<button class="button compact spaced" data-action="cloud">'+(cloud.session?'Configurar equipa cloud':'Criar conta / Entrar')+'</button>')+'<div class="muted spaced" id="sync-status">'+(lastCloud?'Última sincronização: '+new Date(lastCloud).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):'O progresso está guardado neste telemóvel.')+'</div></section><section class="card"><h3>As vossas conquistas</h3>'+ACHIEVEMENTS.map(a=>'<div class="achievement '+(a.test(p)?'earned':'')+'"><div class="badge">'+a.icon+'</div><div><h3>'+a.name+'</h3><p>'+a.text+'</p></div>'+(a.test(p)?'<span style="margin-left:auto;color:#c9dcaf">✓</span>':'')+'</div>').join('')+'</section><section class="card"><h3>Leva a magia contigo</h3><p class="muted">Envia o instalador à tua namorada ou guarda uma cópia de segurança da equipa. As cópias não incluem a sessão da conta.</p><div class="stack spaced"><button class="button secondary compact" data-action="share-apk">↗ Partilhar a app</button><div class="row"><button class="button secondary compact" data-action="backup">Exportar save</button><button class="button secondary compact" data-action="restore">Importar save</button></div>'+(state.archives.length?'<button class="button secondary compact" data-action="archives">Equipas arquivadas ('+state.archives.length+')</button>':'')+'</div></section>';
}
function bookHTML(s=null){
 const p=s?.players[localIndex()],progress=derive(state.team),tabs=[['weapons','Evoluções'],['fusions','Fusões'],['fairies','Transformações'],['combos','Combos a dois']];
 let body='';const contains=(...x)=>!bookSearch||x.join(' ').toLocaleLowerCase('pt-PT').includes(bookSearch.toLocaleLowerCase('pt-PT'));
 if(bookTab==='weapons')body=Object.entries(WEAPONS).filter(([id,w])=>contains(w.name,w.evolution,PASSIVES[w.passive].name)).map(([id,w])=>{
  const weapon=p?.weapons.find(x=>x.id===id),a=p?.passives[w.passive]||0,done=!!weapon?.evolved||p?.evolvedEver.includes(id);
  return '<article class="recipe"><h3>'+w.icon+' '+w.evolution+'</h3><p>'+w.effect+'</p><div class="ingredients"><span class="ingredient '+(weapon?.level>=8||done?'ok':'')+'">'+w.name+' '+(p?' '+(weapon?.level||0)+'/8':'nível 8')+'</span> + <span class="ingredient '+(a>=5?'ok':'')+'">'+PASSIVES[w.passive].name+' '+(p?a+'/5':'nível 5')+'</span> + <span class="ingredient">Baú de boss</span></div><div class="recipe-footer"><span>'+(done?'✓ Evoluída nesta partida':weapon?.level>=8&&a>=5?'✦ Pronta para um baú':'Uma arma e o seu acessório')+'</span><button data-action="pin" data-value="w:'+id+'">'+(state.pin==='w:'+id?'✓ Fixada':'Fixar receita')+'</button></div></article>';
 }).join('');
 if(bookTab==='fusions')body=FUSIONS.filter(f=>contains(f.name,f.effect,WEAPONS[f.a].evolution,WEAPONS[f.b].evolution)).map(f=>'<article class="recipe"><h3>'+f.icon+' '+f.name+'</h3><p>'+f.effect+'</p><div class="ingredients"><span class="ingredient '+(p?.weapons.some(w=>w.id===f.a&&w.evolved)?'ok':'')+'">'+WEAPONS[f.a].evolution+'</span> + <span class="ingredient '+(p?.weapons.some(w=>w.id===f.b&&w.evolved)?'ok':'')+'">'+WEAPONS[f.b].evolution+'</span> + <span class="ingredient">Baú de boss</span></div><div class="recipe-footer"><span>'+(progress.unlocks.includes('fusion:'+f.id)?'✓ Descoberta pela equipa':'Consome as duas armas e liberta um espaço')+'</span><button data-action="pin" data-value="f:'+f.id+'">'+(state.pin==='f:'+f.id?'✓ Fixada':'Fixar receita')+'</button></div></article>').join('');
 if(bookTab==='fairies')body=FAIRIES.filter(f=>contains(f.name,f.element,f.unlock)).map(f=>'<article class="recipe"><h3 style="color:'+f.color+'">ʚɞ '+f.name+' · Enchantix</h3><p>'+f.unlock+' Desbloqueio permanente da equipa; ativa a partir do nível 10.</p><div class="ingredients"><span class="ingredient '+(progress.unlocks.includes('enchantix:'+f.id)?'ok':'')+'">'+(progress.unlocks.includes('enchantix:'+f.id)?'✓ Enchantix desbloqueado':'Enchantix por descobrir')+'</span></div><p><b>Believix:</b> vence com esta fada em Enchantix e com uma fusão. Nas partidas seguintes, ativa ao nível 20. Cada transformação dá +20% de dano.</p><div class="recipe-footer spaced"><span>'+(progress.unlocks.includes('believix:'+f.id)?'✓ Believix desbloqueado':'Believix por descobrir')+'</span></div></article>').join('');
 if(bookTab==='combos')body=[['🔥 + ♫','Fogo em harmonia','As ondas sonoras prolongam as queimaduras. Inimigos afetados pelo som recebem +18% de dano.'],['≈ + ϟ','Maré elétrica','As descargas causam +60% de dano contra inimigos molhados por Morphix.'],['❀ + ❄','Jardim de cristal','As raízes prolongam o congelamento em 0,8 segundos.'],['♡ + ♡','Ligação de Fadas','Fiquem a menos de 220 passos para carregar a ligação. Ao completar, explode, cura 15 de vida e protege ambos durante 2 segundos.'],['♡ + ʚɞ','Juntos outra vez','Fica perto da tua parceira caída durante 3 segundos para a reanimar com 45% de vida.']].filter(x=>contains(...x)).map(([icon,name,text])=>'<article class="recipe"><h3>'+icon+' '+name+'</h3><p>'+text+'</p><div class="recipe-footer spaced">Ativa automaticamente quando as condições se cumprem.</div></article>').join('');
 return '<div class="book-tabs spaced">'+tabs.map(([id,name])=>'<button data-action="book-tab" data-value="'+id+'" class="'+(bookTab===id?'active':'')+'">'+name+'</button>').join('')+'</div><input class="book-search" id="book-search" type="search" placeholder="Procurar uma combinação…" value="'+esc(bookSearch)+'" aria-label="Procurar uma combinação"><div class="recipe-grid">'+(body||'<p class="empty">Não há receitas com esse nome.</p>')+'</div>';
}
function localIndex(){return role==='guest'?1:0;}
function world(){return game?.s||remote;}
function adoptTeam(team,archive=true){
 team=validateTeam(team);
 if(team.id===state.team.id)state.team=mergeTeam(state.team,team);
 else{if(archive&&state.team.events.length)state.archives=[state.team,...state.archives.filter(t=>t.id!==state.team.id)].slice(0,10);state.team=team;}
 saveSoon();
}
async function syncCloud(silent=false){
 if(!cloud.session||!cloud.enabled||cloudBusy)return;cloudBusy=true;
 try{
  let info=cloud.info||await cloud.dashboard();
  if(!info){if(!silent)showCloudTeam();return;}
  if(info.team.id!==state.team.id)throw new Error('Esta equipa local é diferente da tua equipa cloud. Usa o código da mesma equipa nos dois telemóveis.');
  info=await cloud.sync(state.team);adoptTeam(info.team);lastCloud=Date.now();
  if(!silent)toast('Equipa sincronizada.');if(page==='team'&&!game&&!remote)render();
 }catch(e){if(!silent)toast(e.message);}finally{cloudBusy=false;}
}
function showSetup(){
 modal('setup','<div class="eyebrow">O INÍCIO DA VOSSA HISTÓRIA</div><h2>Como te chamas?</h2><p>Cria o teu perfil. Podes jogar já e ligar a conta cloud depois.</p><form id="profile-form" class="stack"><label>O teu nome<input name="name" required maxlength="24" autocomplete="nickname" placeholder="Nome da tua fada"></label><label>Nome da equipa<input name="team" required maxlength="40" value="A nossa equipa"></label><button class="button full" type="submit">Entrar em Magix →</button></form>');
}
function showDuo(){
 if(!state.name){showSetup();return;}
 modal('duo',closeButton+'<div class="eyebrow">A VOSSA AVENTURA COOPERATIVA</div><h2>Duas fadas.<br>Uma equipa.</h2><p>Liguem os dois telemóveis ao mesmo Wi-Fi, ou um ao hotspot do outro. Basta um de vocês criar a sala.</p><div class="stack"><button class="button full" data-action="host">✦ Criar sala neste telemóvel</button><button class="button secondary full" data-action="join">♡ Entrar na sala</button><button class="button secondary compact" data-action="wifi">Abrir definições de Wi-Fi / hotspot</button></div>'+(!lan.enabled?'<div class="notice">O multiplayer Wi-Fi está disponível na app Android. Aqui podes experimentar a aventura a solo.</div>':'')+'<div class="notice">O anfitrião precisa de manter a app aberta durante a partida. Os saves cloud sincronizam quando há internet.</div>');
}
function showJoin(value=''){
 modal('join',closeButton+'<div class="eyebrow">ENCONTRA A TUA OUTRA METADE</div><h2>Entrar na sala</h2><p>Pede o convite à outra fada e cola-o aqui. A sala deve estar aberta e ambos no mesmo Wi-Fi ou hotspot.</p><form id="join-form" class="stack"><label>Convite da sala<input name="invitation" required autocomplete="off" value="'+esc(value)+'" placeholder="192.168.1.10:12345#12345678"></label><button class="button full" type="submit">Ligar à outra fada →</button></form><p class="muted spaced">A primeira ligação junta este perfil à equipa do anfitrião. Uma equipa anterior com progresso fica arquivada.</p>');
}
function invitation(ip){return 'magix-duet://join?ip='+encodeURIComponent(ip)+'&port='+hostingInfo.port+'&code='+hostingInfo.code;}
function showLobby(){
 if(!hostingInfo)return;
 const ips=hostingInfo.addresses||[],ip=ips[0],invite=ip?ip+':'+hostingInfo.port+'#'+hostingInfo.code:'';
 modal('lobby','<button class="icon-button close" data-action="leave-lobby" aria-label="Fechar sala">×</button><div class="eyebrow">SALA COOPERATIVA</div><h2>'+ (peerProfile?'A equipa está pronta.':'À espera da tua fada…')+'</h2><p>'+ (peerProfile?esc(peerProfile.name)+' escolheu '+FAIRIES.find(f=>f.id===peerProfile.fairy)?.name+'. Podem começar.':'Partilha o convite ou pede à outra pessoa para o copiar. O Wi-Fi não precisa de ter internet.')+'</p><div class="invite spaced">'+(invite?esc(invite):'Liga o Wi-Fi ou hotspot e cria novamente a sala.')+'</div>'+(ips.length>1?'<p class="muted spaced">Outros endereços: '+ips.slice(1).map(x=>esc(x+':'+hostingInfo.port+'#'+hostingInfo.code)).join(' · ')+'</p>':'')+'<div class="stack"><button class="button secondary full" data-action="share-invite" '+(!ip?'disabled':'')+'>↗ Partilhar convite</button><button class="button full" data-action="start-duo" '+(!peerProfile?'disabled':'')+'>♡ Começar aventura a dois</button><button class="button secondary compact" data-action="wifi">Wi-Fi / hotspot</button></div><div class="waiting"><i></i>'+(peerProfile?'Ligadas · progresso da equipa sincronizado':'Sala aberta neste telemóvel')+'</div>');
}
function showSettings(){
 modal('settings',closeButton+'<div class="eyebrow">AO VOSSO GOSTO</div><h2>Um pouco de magia</h2><div class="toggle-line"><span>Efeitos sonoros</span><button data-action="toggle" data-value="sound">'+(state.sound?'Ativos':'Desativados')+'</button></div><div class="toggle-line"><span>Vibração</span><button data-action="toggle" data-value="haptics">'+(state.haptics?'Ativa':'Desativada')+'</button></div><div class="toggle-line"><span>Tema visual</span><button data-action="theme">'+(state.theme==='lunar'?'Reino Lunar':'Magix')+'</button></div><form id="rename-form" class="stack"><label>O teu nome<input name="name" required maxlength="24" value="'+esc(state.name)+'"></label><button class="button secondary compact" type="submit">Guardar nome</button></form><div class="stack"><button class="button secondary compact" data-action="how">Como jogar</button><button class="button secondary compact" data-action="share-apk">Partilhar app</button>'+(cloud.session?'<button class="danger-link" data-action="logout">Sair da conta cloud</button>':'')+'</div><p class="muted spaced">Magix Duet · versão 0.1.0<br>Feito para aventuras a dois.</p>');
}
function showCloud(){
 if(cloud.session){showCloudTeam();return;}
 modal('cloud',closeButton+'<div class="eyebrow">A VOSSA EQUIPA, SEMPRE CONVOSCO</div><h2>Guardar na cloud</h2><p>Entra ou cria uma conta com email. Depois podem partilhar uma equipa com duas contas, ou usar a mesma conta nos dois telemóveis.</p><form id="auth-form" class="stack"><label>Email<input type="email" name="email" required autocomplete="email" placeholder="O teu email"></label><label>Palavra-passe<input type="password" name="password" required minlength="8" autocomplete="current-password" placeholder="Pelo menos 8 caracteres"></label><div class="modal-error" id="auth-error"></div><button class="button full" type="submit" name="mode" value="login">Entrar</button><button class="button secondary full" type="submit" name="mode" value="signup">Criar conta</button><button class="danger-link" type="button" data-action="recover">Esqueci-me da palavra-passe</button></form>');
}
function showCloudTeam(){
 if(cloud.info){page='team';closeModal();render();return;}
 modal('cloud-team',closeButton+'<div class="eyebrow">CONTA LIGADA</div><h2>A vossa equipa cloud</h2><p>Podes guardar a equipa deste telemóvel na cloud ou entrar na equipa da tua namorada com o código que aparece no menu Equipa dela.</p><div class="stack"><button class="button full" data-action="cloud-create">☁ Guardar esta equipa na cloud</button><form id="cloud-join-form" class="stack"><label>Código de equipa<input name="code" required maxlength="20" autocomplete="off" placeholder="Código de 12 caracteres"></label><button class="button secondary full" type="submit">Entrar na equipa dela</button></form></div>');
}

function gameView(){
 closeModal();app.innerHTML='<main class="game-wrap"><canvas class="game-canvas" id="game-canvas" aria-label="Arena de Magix"></canvas><div class="hud"><div class="hud-players" id="hud-players"></div><div class="hud-center"><div class="hud-time" id="hud-time">00:00</div><small id="hud-wave">FLORESTA DE MAGIX</small></div><button class="icon-button" data-action="pause" aria-label="Pausa">Ⅱ</button></div><div class="bond-meter" id="bond-meter"></div><div class="pin-hud" id="pin-hud"></div><div class="game-tip" id="game-tip">Arrasta o dedo para voar · os ataques são automáticos<br>Fica perto da outra fada para carregar a vossa ligação.</div><div class="stick" id="stick"><div class="stick-knob" id="stick-knob"></div></div><button class="ultimate" id="ultimate" data-action="ultimate" aria-label="Magia máxima">✦<small id="ultimate-label">A CARREGAR</small></button><div class="hud-bottom"><div class="weapons-hud" id="weapons-hud"></div><div class="xp-label"><span id="hud-level">NÍVEL 1</span><span id="hud-kills">0 sombras</span></div><div class="xp"><i id="xp-fill"></i></div></div></main>';
 renderer=new Renderer($('#game-canvas'));lastHud='';lastOverlay='';pauseBook=false;input.x=input.y=0;keys.clear();native?.awake?.(true);saveAt=performance.now();sound('level');
}
function startSolo(resume=false){
 if(!state.name){showSetup();return;}
 lan.disconnect();connected=false;peerProfile=null;role='solo';remote=null;resultSaved='';
 try{game=resume?Game.restore(state.checkpoint):new Game({fairies:[state.fairy],names:[state.name],upgrades:derive(state.team).upgrades,unlocks:derive(state.team).unlocks,runId:uid()});}catch{state.checkpoint=null;toast('Não foi possível retomar a partida.');render();return;}
 matchMeta={fortune:game.upgrades.fortune||0};gameView();
}
function startDuo(){
 if(!connected||!peerProfile)return;role='host';remote=null;resultSaved='';
 const p=derive(state.team);matchMeta={fortune:p.upgrades.fortune||0,runId:uid(),upgrades:p.upgrades};
 game=new Game({fairies:[state.fairy,peerProfile.fairy],names:[state.name,peerProfile.name],upgrades:p.upgrades,unlocks:p.unlocks,runId:matchMeta.runId});
 commands=[];lan.send({type:'start',world:game.s,meta:matchMeta,team:state.team});gameView();
}
function validWorld(s){return s&&s.version===1&&typeof s.runId==='string'&&Array.isArray(s.players)&&s.players.length===2&&s.players.every(p=>typeof p.x==='number'&&typeof p.y==='number'&&Array.isArray(p.weapons)&&p.weapons.every(w=>weaponInfo(w.id)))&&Array.isArray(s.enemies)&&s.enemies.length<=250&&Array.isArray(s.shots)&&s.shots.length<=1000&&Array.isArray(s.gems)&&s.gems.length<=400&&Array.isArray(s.fx)&&Array.isArray(s.projectiles);}
function receiveWorld(s){
 if(!validWorld(s))return;previousRemote=remote;remote=s;remoteAt=performance.now();commands=commands.filter(c=>c.seq>s.guestAck);
 const p=s.players[1];if(!predicted||Math.hypot(predicted.x-p.x,predicted.y-p.y)>150||s.pause||s.over)predicted={x:p.x,y:p.y};else{predicted.x+=(p.x-predicted.x)*.5;predicted.y+=(p.y-predicted.y)*.5;}
 if(s.over)saveResult(s);
}
function command(type,value){
 if(!world()||world().over&&type!=='leave')return;
 if(role==='guest'){commands.push({seq:++cmdSeq,type,value});sendInput();}else game?.command(0,{type,value});
 if(type==='choice'||type==='ultimate'){sound(type==='choice'?'level':'tap');vibrate();}
}
function sendInput(){if(role==='guest'&&connected)lan.send({type:'input',x:input.x,y:input.y,commands:commands.slice(0,8)});}
function onNetwork(type,data){
 if(type==='hosting'){hostingInfo=data;role='host';peerProfile=null;showLobby();return;}
 if(type==='connected'){
  connected=true;lastPeer=performance.now();stale=false;
  if(data==='guest'){role='guest';commands=[];lan.send({type:'hello',profile:{name:state.name,fairy:state.fairy},team:state.team});modal('connecting','<div class="eyebrow">A LIGAÇÃO ESTÁ A ACONTECER</div><h2>A reunir a equipa…</h2><p>A sincronizar o progresso com a outra fada.</p>');}
  return;
 }
 if(type==='data'){
  if(!data||typeof data.type!=='string')return;lastPeer=performance.now();stale=false;
  if(data.type==='hello'&&role==='host'){
   const p=data.profile;if(!p||!FAIRIES.some(f=>f.id===p.fairy))return;
   peerProfile={name:String(p.name||'Outra fada').slice(0,24),fairy:p.fairy};
   try{if(data.team?.id===state.team.id)adoptTeam(data.team);}catch{}
   lan.send({type:'welcome',profile:{name:state.name,fairy:state.fairy},team:state.team,world:game?.s||null,meta:matchMeta});
   if(!game)showLobby();else{if(modalName==='lost')closeModal();lastOverlay='';toast('A outra fada voltou à sala.');}
  }
  if(data.type==='welcome'&&role==='guest'){
   try{adoptTeam(data.team);}catch{toast('Não foi possível sincronizar a equipa.');lan.disconnect();return;}
   peerProfile=data.profile;matchMeta=data.meta||{};
   if(data.world&&validWorld(data.world)){game=null;receiveWorld(data.world);gameView();}
   else modal('guest-lobby','<button class="icon-button close" data-action="leave-lobby" aria-label="Sair da sala">×</button><div class="eyebrow">LIGADAS NA MESMA EQUIPA</div><div class="mini-fairy">'+fairySVG(state.fairy)+'</div><h2>Pronta para a aventura.</h2><p>'+esc(peerProfile.name)+' vai iniciar a partida. As vossas recompensas serão partilhadas.</p><div class="waiting"><i></i>À espera do anfitrião…</div>');
  }
  if(data.type==='start'&&role==='guest'&&validWorld(data.world)){try{adoptTeam(data.team);}catch{}matchMeta=data.meta||{};game=null;resultSaved='';receiveWorld(data.world);gameView();}
  if(data.type==='input'&&role==='host'&&game){game.input(1,data.x,data.y);for(const c of Array.isArray(data.commands)?data.commands.slice(0,8):[])game.command(1,c);}
  if(data.type==='world'&&role==='guest'){if(!remote){receiveWorld(data.world);if(remote)gameView();}else receiveWorld(data.world);}
  if(data.type==='team'){try{if(data.team?.id===state.team.id)adoptTeam(data.team);}catch{}}
  if(data.type==='ping')lan.send({type:'pong'});
  if(data.type==='leave'&&game){game.finish(false);}
  return;
 }
 if(type==='disconnected'){
  connected=false;peerProfile=null;input.x=input.y=0;game?.input(1,0,0);
  if(game&&!game.s.over){game.pause();lastOverlay='';showLost();}
  else if(remote&&!remote.over)showLost();
  else if(modalName==='lobby')showLobby();
  else if(modalName==='guest-lobby'||modalName==='connecting'){closeModal();toast('A sala foi fechada.');render();}
  return;
 }
 if(type==='networkError'){connected=false;toast(data);if(game||remote)showLost();else if(role==='guest')showJoin(lastInvite);return;}
 if(type==='backupSaved')toast(data);
 if(type==='restore'){try{const team=validateTeam(data.team||data);adoptTeam(team);closeModal();render();toast('Save importado. O progresso da equipa foi recuperado.');syncCloud(true);}catch(e){toast(e.message);}return;}
 if(type==='invitation'){lastInvite=data;if(!game&&!remote)showJoin(data);}
}
function showLost(){
 if(world()?.over)return;
 modal('lost','<div class="eyebrow">A VOSSA LIGAÇÃO PRECISA DE MAGIA</div><h2>A outra fada desligou-se.</h2><p>'+(role==='host'?'A partida está em pausa. A outra pessoa pode voltar a entrar com o mesmo convite.':'Volta a ligar-te à sala para continuar. O anfitrião precisa de ter a app aberta.')+'</p><div class="stack">'+(role==='guest'?'<button class="button full" data-action="reconnect">↻ Voltar a ligar</button>':'<button class="button secondary full" data-action="share-invite">Partilhar convite novamente</button>')+'<button class="button secondary full" data-action="finish-partial">Guardar recompensas e sair</button></div>');
}
function recordProgress(s,checkpoint=false){
 if(!s||s.time<5)return;
 const result=game&&role!=='guest'?game.result():{run_id:s.runId,duration:Math.floor(s.time),kills:s.kills,won:s.won,coop:s.players.length===2,unlocks:s.unlocks,bonus:s.coins};
 result.fortune=matchMeta.fortune||0;
 state.team=finishRun(state.team,result,state.device);
 state.checkpoint=checkpoint&&game&&s.players.length===1&&!s.over?game.save():null;persist();
 if(connected)lan.send({type:'team',team:state.team});
}
function saveResult(s){
 if(resultSaved===s.runId)return;resultSaved=s.runId;recordProgress(s,false);sound('end');vibrate();syncCloud(true);
}
function exitRun(){
 const s=world();if(s&&!s.over)recordProgress({...s,won:false},false);
 if(connected)lan.send({type:'leave'});
 game=null;remote=null;previousRemote=null;predicted=null;state.checkpoint=null;resultSaved='';connected=false;peerProfile=null;lan.disconnect();native?.awake?.(false);closeModal();page='home';persist();render();syncCloud(true);
}
function updateOverlay(s){
 if(s.over){
  saveResult(s);const key='over:'+s.runId;if(lastOverlay===key)return;lastOverlay=key;
  const reward=state.team.events.find(e=>e.id===s.runId)?.coins||0;
  modal('result','<div class="eyebrow">'+(s.won?'A LUZ DE MAGIX PREVALECEU':'CADA AVENTURA TORNA-VOS MAIS FORTES')+'</div><h2>'+(s.won?'A magia venceu.':'A próxima será vossa.')+'</h2><p>'+(s.players.length===2?'O progresso desta aventura pertence à vossa equipa.':'A tua aventura também faz crescer a equipa.')+'</p><div class="run-stats"><div><strong>'+formatTime(s.time)+'</strong><small>SOBREVIVÊNCIA</small></div><div><strong>'+s.kills+'</strong><small>SOMBRAS</small></div><div><strong>+'+reward+'</strong><small>MOEDAS DA EQUIPA</small></div></div><p class="muted">Nível '+s.level+' · '+s.bossKills+' bosses derrotados · '+(s.players.flatMap(p=>p.fusionEver).length)+' fusões nesta partida</p><div class="stack"><button class="button full" data-action="end-home">Voltar a Magix →</button><button class="button secondary full" data-action="backup">Guardar cópia da equipa</button></div>');return;
 }
 const pause=s.pause;
 if(!pause){if(['pause','pause-book','upgrade','waiting-choice'].includes(modalName))closeModal();lastOverlay='';return;}
 if(modalName==='lost')return;
 const local=localIndex(),p=s.players[local],key=pause.id+':'+pause.kind+':'+pauseBook+':'+JSON.stringify(pause.picked||pause.ready)+':'+p.rerolls+':'+bookTab+':'+bookSearch;
 if(lastOverlay===key)return;lastOverlay=key;
 if(pause.kind==='upgrade'){
  if(pause.picked[local])modal('waiting-choice','<div class="eyebrow">NÍVEL '+s.level+'</div><h2>A tua magia evoluiu.</h2><p>A outra fada está a escolher a sua melhoria. A aventura continua quando ambas estiverem prontas.</p><div class="waiting"><i></i>À espera da outra fada…</div>');
  else{sound('level');modal('upgrade','<div class="eyebrow">NÍVEL '+s.level+' · ESCOLHE UMA MELHORIA</div><h2>Faz crescer a tua magia.</h2><p>4 armas · 4 acessórios · combinações infinitamente vossas.</p><div class="choice-list">'+pause.choices[local].map(o=>'<button class="choice" data-action="choice" data-value="'+o.id+'"><span class="symbol">'+o.icon+'</span><span><strong>'+o.name+' <small style="display:inline">Nv. '+o.level+'</small></strong><small>'+o.text+'</small></span><span class="arrow">›</span></button>').join('')+'</div><button class="button secondary full compact" data-action="reroll" '+(p.rerolls<=0?'disabled':'')+'>↻ Novas opções ('+p.rerolls+' restantes)</button>');}
 }else if(pauseBook)modal('pause-book','<button class="icon-button close" data-action="pause-book-back" aria-label="Voltar à pausa">×</button><div class="eyebrow">A AVENTURA ESTÁ EM PAUSA</div><h2>Livro de combinações</h2>'+bookHTML(s),true);
 else modal('pause','<div class="eyebrow">UM MOMENTO PARA RESPIRAR</div><h2>A magia está em pausa.</h2><p>'+(s.players.length===2?'A partida continua quando ambos carregarem em Continuar.':'Consulta as combinações e prepara a próxima evolução.')+'</p><div class="run-stats"><div><strong>'+formatTime(s.time)+'</strong><small>TEMPO</small></div><div><strong>'+s.level+'</strong><small>NÍVEL</small></div><div><strong>'+s.kills+'</strong><small>SOMBRAS</small></div></div><div class="stack"><button class="button full" data-action="resume-game" '+(pause.ready[local]?'disabled':'')+'>'+(pause.ready[local]?'✓ Pronta · à espera da outra fada':'▶ Continuar')+'</button><button class="button secondary full" data-action="pause-book">✧ Livro de combinações</button><button class="button secondary full" data-action="save-leave">Guardar e terminar a partida</button></div>');
}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
function updateHud(s){
 const p=s.players[localIndex()]||s.players[0];
 $('#hud-time').textContent=formatTime(s.time);$('#hud-wave').textContent=s.time>=450?'A SOMBRA FINAL':s.time<12?'FLORESTA DE MAGIX':'ONDA '+Math.min(8,1+Math.floor(s.time/60));
 $('#hud-players').innerHTML=s.players.map(a=>{const f=FAIRIES.find(f=>f.id===a.fairy);return '<div class="hud-player" style="--fairy:'+f.color+'"><span class="glyph">'+f.icon+'</span><div><small>'+esc(a.name)+(a.down?' · a reanimar':a.transform===2?' · Believix':a.transform?' · Enchantix':'')+'</small><div class="hp-track"><i style="width:'+Math.max(0,a.hp/a.maxHp*100)+'%"></i></div></div></div>';}).join('');
 $('#hud-level').textContent='NÍVEL '+s.level;$('#hud-kills').textContent=s.kills+' sombras';$('#xp-fill').style.width=Math.min(100,s.xp/s.xpNeed*100)+'%';
 $('#ultimate').classList.toggle('ready',p.ultimate>=100);$('#ultimate-label').textContent=p.ultimate>=100?'MAGIA MÁXIMA':Math.floor(p.ultimate)+'%';
 $('#bond-meter').textContent=s.players.length===2?'♡ LIGAÇÃO '+Math.floor(s.bond)+'%':'';$('#bond-meter').style.display=s.players.length===2?'':'none';
 $('#game-tip').style.opacity=s.time<12?'1':'0';
 const wk=JSON.stringify(p.weapons);if(lastHud!==wk){lastHud=wk;$('#weapons-hud').innerHTML=p.weapons.map(w=>'<span class="weapon-mini '+(w.evolved?'evolved':'')+'" title="'+esc(weaponInfo(w.id).name)+'">'+weaponInfo(w.id).icon+'<small>'+(w.evolved?'✦':w.level)+'</small></span>').join('');}
 let pin='';if(state.pin?.startsWith('w:')){const w=WEAPONS[state.pin.slice(2)],owned=p.weapons.find(a=>a.id===state.pin.slice(2));if(w)pin='⌁ '+w.evolution+'<br>'+ (owned?.level||0)+'/8 · '+(p.passives[w.passive]||0)+'/5';}
 if(state.pin?.startsWith('f:')){const f=FUSIONS.find(x=>x.id===state.pin.slice(2));if(f)pin='⌁ '+f.name+'<br>'+ (p.weapons.some(w=>w.id===f.a&&w.evolved)?'✓':'○')+' + '+(p.weapons.some(w=>w.id===f.b&&w.evolved)?'✓':'○');}
 $('#pin-hud').innerHTML=pin;
}
function drawRemote(now,dt){
 const s=remote;if(!s)return null;const p=s.players[1];if(!s.pause&&!s.over&&connected&&predicted){const speed=165*(1+.05*(p.passives.pearl||0));predicted.x=Math.max(25,Math.min(2175,predicted.x+input.x*speed*dt));predicted.y=Math.max(25,Math.min(2175,predicted.y+input.y*speed*dt));}
 const elapsed=Math.min(.25,(now-remoteAt)/1000),alpha=Math.min(1,elapsed/.16),previous=new Map((previousRemote?.enemies||[]).map(e=>[e.id,e]));
 return{...s,time:s.time+(s.pause||s.over?0:elapsed),players:s.players.map((a,i)=>i===1&&predicted?{...a,x:predicted.x,y:predicted.y}:a),enemies:s.enemies.map(e=>{const old=previous.get(e.id);return old?{...e,x:old.x+(e.x-old.x)*alpha,y:old.y+(e.y-old.y)*alpha}:e;}),shots:s.shots.map(b=>({...b,x:b.x+(s.pause?0:b.vx*elapsed),y:b.y+(s.pause?0:b.vy*elapsed)})),fx:s.fx.map(e=>({...e,ttl:e.ttl-elapsed})).filter(e=>e.ttl>0)};
}
function frame(now){
 const dt=Math.min(.05,(now-frameTime)/1000);frameTime=now;clock=now;
 if(game||remote){
  let x=input.x,y=input.y;if(pointer===null){x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}input.x=x;input.y=y;}
  if(game){game.input(0,x,y);if(role==='host'&&now-lastPeer>600)game.input(1,0,0);game.step(dt);}
  const s=world();if(renderer&&s)renderer.draw(role==='guest'?drawRemote(now,dt):s,localIndex(),state.theme);
  if(now-hudAt>120){hudAt=now;updateHud(s);updateOverlay(s);}
  if(role==='host'&&connected&&now-sendAt>160){sendAt=now;lan.send({type:'world',world:s});}
  if(role==='guest'&&connected&&now-inputAt>50){inputAt=now;sendInput();}
  if(connected&&now-lastPeer>5000&&!stale){stale=true;game?.pause();showLost();}
  if(now-saveAt>15000&&!s.over){saveAt=now;recordProgress(s,true);syncCloud(true);}
 }else if(connected&&now-sendAt>1000){sendAt=now;lan.send({type:'ping'});}
 requestAnimationFrame(frame);
}

async function cloudAuth(form,mode){
 const button=form.querySelector('button[type="submit"]');form.classList.add('busy');$('#auth-error').textContent='';
 try{
  const values=new FormData(form),email=String(values.get('email')).trim(),password=String(values.get('password'));
  if(mode==='signup'){const r=await cloud.signUp(email,password,state.name);form.elements.password.value='';if(!r.confirmed){$('#auth-error').textContent='Conta criada. Confirma o teu email e depois entra aqui com a tua palavra-passe.';return;}}
  else await cloud.signIn(email,password);
  const info=await cloud.dashboard();if(info){adoptTeam(info.team);closeModal();page='team';render();await syncCloud(true);}else showCloudTeam();
 }catch(e){if($('#auth-error'))$('#auth-error').textContent=e.message;else toast(e.message);}
 finally{form.classList.remove('busy');}
}
document.addEventListener('submit',async e=>{
 const form=e.target;if(!(form instanceof HTMLFormElement))return;e.preventDefault();
 const values=new FormData(form);
 if(form.id==='profile-form'){state.name=String(values.get('name')).trim().slice(0,24)||'Fada';state.team.name=String(values.get('team')).trim().slice(0,40)||'A nossa equipa';persist();closeModal();render();sound('level');}
 if(form.id==='rename-form'){state.name=String(values.get('name')).trim().slice(0,24)||'Fada';persist();closeModal();render();toast('Nome guardado.');}
 if(form.id==='join-form'){
  if(!lan.enabled){toast('Instala a app Android para jogar por Wi-Fi.');return;}
  lastInvite=String(values.get('invitation')).trim();role='guest';modal('connecting','<div class="eyebrow">A ABRIR O PORTAL</div><h2>A ligar à sala…</h2><p>Mantém os dois telemóveis no mesmo Wi-Fi ou hotspot.</p>');lan.join(lastInvite);
 }
 if(form.id==='auth-form')await cloudAuth(form,e.submitter?.value||'login');
 if(form.id==='cloud-join-form'){
  form.classList.add('busy');
  try{const info=await cloud.join(String(values.get('code')),state.name);adoptTeam(info.team);closeModal();page='team';render();toast('Agora fazem parte da mesma equipa cloud.');}
  catch(err){toast(err.message);}finally{form.classList.remove('busy');}
 }
});
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-action]');if(!button||button.disabled)return;const a=button.dataset.action,v=button.dataset.value;
 if(a==='page'){page=v;bookSearch='';closeModal();render();return;}
 if(a==='fairy'){state.fairy=v;saveSoon();render();sound();return;}
 if(a==='close'){closeModal();return;}
 if(a==='settings'){showSettings();return;}
 if(a==='solo'){startSolo();return;}
 if(a==='continue-run'){startSolo(true);return;}
 if(a==='duo'){showDuo();return;}
 if(a==='host'){
  if(!lan.enabled){toast('O multiplayer Wi-Fi está disponível na app Android.');return;}
  connected=false;game=null;remote=null;peerProfile=null;hostingInfo=null;role='host';modal('creating','<div class="eyebrow">A PREPARAR O VOSSO PORTAL</div><h2>A criar a sala…</h2><p>Este telemóvel vai alojar a aventura.</p>');lan.startHost();return;
 }
 if(a==='join'){showJoin(lastInvite);return;}
 if(a==='wifi'){native?.wifi?.();if(!native)toast('Nos telemóveis, liga ambos ao mesmo Wi-Fi ou hotspot.');return;}
 if(a==='leave-lobby'){lan.disconnect();connected=false;peerProfile=null;hostingInfo=null;closeModal();render();return;}
 if(a==='share-invite'){
  if(!hostingInfo?.addresses?.length){toast('Não foi encontrado um endereço Wi-Fi.');return;}
  const url=invitation(hostingInfo.addresses[0]);lan.share('Vamos jogar Magix Duet! Liga-te ao meu Wi-Fi/hotspot e abre este convite:\n'+url+'\nOu cola na app: '+hostingInfo.addresses[0]+':'+hostingInfo.port+'#'+hostingInfo.code);
  if(!native)toast('Convite copiado.');return;
 }
 if(a==='start-duo'){startDuo();return;}
 if(a==='reconnect'){modal('connecting','<h2>A voltar à tua fada…</h2><p>A aguardar a ligação ao anfitrião.</p>');lan.join(lastInvite);return;}
 if(a==='pause'){command('pause');return;}
 if(a==='resume-game'){command('resume');pauseBook=false;lastOverlay='';return;}
 if(a==='choice'){command('choice',v);lastOverlay='';return;}
 if(a==='reroll'){command('reroll');lastOverlay='';return;}
 if(a==='ultimate'){command('ultimate');return;}
 if(a==='pause-book'){pauseBook=true;bookSearch='';lastOverlay='';updateOverlay(world());return;}
 if(a==='pause-book-back'){pauseBook=false;lastOverlay='';updateOverlay(world());return;}
 if(a==='book-tab'){bookTab=v;bookSearch='';if(game||remote){lastOverlay='';updateOverlay(world());}else render();return;}
 if(a==='pin'){state.pin=state.pin===v?null:v;saveSoon();if(game||remote){lastOverlay='';updateOverlay(world());}else render();return;}
 if(a==='save-leave'||a==='finish-partial'){
  if(game)game.finish(false);else if(remote){remote={...remote,over:true,won:false,pause:null};saveResult(remote);}
  if(connected&&role==='host')lan.send({type:'world',world:game.s});if(game)saveResult(game.s);exitRun();return;
 }
 if(a==='end-home'){exitRun();return;}
 if(a==='toggle'){state[v]=!state[v];saveSoon();showSettings();return;}
 if(a==='theme'){state.theme=state.theme==='lunar'?'magix':'lunar';saveSoon();showSettings();return;}
 if(a==='how'){modal('how',closeButton+'<div class="eyebrow">UM PEQUENO GRIMÓRIO</div><h2>Como jogar</h2><div class="howto"><p>Arrasta o dedo para voar. No computador, usa WASD ou as setas. As armas atacam automaticamente.</p><p>Recolhe as gemas azuis e escolhe uma melhoria ao subir de nível. Equipa até 4 armas e 4 acessórios.</p><p>Evolui uma arma com nível 8, o acessório certo a nível 5 e um baú de boss. Consulta todas as receitas na pausa.</p><p>Ao carregar a estrela, toca nela para libertar a magia máxima. No computador, usa Espaço.</p><p>Joguem perto para carregar a ligação. Se uma fada cair, a outra pode reanimá-la ficando perto durante 3 segundos.</p><p>Derrotem o boss final, que chega aos 7:30. As recompensas e as transformações pertencem à equipa.</p></div>');return;}
 if(a==='buy'){try{state.team=buy(state.team,v,state.device);persist();render();sound('level');vibrate();syncCloud(true);}catch(err){toast(err.message);}return;}
 if(a==='cancel-pending'){for(const id of derive(state.team).pending)state.team=cancelPending(state.team,id,state.device);persist();render();syncCloud(true);return;}
 if(a==='cloud'){showCloud();return;}
 if(a==='cloud-create'){
  button.disabled=true;try{const info=await cloud.create(state.team,state.name);adoptTeam(info.team);closeModal();page='team';render();toast('Equipa guardada na cloud. Partilha o código com a tua namorada.');}catch(err){toast(err.message);button.disabled=false;}return;
 }
 if(a==='sync'){await syncCloud();return;}
 if(a==='share-team'){if(cloud.info?.code)lan.share('A nossa equipa Magix Duet: '+state.team.name+'\nCria a tua conta na app e entra com o código de equipa '+cloud.info.code+'.');return;}
 if(a==='cloud-switch'){modal('cloud-team',closeButton+'<div class="eyebrow">PARTILHAR O MESMO CAMINHO</div><h2>Entrar noutra equipa</h2><p>A equipa atual fica guardada neste telemóvel. Introduz o código que aparece na conta da tua namorada.</p><form id="cloud-join-form" class="stack"><label>Código de equipa<input name="code" required maxlength="20" autocomplete="off"></label><button class="button full" type="submit">Entrar nesta equipa</button></form>');return;}
 if(a==='recover'){const email=$('#auth-form')?.elements.email.value;if(!email){toast('Escreve o teu email primeiro.');return;}try{await cloud.recover(email);toast('Se a conta existir, receberás um email para recuperar o acesso.');}catch(err){toast(err.message);}return;}
 if(a==='logout'){try{await cloud.signOut();closeModal();render();toast('Sessão cloud terminada. O save local foi mantido.');}catch(err){toast(err.message);}return;}
 if(a==='share-apk'){if(native)native.shareApk();else toast('Na app Android podes partilhar o próprio instalador.');return;}
 if(a==='backup'){
  const value=JSON.stringify({kind:'magix-duet-team',version:1,team:state.team},null,2);if(native)native.backup(value);else{const url=URL.createObjectURL(new Blob([value],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='Magix-Duet-Equipa.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}return;
 }
 if(a==='restore'){
  if(native)native.restore();else{const file=document.createElement('input');file.type='file';file.accept='application/json';file.onchange=async()=>{try{onNetwork('restore',JSON.parse(await file.files[0].text()));}catch{toast('Cópia de segurança inválida.');}};file.click();}return;
 }
 if(a==='archives'){modal('archives',closeButton+'<div class="eyebrow">HISTÓRIAS GUARDADAS</div><h2>Equipas arquivadas</h2><p>Ao recuperar uma equipa, a atual fica arquivada. A tua conta cloud mantém a sua equipa até a mudares.</p><div class="stack">'+state.archives.map((t,i)=>'<button class="button secondary full" data-action="archive-use" data-value="'+i+'">'+esc(t.name)+' · '+derive(t).runs+' aventuras</button>').join('')+'</div>');return;}
 if(a==='archive-use'){const t=state.archives[Number(v)];if(t){state.archives=state.archives.filter(x=>x.id!==t.id);adoptTeam(t);closeModal();render();}return;}
});
document.addEventListener('input',e=>{
 if(e.target.id!=='book-search')return;bookSearch=e.target.value;
 const position=e.target.selectionStart;
 if(game||remote){lastOverlay='';updateOverlay(world());}else render();
 const field=$('#book-search');if(field){field.focus();try{field.setSelectionRange(position,position);}catch{}}
});
document.addEventListener('keydown',e=>{
 if(e.target.matches('input,textarea,select'))return;
 const key=e.key.toLowerCase();keys.add(key);
 if(game||remote){if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();if(!e.repeat&&key===' ')command('ultimate');if(!e.repeat&&(key==='escape'||key==='p'))command('pause');}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.addEventListener('pointerdown',e=>{
 if(!(game||remote)||e.target.closest('button')||!e.target.closest('.game-wrap')||pointer!==null||world()?.pause||world()?.over)return;
 pointer=e.pointerId;stickOrigin={x:e.clientX,y:e.clientY};const stick=$('#stick');stick.style.left=(e.clientX-52)+'px';stick.style.top=(e.clientY-52)+'px';stick.style.bottom='auto';try{$('#game-canvas').setPointerCapture(e.pointerId);}catch{}e.preventDefault();
},{passive:false});
document.addEventListener('pointermove',e=>{
 if(pointer!==e.pointerId)return;const dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y,l=Math.hypot(dx,dy),scale=l>42?42/l:1;
 input.x=dx*scale/42;input.y=dy*scale/42;const knob=$('#stick-knob');if(knob)knob.style.transform='translate('+(dx*scale)+'px,'+(dy*scale)+'px)';e.preventDefault();
},{passive:false});
function releasePointer(e){if(e&&pointer!==e.pointerId)return;pointer=null;input.x=input.y=0;const knob=$('#stick-knob'),stick=$('#stick');if(knob)knob.style.transform='';if(stick){stick.style.left='';stick.style.top='';stick.style.bottom='';}}
document.addEventListener('pointerup',releasePointer);document.addEventListener('pointercancel',releasePointer);
window.addEventListener('blur',()=>{keys.clear();releasePointer();});
window.magixBack=()=>{if(game||remote){if(pauseBook){pauseBook=false;lastOverlay='';updateOverlay(world());}else command('pause');return true;}if(modalName){if(['lobby','guest-lobby','connecting'].includes(modalName)){lan.disconnect();connected=false;peerProfile=null;}closeModal();return true;}if(page!=='home'){page='home';render();return true;}return false;};
window.magixBackground=()=>{keys.clear();releasePointer();if(world()&&!world().over){command('pause');if(role==='host'&&connected)lan.send({type:'world',world:game.s});recordProgress(world(),true);}persist();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)window.magixBackground();else syncCloud(true);});
window.addEventListener('online',()=>syncCloud(true));window.addEventListener('pagehide',()=>{if(world())recordProgress(world(),true);persist();});
setInterval(()=>{if(cloud.session)syncCloud(true);},60000);
render();if(!state.name)showSetup();
if(native){const pending=native.invitation?.();if(pending&&state.name){lastInvite=pending;showJoin(pending);}}
if(cloud.session)cloud.dashboard().then(info=>{if(info&&info.team.id===state.team.id)syncCloud(true);if(page==='team'&&!game&&!remote)render();}).catch(()=>{});
if(new URLSearchParams(location.search).has('test'))window.MagixTest={get state(){return state;},get world(){return world();},get role(){return role;},get game(){return game;},get connected(){return connected;},command,showSetup,showDuo,derive:()=>derive(state.team)};
requestAnimationFrame(frame);
