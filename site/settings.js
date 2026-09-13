let pending;
export function readSettings(){
 pending ||= fetch('./config.json').then(r=>r.ok?r.json():{}).catch(()=>({}));
 return pending;
}
