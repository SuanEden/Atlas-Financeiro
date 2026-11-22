/** Explicitly opt-in, read-only deployment diagnostic. Never print tokens, IDs or bank data. */
const raw=(process.env.ATLAS_PLUGGY_ALLOWED_ITEM_IDS??'').trim();
const ids=raw?raw.split(',').map(x=>x.trim()):[];
const valid=/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const banks=ids.map((id,index)=>['connection-'+(index+1),id]);

if (process.env.ATLAS_BANK_DIAGNOSE !== '1') {
  process.exit(0);
}
if(!banks.length||banks.length>20||banks.some(([,id])=>!valid.test(id))||
  new Set(banks.map(([,id])=>id)).size!==banks.length){
  console.log('BANK_DIAGNOSTIC allowlist=missing_or_invalid');
  process.exit(0);
}
const {PLUGGY_CLIENT_ID: clientId, PLUGGY_CLIENT_SECRET: clientSecret} = process.env;
if (!clientId || !clientSecret) {
  console.log('BANK_DIAGNOSTIC credentials=missing');
  process.exit(0);
}
try {
  const login = await fetch('https://api.pluggy.ai/auth', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({clientId,clientSecret}),
    signal:AbortSignal.timeout(12000),
  });
  if(!login.ok){console.log('BANK_DIAGNOSTIC auth_http='+login.status);process.exit(0);}
  const {apiKey}=await login.json();
  if(typeof apiKey!=='string'){console.log('BANK_DIAGNOSTIC auth_response=invalid');process.exit(0);}
  for(const [name,id] of banks){
    const headers={'X-API-KEY':apiKey};
    let item;
    try{
      const itemResponse=await fetch('https://api.pluggy.ai/items/'+encodeURIComponent(id),{headers,signal:AbortSignal.timeout(12000)});
      if(!itemResponse.ok){console.log('BANK_DIAGNOSTIC bank='+name+' item_http='+itemResponse.status);continue;}
      item=await itemResponse.json();
      console.log('BANK_DIAGNOSTIC bank='+name+' item_http=200 status='+String(item.status||'UNKNOWN').replace(/[^A-Z_]/g,'').slice(0,32));
    }catch{console.log('BANK_DIAGNOSTIC bank='+name+' item=network_or_parse_error');continue;}
    try{
      const res=await fetch('https://api.pluggy.ai/accounts?itemId='+encodeURIComponent(id),{headers,signal:AbortSignal.timeout(12000)});
      if(!res.ok){console.log('BANK_DIAGNOSTIC bank='+name+' accounts_http='+res.status);continue;}
      const body=await res.json();
      const list=Array.isArray(body.results)?body.results:[];
      const eligible=list.filter(a=>a?.type==='BANK'&&a?.currencyCode==='BRL');
      console.log('BANK_DIAGNOSTIC bank='+name+' accounts_http=200 count='+list.length+' bank_brl_count='+eligible.length+' has_balance='+eligible.some(a=>typeof a.balance==='number'&&Number.isFinite(a.balance)));
    }catch{console.log('BANK_DIAGNOSTIC bank='+name+' accounts=network_or_parse_error');}
  }
} catch {
  console.log('BANK_DIAGNOSTIC auth=network_or_parse_error');
}
// Diagnostic errors do not fail the finance app build.
