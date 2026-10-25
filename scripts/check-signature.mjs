import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const expected=fs.readFileSync('scripts/release-signing.sha256','utf8').trim(),tool=path.join(process.env.ANDROID_HOME,'build-tools/35.0.0/apksigner');
const r=spawnSync(tool,['verify','--print-certs',process.argv[2]],{encoding:'utf8'});if(r.status!==0)throw new Error('APK signature verification failed.');
const actual=r.stdout.match(/Signer #1 certificate SHA-256 digest: ([0-9a-f]+)/i)?.[1];
if(actual!==expected)throw new Error('Signing identity changed. Stop publication to protect installed app updates.');
console.log('PASS: update signing certificate matches v0.1.1 ('+actual+').');
