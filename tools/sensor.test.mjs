import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';

const source=(await readFile(new URL('../site/sensor.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'').replaceAll('export ','');
function fixture(saved){
  const storage=new Map(saved===undefined?[]:[['noobeye:sensor:v1',saved]]);
  const listeners=new Map(),nodes=new Map();let time=0,pulses=[],stops=0,tick;
  const element=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,style:{},textContent:'',animate(){this.flashes=(this.flashes||0)+1;this.glowing=true;return {cancel:()=>{this.glowing=false;}};},matchMedia:()=>({matches:false}),setAttribute(k,v){this[k]=v;},addEventListener(k,fn){listeners.set(id+':'+k,fn);},getBoundingClientRect(){return {left:0,top:0,right:1000,bottom:1000,width:1000};}});return nodes.get(id);};
  const state={active:true,targets:[{id:'a',bounds:[90,90,110,110]},{id:'b',bounds:[890,890,910,910]}],found:new Set(),width:1000,height:1000};
  const context=vm.createContext({tr:zh=>zh,prepareSensorAudio:async()=>{},sensorPulse:s=>{pulses.push({s,time});return ()=>stops++;},performance:{now:()=>time},innerWidth:1000,innerHeight:1000,setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;},document:{hidden:false,getElementById:element,addEventListener:element('document').addEventListener},window:element('window')});
  context.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
  vm.runInContext(source,context);
  const controller=context.setupSensor({viewport:element('vp'),readState:()=>state,localPoint:(x,y)=>({x,y}),onEngage:()=>{}});
  return {context,state,controller,element,pulses,storage,get stops(){return stops;},event:(id,event,e={})=>listeners.get(id+':'+event)(e),advance:ms=>{time+=ms;tick?.();}};
}
test('nearest remaining target, monotonic proximity, completion silence',()=>{
  const f=fixture(),p=f.context.proximity,s=f.state;
  const near=p({x:100,y:100},s.targets,s.found,1000,1000),far=p({x:500,y:500},s.targets,s.found,1000,1000);
  assert.equal(near.interval,160);assert.ok(near.strength>far.strength);assert.ok(near.interval<far.interval);
  s.found.add('a');assert.ok(p({x:100,y:100},s.targets,s.found,1000,1000).strength<far.strength);
  s.found.add('b');assert.equal(p({x:100,y:100},s.targets,s.found,1000,1000),null);
});
test('on by default; hover pulses periodically; leave, touch release and disable stop',async()=>{
  const f=fixture(),mouse={isPrimary:true,pointerType:'mouse',clientX:100,clientY:100,buttons:0};
  assert.equal(f.controller.enabled,true);
  f.event('vp','pointermove',mouse);assert.equal(f.pulses.length,1);
  f.advance(300);assert.equal(f.pulses.length,2);assert.equal(f.element('sensor-signal').flashes,2);
  f.event('vp','pointerleave');assert.equal(f.element('sensor-signal').glowing,false);f.advance(2000);assert.equal(f.pulses.length,2);
  f.event('vp','pointerdown',{...mouse,pointerType:'touch',buttons:1});assert.equal(f.pulses.length,3);
  f.event('vp','pointerup',{pointerType:'touch'});f.advance(2000);assert.equal(f.pulses.length,3);
  f.event('vp','pointermove',mouse);await f.event('sensor','click');f.advance(2000);assert.equal(f.pulses.length,4);assert.ok(f.stops>0);
});
test('inactive scene, background, multitouch and all-found suppress scanning',async()=>{
  const f=fixture(),mouse={isPrimary:true,pointerType:'mouse',clientX:100,clientY:100};
  f.state.active=false;f.event('vp','pointermove',mouse);assert.equal(f.pulses.length,0);
  f.state.active=true;f.context.document.hidden=true;f.advance(2000);assert.equal(f.pulses.length,0);
  f.context.document.hidden=false;f.event('vp','pointerdown',{...mouse,isPrimary:false});f.advance(2000);assert.equal(f.pulses.length,0);
  f.state.found=new Set(['a','b']);f.event('vp','pointermove',mouse);assert.equal(f.pulses.length,0);
});
test('explicit off survives reload; enabling persists and resumes scanning',async()=>{
  const f=fixture();await f.event('sensor','click');
  const reloaded=fixture(f.storage.get('noobeye:sensor:v1'));
  assert.equal(reloaded.controller.enabled,false);
  const mouse={isPrimary:true,pointerType:'mouse',clientX:100,clientY:100};
  reloaded.event('vp','pointermove',mouse);reloaded.advance(2000);assert.equal(reloaded.pulses.length,0);
  await reloaded.event('sensor','click');reloaded.event('vp','pointermove',mouse);
  assert.equal(reloaded.pulses.length,1);
  assert.equal(fixture(reloaded.storage.get('noobeye:sensor:v1')).controller.enabled,true);
});
