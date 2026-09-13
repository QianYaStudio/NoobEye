export const formatTime=ms=>{const s=Math.floor(Math.max(0,ms)/1000);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};
export class SessionClock{
 constructor(now=()=>performance.now()){this.now=now;this.load({});}
 load(saved={}){this.elapsedMs=Math.max(0,Number(saved.elapsedMs)||0);this.started=Boolean(saved.started);this.finished=Boolean(saved.finished);this.active=false;this.last=this.now();}
 tick(){const now=this.now();if(this.active&&!this.finished)this.elapsedMs+=Math.max(0,now-this.last);this.last=now;return this.elapsedMs;}
 setActive(active){this.tick();this.active=Boolean(active)&&!this.finished;if(this.active)this.started=true;}
 finish(){this.tick();this.finished=true;this.active=false;}
 snapshot(){this.tick();return {elapsedMs:Math.round(this.elapsedMs),started:this.started,finished:this.finished};}
}
