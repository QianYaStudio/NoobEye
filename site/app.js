import { setupSensor } from './sensor.js?v=feedback-20260915';
import { celebrateCompletion } from './celebration.js';
import {targetOutline,createOutlineMark} from './target-outlines.js?v=issue-012';
import { effect, setupAudio, setIssueMusic, startListening } from './audio.js?v=feedback-20260915';
import { tr, labelOf, titleOf, introOf, clueOf, setupLanguage } from './i18n.js';
import {setupProjectLinks} from './project.js';
import {setupSubscriptions} from './subscriptions.js';
import {clearPlayRecords} from './records.js';
import { SessionClock, formatTime } from './session.js';
import { setupStats, startRun, finishRun, readStats } from './stats.js';
const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
let STORAGE = 'noobeye:pottery-yard:v1';
let targets = [], found = new Set(), hints = {}, selected = null, issues=[], currentIssue=null;
let sceneReady=false, sceneRequest=0;
const clock=new SessionClock();
let gameVisible=false, mistakes=0, runId='', rankEligible=true, rankResult=null, startPromise=null, startSent=false;
let awaitingFreshInteraction=false, sensorUsed=false;
let view = { x: 0, y: 0, size: 1254 }, pointers = new Map(), drag = null, pinch = null;
const say = (text) => { $('status').textContent = text; };
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const sceneWidth=()=>currentIssue?.width||1254;
const sceneHeight=()=>currentIssue?.height||1254;
function loadScene(src){
  sensor.clear();const request=++sceneRequest;sceneReady=false;$('viewport').setAttribute('aria-busy','true');
  const preload=new Image();
  preload.onload=()=>{if(request!==sceneRequest)return;$('scene-image').setAttribute('href',src);sceneReady=true;$('viewport').setAttribute('aria-busy','false');syncClock();};
  preload.onerror=()=>{if(request!==sceneRequest)return;$('viewport').setAttribute('aria-busy','false');say(tr('画面加载失败，请重新选刊或切换版本重试。','The picture could not load. Select this issue or an edition to retry.','画像を読み込めませんでした。この号か表示を選び直してください。'));};
  preload.src=src;
}
function save() {
  if(!currentIssue||awaitingFreshInteraction)return;
  try { localStorage.setItem(STORAGE, JSON.stringify({ found: [...found], hints, sensorUsed, ...clock.snapshot(), mistakes, runId, rankEligible, gameplayRevision:currentIssue.gameplayRevision })); }
  catch { say(tr('当前浏览器无法保存进度，请保持此页打开。','This browser cannot save progress. Keep this page open to continue.','このブラウザーでは進み具合を保存できません。このページを開いたまま続けてください。')); }
}
function svgElement(name, attrs) {
  const el = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}
function mark(target, hint = false, animate = false) {
  const outline = !hint && targetOutline(currentIssue.id, target.id);
  if (outline) {
    const group = createOutlineMark(outline,target.bounds,animate);
    group.dataset.target=target.id;
    $('marks').append(group);
    return;
  }
  const [x1, y1, x2, y2] = target.bounds;
  const layer = hint ? $('hint-mark') : $('marks');
  if (hint) layer.replaceChildren();
  layer.append(svgElement('rect', { x: x1 - (hint ? 55 : 9), y: y1 - (hint ? 55 : 9), width: x2-x1+(hint?110:18), height: y2-y1+(hint?110:18), rx: hint?40:12, fill: hint?'#d8ed4622':'#d8ed4633', stroke: hint?'#914922':'#556820', 'stroke-width': 3, 'stroke-dasharray': hint?'10 7':'none', 'vector-effect':'non-scaling-stroke' }));
}
function render() {
  $('count').textContent = String(found.size).padStart(2,'0');
  $('complete').hidden = !targets.length || found.size !== targets.length;
  for (const target of targets) {
    const btn = $(`find-${target.id}`);
    btn.classList.toggle('found', found.has(target.id));
    btn.classList.toggle('selected', selected === target.id && !found.has(target.id));
    btn.querySelector('.label').textContent=labelOf(target);
    btn.setAttribute('aria-pressed', String(selected === target.id));
    btn.setAttribute('aria-label', `${labelOf(target)}, ${found.has(target.id)?tr('已找到','found','発見済み'):tr('未找到','not found','未発見')}`);
  }
  $('hint').disabled = found.size === targets.length;
  const level = selected ? Number(hints[selected] || 0) : 0;
  $('hint').textContent = found.size === targets.length ? tr('全部发现','All found','すべて発見') : level >= 2 ? tr('揭晓这件藏品','Reveal this object','この位置を見る') : level === 1 ? tr('圈出大致区域','Show the area','近くの範囲を見る') : tr('给我一点线索','A little hint','ヒントをもらう');
  updateShelf();renderCompletion();
}
function discover(target) {
  if (found.has(target.id)) return;
  found.add(target.id); mark(target,false,true); $('hint-mark').replaceChildren();
  selected = null; $('hint-copy').textContent = tr('又发现一件。让目光继续散步吧。','Another discovery. Keep exploring.','また一つ発見。引き続き探してみましょう。');
  if(found.size===targets.length){clock.finish();recordCompletion();}
  save(); render(); effect(found.size===targets.length?'complete':'found','発見済み');
  if(found.size===targets.length)celebrateCompletion($('complete'));
  say(found.size === targets.length ? tr(`全部 ${targets.length} 件藏品都找到了！`,`All ${targets.length} objects found!`,`全${targets.length}個を見つけました！`) : tr(`发现了${labelOf(target)}！已找到 ${found.size} / ${targets.length}。`,`Found ${labelOf(target)}! ${found.size} / ${targets.length}.`,`${labelOf(target)}を発見！ ${found.size} / ${targets.length}。`));
}
function updateView() {
  const ratio=sceneHeight()/sceneWidth();
  view.x = clamp(view.x, 0, sceneWidth()-view.size); view.y = clamp(view.y, 0, sceneHeight()-view.size*ratio);
  $('scene').setAttribute('viewBox',`${view.x} ${view.y} ${view.size} ${view.size*ratio}`);
  $('zoom-value').textContent = `${Math.round(sceneWidth()/view.size*100)}%`;
}
function zoom(factor, px = .5, py = .5) {
  const next = clamp(view.size/factor,sceneWidth()/5,sceneWidth());
  view.x += (view.size-next)*px; view.y += (view.size-next)*py*sceneHeight()/sceneWidth(); view.size=next; updateView();
}
function localPoint(clientX,clientY) {
  const r = $('viewport').getBoundingClientRect();
  return { x:view.x+(clientX-r.left)/r.width*view.size, y:view.y+(clientY-r.top)/r.height*view.size*sceneHeight()/sceneWidth() };
}
function ripple(clientX,clientY,success){
  const rect=vp.getBoundingClientRect(),el=document.createElement('span');el.className='ripple '+(success?'rainbow':'ordinary');
  el.style.left=`${clientX-rect.left}px`;el.style.top=`${clientY-rect.top}px`;
  el.append(document.createElement('i'),document.createElement('i'),document.createElement('i'));
  $('ripple-layer').append(el);setTimeout(()=>el.remove(),1000);
}
function hit(clientX,clientY) {
  if(!sceneReady){say(tr('画面正在准备，请稍候。','The picture is loading. One moment.','画像を読み込んでいます。少々お待ちください。'));return;}
  const p=localPoint(clientX,clientY), tolerance=7;
  const target = targets.find(t=>p.x>=t.bounds[0]-tolerance&&p.x<=t.bounds[2]+tolerance&&p.y>=t.bounds[1]-tolerance&&p.y<=t.bounds[3]+tolerance);
  ripple(clientX,clientY,Boolean(target));
  if(target){if(found.has(target.id)){effect('tap');say(tr('这件已经找到了。','You have already found this one.','これはもう見つけています。'));}else discover(target);}
  else{mistakes++;effect('miss');save();say(tr('这里还没有发现。看看轮廓，也看看空隙。','Not here yet. Look at the outlines, and the spaces between them.','ここではないようです。輪郭や隙間も見てみましょう。'));}
}
function giveHint() {
  if (!targets.length || found.size === targets.length) return;
  engage();
  const target = targets.find(t=>t.id===selected&&!found.has(t.id)) || targets.find(t=>!found.has(t.id));
  effect('hint');
  selected=target.id; hints[target.id]=(hints[target.id]||0)+1;
  if(hints[target.id]===1) {
    const text=`${labelOf(target)}: ${clueOf(target,currentIssue)}`; $('hint-copy').textContent=text; say(text);
  } else if(hints[target.id]===2) {
    view={x:0,y:0,size:sceneWidth()}; updateView(); mark(target,true);
    $('hint-copy').textContent=tr(`${labelOf(target)}就在虚线圈出的附近。`,`${labelOf(target)} is near the dashed outline.`,`${labelOf(target)}は点線の近くにあります。`); say($('hint-copy').textContent);
  } else {
    discover(target); $('hint-copy').textContent=tr(`已揭晓${labelOf(target)}的位置。`,`${labelOf(target)} has been revealed.`,`${labelOf(target)}の位置を表示しました。`);
  }
  render(); save();
}
$('hint').addEventListener('click',giveHint);
$('zoom-in').addEventListener('click',()=>{effect();zoom(1.35);});
$('zoom-out').addEventListener('click',()=>{effect();zoom(1/1.35);});
$('fit').addEventListener('click',()=>{view={x:0,y:0,size:sceneWidth()};updateView();});
for(const mode of ['color','line']) $(mode).addEventListener('click',()=>{
  if(!currentIssue)return;effect('page');
  loadScene(currentIssue[mode]);
  $('color').setAttribute('aria-pressed',String(mode==='color')); $('line').setAttribute('aria-pressed',String(mode==='line'));
});
$('restart').addEventListener('click',()=>{clock.setActive(false);$('reset-dialog').showModal();});
$('reset-dialog').addEventListener('close',()=>{
  if($('reset-dialog').returnValue!=='reset'){syncClock();return;}
  resetAttempt();
  $('hint-copy').textContent=tr('卡住了？先选一件想找的藏品。','Stuck? Select an object for a hint.','迷ったら、探すものを選んでヒントを見ましょう。');save();render();syncClock();effect('page');say(tr('新的观察，从这里开始。','A fresh look starts here.','新しい発見を、ここから。'));
});
function resetAttempt(waitForInteraction=false){
  sensor.clear();sensorUsed=false;awaitingFreshInteraction=waitForInteraction;found.clear();hints={};selected=null;clock.load({});mistakes=0;runId=crypto.randomUUID();rankEligible=true;rankResult=null;startPromise=null;startSent=false;
  $('marks').replaceChildren();$('hint-mark').replaceChildren();$('ripple-layer').replaceChildren();$('personal-best').textContent='';$('rank-result').textContent='';$('rank-result').hidden=true;$('complete').classList.remove('celebrate');
  view={x:0,y:0,size:sceneWidth()};updateView();
}
function engage(){if(awaitingFreshInteraction){awaitingFreshInteraction=false;syncClock();}}
$('clear-records').addEventListener('click',()=>{if(!currentIssue)return;clock.setActive(false);$('clear-dialog').showModal();});
$('clear-dialog').addEventListener('close',()=>{
  const scope=$('clear-dialog').returnValue;
  if(!['issue','all'].includes(scope)){syncClock();return;}
  try{clearPlayRecords(localStorage,scope,currentIssue.id);shelfCounts.clear();}
  catch{say(tr('无法清除浏览器中的记录，请稍后重试。','The browser records could not be cleared. Please try again.','記録を消去できませんでした。もう一度お試しください。'));syncClock();return;}
  resetAttempt(true);render();syncClock();
  $('hint-copy').textContent=tr('准备好了，点击画面开始新的寻找。','Ready. Click the picture to start a fresh search.','準備できました。画面をクリックして、新しく探し始めましょう。');
  say(scope==='all'?tr('全部游玩记录已清除，可以交给下一位玩家了。','All play records cleared. Ready for the next player.','すべてのプレイ記録を消去しました。次のプレイヤーにどうぞ。'):tr('本期游玩记录已清除，准备重新开始。','This issue’s play records are cleared. Ready to start again.','この号のプレイ記録を消去しました。最初から始められます。'));
});
$('share').addEventListener('click',async()=>{
  const url = new URL(location.href);url.hash='play';
  try {await navigator.clipboard.writeText(url.href);say(tr('本期链接已复制。','Issue link copied.','この号のリンクをコピーしました。'));}
  catch {say(tr(`本期链接：${url.href}`,`Issue link: ${url.href}`,`この号のリンク：${url.href}`));}
});
const vp=$('viewport');
const sensor=setupSensor({viewport:vp,localPoint,onEngage:engage,onScan:()=>{if(!sensorUsed){sensorUsed=true;save();}},readState:()=>({
  targets,found,width:sceneWidth(),height:sceneHeight(),
  active:sceneReady&&gameVisible&&pointers.size<2&&!$('reset-dialog').open&&!$('clear-dialog').open
})});
vp.addEventListener('wheel',e=>{e.preventDefault();const r=vp.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);},{passive:false});
vp.addEventListener('wheel',engage,{passive:true});
document.querySelector('.toolbar').addEventListener('click',engage);
vp.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;engage();vp.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  $('canvas-tip').style.opacity='0';
  if(pointers.size===1)drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,moved:false};
  else{drag=null;const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
});
vp.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size>=2){const[a,b]=[...pointers.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);const r=vp.getBoundingClientRect();const x=(a.x+b.x)/2,y=(a.y+b.y)/2;if(pinch?.distance>0){zoom(distance/pinch.distance,(pinch.x-r.left)/r.width,(pinch.y-r.top)/r.height);view.x-=(x-pinch.x)/r.width*view.size;view.y-=(y-pinch.y)/r.height*view.size*sceneHeight()/sceneWidth();updateView();}pinch={distance,x,y};return;}
  if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>5)drag.moved=true;
  if(drag.moved&&!(sensor.enabled&&e.pointerType!=='mouse')){const scale=view.size/vp.clientWidth;view.x=drag.vx-dx*scale;view.y=drag.vy-dy*scale;updateView();}
});
function endPointer(e,cancelled=false){
  if(!pointers.has(e.pointerId))return;
  if(!cancelled&&drag&&!drag.moved&&pointers.size===1)hit(e.clientX,e.clientY);
  pointers.delete(e.pointerId);drag=null;pinch=null;
}
vp.addEventListener('pointerup',e=>endPointer(e));vp.addEventListener('pointercancel',e=>endPointer(e,true));vp.addEventListener('lostpointercapture',e=>endPointer(e,true));
vp.addEventListener('keydown',e=>{
  engage();
  if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','h','H','0'].includes(e.key))e.preventDefault();
  if(e.key==='+'||e.key==='=')zoom(1.3);if(e.key==='-')zoom(1/1.3);
  if(e.key==='h'||e.key==='H')giveHint();if(e.key==='0'){view={x:0,y:0,size:sceneWidth()};updateView();}
  if(e.key.startsWith('Arrow')){const step=view.size*.1;view.x+=(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0);view.y+=(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0);updateView();}
});
const storageKey=issue=>issue.id==='011'?'noobeye:pottery-yard:v1':`noobeye:issue:${issue.id}:${issue.version}`;
const SHELF_PAGE_SIZE=4;
let shelfPage=0;
let shelfSlide=null;
const shelfCounts=new Map();
function renderShelfPage(direction=0){
  const shelf=$('issue-shelf');
  shelfSlide?.cancel();
  const cards=document.createDocumentFragment();
  for(const issue of issues.slice(shelfPage*SHELF_PAGE_SIZE,(shelfPage+1)*SHELF_PAGE_SIZE)){
    const button=document.createElement('button');button.id=`issue-${issue.id}`;button.className='issue-card';
    const cover=document.createElement('span');cover.className='card-cover';
    cover.style.aspectRatio=`${issue.coverWidth||520} / ${issue.coverHeight||708}`;
    const img=document.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';img.width=issue.coverWidth;img.height=issue.coverHeight;
    const fallback=document.createElement('span');fallback.className='cover-fallback';fallback.hidden=true;fallback.setAttribute('aria-hidden','true');
    fallback.textContent=issue.id;
    img.addEventListener('load',()=>{cover.classList.add('is-loaded');});
    img.addEventListener('error',()=>{cover.classList.add('is-error');fallback.hidden=false;});
    img.src=issue.cover;cover.append(img,fallback);
    const copy=document.createElement('span');copy.className='card-copy';
    const number=document.createElement('span');number.className='card-number';
    const title=document.createElement('strong');
    const progress=document.createElement('span');progress.className='card-progress';
    copy.append(number,title,progress);button.append(cover,copy);
    button.addEventListener('click',()=>loadIssue(issue.id,{navigate:true}));cards.append(button);
  }
  shelf.replaceChildren(cards);shelf.scrollLeft=0;updateShelf();
  if(direction&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    shelfSlide=shelf.animate([{transform:`translateX(${direction*8}%)`,opacity:.25},{transform:'translateX(0)',opacity:1}],{duration:280,easing:'cubic-bezier(.2,.75,.3,1)'});
  }
}
function turnShelf(delta){
  const next=clamp(shelfPage+delta,0,Math.max(0,Math.ceil(issues.length/SHELF_PAGE_SIZE)-1));
  if(next===shelfPage)return;shelfPage=next;renderShelfPage(delta);
}
$('shelf-prev').addEventListener('click',()=>turnShelf(-1));
$('shelf-next').addEventListener('click',()=>turnShelf(1));
function updateShelf(){
  let completed=0;
  for(const issue of issues){
    let count=0;
    if(issue.id===currentIssue?.id)count=found.size;
    else if(shelfCounts.has(issue.id))count=shelfCounts.get(issue.id);
    else try{const p=JSON.parse(localStorage.getItem(storageKey(issue))||'{}');count=new Set((Array.isArray(p.found)?p.found:[]).filter(id=>issue.targets.some(t=>t.id===id))).size;}catch{}
    shelfCounts.set(issue.id,count);
    if(count===issue.targets.length)completed++;
    const button=$(`issue-${issue.id}`);if(!button)continue;
    button.setAttribute('aria-pressed',String(issue.id===currentIssue?.id));
    button.querySelector('strong').textContent=titleOf(issue);
    button.querySelector('.card-number').textContent=tr(`第 ${issue.id} 期`,`ISSUE ${issue.id}`,`第${issue.id}号`);
    button.querySelector('.card-progress').textContent=count===issue.targets.length?tr('已完成','Completed','クリア済み'):count?tr(`${count} / ${issue.targets.length} 已发现`,`${count} / ${issue.targets.length} found`,`${count} / ${issue.targets.length} 発見`):tr(`${issue.targets.length} 件藏品 · 开始寻找`,`${issue.targets.length} objects · Explore`,`${issue.targets.length}個を探す`);
  }
  const pages=Math.max(1,Math.ceil(issues.length/SHELF_PAGE_SIZE));
  $('shelf-prev').disabled=shelfPage===0;$('shelf-next').disabled=shelfPage>=pages-1;
  for(const [id,label]of [['shelf-prev',tr('上一页 · 较新期刊','Previous page · newer issues','前のページ・新しい号')],['shelf-next',tr('下一页 · 较早期刊','Next page · older issues','次のページ・以前の号')]]){$(id).setAttribute('aria-label',label);$(id).title=label;}
  $('shelf-page').textContent=tr(`第 ${shelfPage+1} / ${pages} 页`,`${shelfPage+1} / ${pages}`,`${shelfPage+1} / ${pages} ページ`);
  $('collection-progress').textContent=tr(`${issues.length} 期收藏 · ${completed} 期已完成`,`${issues.length} issues · ${completed} completed`,`全${issues.length}号・${completed}号クリア`);
}
function loadIssue(id,{navigate=false}={}){
    const issue=issues.find(item=>item.id===id);if(!issue)return;
    if(currentIssue){clock.setActive(false);save();}
    currentIssue=issue;targets=issue.targets;STORAGE=storageKey(issue);awaitingFreshInteraction=false;
    rankResult=null;startPromise=null;startSent=false;renderCommunity(null);
    $('viewport').style.aspectRatio=`${issue.width} / ${issue.height}`;
    $('scene-image').setAttribute('width',issue.width);$('scene-image').setAttribute('height',issue.height);
    selected=null;view={x:0,y:0,size:sceneWidth()};pointers.clear();drag=null;pinch=null;updateView();
    $('marks').replaceChildren();$('hint-mark').replaceChildren();$('targets').replaceChildren();
    $('hint-copy').textContent=tr('卡住了？先选一件想找的藏品。','Stuck? Select an object for a hint.','迷ったら、探すものを選んでヒントを見ましょう。');
    renderIssueCopy();
    loadScene(issue.color||issue.line);$('color').disabled=!issue.color;
    $('color').setAttribute('aria-pressed',String(Boolean(issue.color)));$('line').setAttribute('aria-pressed',String(!issue.color));
    updateNavigation();
    let progress={};try{progress=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch{}
    found=new Set((Array.isArray(progress.found)?progress.found:[]).filter(id=>targets.some(t=>t.id===id)));
    hints=progress.hints&&typeof progress.hints==='object'&&!Array.isArray(progress.hints)?progress.hints:{};
    if(progress.gameplayRevision!==issue.gameplayRevision){for(const id of issue.invalidatedTargets||[]){found.delete(id);delete hints[id];}}
    sensorUsed=progress.sensorUsed===true;
    clock.load({...progress,finished:found.size===targets.length});
    mistakes=Math.max(0,Number(progress.mistakes)||0);runId=progress.runId||crypto.randomUUID();
    rankEligible=progress.rankEligible!==false && !(found.size>0&&!progress.started);

    for(const target of targets){
      const button=document.createElement('button');button.id=`find-${target.id}`;button.className='target';
      const img=document.createElement('img');img.src=target.image;img.alt='';img.draggable=false;
      const label=document.createElement('span');label.className='label';label.textContent=labelOf(target);
      button.append(img,label);button.addEventListener('click',()=>{
        engage();
        effect('select');
        if(found.has(target.id)){view={x:0,y:0,size:sceneWidth()};updateView();say(tr(`${labelOf(target)}已找到，高亮线条记录着你的发现。`,`${labelOf(target)} is already found, highlighted in the picture.`,`${labelOf(target)}は発見済みです。絵の中の線がハイライトされています。`));return;}
        selected=target.id;$('hint-mark').replaceChildren();$('hint-copy').textContent=tr(`正在寻找${labelOf(target)}。需要时可以获取线索。`,`Looking for ${labelOf(target)}. A hint is available if you need one.`,`${labelOf(target)}を探しています。必要ならヒントをどうぞ。`);render();
      });$('targets').append(button);if(found.has(target.id))mark(target);
    }
    render();setIssueMusic('echoes');syncClock();
    readStats(issue).then(data=>{if(currentIssue===issue)renderCommunity(data);});
    say(found.size?tr(`欢迎回来，已恢复 ${found.size} / ${targets.length} 件藏品。`,`Welcome back. ${found.size} / ${targets.length} discoveries restored.`,`おかえりなさい。${found.size} / ${targets.length}個の発見を復元しました。`):tr(`寻找 ${targets.length} 件藏品。点击隐藏形状，记录发现。`,`Find ${targets.length} objects. Click the hidden shapes to collect them.`,`隠れた${targets.length}個を探しましょう。見つけた形をクリックしてください。`));
    const url=new URL(location.href);url.searchParams.set('issue',issue.id);if(navigate)url.hash='play';history.replaceState(null,'',url);
    try{localStorage.setItem('noobeye:last-issue',issue.id);}catch{}
    if(navigate){$('play').scrollIntoView();startListening();effect('page');}
}
async function init(){
  setupLanguage();setupSubscriptions();setupAudio();await Promise.all([setupStats(),setupProjectLinks()]);
  try {
    const response=await fetch('./catalog.json?v=issue-012');if(!response.ok)throw new Error('Content unavailable');
    const content=await response.json();issues=content.issues.sort((a,b)=>Number(b.id)-Number(a.id));
    renderShelfPage();
    let last;try{last=localStorage.getItem('noobeye:last-issue');}catch{}
    const requested=new URL(location.href).searchParams.get('issue')||last||content.defaultIssue;
    loadIssue(issues.some(i=>i.id===requested)?requested:content.defaultIssue);
  }catch(error){say(tr('寻找清单加载失败，请刷新页面重试。','The collection could not load. Please refresh to try again.','一覧を読み込めませんでした。ページを再読み込みしてください。'));$('hint').disabled=true;console.error(error);}
}
function neighbor(delta){return issues.find(i=>Number(i.id)===Number(currentIssue.id)+delta);}
function adjacent(delta){const next=neighbor(delta);if(next)loadIssue(next.id,{navigate:true});}
function updateNavigation(){
 const prev=!neighbor(-1),next=!neighbor(1);
 $('prev-issue').disabled=prev;$('complete-prev').disabled=prev;$('next-issue').disabled=next;
 for(const [id,disabled,label] of [['side-prev',prev,tr('上一期','Previous issue','前の号へ')],['side-next',next,tr('下一期','Next issue','次の号へ')]]){
   $(id).disabled=disabled;$(id).setAttribute('aria-label',label);$(id).title=label;
 }
 $('continue-issue').textContent=next?tr('返回书架','Back to the collection','一覧へ戻る'):tr('下一期','Next issue','次の号へ');
}
$('prev-issue').addEventListener('click',()=>adjacent(-1));$('next-issue').addEventListener('click',()=>adjacent(1));
$('side-prev').addEventListener('click',()=>adjacent(-1));$('side-next').addEventListener('click',()=>adjacent(1));
// Keep quick navigation in the outer gutters, only alongside the playing canvas.
let sideNavigationFrame=0;
function positionSideNavigation(){
 sideNavigationFrame=0;
 const rect=vp.getBoundingClientRect(),middle=innerHeight/2;
 document.querySelector('.side-navigation').classList.toggle('is-visible',rect.top<=middle&&rect.bottom>=middle);
}
function scheduleSideNavigation(){if(!sideNavigationFrame)sideNavigationFrame=requestAnimationFrame(positionSideNavigation);}
window.addEventListener('scroll',scheduleSideNavigation,{passive:true});
window.addEventListener('resize',scheduleSideNavigation);
new ResizeObserver(scheduleSideNavigation).observe(document.querySelector('.canvas-column'));
scheduleSideNavigation();
$('complete-prev').addEventListener('click',()=>adjacent(-1));
$('continue-issue').addEventListener('click',()=>{if(!neighbor(1))$('archive').scrollIntoView();else adjacent(1);});
for(const a of document.querySelectorAll('a[href="#play"]'))a.addEventListener('click',()=>{engage();startListening();effect('page');});

function renderIssueCopy(){
 if(!currentIssue)return;const issue=currentIssue;
 $('issue-title').textContent=titleOf(issue);$('chapter-number').textContent=tr(`第 ${issue.id} 期 · 观察练习`,`ISSUE ${issue.id} · A CLOSER LOOK`,`第${issue.id}号・じっくり観察`);
 $('total-count').textContent=String(targets.length).padStart(2,'0');
 $('issue-intro').textContent=introOf(issue);
 $('cover-issue').textContent=tr(`第 ${issue.id} 期 / ${titleOf(issue)}`,`Issue ${issue.id} / ${titleOf(issue)}`,`第${issue.id}号 / ${titleOf(issue)}`);
 $('cover-meta').textContent=tr(`${targets.length} 件藏品 · 随时停留`,`${targets.length} objects · Take your time`,`${targets.length}個・自分のペースで`);
 const cover=document.querySelector('.cover-art img');cover.src=issue.color||issue.line;cover.alt=titleOf(issue);
 document.querySelector('.cover-art').setAttribute('aria-label',tr(`进入${titleOf(issue)}`,`Explore ${titleOf(issue)}`,`${titleOf(issue)}で探す`));
}
function syncClock(){
 if(!currentIssue)return;
 clock.setActive(!awaitingFreshInteraction&&gameVisible&&!document.hidden&&sceneReady&&!$('reset-dialog').open&&!$('clear-dialog').open&&found.size<targets.length);
 if(clock.started&&!startSent&&!clock.finished){const issue=currentIssue;startSent=true;startPromise=startRun(issue,runId).then(result=>{if(result)readStats(issue).then(data=>{if(currentIssue===issue)renderCommunity(data);});return result;});}
 $('timer').textContent=formatTime(clock.tick());
 $('timer').setAttribute('aria-label',tr('本次观察用时','Time spent exploring','今回探した時間'));
 $('timer-state').textContent=awaitingFreshInteraction?tr('待开始','Ready','開始待ち'):clock.started&&!clock.active&&!clock.finished?tr('已暂停','Paused','一時停止中'):'';
}
function renderCompletion(){
 if(!currentIssue||found.size!==targets.length)return;
 const elapsed=clock.elapsedMs;
 $('complete-copy').textContent=rankEligible&&clock.started?tr(`${formatTime(elapsed)}，发现了全部 ${targets.length} 件藏品。`,`All ${targets.length} objects found in ${formatTime(elapsed)}.`,`${formatTime(elapsed)}で、全${targets.length}個を発見。`):tr('全部藏品已发现。这份旧进度没有完整计时，重玩可记录新成绩。','All objects found. This saved attempt has no complete timing; play again to set a new time.','すべて発見済みです。以前の進み具合には完全な時間記録がありません。もう一度遊ぶと記録できます。');
 let best;try{best=JSON.parse(localStorage.getItem(STORAGE+':best')||'null');}catch{}
 $('personal-best').textContent=best?tr(`个人最佳 ${formatTime(best.elapsedMs)} · ${best.hints?'使用过提示':'独立寻找'}`,`Personal best ${formatTime(best.elapsedMs)} · ${best.hints?'with hints':'without hints'}`,`自己ベスト ${formatTime(best.elapsedMs)}・${best.hints?'ヒントあり':'ヒントなし'}`):'';
 $('rank-result').hidden=!rankResult;
 if(rankResult)$('rank-result').textContent=rankResult.sampleSize===0?tr('记录已保存，等待更多玩家留下可比成绩。','Your time is saved. Waiting for more players to compare with.','記録を保存しました。比較できるほかのプレイヤーの記録を待っています。'):rankResult.percentile===null?tr(`已有 ${rankResult.sampleSize} 位其他玩家的可比成绩，达到 20 份后显示百分位。`,`${rankResult.sampleSize} other comparable players so far. Percentiles appear at 20.`,`比較できるほかの記録は${rankResult.sampleSize}件です。20件から順位の割合を表示します。`):tr(`超越了 ${rankResult.percentile}% 的同组玩家 · ${rankResult.sampleSize} 份真实成绩`,`Faster than ${rankResult.percentile}% of comparable players · ${rankResult.sampleSize} real times`,`同じ条件のプレイヤーの${rankResult.percentile}%より速い記録・${rankResult.sampleSize}件の実記録`);
 updateNavigation();
}
async function recordCompletion(){
 const issue=currentIssue,id=runId,elapsed=clock.elapsedMs,hintCount=Object.values(hints).reduce((a,b)=>a+Number(b||0),0)+(sensorUsed?1:0);
 if(rankEligible&&clock.started){
   let best;try{best=JSON.parse(localStorage.getItem(STORAGE+':best')||'null');if(!best||elapsed<best.elapsedMs)localStorage.setItem(STORAGE+':best',JSON.stringify({elapsedMs:elapsed,hints:hintCount}));}catch{}
 }
 const card=$('complete');
 setTimeout(()=>{if(currentIssue===issue&&found.size===targets.length){card.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});card.focus({preventScroll:true});}},250);
 await(startPromise||startRun(issue,id));
 const result=await finishRun(issue,id,elapsed,hintCount,mistakes,rankEligible&&clock.started);
 if(currentIssue===issue&&runId===id){rankResult=result?.rank||null;renderCompletion();readStats(issue).then(data=>{if(currentIssue===issue)renderCommunity(data);});}
}
let communityData=null;
function renderCommunity(data){communityData=data;$('community-stats').hidden=!data;if(data)$('community-stats').textContent=tr(`本期 ${data.players} 位访客玩过 · ${data.completedPlayers} 位通关　／　全刊 ${data.totalPlayers} 位访客 · ${data.totalCompletedPlayers} 位有通关记录`,`This issue: ${data.players} visitors played · ${data.completedPlayers} completed / Journal: ${data.totalPlayers} visitors · ${data.totalCompletedPlayers} with a completion`,`この号：${data.players}人がプレイ・${data.completedPlayers}人がクリア／全体：${data.totalPlayers}人がプレイ・${data.totalCompletedPlayers}人がクリア経験あり`);}
new IntersectionObserver(entries=>{gameVisible=entries[0].isIntersecting;syncClock();},{threshold:.15}).observe(vp);
document.addEventListener('visibilitychange',()=>{syncClock();if(currentIssue)save();});
window.addEventListener('pagehide',()=>{clock.setActive(false);if(currentIssue)save();});
window.addEventListener('noobeye-language',()=>{renderIssueCopy();if(currentIssue){render();updateNavigation();syncClock();$('hint-copy').textContent=tr('选择一件藏品，获取提示。','Select an object for a hint.','探すものを選ぶと、ヒントが見られます。');say(tr('继续寻找吧。','Keep exploring.','続きを探してみましょう。'));renderCommunity(communityData);}});
setInterval(syncClock,500);setInterval(()=>{if(currentIssue&&clock.active)save();},5000);
init();
