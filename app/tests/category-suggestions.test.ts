import { describe, expect, it } from 'vitest';
import type { Category } from '../src/domain';
import { suggestExpenseCategory } from '../src/ui/category-suggestions';

const owner='7e70df2f-42bc-4263-bfe8-b9c26af13213';
const row=(id:string,name:string,kind:Category['kind'],parentId?:string):Category=>({
  id,userId:owner,name,kind,...(parentId?{parentId}:{})
});
const categories=[
  row('service','Serviços e assinaturas','expense'),
  row('spotify','Spotify','expense','service'),
  row('travel','Transporte','expense'),
  row('uber','Transporte por aplicativo','expense','travel'),
  row('food','Alimentação','expense'),
  row('market','Supermercado e mercado','expense','food'),
];
describe('sugestões conservadoras de classificação',()=>{
  it('sugere somente categoria existente e vinculada ao pai esperado',()=>{
    expect(suggestExpenseCategory('Spotify Premium',categories)?.categoryId).toBe('spotify');
    expect(suggestExpenseCategory('Uber *Trip',categories)?.categoryId).toBe('uber');
    expect(suggestExpenseCategory('Supermercado Central',categories)?.categoryId).toBe('market');
  });
  it('não sugere despesa para operações bancárias ambíguas',()=>{
    for(const label of ['Pix Spotify João', 'Pagamento fatura Spotify', 'Estorno Uber',
      'Transferencia Uber', 'Aplicacao Spotify', 'Resgate Spotify']){
      expect(suggestExpenseCategory(label,categories)).toBeUndefined();
    }
  });
  it('não classifica Pix para pessoa física nem uma marca parcialmente semelhante',()=>{
    expect(suggestExpenseCategory('Pix para João',categories)).toBeUndefined();
    expect(suggestExpenseCategory('Ubershop',categories)).toBeUndefined();
    expect(suggestExpenseCategory('Spotifyx',categories)).toBeUndefined();
  });
  it('não inventa categoria nem reaproveita homônimos em raiz errada',()=>{
    expect(suggestExpenseCategory('ChatGPT',categories)).toBeUndefined();
    expect(suggestExpenseCategory('Uber',categories.filter(c=>c.id!=='uber'))).toBeUndefined();
    expect(suggestExpenseCategory('Spotify',[row('fake','Spotify','expense')])).toBeUndefined();
  });
});
