export async function resend(env,path,method='GET',body,key,attempt=0){
 const response=await fetch('https://api.resend.com'+path,{method,headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(response.status===429&&attempt<2){await new Promise(resolve=>setTimeout(resolve,Math.min(3000,Math.max(1000,Number(response.headers.get('Retry-After')||1)*1000))));return resend(env,path,method,body,key,attempt+1);}
 if(response.status===404&&method==='GET')return null;
 const data=await response.json();
 if(!response.ok){const error=new Error('Email service unavailable');error.status=response.status;throw error;}
 return data;
}
