import {readSettings} from './settings.js';
let endpoint='';
let visitor;try{visitor=localStorage.getItem('noobeye:visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('noobeye:visitor',visitor);}}catch{visitor=crypto.randomUUID();}
export async function setupStats(){const config=await readSettings();endpoint=String(config.statsApi||'').replace(/\/$/,'');}
export const statsEnabled=()=>Boolean(endpoint);
async function request(path,body){
 if(!endpoint)return null;
 try{const response=await fetch(endpoint+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify({...body,visitorId:visitor}):undefined,signal:AbortSignal.timeout(6000)});return response.ok?await response.json():null;}catch{return null;}
}
export const startRun=(issue,runId)=>request('/runs/start',{issue:issue.id,revision:issue.gameplayRevision,runId});
export const finishRun=(issue,runId,elapsedMs,hints,mistakes,eligible=true)=>request('/runs/complete',{issue:issue.id,revision:issue.gameplayRevision,runId,elapsedMs:Math.round(elapsedMs),hints,mistakes,eligible});
export const readStats=issue=>request(`/stats?issue=${encodeURIComponent(issue.id)}&revision=${issue.gameplayRevision}`);
