import {language,tr} from './i18n.js?v=issue-019-20260925';
import {readSettings} from './settings.js';
export function setupSubscriptions(){
 const section=document.createElement('section');section.id='subscribe';section.className='newsletter';
 section.innerHTML='<div><span class="eyebrow">POST FROM NOOBEYE</span><h2></h2><p class="newsletter-description"></p></div><form><label class="email-label" for="subscribe-email"></label><div class="newsletter-fields"><input id="subscribe-email" name="email" type="email" autocomplete="email" maxlength="254" required placeholder="you@example.com"><button type="submit"></button></div><label class="newsletter-language"><span></span><select name="locale" aria-label="Email language"><option value="zh">中文</option><option value="en">English</option><option value="ja">日本語</option></select></label><label class="newsletter-consent"><input type="checkbox" name="consent" required><span></span></label><label class="newsletter-trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><p class="newsletter-status" role="status" aria-live="polite"></p></form>';
 document.querySelector('footer').before(section);
 const form=section.querySelector('form'),button=form.querySelector('button'),status=form.querySelector('[role=status]');let busy=false,result='';
 function render(){
  section.querySelector('h2').textContent=tr('把下一次发现，寄给你。','Let the next discovery come to you.','次の発見を、あなたのもとへ。');
  section.querySelector('.newsletter-description').textContent=tr('新一期正式上线时，给你一封来信。','A little note when a new issue arrives.','新刊が届いたら、メールでお知らせします。');
  section.querySelector('.email-label').textContent=tr('你的邮箱','Your email','メールアドレス');
  section.querySelector('.newsletter-language span').textContent=tr('邮件语言','Email language','メールの言語');
  section.querySelector('.newsletter-consent span').textContent=tr('我愿意接收新刊邮件，可随时退订。邮箱交由 Resend 处理，仅用于此订阅。','Send me new issue emails. Unsubscribe anytime. Resend processes my email for this subscription.','新刊メールを購読します。いつでも解除できます。メールアドレスはこの購読のために Resend が処理します。');
  button.textContent=busy?tr('发送中…','Sending…','送信中…'):tr('订阅新刊','Subscribe','新刊を購読');button.disabled=busy;
  status.textContent=result==='sent'?tr('确认邮件已发送，请查收并点击确认。也可以检查垃圾邮件文件夹。','Confirmation email sent. Check your inbox and spam folder, then confirm.','確認メールを送信しました。受信トレイや迷惑メールフォルダーから購読を確認してください。'):result==='rate_limit'?tr('请求较频繁，请两分钟后再试。','Please wait two minutes before trying again.','2分ほど待ってから再度お試しください。'):result==='error'?tr('暂时无法发送，请稍后重试。','Unable to send right now. Please try again later.','現在送信できません。しばらくしてからお試しください。'):'';
 }
 form.elements.locale.value=language;
 let chosen=false;form.elements.locale.addEventListener('change',()=>chosen=true);
 window.addEventListener('noobeye-language',()=>{if(!chosen)form.elements.locale.value=language;render();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;busy=true;result='';render();
  try{
   const config=await readSettings(),endpoint=String(config.subscriptionsApi||'').replace(/\/$/,'');
   if(!endpoint)throw new Error('Unavailable');
   const response=await fetch(endpoint+'/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value,locale:form.elements.locale.value,consent:form.elements.consent.checked,website:form.elements.website.value}),signal:AbortSignal.timeout(25000)});
   const data=await response.json();result=response.ok&&data.ok?'sent':response.status===429?'rate_limit':'error';
  }catch{result='error';}finally{busy=false;render();}
 });
 render();
}
