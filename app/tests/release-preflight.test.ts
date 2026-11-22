import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const script = resolve(fileURLToPath(new URL('../scripts/release-preflight.mjs', import.meta.url)));
function check(target:string, overrides:Record<string,string>={}) {
  const env = {
    ...process.env,
    VITE_ATLAS_REMOTE_MODE:'disabled',
    VITE_SUPABASE_URL:'',
    VITE_SUPABASE_PUBLISHABLE_KEY:'',
    VITE_ATLAS_AUTH_ORIGIN:'',
    ATLAS_RELEASE_APPROVED:'',
    ...overrides,
  };
  return spawnSync(process.execPath,[script,'--target='+target],{env,encoding:'utf8'});
}
const staging = {
  VITE_ATLAS_REMOTE_MODE:'integration',
  VITE_SUPABASE_URL:'https://eiqsrredrboxxhxwibyy.supabase.co/',
  VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_123456789012345',
  VITE_ATLAS_AUTH_ORIGIN:'https://atlas-financeiro-nine.vercel.app',
};
describe('pré-publicação sem leitura de dados financeiros',()=>{
  it('aceita modo local isolado',()=>{
    const result=check('local');
    expect(result.status).toBe(0);
  });
  it('rejeita integração remota no modo local',()=>{
    expect(check('local',{VITE_ATLAS_REMOTE_MODE:'integration'}).status).toBe(1);
  });
  it('aceita staging com projeto e origem previstos',()=>{
    expect(check('staging',staging).status).toBe(0);
  });
  it('rejeita staging apontado para banco financeiro principal',()=>{
    expect(check('staging',{...staging,VITE_SUPABASE_URL:'https://zxancpaardzuqyyikwio.supabase.co/'}).status).toBe(1);
  });
  it('rejeita produção apontada para staging e falta de aprovação',()=>{
    expect(check('production',{...staging,ATLAS_RELEASE_APPROVED:'yes'}).status).toBe(1);
    const principal={...staging,VITE_SUPABASE_URL:'https://zxancpaardzuqyyikwio.supabase.co/'};
    expect(check('production',principal).status).toBe(1);
    expect(check('production',{...principal,ATLAS_RELEASE_APPROVED:'yes'}).status).toBe(0);
  });
  it('não imprime chaves em erros',()=>{
    const secret='sb_publishable_SENSITIVE_VALUE_123456';
    const result=check('production',{...staging,VITE_SUPABASE_PUBLISHABLE_KEY:secret});
    expect(result.status).toBe(1);
    expect(result.stdout+result.stderr).not.toContain(secret);
  });
});
