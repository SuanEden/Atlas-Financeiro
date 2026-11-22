import { describe, expect, it } from 'vitest';
import { approvedPluggyItems, pluggyReady } from '../api/pluggy';

const a='71c06153-0d24-45ac-81f6-9de6f0d04282';
const b='1c91ee97-e614-494f-b41a-5e203d5fa7ee';
describe('configuração privada do gateway Pluggy',()=>{
  it('nega todas as conexões quando variável não existe',()=>{
    expect([...approvedPluggyItems(undefined)]).toEqual([]);
    expect([...approvedPluggyItems('')]).toEqual([]);
  });
  it('aceita somente UUIDs distintos e limita a quantidade',()=>{
    expect([...approvedPluggyItems(a+', '+b)]).toEqual([a,b]);
    expect(()=>approvedPluggyItems(a+','+a)).toThrow();
    expect(()=>approvedPluggyItems('all')).toThrow();
    expect(()=>approvedPluggyItems(a+',')).toThrow();
    expect(()=>approvedPluggyItems(Array.from({length:21},(_,i)=>'00000000-0000-0000-0000-'+String(i).padStart(12,'0')).join(','))).toThrow();
  });
  it('não declara prontidão sem todas as credenciais e allowlist',()=>{
    const env:NodeJS.ProcessEnv={
      PLUGGY_CLIENT_ID:'configured',PLUGGY_CLIENT_SECRET:'configured',
      ATLAS_PLUGGY_OWNER_ID:a,VITE_SUPABASE_URL:'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY:'configured',ATLAS_PLUGGY_ALLOWED_ITEM_IDS:a,
    };
    expect(pluggyReady(env)).toBe(true);
    expect(pluggyReady({...env,ATLAS_PLUGGY_ALLOWED_ITEM_IDS:undefined})).toBe(false);
    expect(pluggyReady({...env,PLUGGY_CLIENT_SECRET:undefined})).toBe(false);
  });
});
