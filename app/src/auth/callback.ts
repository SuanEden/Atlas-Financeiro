export type AuthReturn={kind:'none'}|{kind:'error'}|{kind:'code';code:string};
/** Remove sensitive URL values before async work, logs, rendering or error handling. */
export function consumeAuthReturn(href:string,replace:(path:string)=>void):AuthReturn {
  const url=new URL(href);
  // Supabase may return to the configured Site URL (/) when redirectTo is
  // not allowlisted. Consume the code there too, never show it in the URL.
  const isCallback=url.pathname==='/auth/callback';
  const siteUrlFallback=url.pathname==='/'&&(url.searchParams.has('code')||url.searchParams.has('error'));
  if(!isCallback&&!siteUrlFallback) return {kind:'none'};
  const codes=url.searchParams.getAll('code');
  const result:AuthReturn=codes.length===1&&codes[0]&&codes[0].length<=2048&&!url.searchParams.has('error')&&!url.hash?{kind:'code',code:codes[0]}:{kind:'error'};
  replace('/');
  return result;
}
