import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
const source=fs.readFileSync('app/src/main/java/pt/magix/duet/MainActivity.java','utf8');
const start=source.indexOf(' private static String line('),end=source.indexOf(' public final class Bridge');
const sendStart=source.indexOf('  @JavascriptInterface public void send(String text)'),sendEnd=source.indexOf('  @JavascriptInterface public String invitation()',sendStart);
if(start<0||end<0||sendStart<0||sendEnd<0)throw new Error('Native transport source boundaries changed. Update the harness deliberately.');
const methods=source.slice(start,end),send=source.slice(sendStart,sendEnd).replace('@JavascriptInterface ','');
const java=fs.readFileSync('tests/native/LanHarness.template.java','utf8').replace('__METHODS__',methods).replace('__SEND__',send);
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'magix-lan-'));
try{
 const base='https://repo.maven.apache.org/maven2/org/json/json/20240303/json-20240303.jar';
 const [jar,hash]=await Promise.all([
  fetch(base).then(async r=>{if(!r.ok)throw new Error('JSON test dependency unavailable');return Buffer.from(await r.arrayBuffer());}),
  fetch(base+'.sha256').then(async r=>{if(r.ok)return{algorithm:'sha256',value:(await r.text()).trim()};const fallback=await fetch(base+'.sha1');if(!fallback.ok)throw new Error('Dependency checksum unavailable');return{algorithm:'sha1',value:(await fallback.text()).trim()};})
 ]);
 if(crypto.createHash(hash.algorithm).update(jar).digest('hex')!==hash.value)throw new Error('JSON test dependency checksum mismatch');
 const jarPath=path.join(folder,'json.jar');fs.writeFileSync(jarPath,jar);fs.writeFileSync(path.join(folder,'LanHarness.java'),java);
 for(const [cmd,args] of [['javac',['-encoding','UTF-8','-cp',jarPath,path.join(folder,'LanHarness.java')]],['java',['-cp',folder+path.delimiter+jarPath,'LanHarness']]]){
  const r=spawnSync(cmd,args,{stdio:'inherit',timeout:45000});if(r.status!==0)throw new Error('Native LAN verification failed: '+cmd);
 }
}finally{fs.rmSync(folder,{recursive:true,force:true});}
