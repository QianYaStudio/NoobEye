// Custom releases are opt-in deployment configuration, separate from ordinary numbering.
export function issueValid(value,env={}){
 if(typeof value!=='string')return false;
 if(/^(00[1-9]|01[0-9]|02[0-9]|03[0-9]|04[0-9]|05[0-4])$/.test(value))return true;
 return /^custom-(?:\d{3}|[1-9]\d{3,})$/.test(value)&&String(env.CUSTOM_ISSUE_IDS||'').split(',').map(v=>v.trim()).includes(value);
}
