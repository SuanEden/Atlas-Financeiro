import type { Category } from '../domain';
import { categoryKey } from './personalized-categories';

type Suggestion = { categoryId:string; label:string };
const rules=[
  {pattern:/^(?:uber)(?:\s|\*|$)/i,group:'Transporte',category:'Transporte por aplicativo'},
  {pattern:/^(?:spotify)(?:\s|\*|$)/i,group:'Serviços e assinaturas',category:'Spotify'},
  {pattern:/^(?:chatgpt)(?:\s|\*|$)/i,group:'Serviços e assinaturas',category:'ChatGPT'},
  {pattern:/^(?:supermercado|hipermercado)(?:\s|\*|$)/i,group:'Alimentação',category:'Supermercado e mercado'},
  {pattern:/^(?:padaria|panificadora)(?:\s|\*|$)/i,group:'Alimentação',category:'Padaria'},
  {pattern:/^(?:farmacia|farmácia|drogaria)(?:\s|\*|$)/i,group:'Saúde e bem-estar',category:'Farmácia'},
] as const;

/**
 * A visible suggestion only, never an automatic posting. Excludes ambiguous
 * banking operations even if the text happens to mention a known merchant.
 */
export function suggestExpenseCategory(description:string,categories:readonly Category[]):Suggestion|undefined {
  const normalized=categoryKey(description);
  if(!normalized||normalized.length>500||/\b(?:pix|fatura|estorno|transferencia|aplicacao|resgate)\b/.test(normalized))return undefined;
  const match=rules.find(rule=>rule.pattern.test(description.trim()));
  if(!match)return undefined;
  const parent=categories.find(row=>row.kind==='expense'&&!row.parentId&&categoryKey(row.name)===categoryKey(match.group));
  if(!parent)return undefined;
  const child=categories.find(row=>row.kind==='expense'&&row.parentId===parent.id&&categoryKey(row.name)===categoryKey(match.category));
  return child?{categoryId:child.id,label:match.group+' > '+match.category}:undefined;
}
