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
  /** A reversal is a new immutable event with the opposite posting effect. */
  reversesEventId?: string;
  /** An edit appends a replacement instead of overwriting the original event. */
  replacesEventId?: string;
  /** JSON-encoded monthly rule; a template is not a cash movement. */
  recurrenceJson?: string;
  /** Links a real or planned occurrence to its recurring template. */
  recurrenceRuleId?: string;
  recurrenceMonth?: string;
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

export type PendingOperationKind =
  | 'create_account'
  | 'create_category'
  | 'record_event'
  | 'reverse_event'
  | 'replace_event';

/** Durable local operation prepared for the future remote synchronization layer. */
export interface PendingOperation extends OwnedEntity {
  kind: PendingOperationKind;
  createdAt: string;
  payloadJson: string;
}

export interface LocalFinancialState extends FinancialDataset {
  outbox: PendingOperation[];
}
