const URL_BASE=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const hash=async(s:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function service(path:string,body:unknown,method='POST'){
 const r=await fetch(URL_BASE+path,{method,headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(body)});
 let data:any=null;try{data=await r.json();}catch{}return{ok:r.ok,status:r.status,data};
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Método inválido.'},405);
 try{
  const length=Number(req.headers.get('content-length')||0);if(length>4096)return reply({error:'Pedido inválido.'},400);
  const raw=await req.text();if(raw.length>4096)return reply({error:'Pedido inválido.'},400);
  const b=JSON.parse(raw),username=String(b.username||'').toLowerCase().trim(),password=String(b.password||'');
  if(!/^[a-z0-9_]{3,24}$/.test(username)||password.length<8||password.length>72)return reply({error:'Usa um nome de conta com 3–24 letras minúsculas, números ou _, e uma palavra-passe com 8–72 caracteres.'},400);
  const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const gate=await service('/rest/v1/rpc/magix_account_gate',{p_key:await hash(SERVICE_KEY+'|'+ip)});
  if(!gate.ok)return reply({error:'O serviço de contas está temporariamente indisponível.'},503);
  if(gate.data!==true)return reply({error:'Demasiadas tentativas. Aguarda uma hora e volta a tentar.'},429);
  const email=username+'@accounts.magix.invalid';
  if(b.action==='register'){
   const recovery=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','').slice(0,8);
   const created=await service('/auth/v1/admin/users',{email,password,email_confirm:true,user_metadata:{display_name:String(b.name||username).slice(0,24),magix_username:username}});
   if(!created.ok)return reply({error:created.status===422?'Este nome de conta já está em uso. Escolhe outro ou entra na conta.':'Não foi possível criar a conta. Tenta novamente.'},400);
   const stored=await service('/rest/v1/rpc/magix_account_register',{p_username:username,p_user_id:created.data.id,p_hash:await hash(recovery)});
   if(!stored.ok){await service('/auth/v1/admin/users/'+created.data.id,{},'DELETE');return reply({error:'Não foi possível terminar a criação. Tenta novamente.'},503);}
   return reply({ok:true,username,recovery_code:recovery});
  }
  if(b.action==='recover'){
   const code=String(b.recovery_code||'').replace(/[\s-]/g,'').toLowerCase();
   if(!/^[a-f0-9]{40}$/.test(code))return reply({error:'Código de recuperação inválido.'},400);
   const recovery=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','').slice(0,8),oldHash=await hash(code),newHash=await hash(recovery);
   const record=await service('/rest/v1/rpc/magix_account_recover',{p_username:username,p_hash:oldHash,p_new_hash:newHash});
   if(!record.ok||!record.data)return reply({error:'Nome de conta ou código de recuperação inválido.'},400);
   const changed=await service('/auth/v1/admin/users/'+record.data,{password},'PUT');
   if(!changed.ok){await service('/rest/v1/rpc/magix_account_recover',{p_username:username,p_hash:newHash,p_new_hash:oldHash});return reply({error:'Não foi possível mudar a palavra-passe. Tenta novamente.'},503);}
   return reply({ok:true,username,recovery_code:recovery});
  }
  if(b.action==='delete'){
   const signed=await fetch(URL_BASE+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
   if(!signed.ok)return reply({error:'Nome de conta ou palavra-passe inválidos.'},401);
   const session=await signed.json(),uid=session.user.id;
   const dashboard=await fetch(URL_BASE+'/rest/v1/rpc/magix_dashboard',{method:'POST',headers:{apikey:ANON_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}'}).then(r=>r.json());
   const deleted=await service('/auth/v1/admin/users/'+uid,{},'DELETE');
   if(!deleted.ok)return reply({error:'Não foi possível apagar a conta.'},503);
   if(dashboard?.team?.id)await service('/rest/v1/rpc/magix_account_cleanup',{p_team:dashboard.team.id});
   return reply({ok:true});
  }
  return reply({error:'Operação inválida.'},400);
 }catch{return reply({error:'Não foi possível concluir o pedido. Tenta novamente.'},500);}
});
