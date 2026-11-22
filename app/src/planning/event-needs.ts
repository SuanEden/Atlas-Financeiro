import type { FinancialEvent } from '../domain';

export const NECESSITY_PAGE_SIZE = 40;

export function searchExpenseEvents(
  events: readonly FinancialEvent[],
  query: string,
  page: number,
  size = NECESSITY_PAGE_SIZE,
): { matches: FinancialEvent[]; total: number; pages: number; page: number } {
  if (!Number.isSafeInteger(size) || size < 1 || size > 200) throw new RangeError('Tamanho de página inválido.');
  const normalized = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const matches = events.filter(event => {
    if (event.kind !== 'expense' || event.reversesEventId) return false;
    if (!normalized) return true;
    const value = [event.description, event.competenceDate].join(' ').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    return value.includes(normalized);
  }).sort((a,b) => b.competenceDate.localeCompare(a.competenceDate) || a.id.localeCompare(b.id));
  const pages = Math.max(1, Math.ceil(matches.length / size));
  const current = Number.isSafeInteger(page) ? Math.max(0, Math.min(page, pages - 1)) : 0;
  return { matches: matches.slice(current * size, (current + 1) * size), total: matches.length, pages, page: current };
}
