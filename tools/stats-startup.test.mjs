import test from 'node:test';
import assert from 'node:assert/strict';

test('stats requests wait for slow settings without dropping or duplicating a run', async()=>{
  const originalFetch=globalThis.fetch;
  let release;
  const settings=new Promise(resolve=>{release=resolve;});
  const calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options});
    if(url==='./config.json')return settings;
    return new Response(JSON.stringify({ok:true}),{status:200});
  };
  try{
    const {setupStats,startRun,readStats}=await import('../site/stats.js');
    const ready=setupStats();
    const issue={id:'012',gameplayRevision:2};
    const start=startRun(issue,'test-startup');
    const stats=readStats(issue);
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(calls.map(c=>c.url),['./config.json']);
    release(new Response(JSON.stringify({statsApi:'https://stats.example'}),{status:200}));
    await ready;
    assert.deepEqual(await start,{ok:true});
    assert.deepEqual(await stats,{ok:true});
    assert.deepEqual(calls.map(c=>c.url),['./config.json','https://stats.example/runs/start','https://stats.example/stats?issue=012&revision=2']);
    assert.equal(JSON.parse(calls[1].options.body).runId,'test-startup');
  }finally{globalThis.fetch=originalFetch;}
});
