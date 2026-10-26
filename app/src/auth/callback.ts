export type AuthReturn={kind:'none'}|{kind:'error'}|{kind:'code';code:string};
/** Remove sensitive URL values before async work, logs, rendering or error handling. */
export function consumeAuthReturn(href:string,replace:(path:string)=>void):AuthReturn {
  const url=new URL(href);
  if(url.pathname!=='/auth/callback') return {kind:'none'};
  const codes=url.searchParams.getAll('code');
  const result:AuthReturn=codes.length===1&&codes[0]&&codes[0].length<=2048&&!url.searchParams.has('error')&&!url.hash?{kind:'code',code:codes[0]}:{kind:'error'};
  replace('/');
  return result;
}
