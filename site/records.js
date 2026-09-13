const legacy='noobeye:pottery-yard:v1';
export function isIssueRecord(key,issueId){
 return Boolean(key)&&(key.startsWith(`noobeye:issue:${issueId}:`)||(issueId==='011'&&(key===legacy||key.startsWith(legacy+':'))));
}
export function clearPlayRecords(storage,scope,issueId){
 if(!['issue','all'].includes(scope))throw new Error('Unknown clear scope');
 const keys=Array.from({length:storage.length},(_,index)=>storage.key(index)).filter(key=>scope==='issue'?isIssueRecord(key,issueId):Boolean(key)&&(key.startsWith('noobeye:issue:')||key===legacy||key.startsWith(legacy+':')||key==='noobeye:last-issue'));
 for(const key of keys)storage.removeItem(key);
 return keys.length;
}
