import type { Category } from '../domain';

/** Optional, user-approved templates. Never represent transfers, balances, settlements or confirmed payments. */
export const atlasCategoryCatalog = [
  { kind:'expense', name:'Alimentação', children:['Supermercado e mercado','Padaria','Lanches','Restaurantes','Açaí e sobremesas','Delivery','Outros alimentos'] },
  { kind:'expense', name:'Transporte', children:['Ônibus','Bilhete Único','Transporte por aplicativo','Combustível','Manutenção de veículo','Outros transportes'] },
  { kind:'expense', name:'Moradia', children:['Água','Energia','Manutenção residencial','Produtos e utilidades domésticas','Outras despesas domésticas'] },
  { kind:'expense', name:'Serviços e assinaturas', children:['Internet residencial','Telefonia e recargas','ChatGPT','Spotify','Streaming','Software e serviços digitais','Outros serviços'] },
  { kind:'expense', name:'Educação', children:['Faculdade','Mensalidades','Cursos','Livros e materiais','Certificados e inscrições','Outras despesas educacionais'] },
  { kind:'expense', name:'Saúde e bem-estar', children:['Farmácia','Consultas e exames','Academia','Suplementos','Cuidados pessoais','Barbearia','Outros cuidados'] },
  { kind:'expense', name:'Compras pessoais', children:['Roupas','Calçados','Eletrônicos','Acessórios','Equipamentos de informática','Outros produtos'] },
  { kind:'expense', name:'Lazer', children:['Jogos','Passeios','Cinema','Encontros','Entretenimento','Outros gastos de lazer'] },
  { kind:'expense', name:'Fé e doações', children:['Dízimos','Ofertas','Doações','Contribuições religiosas'] },
  { kind:'expense', name:'Finanças', children:['Tarifas bancárias','Juros','Encargos','Impostos e taxas','Custos de operações de crédito'] },
  { kind:'expense', name:'Outros', children:['Despesa não identificada','Despesas diversas'] },
  { kind:'income', name:'Trabalho', children:['Salário','Trabalho autônomo','Serviços de informática','Suporte técnico','Outras atividades profissionais'] },
  { kind:'income', name:'Rendas recorrentes', children:['Aluguel recebido','Outras rendas recorrentes'] },
  { kind:'income', name:'Reembolsos', children:['Transporte','Compras','Despesas profissionais','Outros reembolsos'] },
  { kind:'income', name:'Rendimentos', children:['Juros de investimentos','Rendimentos financeiros','Outras receitas financeiras'] },
  { kind:'income', name:'Outras receitas', children:['Ajuda financeira','Presentes recebidos','Receitas não identificadas','Receitas diversas'] },
] as const;

type CatalogGroup = (typeof atlasCategoryCatalog)[number];
export type CatalogProposal = {
  key:string;
  name:string;
  kind:CatalogGroup['kind'];
  parentKey?:string;
};
export const categoryKey = (name:string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');

/**
 * Pure dry-run. Match by normalized exact name + nature + parent, never by fuzzy
 * similarity. The wrong parent or a different nature must never be silently reused.
 * Virtual IDs allow a child to depend on a parent that has yet to be created.
 */
export function planPersonalizedCategories(existing:readonly Category[]):CatalogProposal[] {
  const current = existing.map(row => ({...row}));
  const proposals:CatalogProposal[]=[];
  const same=(row:Category,name:string,kind:'income'|'expense',parentId?:string) =>
    row.kind===kind && categoryKey(row.name)===categoryKey(name) && (row.parentId||undefined)===parentId;
  for(const group of atlasCategoryCatalog) {
    const key=group.kind+':'+categoryKey(group.name);
    let parent=current.find(row => same(row,group.name,group.kind));
    if(!parent) {
      parent={id:'preview:'+key,userId:'preview',name:group.name,kind:group.kind};
      proposals.push({key,name:group.name,kind:group.kind});
      current.push(parent);
    }
    for(const name of group.children) {
      if(current.some(row=>same(row,name,group.kind,parent!.id)))continue;
      const childKey=key+'/'+categoryKey(name);
      proposals.push({key:childKey,name,kind:group.kind,parentKey:key});
      current.push({id:'preview:'+childKey,userId:'preview',name,kind:group.kind,parentId:parent.id});
    }
  }
  return proposals;
}

/** Resolve a proposed child against the parent's actual, immutable ID. */
export function resolveCatalogParent(existing:readonly Category[],proposal:CatalogProposal):string|undefined {
  if(!proposal.parentKey)return undefined;
  const target=atlasCategoryCatalog.find(group=>group.kind+':'+categoryKey(group.name)===proposal.parentKey);
  if(!target)throw new Error('Categoria superior não reconhecida.');
  const parent=existing.find(row=>row.kind===target.kind&&categoryKey(row.name)===categoryKey(target.name)&&!row.parentId);
  if(!parent)throw new Error('Categoria superior ainda não existe. A execução foi interrompida sem apagar dados.');
  return parent.id;
}
