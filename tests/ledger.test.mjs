import test from 'node:test';import assert from 'node:assert/strict';
import {freshTeam,mergeTeam,derive,finishRun,buy,addEvent,cancelPending,validateTeam} from '../src/ledger.js';
const result=(id,extra={})=>({run_id:id,duration:100,kills:100,won:false,coop:true,unlocks:[],fortune:0,...extra});
test('One coop run saved by both devices awards coins only once',()=>{
 const team=freshTeam();const a=finishRun(team,result('same-run'),'alpha'),b=finishRun(team,result('same-run'),'beta'),merged=mergeTeam(a,b);
 assert.equal(derive(merged).runs,1);assert.equal(derive(merged).coins,97);assert.deepEqual(mergeTeam(a,b),mergeTeam(b,a));assert.deepEqual(mergeTeam(merged,merged),merged);
});
test('Offline runs from either partner combine without losing progress',()=>{
 const team=freshTeam();const a=finishRun(team,result('a',{won:true}),'alpha'),b=finishRun(team,result('b',{kills:200}),'beta');
 const m=derive(mergeTeam(a,b));assert.equal(m.runs,2);assert.equal(m.wins,1);assert.equal(m.kills,300);
});
test('Longer checkpoint supersedes an earlier save of the same run',()=>{
 const team=freshTeam(),a=finishRun(team,result('a',{duration:20,kills:5}),'alpha'),b=finishRun(team,result('a',{duration:100,kills:100}),'beta');
 assert.equal(derive(mergeTeam(a,b)).coins,97);assert.equal(derive(mergeTeam(a,b)).runs,1);
});
test('Concurrent offline purchases converge and never create negative currency',()=>{
 const team=finishRun(freshTeam(),result('a',{coins:0,kills:150,coop:false}),'alpha');assert.equal(derive(team).coins,102);
 const a=buy(team,'power','alpha'),b=buy(team,'vigor','beta'),m=mergeTeam(a,b),p=derive(m);
 assert.equal(p.coins,2);assert.equal(p.pending.length,1);assert.equal(p.accepted.length,1);assert.deepEqual(derive(mergeTeam(b,a)),p);
 const canceled=cancelPending(m,p.pending[0],'alpha');assert.equal(derive(canceled).pending.length,0);
});
test('Independent teams cannot accidentally overwrite one another',()=>{
 assert.throws(()=>mergeTeam(freshTeam(),freshTeam()),/diferentes/);
 assert.throws(()=>validateTeam({version:1,id:'bad',events:'not-an-array'}));
});
test('Unknown upgrade requests and insufficient balances are rejected',()=>{
 assert.throws(()=>buy(freshTeam(),'power'),/moedas/);assert.throws(()=>buy(freshTeam(),'unknown'));
});
