import { tr } from './i18n.js?v=issue-014-20260916';
const TRACKS=[
 {id:'echoes',names:['Echoes','Echoes','Echoes'],styles:['默认配乐','Default soundtrack','標準の音楽'],src:'./assets/music/echoes.mp3'},
 {id:'acoustic',names:['慢慢的星期天','Lazy Sunday','ゆったりした日曜日'],styles:['木吉他 · 轻盈午后','Acoustic guitar','アコースティックギター'],src:'./assets/music/acoustic.mp3'},
 {id:'bossa',names:['阳光落在杯沿','Sunny Bossa','日だまりのボサノヴァ'],styles:['Bossa Nova · 温暖律动','Bossa Nova','ボサノヴァ'],src:'./assets/music/bossa.mp3'},
 {id:'piano',names:['留白之间','Minimal Piano','余白のあいだ'],styles:['钢琴 · 安静观察','Piano','ピアノ'],src:'./assets/music/piano.mp3'},
 {id:'garden',names:['花园醒来之前','Garden Dawn','庭が目覚める前に'],styles:['鸟鸣氛围 · 林间呼吸','Birdsong ambient','鳥のさえずり'],src:'./assets/music/garden.mp3'}
];
const KEY='noobeye:audio:v2';
let prefs={music:false,effects:true,volume:.3,track:'auto',touched:false};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)prefs={...prefs,...saved};else{const old=JSON.parse(localStorage.getItem('noobeye:audio:v1')||'{}');prefs={...prefs,...old,track:'auto'};}}catch{}
prefs.volume=Math.max(0,Math.min(1,Number(prefs.volume)||0));
if(!['auto',...TRACKS.map(t=>t.id)].includes(prefs.track))prefs.track='auto';
let context,analyser,mediaSource,frequency,timeDomain,frame,playVersion=0,suggested='echoes',blocked=false,dockVisible=false,userStartedPlayback=false;
let dockPositionFrame=0;
const player=new Audio();player.preload='none';player.loop=true;player.crossOrigin='anonymous';
const $=id=>document.getElementById(id);
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}};
const current=()=>TRACKS.find(t=>t.id===(prefs.track==='auto'?suggested:prefs.track))||TRACKS[0];
const timeLabel=seconds=>{const s=Math.floor(Number.isFinite(seconds)?seconds:0);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
function ensureContext(){context||=new(window.AudioContext||window.webkitAudioContext)();return context;}
function connectMusic(){
 if(mediaSource)return;
 const ctx=ensureContext();analyser=ctx.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.83;
 mediaSource=ctx.createMediaElementSource(player);mediaSource.connect(analyser);analyser.connect(ctx.destination);
 frequency=new Uint8Array(analyser.frequencyBinCount);timeDomain=new Uint8Array(analyser.fftSize);
}
function positionDock(){
 dockPositionFrame=0;
 const dock=$('music-dock'),footer=document.querySelector('main > footer');
 if(!dockVisible||!footer)return;
 const height=dock.offsetHeight;
 const size=height+'px';
 if(document.body.style.getPropertyValue('--music-dock-height')!==size)document.body.style.setProperty('--music-dock-height',size);
 // Keep floating until the footer reaches the player, then center it on the footer's top edge.
 const footerBottom=Math.max(0,window.innerHeight-footer.getBoundingClientRect().top-height/2);
 dock.style.setProperty('--dock-footer-bottom',footerBottom+'px');
}
function scheduleDockPosition(){if(!dockPositionFrame)dockPositionFrame=requestAnimationFrame(positionDock);}
function ui(){
 const audible=!player.paused&&prefs.music&&!blocked;
 $('music-toggle').dataset.icon='music';$('sound').dataset.icon=prefs.effects?'sound':'mute';
 $('music-toggle').textContent=blocked||(prefs.music&&!userStartedPlayback)?tr('播放音乐','Play music','音楽を再生'):prefs.music?tr('音乐：开','Music: on','音楽：オン'):tr('音乐：关','Music: off','音楽：オフ');
 $('music-toggle').setAttribute('aria-pressed',String(prefs.music&&userStartedPlayback&&!blocked));
 $('sound').textContent=prefs.effects?tr('音效：开','Sound: on','効果音：オン'):tr('音效：关','Sound: off','効果音：オフ');$('sound').setAttribute('aria-pressed',String(prefs.effects));
 $('now-playing').textContent=tr(...current().names)+' · '+tr(...current().styles);
 $('music-volume').value=String(Math.round(prefs.volume*100));$('music-track').value=prefs.track;
 const dock=$('music-dock');dock.hidden=!dockVisible;dock.classList.toggle('is-playing',audible);dock.classList.toggle('is-collapsed',Boolean(prefs.collapsed));document.body.classList.toggle('music-dock-open',dockVisible&&!prefs.collapsed);
 dock.setAttribute('aria-label',tr('音乐播放器','Music player','ミュージックプレーヤー'));
 $('dock-title').textContent=tr(...current().names);
 $('dock-prev').setAttribute('aria-label',tr('上一首','Previous track','前の曲'));$('dock-next').setAttribute('aria-label',tr('下一首','Next track','次の曲'));
 $('dock-collapse').setAttribute('aria-label',prefs.collapsed?tr('展开播放器','Expand player','プレーヤーを展開'):tr('收起到右下角','Collapse to bottom right','右下に折りたたむ'));$('dock-collapse').setAttribute('aria-expanded',String(!prefs.collapsed));
 for(const id of ['dock-prev','dock-next','dock-collapse'])$(id).title=$(id).getAttribute('aria-label');
 $('dock-state').textContent=audible?tr('正在播放','NOW PLAYING','再生中'):tr('已暂停','PAUSED','一時停止中');
 $('dock-play').dataset.icon=audible?'pause':'play';
 $('dock-play').setAttribute('aria-label',audible?tr('暂停音乐','Pause music','音楽を一時停止'):tr('继续播放','Resume music','音楽を再開'));
 $('dock-close').setAttribute('aria-label',tr('停止音乐并关闭播放器','Stop music and close player','音楽を停止してプレーヤーを閉じる'));
 $('dock-volume').value=String(Math.round(prefs.volume*100));$('dock-volume').setAttribute('aria-label',tr('音乐音量','Music volume','音楽の音量'));
 $('dock-time').textContent=timeLabel(player.currentTime)+' / '+timeLabel(player.duration);
 positionDock();
 drawWave();
}
function drawWave(){
 const canvas=$('music-wave');if(!canvas||!dockVisible)return;
 const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width),h=Math.round(rect.height);
 if(!w||!h)return;
 if(canvas.width!==w*ratio||canvas.height!==h*ratio){canvas.width=w*ratio;canvas.height=h*ratio;}
 const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 const active=!player.paused&&prefs.music;
 if(analyser&&frequency&&timeDomain&&active){analyser.getByteFrequencyData(frequency);analyser.getByteTimeDomainData(timeDomain);}
 const energy=active&&frequency?frequency.slice(0,100).reduce((sum,v)=>sum+v,0)/25500:0;
 $('music-dock').style.setProperty('--energy',String(energy));
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const t=reduce?0:performance.now()/1000;
 const gradient=ctx.createLinearGradient(0,0,w,0);gradient.addColorStop(0,'#73f9dd');gradient.addColorStop(.45,'#a596ff');gradient.addColorStop(1,'#ff8abe');
 ctx.lineCap='round';ctx.strokeStyle=gradient;
 for(let band=0;band<4;band++){
  ctx.beginPath();ctx.lineWidth=band===0?2:1;ctx.globalAlpha=active?.85-band*.16:.22;
  for(let x=0;x<=w;x+=2){
   const envelope=Math.pow(Math.sin(x/w*Math.PI),.65);
   const signal=active&&timeDomain?(timeDomain[Math.floor(x/w*(timeDomain.length-1))]-128)/128:0;
   const amplitude=active?Math.min(h*.35,4+energy*h*.8):2;
   const y=h/2+(Math.sin(x/w*Math.PI*(3+band)+t*(2+band*.4)+band)*amplitude+signal*h*.25)*envelope*(1-band*.12);
   x?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }ctx.stroke();
 }
 ctx.globalAlpha=1;
 if(active&&!reduce){for(let i=0;i<22;i++){const bin=frequency?.[i*5]||0;ctx.fillStyle=gradient;ctx.globalAlpha=.18+bin/800;const size=1+bin/170;ctx.beginPath();ctx.arc((i/22*w+t*(9+i%3))%w,h/2+Math.sin(t+i)*h*.36,size,0,Math.PI*2);ctx.fill();}}
}
function animate(){
 cancelAnimationFrame(frame);
 const tick=()=>{
  if(player.paused||document.hidden){drawWave();return;}
  const head=Math.min(1,player.currentTime/.8),tail=Number.isFinite(player.duration)?Math.min(1,Math.max(0,(player.duration-player.currentTime)/.8)):1;
  player.volume=prefs.volume*Math.min(head,tail);drawWave();frame=requestAnimationFrame(tick);
 };tick();
}
async function play(){
 const version=++playVersion;
 if(!userStartedPlayback){ui();return;}
 if(!prefs.music||document.hidden){player.pause();blocked=false;ui();return;}
 const src=current().src;
 if(player.getAttribute('src')!==src){player.pause();player.src=src;player.volume=0;}
 try{
  try{connectMusic();await ensureContext().resume();}catch{ /* Native playback remains available if Web Audio is unavailable. */ }
  await player.play();if(version!==playVersion)return;
  blocked=false;dockVisible=true;ui();animate();
 }catch(error){
  if(version!==playVersion)return;blocked=true;ui();
  $('now-playing').textContent=error.name==='NotAllowedError'?tr('点击“播放音乐”开始聆听','Tap Play music to listen','「音楽を再生」を押してください'):tr('音乐暂时无法播放，点击重试。','Music could not play. Tap to retry.','再生できませんでした。もう一度お試しください。');
 }
}
function toggleMusic(){prefs.music=blocked||!userStartedPlayback?true:!prefs.music;userStartedPlayback=true;blocked=false;prefs.touched=true;persist();play();ui();}
function chooseTrack(id){userStartedPlayback=true;prefs.track=id;prefs.music=true;prefs.touched=true;persist();ui();play();}
function stepTrack(delta){chooseTrack(TRACKS[(TRACKS.findIndex(t=>t.id===current().id)+delta+TRACKS.length)%TRACKS.length].id);}
function volumeChanged(event){prefs.volume=Number(event.target.value)/100;player.volume=prefs.volume;persist();ui();}
export async function prepareSensorAudio(){await ensureContext().resume();}
// Original two-mode hollow chime, synthesized without recorded samples.
export function sensorPulse(strength){
 if(!prefs.effects||context?.state!=='running')return null;
 const ctx=context,t=ctx.currentTime,nodes=[];
 for(const [frequency,level,decay] of [[510,1,.14],[1373,.22,.075]]){
  const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
  o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*.96,t+.12);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime((.009+.046*strength)*level,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+decay);
  o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+decay+.02);nodes.push([o,g]);
  o.onended=()=>{o.disconnect();g.disconnect();};
 }
 return ()=>{for(const [o,g]of nodes){g.disconnect();try{o.stop();}catch{}}};
}
export function effect(kind='tap'){
 if(!prefs.effects)return;
 try{
  const ctx=ensureContext();ctx.resume().catch(()=>{});
  if(kind==='found'||kind==='complete'){
   // The finale extends the discovery chime into an ascending phrase and full chord.
   const start=ctx.currentTime;
   const notes=kind==='complete'
    ?[[523.25,0,.28,.07],[659.25,.11,.28,.075],[783.99,.22,.3,.08],[1046.5,.36,.38,.085],[1174.66,.54,.22,.065],[1318.51,.7,.4,.08],[1567.98,.88,.38,.07],[1046.5,1.08,1.1,.085],[1318.51,1.08,1,.04],[1567.98,1.08,1,.035],[261.63,1.08,1.15,.075],[523.25,1.08,1.1,.035],[2093,1.18,.8,.018]]
    :[[659.25,0,.15,.07],[783.99,.065,.17,.07],[1046.5,.14,.46,.085],[523.25,.14,.4,.032],[659.25,.14,.4,.024]];
   for(const [freq,delay,duration,level] of notes){
    for(const [partial,weight] of [[1,1],[2,.14]]){
     const o=ctx.createOscillator(),g=ctx.createGain(),t=start+delay;
     o.type='sine';o.frequency.setValueAtTime(freq*partial,t);
     g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level*weight,t+.006);
     g.gain.exponentialRampToValueAtTime(.0001,t+duration);
     o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+duration+.02);
     o.onended=()=>{o.disconnect();g.disconnect();};
    }
   }
   return;
  }
  const presets={tap:[[700,0,.045]],miss:[[270,0,.11],[185,.06,.16]],select:[[440,0,.08],[660,.045,.1]],hint:[[660,0,.14],[880,.08,.2]],found:[[523.25,0,.18],[659.25,.075,.2],[783.99,.15,.25]],complete:[[523.25,0,.2],[659.25,.1,.2],[783.99,.2,.25],[1046.5,.36,.6]],page:[[392,0,.08],[523.25,.055,.12]]};
  for(const[freq,delay,duration]of presets[kind]||presets.tap){const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+delay;o.type=kind==='miss'?'triangle':'sine';o.frequency.setValueAtTime(freq,t);if(kind==='miss')o.frequency.exponentialRampToValueAtTime(freq*.7,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(kind==='miss'?.07:.065,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+duration+.03);}
 }catch{}
}
export function setIssueMusic(id){suggested=id;ui();play();}
export function startListening(){userStartedPlayback=true;if(!prefs.touched){prefs.music=true;prefs.touched=true;persist();}play();ui();}
export function setupAudio(){
 for(const track of TRACKS){const o=document.createElement('option');o.value=track.id;o.textContent=tr(...track.names);$('music-track').append(o);}
 $('music-toggle').addEventListener('click',toggleMusic);$('dock-play').addEventListener('click',toggleMusic);
 $('dock-prev').addEventListener('click',()=>stepTrack(-1));$('dock-next').addEventListener('click',()=>stepTrack(1));
 $('dock-collapse').addEventListener('click',()=>{prefs.collapsed=!prefs.collapsed;persist();ui();});
 $('dock-close').addEventListener('click',()=>{++playVersion;prefs.music=false;prefs.touched=true;dockVisible=false;player.pause();player.removeAttribute('src');player.load();persist();ui();});
 $('sound').addEventListener('click',()=>{prefs.effects=!prefs.effects;persist();ui();effect('select');});
 $('music-volume').addEventListener('input',volumeChanged);$('dock-volume').addEventListener('input',volumeChanged);
 $('music-track').addEventListener('change',e=>chooseTrack(e.target.value));
 document.addEventListener('visibilitychange',()=>{if(document.hidden){++playVersion;player.pause();context?.suspend();ui();}else{context?.resume().catch(()=>{});play();}});
 player.addEventListener('pause',()=>{cancelAnimationFrame(frame);ui();});
 player.addEventListener('playing',()=>{if(prefs.music){dockVisible=true;ui();animate();}});
 player.addEventListener('timeupdate',()=>{$('dock-time').textContent=timeLabel(player.currentTime)+' / '+timeLabel(player.duration);});
 player.addEventListener('error',()=>{if(prefs.music){blocked=true;ui();$('now-playing').textContent=tr('音乐加载失败，请切换曲目重试。','Music could not load. Choose another track to retry.','音楽を読み込めませんでした。別の曲をお試しください。');}});
 window.addEventListener('noobeye-language',()=>{for(const track of TRACKS){const option=$('music-track').querySelector('option[value="'+track.id+'"]');if(option)option.textContent=tr(...track.names);}ui();});
 new ResizeObserver(()=>drawWave()).observe($('music-wave'));
 const dockLayout=new ResizeObserver(scheduleDockPosition);dockLayout.observe($('music-dock'));dockLayout.observe(document.querySelector('main'));
 window.addEventListener('scroll',scheduleDockPosition,{passive:true});window.addEventListener('resize',scheduleDockPosition);
 window.visualViewport?.addEventListener('resize',scheduleDockPosition);
 ui();
}
