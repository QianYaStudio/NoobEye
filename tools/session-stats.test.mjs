import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../backend/worker.js';
import {SessionClock,formatTime} from '../site/session.js';
const origin='https://qianyastudio.github.io';
function fixture(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../backend/schema.sql',import.meta.url),'utf8'));const DB={prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args)||null;},async run(){return sqlite.prepare(sql).run(...args);}};},async first(){return sqlite.prepare(sql).get()||null;}};}};return{sqlite,env:{DB,ALLOWED_ORIGINS:origin}};}
async function call(env,path,body){const r=await worker.fetch(new Request('https://stats.example'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),env);return{status:r.status,body:await r.json()};}
test('timer pauses without counting hidden time and restores elapsed time',()=>{let now=0;const c=new SessionClock(()=>now);now=5000;c.tick();assert.equal(c.elapsedMs,0);c.setActive(true);now=7500;c.setActive(false);now=20000;c.tick();assert.equal(c.elapsedMs,2500);c.setActive(true);now=23500;c.finish();now=29000;assert.equal(c.tick(),6000);const saved=c.snapshot();const restored=new SessionClock(()=>now);restored.load(saved);restored.setActive(true);now+=10000;assert.equal(restored.tick(),6000);assert.equal(formatTime(65000),'01:05');});
test('start and complete are idempotent; completion requires a matching start',async()=>{const{sqlite,env}=fixture(),body={runId:crypto.randomUUID(),visitorId:crypto.randomUUID(),issue:'011',revision:2};assert.equal((await call(env,'/runs/start',body)).status,200);await call(env,'/runs/start',body);sqlite.prepare('UPDATE runs SET started_at=?').run(Date.now()-60000);const result={...body,elapsedMs:20000,hints:0,mistakes:1,eligible:true};assert.equal((await call(env,'/runs/complete',result)).status,200);await call(env,'/runs/complete',{...result,elapsedMs:4000});const stats=(await call(env,'/stats?issue=011&revision=2')).body;assert.equal(stats.players,1);assert.equal(stats.completions,1);assert.equal(sqlite.prepare('SELECT elapsed_ms FROM runs').get().elapsed_ms,20000);assert.equal((await call(env,'/runs/complete',{...result,runId:crypto.randomUUID()})).status,409);sqlite.close();});
test('percentile uses real best-per-visitor data, same hint cohort, and a minimum sample',async()=>{const{sqlite,env}=fixture();const subject=crypto.randomUUID();for(let i=0;i<20;i++){const visitor=crypto.randomUUID();sqlite.prepare('INSERT INTO runs VALUES(?,?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),visitor,'011',2,Date.now()-100000,Date.now(),20000+i*1000,0,0,1);sqlite.prepare('INSERT INTO runs VALUES(?,?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),visitor,'011',2,Date.now()-100000,Date.now(),99000,0,0,1);}sqlite.prepare('INSERT INTO runs VALUES(?,?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),crypto.randomUUID(),'011',2,Date.now()-100000,Date.now(),5000,2,0,1);const body={runId:crypto.randomUUID(),visitorId:subject,issue:'011',revision:2};await call(env,'/runs/start',body);sqlite.prepare('UPDATE runs SET started_at=? WHERE run_id=?').run(Date.now()-60000,body.runId);const r=await call(env,'/runs/complete',{...body,elapsedMs:30000,hints:0,mistakes:0,eligible:true});assert.equal(r.body.rank.sampleSize,20);assert.equal(r.body.rank.percentile,45);const hintBody={...body,runId:crypto.randomUUID()};await call(env,'/runs/start',hintBody);sqlite.prepare('UPDATE runs SET started_at=? WHERE run_id=?').run(Date.now()-60000,hintBody.runId);const hintResult=await call(env,'/runs/complete',{...hintBody,elapsedMs:30000,hints:1,mistakes:0,eligible:true});assert.equal(hintResult.body.rank.sampleSize,1);assert.equal(hintResult.body.rank.percentile,null);sqlite.close();});
test('invalid results and unapproved origins are rejected; old partial runs are not ranked',async()=>{const{sqlite,env}=fixture(),body={runId:crypto.randomUUID(),visitorId:crypto.randomUUID(),issue:'003',revision:2};const blocked=await worker.fetch(new Request('https://stats.example/stats?issue=003&revision=2',{headers:{Origin:'https://elsewhere.example'}}),env);assert.equal(blocked.status,403);await call(env,'/runs/start',body);assert.equal((await call(env,'/runs/complete',{...body,elapsedMs:-1,hints:0,mistakes:0,eligible:true})).status,400);const r=await call(env,'/runs/complete',{...body,elapsedMs:0,hints:0,mistakes:0,eligible:false});assert.equal(r.body.rank,null);assert.equal((await call(env,'/stats?issue=003&revision=2')).body.completedPlayers,1);sqlite.close();});


test('every published issue supports stats, starts and completions',async()=>{
 const catalog=JSON.parse(readFileSync(new URL('../site/catalog.json',import.meta.url),'utf8'));
 const {sqlite,env}=fixture();
 try{
  for(const issue of catalog.issues){
   const body={runId:crypto.randomUUID(),visitorId:crypto.randomUUID(),issue:issue.id,revision:issue.gameplayRevision};
   assert.equal((await call(env,`/stats?issue=${issue.id}&revision=${issue.gameplayRevision}`)).status,200,`stats ${issue.id}`);
   assert.equal((await call(env,'/runs/start',body)).status,200,`start ${issue.id}`);
   sqlite.prepare('UPDATE runs SET started_at=? WHERE run_id=?').run(Date.now()-60000,body.runId);
   assert.equal((await call(env,'/runs/complete',{...body,elapsedMs:20000,hints:0,mistakes:0,eligible:true})).status,200,`complete ${issue.id}`);
  }
 }finally{sqlite.close();}
});
