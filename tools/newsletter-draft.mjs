// Creates reviewable Resend drafts. Sending is an explicit action in Resend.
import {readFile} from 'node:fs/promises';
import {resend} from '../backend/resend.js';
const [issueId,siteUrl]=process.argv.slice(2);
if(!/^\d{3}$/.test(issueId||'')||!siteUrl)throw Error('Usage: node tools/newsletter-draft.mjs 013 https://your-published-site/');
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(await readFile(new URL('site/catalog.json',root),'utf8'));
const publication=JSON.parse(await readFile(new URL('tools/publication.json',root),'utf8'));
const issue=catalog.issues.find(i=>i.id===issueId);
if(!issue||publication.withheldIssues.includes(issueId))throw Error('Only published catalogue issues can be announced.');
const play=new URL(siteUrl);if(play.protocol!=='https:'||play.hostname==='localhost'||!play.hostname.includes('.')||/^\d+(\.\d+){3}$/.test(play.hostname))throw Error('A public HTTPS magazine URL is required.');
play.searchParams.set('issue',issueId);play.hash='play';
const config=JSON.parse(await readFile(new URL('backend/wrangler.jsonc',root),'utf8'));
let local='';try{local=await readFile(new URL('backend/.dev.vars',root),'utf8');}catch{}
const key=process.env.RESEND_API_KEY||local.split(/\r?\n/).find(s=>s.startsWith('RESEND_API_KEY='))?.slice(15);
if(!key)throw Error('Set RESEND_API_KEY in the environment or ignored backend/.dev.vars.');
const env={...config.vars,RESEND_API_KEY:key};
if(!env.RESEND_SEGMENT_ID||!env.MAIL_FROM)throw Error('Configure Resend first.');
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const existing=[];let after='';
do{const page=await resend(env,'/broadcasts'+(after?'?after='+encodeURIComponent(after):''));existing.push(...page.data);after=page.has_more?page.data.at(-1).id:'';}while(after);
for(const [locale,title,description,action,unsubscribe] of [
 ['zh',`NoobEye 第 ${issueId} 期已上线`,issue.title,'打开杂志，开始寻找','退订 / 管理订阅'],
 ['en',`NoobEye issue ${issueId} is here`,issue.english,'Open the journal and explore','Unsubscribe / Manage preferences'],
 ['ja',`NoobEye 第${issueId}号を公開しました`,'新しい発見が待っています。','雑誌を開いて探しに行く','購読解除 / 設定']
]){
 const name=`NoobEye issue ${issueId} ${locale}`;
 const previous=existing.find(b=>b.name===name);
 if(previous){console.log(`${locale}: existing broadcast ${previous.id}; skipped`);continue;}
 const draft=await resend(env,'/broadcasts','POST',{name,segment_id:env.RESEND_SEGMENT_ID,topic_id:env['RESEND_TOPIC_'+locale.toUpperCase()],from:env.MAIL_FROM,subject:title,send:false,text:`${title}\n${description}\n\n${action}: ${play.href}\n\n${unsubscribe}: {{{RESEND_UNSUBSCRIBE_URL}}}`,html:`<div style="font:17px/1.8 system-ui;max-width:560px;margin:32px auto"><p>NoobEye · FindPuzzle</p><h1>${esc(title)}</h1><p>${esc(description)}</p><p><a href="${esc(play.href)}">${action}</a></p><p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">${unsubscribe}</a></p><small>QianYaStudio</small></div>`});
 console.log(`${locale}: draft ${draft.id}`);
}
console.log('Review language, issue URL and recipients in Resend Broadcasts, then send there. No emails sent by this command.');
