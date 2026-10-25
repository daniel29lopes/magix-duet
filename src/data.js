export const FAIRIES=[
{id:'bloom',name:'Bloom',element:'Chama do Dragão',color:'#ff977a',hair:'#ce5439',skin:'#ffd2b3',weapon:'flame',icon:'🔥',description:'Queimaduras que se espalham.',unlock:'Evolui a Chama e derrota um boss.'},
{id:'stella',name:'Stella',element:'Sol e estrelas',color:'#ffdc83',hair:'#edbd54',skin:'#ffd4b1',weapon:'sun',icon:'☀',description:'Raios, críticos e muita luz.',unlock:'Evolui os Raios e recolhe 100 gemas.'},
{id:'flora',name:'Flora',element:'Natureza',color:'#9fe2b3',hair:'#976746',skin:'#dba67e',weapon:'vines',icon:'❀',description:'Raízes que protegem e curam.',unlock:'Evolui os Espinhos e recupera 200 de vida.'},
{id:'musa',name:'Musa',element:'Música',color:'#fb9cce',hair:'#292449',skin:'#f2c2af',weapon:'sound',icon:'♫',description:'Ondas que fazem o mundo vibrar.',unlock:'Evolui as Ondas e elimina 50 inimigos afetados.'},
{id:'tecna',name:'Tecna',element:'Tecnologia',color:'#bda4ff',hair:'#d783c3',skin:'#f7c6bb',weapon:'discs',icon:'◇',description:'Drones, precisão e ricochetes.',unlock:'Evolui os Discos e elimina 100 inimigos com eles.'},
{id:'aisha',name:'Aisha',element:'Água e Morphix',color:'#7cdbef',hair:'#7c4a39',skin:'#aa7457',weapon:'water',icon:'≈',description:'Ondas que abrem caminho.',unlock:'Evolui o Morphix e atinge 50 inimigos com ondas.'}
];
export const WEAPONS={
flame:{name:'Chama do Dragão',icon:'🔥',color:'#ff977a',passive:'heart',evolution:'Dragão Ancestral',effect:'Perfura e explode; espalha queimaduras.',damage:18,rate:.85,speed:420},
sun:{name:'Raios Solares',icon:'☀',color:'#ffdc83',passive:'prism',evolution:'Supernova',effect:'Raios múltiplos que ricocheteiam.',damage:15,rate:.9,speed:520},
vines:{name:'Espinhos Vivos',icon:'❀',color:'#9fe2b3',passive:'seed',evolution:'Jardim Eterno',effect:'Prende inimigos e cria uma zona de cura.',damage:14,rate:1.2,speed:330},
sound:{name:'Ondas Sonoras',icon:'♫',color:'#fb9cce',passive:'fork',evolution:'Sinfonia Cósmica',effect:'Ondas amplas que tornam os inimigos vulneráveis.',damage:13,rate:1.1,speed:300},
discs:{name:'Discos Digitais',icon:'◇',color:'#bda4ff',passive:'core',evolution:'Enxame Quântico',effect:'Drones perseguidores com ataques rápidos.',damage:12,rate:.65,speed:390},
water:{name:'Esferas de Morphix',icon:'≈',color:'#7cdbef',passive:'pearl',evolution:'Tsunami Morphix',effect:'Ondas largas que empurram e molham os inimigos.',damage:16,rate:1.05,speed:360},
ice:{name:'Cristais de Gelo',icon:'❄',color:'#a8e8ff',passive:'hourglass',evolution:'Zero Absoluto',effect:'Congela grupos; os inimigos estilhaçam ao cair.',damage:12,rate:1,speed:410},
moon:{name:'Lâminas Lunares',icon:'☾',color:'#d6c7ff',passive:'moonstone',evolution:'Eclipse',effect:'Lâminas orbitais que intercetam projéteis.',damage:12,rate:.8,speed:0},
lightning:{name:'Faíscas Elétricas',icon:'ϟ',color:'#e5ed9a',passive:'conductor',evolution:'Tempestade Viva',effect:'Descargas em cadeia; bónus contra inimigos molhados.',damage:17,rate:1.05,speed:650},
stars:{name:'Poeira de Fada',icon:'✦',color:'#f5c4f0',passive:'magnet',evolution:'Chuva Estelar',effect:'Meteoros e maior alcance de recolha.',damage:23,rate:1.5,speed:360}
};
export const PASSIVES={
heart:{name:'Coração Ígneo',icon:'♥',text:'+8% dano por nível'},
prism:{name:'Prisma de Luz',icon:'◈',text:'+5% crítico por nível'},
seed:{name:'Semente Vital',icon:'❧',text:'+0,25 vida/s por nível'},
fork:{name:'Diapasão Harmónico',icon:'♮',text:'+6% área por nível'},
core:{name:'Núcleo Quântico',icon:'⬡',text:'+6% velocidade de ataque por nível'},
pearl:{name:'Pérola das Marés',icon:'◉',text:'+5% velocidade de movimento por nível'},
hourglass:{name:'Ampulheta Glacial',icon:'⌛',text:'+10% duração de efeitos por nível'},
moonstone:{name:'Pedra Lunar',icon:'☽',text:'+4% resistência por nível'},
conductor:{name:'Condutor Arcano',icon:'ϟ',text:'+1 alvo encadeado por nível'},
magnet:{name:'Íman Encantado',icon:'✧',text:'+22 alcance de recolha por nível'}
};
export const FUSIONS=[
{id:'phoenix',name:'Fénix Celestial',a:'flame',b:'sun',icon:'𓅓',color:'#ffc18a',effect:'Uma fénix atravessa os inimigos e deixa fogo.',damage:75,rate:1.1,speed:430},
{id:'eden',name:'Éden das Marés',a:'vines',b:'water',icon:'❃',color:'#93e7bd',effect:'Um jardim móvel cura a equipa e prende inimigos.',damage:38,rate:.75,speed:340},
{id:'orchestra',name:'Orquestra Digital',a:'sound',b:'discs',icon:'♬',color:'#d2a5fc',effect:'Drones e pulsos sonoros atacam em conjunto.',damage:32,rate:.35,speed:450},
{id:'polar',name:'Tempestade Polar',a:'ice',b:'lightning',icon:'❅',color:'#b8f5ff',effect:'Descargas congelam e saltam entre inimigos.',damage:46,rate:.65,speed:600},
{id:'galaxy',name:'Galáxia Encantada',a:'moon',b:'stars',icon:'✺',color:'#e6b5ff',effect:'Estrelas orbitais protegem e atingem à distância.',damage:40,rate:.65,speed:400}
];
export const UPGRADES=[
{id:'power',name:'Magia',icon:'✦',text:'+6% dano',max:10},
{id:'vigor',name:'Vitalidade',icon:'♥',text:'+8 vida máxima',max:10},
{id:'haste',name:'Ritmo',icon:'ϟ',text:'+3% velocidade de ataque',max:10},
{id:'recovery',name:'Renovação',icon:'❧',text:'+0,12 vida/s',max:10},
{id:'fortune',name:'Fortuna',icon:'◈',text:'+5% moedas por partida',max:10},
{id:'reach',name:'Afinidade',icon:'⌁',text:'+12 alcance de recolha',max:10}
];
export const ACHIEVEMENTS=[
{id:'first',name:'Primeira faísca',text:'Completar uma partida.',test:p=>p.runs>=1,icon:'✦'},
{id:'hunters',name:'Guardiões de Magix',text:'Derrotar 1 000 inimigos em equipa.',test:p=>p.kills>=1000,icon:'⚔'},
{id:'victory',name:'Luz contra as trevas',text:'Vencer uma partida.',test:p=>p.wins>=1,icon:'♛'},
{id:'duet',name:'A nossa magia',text:'Vencer em cooperativo.',test:p=>p.coop_wins>=1,icon:'♡'},
{id:'alchemists',name:'Alquimia de fadas',text:'Descobrir uma fusão.',test:p=>(p.unlocks||[]).some(x=>x.startsWith('fusion:')),icon:'⚗'},
{id:'enchantix',name:'Asas de Enchantix',text:'Desbloquear uma transformação.',test:p=>(p.unlocks||[]).some(x=>x.startsWith('enchantix:')),icon:'ʚɞ'}
];
export function weaponInfo(id){return WEAPONS[id]||FUSIONS.find(f=>f.id===id);}
export const THEMES=[{id:'magix',name:'Magix',subtitle:'Fadas, asas e magia',available:true},{id:'lunar',name:'Reino Lunar',subtitle:'Paleta alternativa desbloqueada',available:true}];
