import {resend} from './resend.js';
const locales=['zh','en','ja'];
const copy={
 zh:{title:'把下一次发现，寄给你。',confirm:'确认订阅',intro:'确认后，在 NoobEye · FindPuzzle 新一期正式上线时收到中文邮件。每封新刊邮件都可以退订。',done:'订阅成功。下一期见！',expired:'链接已过期或无效，请回到杂志重新订阅。',error:'邮件服务暂时不可用，请稍后重试。',global:'你曾退订 QianYaStudio 的全部邮件。请使用上一封新刊邮件中的订阅管理链接恢复订阅，再回来确认。',ignore:'若不是你发起的订阅，请忽略此邮件。链接在 48 小时后失效。'},
 en:{title:'Let the next discovery come to you.',confirm:'Confirm subscription',intro:'Receive English emails when a new NoobEye · FindPuzzle issue is published. Every issue email includes an unsubscribe link.',done:'You’re subscribed. See you next issue!',expired:'This link is invalid or expired. Please subscribe again from the journal.',error:'Email is temporarily unavailable. Please try again later.',global:'You previously unsubscribed from all QianYaStudio emails. Restore your preferences through the subscription management link in a previous issue email, then confirm again.',ignore:'If you did not request this, ignore this email. The link expires in 48 hours.'},
 ja:{title:'次の発見を、あなたのもとへ。',confirm:'購読を確認する',intro:'NoobEye · FindPuzzle の新刊公開時に日本語メールをお届けします。各メールからいつでも購読を解除できます。',done:'購読が完了しました。次号でお会いしましょう！',expired:'リンクが無効か、有効期限が切れています。雑誌から再度お申し込みください。',error:'メールサービスを利用できません。しばらくしてからお試しください。',global:'QianYaStudio のすべてのメールを解除済みです。以前の新刊メールにある購読管理リンクから設定を戻して、再度確認してください。',ignore:'心当たりのない場合は、このメールを無視してください。リンクの有効期限は48時間です。'}
};
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=(body,status,origin)=>Response.json(body,{status,headers:{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store'}});
function page(locale,message,token,status=200){const c=copy[locale];return new Response(`<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NoobEye · ${c.confirm}</title><style>body{margin:0;background:#f0eee5;color:#24281e;font:18px/1.7 system-ui;display:grid;min-height:100svh;place-items:center}main{max-width:560px;padding:40px}small{letter-spacing:.14em}h1{line-height:1.25}button{font:inherit;background:#ddf344;border:1px solid;padding:14px 24px;cursor:pointer}</style><main><small>NoobEye · FindPuzzle</small><h1>${c.title}</h1><p>${esc(message)}</p>${token?`<form method="post" action="/subscriptions/confirm"><input type="hidden" name="token" value="${esc(token)}"><button>${c.confirm}</button></form>`:''}<p><small>QianYaStudio</small></p></main></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'strict-origin','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});}
export function subscriptionReady(env){return Boolean(env.RESEND_API_KEY&&env.RESEND_SEGMENT_ID&&env.RESEND_TOPIC_ZH&&env.RESEND_TOPIC_EN&&env.RESEND_TOPIC_JA&&env.MAIL_FROM&&env.PUBLIC_API_URL);}
export async function subscriptionRoute(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin')||'';
 const confirmation=url.pathname==='/subscriptions/confirm';
 if(!confirmation&&url.pathname!=='/subscriptions')return null;
 let locale='en';
 try{
  if(confirmation){
   if(!['GET','POST'].includes(request.method))return new Response(null,{status:405});
   if(request.method==='POST'&&origin&&origin!==url.origin)return new Response(null,{status:403});
   if(Number(request.headers.get('Content-Length'))>2048)return new Response(null,{status:413});
   const raw=request.method==='POST'?await request.text():'';
   if(raw.length>2048)return new Response(null,{status:413});
   const token=request.method==='GET'?url.searchParams.get('token'):new URLSearchParams(raw).get('token');
   if(!/^[a-f0-9]{64}$/.test(token||''))return page(locale,copy[locale].expired,null,400);
   const hash=await digest(token);
   const row=await env.DB.prepare('SELECT * FROM subscription_requests WHERE token_hash=?').bind(hash).first();
   locale=row?.locale||locale;
   if(!row||row.expires_at<Date.now())return page(locale,copy[locale].expired,null,410);
   if(row.confirmed_at)return page(locale,copy[locale].done);
   // Email scanners may open links. Only the explicit form POST opts in.
   if(request.method==='GET')return page(locale,copy[locale].intro,token);
   if(!subscriptionReady(env))return page(locale,copy[locale].error,token,503);
   const path='/contacts/'+encodeURIComponent(row.email);
   let contact=await resend(env,path);
   if(contact?.unsubscribed)return page(locale,copy[locale].global,token,409);
   const topics=locales.map(l=>({id:env['RESEND_TOPIC_'+l.toUpperCase()],subscription:l===locale?'opt_in':'opt_out'}));
   if(!contact){
    contact=await resend(env,'/contacts','POST',{email:row.email,unsubscribed:false,segments:[{id:env.RESEND_SEGMENT_ID}],topics});
   }else{
    await resend(env,path+'/segments/'+env.RESEND_SEGMENT_ID,'POST');
    await resend(env,path+'/topics','PATCH',topics);
   }
   await env.DB.prepare('UPDATE subscription_requests SET confirmed_at=? WHERE token_hash=?').bind(Date.now(),hash).run();
   return page(locale,copy[locale].done);
  }
  const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim());
  if(!origin||!allowed.includes(origin))return new Response(null,{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}});
  if(request.method!=='POST')return json({error:'Method not allowed'},405,origin);
  if(!subscriptionReady(env))return json({error:'unavailable'},503,origin);
  if(env.SUBSCRIPTION_LIMITER&&!((await env.SUBSCRIPTION_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success))return json({error:'rate_limit'},429,origin);
  if(Number(request.headers.get('Content-Length'))>2048)return json({error:'invalid'},400,origin);
  const raw=await request.text();if(raw.length>2048)return json({error:'invalid'},400,origin);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid'},400,origin);}
  const email=String(body?.email||'').trim().toLowerCase();locale=locales.includes(body?.locale)?body.locale:'en';
  if(body?.website)return json({ok:true},200,origin);
  if(body?.consent!==true||!locales.includes(body?.locale)||email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))return json({error:'invalid'},400,origin);
  const now=Date.now();
  await env.DB.prepare('DELETE FROM subscription_requests WHERE expires_at<?').bind(now).run();
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),hash=await digest(token);
  await env.DB.prepare('INSERT INTO subscription_requests(email,locale,token_hash,requested_at,expires_at) VALUES(?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET locale=excluded.locale,token_hash=excluded.token_hash,requested_at=excluded.requested_at,expires_at=excluded.expires_at,confirmed_at=NULL WHERE subscription_requests.requested_at<?').bind(email,locale,hash,now,now+48*3600000,now-120000).run();
  const row=await env.DB.prepare('SELECT token_hash FROM subscription_requests WHERE email=?').bind(email).first();
  if(row.token_hash!==hash)return json({error:'rate_limit'},429,origin);
  const link=env.PUBLIC_API_URL.replace(/\/$/,'')+'/subscriptions/confirm?token='+token,c=copy[locale];
  try{await resend(env,'/emails','POST',{from:env.MAIL_FROM,to:[email],subject:`NoobEye · ${c.confirm}`,text:`${c.intro}\n\n${c.confirm}: ${link}\n\n${c.ignore}`,html:`<div style="font:16px/1.8 system-ui;max-width:560px;margin:32px auto"><p>NoobEye · FindPuzzle</p><h1>${c.title}</h1><p>${c.intro}</p><p><a href="${link}">${c.confirm}</a></p><p>${c.ignore}</p><small>QianYaStudio</small></div>`},'noobeye-confirm-'+hash);}catch(e){await env.DB.prepare('DELETE FROM subscription_requests WHERE token_hash=?').bind(hash).run();throw e;}
  return json({ok:true},200,origin);
 }catch{return confirmation?page(locale,copy[locale].error,null,503):json({error:'unavailable'},503,origin);}
}
