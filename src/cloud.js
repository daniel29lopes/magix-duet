import {CLOUD} from './config.js';
export class Cloud{
 constructor(session,onSession){this.session=session||null;this.onSession=onSession;this.enabled=!!(CLOUD.url&&CLOUD.publishableKey);this.info=null;this.refreshing=null;}
 async request(path,body,{auth=true,method='POST'}={}){
  if(!this.enabled)throw new Error('O serviço cloud ainda não está disponível nesta versão.');
  if(auth)await this.token();
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
  try{
   const headers={'apikey':CLOUD.publishableKey,'Content-Type':'application/json'};
   if(auth&&this.session?.access_token)headers.Authorization='Bearer '+this.session.access_token;
   const r=await fetch(CLOUD.url+path,{method,headers,body:method==='GET'?undefined:JSON.stringify(body||{}),signal:abort.signal});
   const raw=await r.text();let data={};try{data=raw?JSON.parse(raw):{};}catch{}
   if(!r.ok){const code=data.error_code||data.code||data.error;
    if(code==='email_not_confirmed')throw new Error('Confirma o teu email e volta a entrar.');
    if(code==='invalid_credentials'||r.status===401)throw new Error('Não foi possível entrar. Confirma o email e a palavra-passe.');
    if(r.status===429)throw new Error('Foram feitas várias tentativas. Aguarda um pouco e tenta novamente.');
    throw new Error(path.includes('/auth/')?'Não foi possível concluir. Confirma os dados e tenta novamente.':'Não foi possível sincronizar a equipa. Tenta novamente com internet.');
   }
   if(data?.error)throw new Error(data.error);return data;
  }catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw new Error('Sem ligação à cloud. O progresso continua guardado neste telemóvel.');throw e;}
  finally{clearTimeout(timer);}
 }
 setSession(value){this.session=value?.access_token?{access_token:value.access_token,refresh_token:value.refresh_token,expires_at:Date.now()/1000+(value.expires_in||3600),user:{id:value.user?.id,email:value.user?.email}}:null;this.onSession(this.session);}
 async token(){
  if(!this.session)throw new Error('Entra na tua conta para sincronizar.');
  if(this.session.expires_at>Date.now()/1000+90)return;
  if(!this.refreshing)this.refreshing=this.request('/auth/v1/token?grant_type=refresh_token',{refresh_token:this.session.refresh_token},{auth:false}).then(d=>this.setSession(d)).finally(()=>this.refreshing=null);
  await this.refreshing;
 }
 async signIn(email,password){const d=await this.request('/auth/v1/token?grant_type=password',{email,password},{auth:false});this.setSession(d);return d;}
 async signUp(email,password,name){
  if(password.length<8)throw new Error('Escolhe uma palavra-passe com pelo menos 8 caracteres.');
  const d=await this.request('/auth/v1/signup',{email,password,data:{display_name:name}},{auth:false});
  if(d.access_token)this.setSession(d);return{confirmed:!!d.access_token};
 }
 async signOut(){try{if(this.session)await this.request('/auth/v1/logout',{});}finally{this.setSession(null);this.info=null;}}
 async recover(email){await this.request('/auth/v1/recover',{email},{auth:false});}
 async rpc(name,body={}){return this.request('/rest/v1/rpc/'+name,body);}
 async dashboard(){this.info=await this.rpc('magix_dashboard');return this.info;}
 async create(team,name){this.info=await this.rpc('magix_create_team',{p_doc:team,p_display_name:name});return this.info;}
 async join(code,name){this.info=await this.rpc('magix_join_team',{p_code:code.toUpperCase().replace(/\s/g,''),p_display_name:name});return this.info;}
 async sync(team){this.info=await this.rpc('magix_sync_team',{p_doc:team});return this.info;}
}
