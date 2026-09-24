import { tr } from './i18n.js?v=issue-018-20260924';
import { prepareSensorAudio, sensorPulse } from './audio.js?v=issue-018-20260924';

// Distances use scene coordinates so zoom alone cannot make a target closer.
export function proximity(point, targets, found, width, height) {
  let distance=Infinity;
  for(const target of targets){
    if(found.has(target.id))continue;
    const [x1,y1,x2,y2]=target.bounds;
    distance=Math.min(distance,Math.hypot(point.x-(x1+x2)/2,point.y-(y1+y2)/2));
  }
  if(!Number.isFinite(distance))return null;
  const strength=Math.exp(-distance/(Math.hypot(width,height)*.14));
  return {strength,interval:160+1640*Math.pow(1-strength,1.7)};
}

export function setupSensor({viewport,readState,localPoint,onEngage,onScan=()=>{}}){
  const button=document.getElementById('sensor');
  const copy=document.getElementById('sensor-copy');
  const indicator=document.getElementById('sensor-signal');
  const preferenceKey='noobeye:sensor:v1';
  let enabled=true,point=null,timer=null,lastPulse=-Infinity,stopSound=()=>{},glow=null;
  try{enabled=localStorage.getItem(preferenceKey)!=='false';}catch{}
  const stopFeedback=()=>{stopSound();glow?.cancel();glow=null;indicator.setAttribute('data-level','0');indicator.setAttribute('aria-valuenow','0');};
  const clear=()=>{point=null;lastPulse=-Infinity;stopFeedback();};
  function positionIndicator(){
    if(!enabled)return;
    const rect=viewport.getBoundingClientRect();
    // Follow the picture's top until it reaches the window edge; stay within the picture.
    indicator.style.left=`${rect.left+rect.width/2}px`;
    indicator.style.top=`${Math.min(Math.max(16,rect.top+12),rect.bottom-48)}px`;
  }
  function flash(strength){
    glow?.cancel();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const idle={transform:'scale(1)',filter:'brightness(1)'};
    const peak={transform:`scale(${reduced?1:1.03+.09*strength})`,filter:`brightness(${reduced?1.08:1.12+.2*strength})`};
    glow=indicator.animate([idle,{...peak,offset:.16},idle],{duration:140,easing:'ease-out'});
  }
  function ui(){
    button.setAttribute('aria-pressed',String(enabled));
    button.textContent=enabled?tr('卡希传感器：开','Kashi sensor: on','カシセンサー：オン'):tr('卡希传感器：关','Kashi sensor: off','カシセンサー：オフ');
    copy.hidden=!enabled;
    indicator.hidden=!enabled||!readState().active||document.hidden;
    indicator.setAttribute('aria-label',tr('卡希传感器信号强度','Kashi sensor signal strength','カシセンサーの信号強度'));
    copy.textContent=tr('移动鼠标或单指滑动探测，越近声音越急促；双指移动、缩放画面。','Move the mouse or slide one finger to scan. Faster sounds mean closer objects. Use two fingers to pan and zoom.','マウス移動か指1本のスライドで探索。近いほど音が速くなります。指2本で移動・拡大できます。');
    positionIndicator();
  }
  function tick(){
    const state=readState();
    indicator.hidden=!enabled||!state.active||document.hidden;
    positionIndicator();
    if(!enabled||!point||!state.active||document.hidden){stopFeedback();lastPulse=-Infinity;return;}
    const r=viewport.getBoundingClientRect();
    if(point.x<Math.max(0,r.left)||point.x>Math.min(innerWidth,r.right)||point.y<Math.max(0,r.top)||point.y>Math.min(innerHeight,r.bottom)){clear();return;}
    const signal=proximity(localPoint(point.x,point.y),state.targets,state.found,state.width,state.height);
    if(!signal){stopFeedback();indicator.hidden=true;return;}
    const level=Math.max(1,Math.min(5,Math.ceil(signal.strength*5)));
    indicator.setAttribute('data-level',String(level));indicator.setAttribute('aria-valuenow',String(level));
    if(performance.now()-lastPulse>=signal.interval){
      stopSound();const sound=sensorPulse(signal.strength);stopSound=sound||(()=>{});
      flash(signal.strength);onScan();lastPulse=performance.now();
    }
  }
  // Default-on feedback runs immediately; audio unlocks on a real user gesture.
  const unlockAudio=()=>{if(enabled)prepareSensorAudio().catch(()=>{});};
  button.addEventListener('click',()=>{
    enabled=!enabled;clear();clearInterval(timer);timer=null;
    try{localStorage.setItem(preferenceKey,String(enabled));}catch{}
    ui();
    if(enabled){onEngage();unlockAudio();timer=setInterval(tick,40);}
  });
  document.addEventListener('pointerdown',unlockAudio);
  document.addEventListener('keydown',unlockAudio);
  function track(e){
    if(!enabled)return;
    if(!e.isPrimary){clear();return;}
    if(e.pointerType!=='mouse'&&!e.buttons){clear();return;}
    point={x:e.clientX,y:e.clientY};onEngage();tick();
  }
  viewport.addEventListener('pointermove',track);
  viewport.addEventListener('pointerdown',track);
  viewport.addEventListener('pointerleave',clear);
  viewport.addEventListener('pointercancel',clear);
  viewport.addEventListener('lostpointercapture',clear);
  viewport.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')clear();});
  window.addEventListener('blur',clear);
  window.addEventListener('scroll',()=>{clear();positionIndicator();},{passive:true});
  window.addEventListener('resize',positionIndicator);
  document.addEventListener('visibilitychange',clear);
  window.addEventListener('noobeye-language',ui);
  ui();
  if(enabled)timer=setInterval(tick,40);
  return {get enabled(){return enabled;},clear};
}
