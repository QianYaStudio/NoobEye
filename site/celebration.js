let cleanup=()=>{};

export function celebrateCompletion(card){
 cleanup();
 card.classList.remove('celebrate');void card.offsetWidth;card.classList.add('celebrate');
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const ns='http://www.w3.org/2000/svg',layer=document.createElement('div');
 layer.className='completion-confetti';layer.setAttribute('aria-hidden','true');
 const colors=['#efbf48','#fff1b0','#8b78cc','#e88d68','#65b9a5'];
 for(let side=0;side<2;side++){
  for(let i=0;i<22;i++){
   const spark=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
   spark.setAttribute('viewBox','0 0 20 20');
   path.setAttribute('d',i%3===0?'M10 0Q12 8 20 10Q12 12 10 20Q8 12 0 10Q8 8 10 0Z':'M5 2Q13 0 15 5L13 17Q6 20 4 14Z');
   path.setAttribute('fill',colors[i%colors.length]);spark.append(path);
   const travel=18+(i*13%49),rise=22+(i*7%32);
   spark.style.cssText=`left:${side?94:6}%;--dx:${side?-travel:travel}vw;--rise:-${rise}vh;--fall:${18+i%5*5}vh;--spin:${(i%2?1:-1)*(180+i*27)}deg;--delay:${i%6*.045}s;width:${10+i%4*4}px;height:${10+i%4*4}px`;
   layer.append(spark);
  }
 }
 document.body.append(layer);
 const timer=setTimeout(()=>{layer.remove();cleanup=()=>{};},3200);
 cleanup=()=>{clearTimeout(timer);layer.remove();};
}
