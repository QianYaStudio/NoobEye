import guideData from './guide-outline-data.js';
import data from './target-outline-data.js?v=issue-021-20260925';
export const targetOutline=(issueId,targetId)=>guideData[issueId+'/'+targetId]?.paths??data[issueId]?.targets[targetId]?.paths;
export const outlineInfo=(issueId,targetId)=>guideData[issueId+'/'+targetId]??data[issueId]?.targets[targetId];

export function createOutlineMark(paths, bounds, animate=false){
 const ns='http://www.w3.org/2000/svg';
 const make=(name,attrs)=>{const e=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
 const group=make('g',{class:`target-outline${animate?' is-new':''}`});
 const normalized=paths.map(p=>typeof p==='string'?{d:p}:p);
 const silhouette=normalized.find(p=>/[zZ]\s*$/.test(p.d)&&!p.inkFill);
 if(silhouette)group.append(make('path',{d:silhouette.d,...(silhouette.transform?{transform:silhouette.transform}:{}),class:'outline-wash',stroke:'none'}));
 for(const [layer,extra] of [['outline-aura',{}],['outline-core',{}],['outline-sweep',{pathLength:100}]]){
  const g=make('g',{class:layer});
  for(const p of normalized)g.append(make('path',{d:p.d,...(p.transform?{transform:p.transform}:{}),fill:p.inkFill&&layer==='outline-core'?'#e0c25f':'none',...(p.inkFill&&layer==='outline-core'?{stroke:'none','fill-rule':'evenodd'}:{}),'vector-effect':'non-scaling-stroke',...extra}));
  group.append(g);
 }
 const [x1,y1,x2,y2]=bounds;
 for(const [x,y,delay] of [[x1-3,y1-2,0],[x2+3,(y1+y2)/2,120],[(x1+x2)/2,y2+5,240]]){
  const g=make('g',{transform:`translate(${x} ${y})`});
  g.append(make('path',{class:'outline-flare',style:`animation-delay:${delay}ms`,d:'M0 -4Q.8 -.8 3.5 0Q.6 .9 0 4Q-1 .6 -3.5 0Q-.7 -.7 0 -4Z',stroke:'none'}));group.append(g);
 }
 return group;
}
