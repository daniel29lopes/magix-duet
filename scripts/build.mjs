import {build} from 'esbuild';import fs from 'node:fs';
await build({entryPoints:['src/main.js'],bundle:true,format:'iife',target:['chrome100'],minify:true,outfile:'app/src/main/assets/bundle.js',legalComments:'eof'});
fs.rmSync('www',{recursive:true,force:true});fs.mkdirSync('www',{recursive:true});
for(const file of ['index.html','styles.css','bundle.js'])fs.copyFileSync('app/src/main/assets/'+file,'www/'+file);
console.log('Assets Android e versão de teste de navegador compilados. Sem serviços externos.');
