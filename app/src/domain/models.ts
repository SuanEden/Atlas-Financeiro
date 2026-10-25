import type { MoneyCents } from './money';

/** Financial dates are calendar dates in America/Fortaleza, never UTC instants. */
export type IsoDate = string;

export interface OwnedEntity {
  id: string;
  userId: string;
}

export interface Account extends OwnedEntity {
  name: string;
  kind: 'checking' | 'savings' | 'cash' | 'digital' | 'transport' | 'investment' | 'other';
  availability: 'free' | 'reserved' | 'restricted';
}

export interface Category extends OwnedEntity {
  name: string;
  kind: 'income' | 'expense' | 'both';
  parentId?: string;
}

export interface FinancialEvent extends OwnedEntity {
  kind: 'income' | 'expense' | 'transfer' | 'adjustment';
  source: 'manual' | 'import' | 'opening_balance';
  status: 'planned' | 'confirmed' | 'cancelled';
  certainty: 'confirmed' | 'estimated';
  amountCents: MoneyCents;
  accountId: string;
  transferAccountId?: string;
  categoryId?: string;
  description: string;
  competenceDate: IsoDate;
  dueDate?: IsoDate;
  adjustmentDirection?: 'increase' | 'decrease';
}

/** Only effective settlements are recorded here; forecasts remain events. */
export interface Settlement extends OwnedEntity {
  eventId: string;
  amountCents: MoneyCents;
  paymentDate: IsoDate;
  settlementDate: IsoDate;
}

export interface Posting extends OwnedEntity {
  settlementId: string;
  accountId: string;
  amountCents: MoneyCents;
}

export interface FinancialDataset {
  accounts: Account[];
  categories: Category[];
  events: FinancialEvent[];
  settlements: Settlement[];
  postings: Posting[];
}

export interface DatePeriod {
  start: IsoDate;
  end: IsoDate;
}

export interface FinancialTotals {
  incomeCents: MoneyCents;
  expenseCents: MoneyCents;
  resultCents: MoneyCents;
}

export interface AvailabilityBalances {
  freeCents: MoneyCents;
  reservedCents: MoneyCents;
  restrictedCents: MoneyCents;
  totalCents: MoneyCents;
}
