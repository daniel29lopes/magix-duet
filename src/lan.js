import {uid} from './ledger.js';
export class Lan {
 constructor(onEvent){
  this.onEvent=onEvent;this.native=globalThis.MagixAndroid||null;this.testing=!this.native&&new URLSearchParams(location.search).has('test');this.enabled=!!this.native||this.testing;this.id=uid();this.peer=null;
  globalThis.MagixNativeEvent=e=>this.event(e.type,e.text);
  if(this.testing){this.channel=new BroadcastChannel('magix-duet-test');this.channel.onmessage=e=>this.receive(e.data);}
 }
 event(type,text){
  let data=text;try{if(type==='data'||type==='hosting'||type==='restore')data=JSON.parse(text);}catch{return;}
  this.onEvent(type,data);
 }
 startHost(){
  if(this.native)return this.native.startHost();
  if(!this.testing)return;
  this.code=String(Math.floor(Math.random()*1e8)).padStart(8,'0');this.hosting=true;
  this.onEvent('hosting',{addresses:['127.0.0.1'],port:31337,code:this.code});
 }
 join(invitation){
  if(this.native)return this.native.join(invitation);
  if(!this.testing)return;
  let code;try{code=invitation.startsWith('magix-duet://')?new URL(invitation).searchParams.get('code'):invitation.split('#')[1];}catch{}
  this.channel.postMessage({kind:'join',from:this.id,code});clearTimeout(this.timer);this.timer=setTimeout(()=>this.onEvent('networkError','Não foi possível encontrar a sala.'),4000);
 }
 receive(m){
  if(m.from===this.id)return;
  if(m.kind==='join'&&this.hosting&&m.code===this.code&&!this.peer){this.peer=m.from;this.channel.postMessage({kind:'accepted',from:this.id,to:m.from});this.onEvent('connected','host');}
  else if(m.kind==='accepted'&&m.to===this.id){clearTimeout(this.timer);this.peer=m.from;this.onEvent('connected','guest');}
  else if(m.to===this.id&&m.from===this.peer&&m.kind==='data')this.onEvent('data',m.payload);
  else if(m.to===this.id&&m.from===this.peer&&m.kind==='close'){this.peer=null;this.onEvent('disconnected','A outra fada saiu da sala.');}
 }
 send(payload){const text=JSON.stringify(payload);if(this.native)this.native.send(text);else if(this.testing&&this.peer)this.channel.postMessage({kind:'data',from:this.id,to:this.peer,payload});}
 disconnect(){if(this.native)this.native.disconnect();else if(this.peer){this.channel.postMessage({kind:'close',from:this.id,to:this.peer});this.peer=null;}this.hosting=false;clearTimeout(this.timer);}
 share(text){if(this.native)this.native.share(text);else navigator.clipboard?.writeText(text).catch(()=>{});}
}
