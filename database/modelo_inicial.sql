-- Atlas Financeiro: referência relacional do Incremento 1.
-- NÃO é migration de Supabase, NÃO foi aplicada/testada em PostgreSQL e NÃO
-- configura um backend utilizável. Não cria auth.users, serviços, grants de
-- cliente, RPCs, policies, outbox, gerações ou triggers de integridade global.
-- Usa schema isolado para impedir confusão com um schema pronto para deploy.
-- Invariantes entre linhas listadas ao final ainda precisam de implementação.

begin;

create schema atlas_reference;

-- Proprietário de domínio. O vínculo com auth.users pertence à integração I3.
create table atlas_reference.owners (
  id uuid primary key
);

create table atlas_reference.accounts (
  id uuid primary key,
  user_id uuid not null references atlas_reference.owners(id),
  name text not null check (char_length(name) between 1 and 120 and btrim(name) <> ''),
  kind text not null check (kind in (
    'checking', 'savings', 'cash', 'digital', 'transport', 'investment', 'other'
  )),
  availability text not null check (availability in ('free', 'reserved', 'restricted')),
  unique (user_id, id),
  check (kind <> 'transport' or availability = 'restricted')
);

create table atlas_reference.categories (
  id uuid primary key,
  user_id uuid not null references atlas_reference.owners(id),
  name text not null check (char_length(name) between 1 and 120 and btrim(name) <> ''),
  kind text not null check (kind in ('income', 'expense', 'both')),
  parent_id uuid,
  unique (user_id, id),
  foreign key (user_id, parent_id) references atlas_reference.categories(user_id, id),
  check (parent_id is null or parent_id <> id)
);

create table atlas_reference.financial_events (
  id uuid primary key,
  user_id uuid not null references atlas_reference.owners(id),
  kind text not null check (kind in ('income', 'expense', 'transfer', 'adjustment')),
  status text not null check (status in ('planned', 'confirmed', 'cancelled')),
  certainty text not null check (certainty in ('confirmed', 'estimated')),
  source text not null check (source in ('manual', 'import', 'opening_balance')),
  amount_cents bigint not null check (amount_cents between 1 and 99999999999),
  account_id uuid not null,
  transfer_account_id uuid,
  category_id uuid,
  description text not null check (
    char_length(description) between 1 and 500 and btrim(description) <> ''
  ),
  competence_date date not null,
  due_date date,
  adjustment_direction text,
  unique (user_id, id),
  foreign key (user_id, account_id) references atlas_reference.accounts(user_id, id),
  foreign key (user_id, transfer_account_id) references atlas_reference.accounts(user_id, id),
  foreign key (user_id, category_id) references atlas_reference.categories(user_id, id),
  check (status <> 'confirmed' or certainty = 'confirmed'),
  check (source <> 'opening_balance' or kind = 'adjustment'),
  check (
    (kind = 'transfer' and transfer_account_id is not null and transfer_account_id <> account_id)
    or (kind <> 'transfer' and transfer_account_id is null)
  ),
  check (
    (kind = 'adjustment' and adjustment_direction is not null
      and adjustment_direction in ('increase', 'decrease'))
    or (kind <> 'adjustment' and adjustment_direction is null)
  ),
  check (category_id is null or kind in ('income', 'expense')),
  check (competence_date between date '0001-01-01' and date '9999-12-31'),
  check (due_date is null or due_date between date '0001-01-01' and date '9999-12-31')
);

create table atlas_reference.settlements (
  id uuid primary key,
  user_id uuid not null references atlas_reference.owners(id),
  event_id uuid not null,
  amount_cents bigint not null check (amount_cents between 1 and 99999999999),
  payment_date date not null,
  settlement_date date not null,
  unique (user_id, id),
  foreign key (user_id, event_id) references atlas_reference.financial_events(user_id, id),
  check (payment_date <= settlement_date),
  check (payment_date between date '0001-01-01' and date '9999-12-31'),
  check (settlement_date between date '0001-01-01' and date '9999-12-31')
);

create table atlas_reference.postings (
  id uuid primary key,
  user_id uuid not null references atlas_reference.owners(id),
  settlement_id uuid not null,
  account_id uuid not null,
  amount_cents bigint not null check (
    amount_cents between -99999999999 and 99999999999 and amount_cents <> 0
  ),
  unique (user_id, id),
  foreign key (user_id, settlement_id) references atlas_reference.settlements(user_id, id),
  foreign key (user_id, account_id) references atlas_reference.accounts(user_id, id)
);

create index categories_parent_idx on atlas_reference.categories(user_id, parent_id);
create index financial_events_account_idx on atlas_reference.financial_events(user_id, account_id);
create index financial_events_destination_idx on atlas_reference.financial_events(user_id, transfer_account_id);
create index financial_events_category_idx on atlas_reference.financial_events(user_id, category_id);
create index financial_events_competence_idx on atlas_reference.financial_events(user_id, competence_date);
create index settlements_event_idx on atlas_reference.settlements(user_id, event_id);
create index settlements_date_idx on atlas_reference.settlements(user_id, settlement_date);
create index postings_settlement_idx on atlas_reference.postings(user_id, settlement_id);
create index postings_account_idx on atlas_reference.postings(user_id, account_id);

-- Defesa estrutural somente: sem policies/grants, nenhum acesso de cliente é
-- habilitado por este artefato. Donos/superusuários têm semântica própria de RLS.
alter table atlas_reference.owners enable row level security;
alter table atlas_reference.accounts enable row level security;
alter table atlas_reference.categories enable row level security;
alter table atlas_reference.financial_events enable row level security;
alter table atlas_reference.settlements enable row level security;
alter table atlas_reference.postings enable row level security;

comment on schema atlas_reference is
  'Desenho I1 não aplicado: sem auth, grants/policies de cliente, RPCs ou integridade global implementados.';

-- PENDÊNCIAS OBRIGATÓRIAS antes de transformar o desenho em backend:
-- 1. Autorizar por auth.uid() + app_access ativa, com USING e WITH CHECK.
-- 2. Confirmar ausência de ciclos e compatibilidade da natureza da categoria.
-- 3. Somente liquidar evento confirmado; soma de liquidações <= valor do evento.
-- 4. Exatamente um posting compatível por receita/despesa/ajuste, ou dois opostos
--    em contas distintas por transferência. Validar em transação sob concorrência.
-- 5. Preservar histórico e impedir edição/cancelamento que destrua caixa liquidado.
-- 6. Receipts idempotentes, versões, tombstones e cursor em ordem segura de commit.
-- 7. Schemas privados não expostos, superfície api restrita e GraphQL desativado.
-- 8. Testes PostgreSQL/RLS/RPC reais; validação estática deste arquivo não os substitui.

commit;
