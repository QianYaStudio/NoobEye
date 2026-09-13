import {subscriptionRoute} from './subscriptions.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const issueValid=v=>/^(00[1-9]|01[0-2])$/.test(v);
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const json=(data,status,origin)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store'}});
async function counts(db,issue,revision){
 return db.prepare('SELECT COUNT(DISTINCT visitor_id) AS players, COUNT(DISTINCT CASE WHEN completed_at IS NOT NULL THEN visitor_id END) AS completedPlayers, COUNT(*) AS attempts, COUNT(completed_at) AS completions FROM runs WHERE issue=? AND revision=?').bind(issue,revision).first();
}
async function rank(db,run){
 if(!run.eligible)return null;
 // Compare one best result per OTHER visitor in the same issue, revision and hint cohort.
 const result=await db.prepare('SELECT COUNT(*) AS sampleSize, SUM(CASE WHEN best_ms > ? THEN 1 ELSE 0 END) AS slower FROM (SELECT visitor_id, MIN(elapsed_ms) AS best_ms FROM runs WHERE issue=? AND revision=? AND completed_at IS NOT NULL AND eligible=1 AND (hints>0)=? AND visitor_id<>? GROUP BY visitor_id)').bind(run.elapsed_ms,run.issue,run.revision,run.hints>0?1:0,run.visitor_id).first();
 const size=Number(result.sampleSize)||0;
 return {sampleSize:size,percentile:size<20?null:Math.round(Number(result.slower||0)/size*100),assisted:run.hints>0};
}
export default {
 async scheduled(_event,env){await env.DB.prepare('DELETE FROM subscription_requests WHERE expires_at<?').bind(Date.now()).run();},
 async fetch(request,env){
  const subscription=await subscriptionRoute(request,env);
  if(subscription)return subscription;
  const origin=request.headers.get('Origin')||'';
  const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);
  if(!origin||!allowed.includes(origin))return new Response('Origin not allowed',{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400','Vary':'Origin'}});
  try{
   const url=new URL(request.url);
   if(request.method==='GET'&&url.pathname==='/stats'){
    const issue=url.searchParams.get('issue'),revision=Number(url.searchParams.get('revision'));
    if(!issueValid(issue)||!integer(revision,1,10000))return json({error:'Invalid issue'},400,origin);
    const totals=await env.DB.prepare('SELECT COUNT(DISTINCT visitor_id) AS players, COUNT(DISTINCT CASE WHEN completed_at IS NOT NULL THEN visitor_id END) AS completedPlayers FROM runs').first();
    return json({...await counts(env.DB,issue,revision),totalPlayers:totals.players,totalCompletedPlayers:totals.completedPlayers},200,origin);
   }
   if(request.method!=='POST'||!['/runs/start','/runs/complete'].includes(url.pathname))return json({error:'Not found'},404,origin);
   if(env.EVENT_LIMITER){const {success}=await env.EVENT_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});if(!success)return json({error:'Please try later'},429,origin);}
   if(Number(request.headers.get('Content-Length'))>2048)return json({error:'Request too large'},413,origin);
   const text=await request.text();if(text.length>2048)return json({error:'Request too large'},413,origin);
   let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid JSON'},400,origin);}
   const {runId,visitorId,issue,revision}=body||{};
   if(!UUID.test(runId)||!UUID.test(visitorId)||!issueValid(issue)||!integer(revision,1,10000))return json({error:'Invalid run'},400,origin);
   const now=Date.now();
   if(url.pathname==='/runs/start'){
    await env.DB.prepare('INSERT OR IGNORE INTO runs (run_id,visitor_id,issue,revision,started_at) VALUES (?,?,?,?,?)').bind(runId,visitorId,issue,revision,now).run();
    const run=await env.DB.prepare('SELECT * FROM runs WHERE run_id=?').bind(runId).first();
    if(run.visitor_id!==visitorId||run.issue!==issue||run.revision!==revision)return json({error:'Run conflict'},409,origin);
    return json({ok:true},200,origin);
   }
   const {elapsedMs,hints,mistakes,eligible}=body;
   if(!integer(elapsedMs,0,86400000)||!integer(hints,0,10000)||!integer(mistakes,0,100000)||typeof eligible!=='boolean')return json({error:'Invalid result'},400,origin);
   let run=await env.DB.prepare('SELECT * FROM runs WHERE run_id=? AND visitor_id=? AND issue=? AND revision=?').bind(runId,visitorId,issue,revision).first();
   if(!run)return json({error:'Start this run first'},409,origin);
   // Results arriving after a long offline period may count as completions, but are not ranked.
   const rankable=eligible&&elapsedMs>=3000&&elapsedMs<=now-run.started_at+2000;
   await env.DB.prepare('UPDATE runs SET completed_at=?,elapsed_ms=?,hints=?,mistakes=?,eligible=? WHERE run_id=? AND completed_at IS NULL').bind(now,elapsedMs,hints,mistakes,rankable?1:0,runId).run();
   run=await env.DB.prepare('SELECT * FROM runs WHERE run_id=?').bind(runId).first();
   return json({ok:true,rank:await rank(env.DB,run)},200,origin);
  }catch{return json({error:'Statistics temporarily unavailable'},503,origin);}
 }
};
