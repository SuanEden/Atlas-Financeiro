import { isEntitySelectable, type FinancialDataset } from '../domain';
import type { BankImportCandidate } from './pluggy-import';

const rules = [
  { pattern: /\buber\s*(?:\*\s*)?(?:trip|viagem)\b/, parent: 'transporte', names: ['transporte por aplicativo', 'transporte por app'] },
  { pattern: /\bsupermercados?\b/, parent: 'alimentacao', names: ['supermercado e mercado', 'supermercado', 'mercado'] },
  { pattern: /\bpadaria\b/, parent: 'alimentacao', names: ['padaria'] },
  { pattern: /\bfarmacia\b/, parent: 'saude e bem-estar', names: ['farmacia'] },
  { pattern: /\bspotify\b/, parent: 'servicos e assinaturas', names: ['spotify'] },
  { pattern: /\bchatgpt\b/, parent: 'servicos e assinaturas', names: ['chatgpt'] },
];

const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

export function suggestBankCategory(dataset: FinancialDataset, candidate: BankImportCandidate, userId: string) {
  if (candidate.kind !== 'expense') return undefined;
  const description = normalize(candidate.description);
  if (/\b(pix|fatura|estorno|resgate|aplicacao|transferencia)\b/.test(description)) return undefined;
  const matching = rules.filter(rule => rule.pattern.test(description));
  const rule = matching[0];
  if (!rule || matching.length !== 1) return undefined;
  const categories = dataset.categories.filter(category => category.userId === userId && category.kind !== 'income'
    && isEntitySelectable(dataset.entityLifecycles ?? [], userId, 'category', category.id));
  const parents = categories.filter(category => !category.parentId && normalize(category.name) === rule.parent);
  if (parents.length !== 1) return undefined;
  const children = categories.filter(category => category.parentId === parents[0]!.id && rule.names.includes(normalize(category.name)));
  if (children.length !== 1) return undefined;
  return children[0];
}
