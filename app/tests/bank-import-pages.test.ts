import { describe, expect, it } from 'vitest';
import {
  MAX_BANK_IMPORT_PAGES, MAX_BANK_IMPORT_ROWS, previewLinkedBankAccount, type ImportSource, type BankLink,
} from '../src/remote/bank-auto-import';

const account='aa000000-0000-0000-0000-000000000000';
const link:BankLink={
  itemId:'bb000000-0000-0000-0000-000000000000',pluggyAccountId:account,
  atlasAccountId:'atlas-account',activatedOn:'2026-10-01'
};
const emptyState={accounts:[],categories:[],events:[],settlements:[],postings:[],outbox:[]};
describe('paginação segura de extrato bancário',()=>{
  it('consulta mais de 30 páginas completas sem gravar movimentos',async()=>{
    let reads=0;
    const source={
      readState:async()=>emptyState,
      readPage:async()=>{reads++;return {results:[],next:reads<40?'?accountId='+account+'&after=cursor'+reads:null};},
      execute:async()=>{throw new Error('Não deve gravar.');},
      context:{} as never,
    } as unknown as ImportSource;
    const preview=await previewLinkedBankAccount(link,source);
    expect(preview.pages).toBe(40);
    expect(reads).toBe(40);
    expect(preview.candidates).toHaveLength(0);
  });
  it('interrompe prévia muito longa antes de qualquer gravação',async()=>{
    let writes=0;
    const source={
      readState:async()=>emptyState,
      readPage:async()=>({results:[],next:'?accountId='+account+'&after=repeat'}),
      execute:async()=>{writes++;},context:{} as never,
    } as unknown as ImportSource;
    await expect(previewLinkedBankAccount(link,source)).rejects.toThrow(/repetiu o cursor/);
    expect(writes).toBe(0);
  });
  it('rejeita volume acima do limite sem criar lançamento',async()=>{
    let writes=0;
    const rows=Array.from({length:MAX_BANK_IMPORT_ROWS+1},()=>({
      accountId:account,status:'POSTED',date:'2026-11-22'
    }));
    const source={
      readState:async()=>emptyState,
      readPage:async()=>({results:rows,next:null}),
      execute:async()=>{writes++;},context:{} as never,
    } as unknown as ImportSource;
    await expect(previewLinkedBankAccount(link,source)).rejects.toThrow(/Nenhum lançamento foi gravado/);
    expect(writes).toBe(0);
    expect(MAX_BANK_IMPORT_PAGES).toBe(80);
  });
});
