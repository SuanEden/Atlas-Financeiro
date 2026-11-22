import { describe, expect, it } from 'vitest';
import { emptyPlan, type FinancialPlan } from '../src/planning/model';
import { encryptPlanningBackup, decryptPlanningBackup, isEncryptedPlanningBackup } from '../src/planning/encrypted-backup';

const password='corretamente-secreta-123';
const plan:FinancialPlan={...emptyPlan('owner-personal-test'),
  goals:[{id:'g1',name:'Meta realmente privada',targetCents:85000,deadline:null,
    priority:'unset',status:'active',allocations:[]}]};
describe('backup criptografado do planejamento',()=>{
  it('recupera o conteúdo e não expõe valores ou nomes em texto claro',async()=>{
    const raw=await encryptPlanningBackup(plan,password);
    expect(isEncryptedPlanningBackup(raw)).toBe(true);
    expect(raw).not.toContain('Meta realmente privada');
    expect(raw).not.toContain('85000');
    expect(await decryptPlanningBackup(raw,password)).toEqual(plan);
  });
  it('gera sal e nonce novos para exportações repetidas',async()=>{
    const [a,b]=await Promise.all([encryptPlanningBackup(plan,password),encryptPlanningBackup(plan,password)]);
    expect(a).not.toBe(b);
  });
  it('rejeita senha errada, pequena, conteúdo adulterado e envelope inválido',async()=>{
    const raw=await encryptPlanningBackup(plan,password);
    await expect(decryptPlanningBackup(raw,'senha-errada-123')).rejects.toThrow();
    await expect(encryptPlanningBackup(plan,'curta')).rejects.toThrow();
    await expect(decryptPlanningBackup(raw,'curta')).rejects.toThrow();
    const data=JSON.parse(raw) as Record<string,unknown>;
    await expect(decryptPlanningBackup(JSON.stringify({...data,iterations:10}),password)).rejects.toThrow();
    await expect(decryptPlanningBackup(JSON.stringify({...data,ciphertext:'AAAA'}),password)).rejects.toThrow();
    expect(isEncryptedPlanningBackup(JSON.stringify(plan))).toBe(false);
  });
});
