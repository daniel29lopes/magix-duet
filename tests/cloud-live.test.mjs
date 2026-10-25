import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {CLOUD} from '../src/config.js';
test('Live accounts: no-email registration, password login, shared team, recovery, isolation and cleanup',{timeout:60000},async()=>{
 const suffix=randomUUID().replaceAll('-','').slice(0,10),names=['qa_a_'+suffix,'qa_b_'+suffix],passwords=names.map(()=>randomUUID()+'Aa1!'),created=[false,false];let recovery='';
 async function request(path,body,token=null,allowFailure=false){
  const headers={apikey:CLOUD.publishableKey,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;
  const r=await fetch(CLOUD.url+path,{method:'POST',headers,body:JSON.stringify(body)});let data=null;try{data=await r.json();}catch{}
  if(!r.ok&&!allowFailure)throw new Error('Live cloud request failed '+path+' HTTP '+r.status+' '+String(data?.error||data?.msg||'').slice(0,200));
  return{status:r.status,ok:r.ok,data};
 }
 const account=(body,allowFailure=false)=>request('/functions/v1/magix-account',body,null,allowFailure);
 const login=i=>request('/auth/v1/token?grant_type=password',{email:names[i]+'@accounts.magix.invalid',password:passwords[i]});
 const rpc=(name,body,token)=>request('/rest/v1/rpc/'+name,body,token);
 try{
  for(let i=0;i<2;i++){const r=await account({action:'register',username:names[i],password:passwords[i],name:'QA '+i});created[i]=true;assert.equal(r.data.ok,true);assert.match(r.data.recovery_code,/^[a-f0-9]{40}$/);if(i===0)recovery=r.data.recovery_code;}
  const a=(await login(0)).data,b=(await login(1)).data;
  const doc={version:1,id:randomUUID(),name:'QA disposable team',creator:'test',events:[]};
  const first=(await rpc('magix_create_team',{p_doc:doc,p_display_name:'QA A'},a.access_token)).data;assert.equal(first.team.id,doc.id);
  const isolated=(await rpc('magix_dashboard',{},b.access_token)).data;assert.equal(isolated,null);
  const joined=(await rpc('magix_join_team',{p_code:first.code,p_display_name:'QA B'},b.access_token)).data;assert.equal(joined.team.id,doc.id);assert.equal(joined.members.length,2);
  const event={id:randomUUID(),type:'run',order:1,device:'qa',duration:60,kills:50,coins:62,won:false,coop:true,unlocks:[]};doc.events=[event];
  await rpc('magix_sync_team',{p_doc:doc},a.access_token);const synchronized=(await rpc('magix_sync_team',{p_doc:doc},b.access_token)).data;assert.equal(synchronized.team.events.length,1);
  const denied=await request('/rest/v1/rpc/magix_dashboard',{},null,true);assert.ok(denied.status===401||denied.status===403||denied.status===404);
  const invalid=await account({action:'recover',username:names[0],password:'DifferentPassword123!',recovery_code:'0'.repeat(40)},true);assert.equal(invalid.ok,false);
  const newPassword=randomUUID()+'Bb2!';const recovered=await account({action:'recover',username:names[0],password:newPassword,recovery_code:recovery});passwords[0]=newPassword;
  assert.equal(recovered.data.ok,true);assert.notEqual(recovered.data.recovery_code,recovery);const after=(await login(0)).data;
  const persisted=(await rpc('magix_dashboard',{},after.access_token)).data;assert.equal(persisted.team.events.length,1);
 }finally{for(let i=0;i<2;i++)if(created[i]){const deleted=await account({action:'delete',username:names[i],password:passwords[i]});assert.equal(deleted.data.ok,true);}}
});
