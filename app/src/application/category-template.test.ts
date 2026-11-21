import { expect, it } from 'vitest';
import { categoryTemplatePreview } from './category-template';
import type { Category } from '../domain';

it('reuses compatible category IDs and blocks ambiguous branches', () => {
  const userId = 'owner';
  const categories: Category[] = [
    { id: 'food', name: 'ALIMENTACAO', kind: 'expense', userId },
    { id: 'market', name: 'Mercado', kind: 'expense', parentId: 'food', userId },
    { id: 'housing', name: 'Moradia', kind: 'income', userId },
  ];
  const rows = categoryTemplatePreview({ categories }, userId);
  expect(rows.find(row => row.name === 'Supermercado e mercado')).toMatchObject({ status: 'keep', parentId: 'food' });
  expect(rows.find(row => row.name === 'Padaria')).toMatchObject({ status: 'create', parentId: 'food' });
  expect(rows.find(row => row.name === 'Água')?.status).toBe('review');
  for (;;) {
    const missing = categoryTemplatePreview({ categories }, userId).find(row => row.status === 'create');
    if (!missing) break;
    categories.push({ id: String(categories.length), name: missing.name, kind: missing.kind, userId,
      ...(missing.parentId ? { parentId: missing.parentId } : {}) });
  }
  expect(categoryTemplatePreview({ categories }, userId).some(row => row.status === 'create')).toBe(false);
});
