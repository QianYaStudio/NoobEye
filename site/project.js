import {readSettings} from './settings.js';
export async function setupProjectLinks(){
 const settings=await readSettings();
 const fallback='https://github.com/QianYaStudio';
 let href=fallback;
 try{const url=new URL(settings.githubUrl||fallback);if(url.protocol==='https:'&&url.hostname==='github.com')href=url.href;}catch{}
 document.querySelectorAll('[data-github-link]').forEach(link=>{link.href=href;});
}
