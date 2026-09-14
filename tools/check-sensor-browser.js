// Run in a local preview through Browser CDP Runtime.evaluate with userGesture:true.
// PointerEvent injection checks application handlers, not native touch dispatch.
(async()=>{
 const vp=document.querySelector('#viewport'),scene=document.querySelector('#scene'),btn=document.querySelector('#sensor');
 const check=(v,m)=>{if(!v)throw Error(m);},wait=ms=>new Promise(r=>setTimeout(r,ms));
 const notes=[],start=OscillatorNode.prototype.start,capture=vp.setPointerCapture;
 OscillatorNode.prototype.start=function(...args){notes.push({time:performance.now(),frequency:this.frequency.value});return start.apply(this,args);};
 vp.setPointerCapture=()=>{};
 try{
  check(btn.getAttribute('aria-pressed')==='true','default on');
  document.querySelector('#zoom-in').click();vp.scrollIntoView({block:'center',behavior:'instant'});await wait(300);
  const r=vp.getBoundingClientRect(),before=scene.getAttribute('viewBox');
  const pointer=(type,x,y,id=1,primary=true,kind='touch')=>vp.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,isPrimary:primary,pointerType:kind,buttons:type==='pointerup'?0:1,button:0,clientX:r.x+x,clientY:r.y+y}));
  pointer('pointerdown',80,100);pointer('pointermove',180,160);await wait(600);
  check(scene.getAttribute('viewBox')===before,'single finger panned');
  check(notes.length>=3,'no sensor audio after zoom tone');
  pointer('pointerup',180,160);const count=notes.length;await wait(1900);check(notes.length===count,'touch release still playing');
  pointer('pointerdown',80,100);pointer('pointerdown',180,100,2,false);const box=scene.getAttribute('viewBox');
  pointer('pointermove',110,120);pointer('pointermove',210,120,2,false);check(scene.getAttribute('viewBox')!==box,'two finger pan failed');
  pointer('pointerup',110,120);pointer('pointerup',210,120,2,false);
  btn.click();check(document.documentElement.scrollWidth<=innerWidth,'horizontal overflow');
  return {passed:true,checks:['default on','original oscillators play','single finger preserves view','release stops','two finger pan','no overflow'],notes:notes.length};
 }finally{OscillatorNode.prototype.start=start;vp.setPointerCapture=capture;}
})()
