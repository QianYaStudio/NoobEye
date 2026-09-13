import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../backend/worker.js';
const origin='https://qianyastudio.github.io';
function fixture(t){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../backend/schema.sql',import.meta.url),'utf8'));t.after(()=>sqlite.close());
 const DB={prepare(sql){return{bind(...args){return{async first(){return sqlite.prepare(sql).get(...args)||null;},async run(){return sqlite.prepare(sql).run(...args);}};}};}};
 const calls=[];let fail=false,existing=null;
 t.mock.method(globalThis,'fetch',async(url,options)=>{const body=options.body?JSON.parse(options.body):null;calls.push({url,method:options.method,body});if(fail)return Response.json({error:'down'},{status:500});if(options.method==='GET')return existing?Response.json(existing):Response.json({},{status:404});return Response.json({id:'contact-id'});});
 const env={DB,ALLOWED_ORIGINS:origin,RESEND_API_KEY:'fixture',RESEND_SEGMENT_ID:'segment',RESEND_TOPIC_ZH:'zh',RESEND_TOPIC_EN:'en',RESEND_TOPIC_JA:'ja',MAIL_FROM:'NoobEye <noobeye@updates.deadnine.com>',PUBLIC_API_URL:'https://api.example'};
 const call=(path,body,headers={Origin:origin})=>worker.fetch(new Request('https://api.example'+path,{method:body?'POST':'GET',headers:{...headers,'Content-Type':typeof body==='string'?'application/x-www-form-urlencoded':'application/json'},body:body?(typeof body==='string'?body:JSON.stringify(body)):undefined}),env);
 const subscribe=()=>call('/subscriptions',{email:'Reader@example.com',locale:'ja',consent:true});
 const token=()=>calls.find(c=>c.url.endsWith('/emails')).body.text.match(/token=([a-f0-9]+)/)[1];
 return{sqlite,calls,call,subscribe,token,env,setFail:v=>fail=v,setExisting:v=>existing=v};
}
test('confirmation is required, scanner-safe, language-scoped and repeatable',async t=>{
 const f=fixture(t);assert.equal((await f.subscribe()).status,200);assert.equal(f.calls.length,1);
 assert.match(f.calls[0].body.subject,/購読/);const token=f.token();
 assert.notEqual(f.sqlite.prepare('SELECT token_hash FROM subscription_requests').get().token_hash,token);
 assert.equal((await f.call('/subscriptions/confirm?token='+token,null,{})).status,200);assert.equal(f.calls.length,1);
 const response=await f.call('/subscriptions/confirm','token='+token,{Origin:'https://api.example'});assert.equal(response.status,200);assert.match(await response.text(),/購読が完了/);
 const create=f.calls.find(c=>c.url.endsWith('/contacts'));assert.deepEqual(create.body.topics,[{id:'zh',subscription:'opt_out'},{id:'en',subscription:'opt_out'},{id:'ja',subscription:'opt_in'}]);
 const n=f.calls.length;await f.call('/subscriptions/confirm','token='+token,{});assert.equal(f.calls.length,n);
});
test('cooldown, malformed requests and unapproved origins never create contacts',async t=>{
 const f=fixture(t);await f.subscribe();assert.equal((await f.subscribe()).status,429);assert.equal(f.calls.length,1);
 assert.equal((await f.call('/subscriptions',{email:'a@example.com',locale:'en',consent:false})).status,400);
 assert.equal((await f.call('/subscriptions',{email:'a@example.com',locale:'en',consent:true},{Origin:'https://bad.example'})).status,403);
 assert.equal((await f.call('/subscriptions/confirm','token='+f.token(),{Origin:'https://bad.example'})).status,403);
 assert.equal((await f.call('/subscriptions/confirm?token=x',null,{})).status,400);
});
test('service failure is honest and permits retry; expiry removes pending addresses',async t=>{
 const f=fixture(t);f.setFail(true);assert.equal((await f.subscribe()).status,503);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM subscription_requests').get().n,0);
 f.setFail(false);await f.subscribe();const token=f.token();f.sqlite.prepare('UPDATE subscription_requests SET expires_at=0').run();assert.equal((await f.call('/subscriptions/confirm?token='+token,null,{})).status,410);
 await worker.scheduled({},f.env);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM subscription_requests').get().n,0);
});
test('existing contacts only change NoobEye preferences; global opt-out is preserved',async t=>{
 const f=fixture(t);await f.subscribe();f.setExisting({id:'existing',unsubscribed:true});assert.equal((await f.call('/subscriptions/confirm','token='+f.token(),{})).status,409);assert.equal(f.calls.filter(c=>c.method==='PATCH').length,0);
 f.setExisting({id:'existing',unsubscribed:false});assert.equal((await f.call('/subscriptions/confirm','token='+f.token(),{})).status,200);const patches=f.calls.filter(c=>c.method==='PATCH');assert.equal(patches.length,1);assert.match(patches[0].url,/\/topics$/);
});
