import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Download,
  FolderOpen,
  Plus,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import { RecoveryPanel } from './RecoveryPanel';
import {
  calculateAccountBalance,
  calculateAvailabilityBalances,
  calculateCashTotals,
  formatBRL,
  type FinancialEvent,
  type LocalFinancialState,
} from '../domain';
import { backupFilename, serializeLocalBackup } from '../backup';
import { activeEventIds, accountKindLabels, availabilityLabels, eventAmountSign, eventLabel, formatFinancialDate, financialMonthPeriod } from './financial-view';

type Page = 'dashboard' | 'movements' | 'accounts' | 'categories' | 'backup';

interface DashboardProps {
  state: LocalFinancialState;
  today: string;
  onAddAccount: () => void;
  onAddTransaction: () => void;
  onNavigate: (page: Page) => void;
}

export function Dashboard({ state, today, onAddAccount, onAddTransaction, onNavigate }: DashboardProps) {
  const balances = calculateAvailabilityBalances(state);
  const period = financialMonthPeriod(today);
  const cash = calculateCashTotals(state, period);
  const activeIds = activeEventIds(state);
  const recent = [...state.events]
    .filter((event) => activeIds.has(event.id))
    .sort((left, right) => right.competenceDate.localeCompare(left.competenceDate))
    .slice(0, 4);

  return (
    <div className="page-content">
      <PageHeading title="Visão geral" action={<button className="button button--primary" onClick={onAddTransaction} disabled={state.accounts.length === 0}><Plus size={18} />Novo lançamento</button>} />
      <p className="form-note">Dados somente neste navegador. {state.outbox.length} operações locais ainda sem envio remoto. Guarde uma cópia em Backup.</p>
      <section className="money-summary" aria-label="Resumo dos saldos">
        <MoneyStat label="Disponível" value={balances.freeCents} />
        <MoneyStat label="Reservado" value={balances.reservedCents} />
        <MoneyStat label="Total em contas" value={balances.totalCents} />
      </section>

      <section className="flow-section" aria-labelledby="flow-title">
        <div className="section-heading"><div><p className="section-kicker">{monthLabel(today)}</p><h2 id="flow-title">Fluxo do mês</h2></div></div>
        {state.accounts.length === 0 ? (
          <EmptyPanel icon={<WalletCards />} title="Comece criando sua primeira conta" description="Depois, seus lançamentos e o fluxo do mês aparecerão aqui." action="Criar minha primeira conta" onAction={onAddAccount} />
        ) : (
          <div className="flow-band">
            <div><span>Entradas realizadas</span><strong className="positive">{formatBRL(cash.incomeCents)}</strong></div>
            <div><span>Saídas realizadas</span><strong className="negative">{formatBRL(cash.expenseCents)}</strong></div>
            <div><span>Resultado do mês</span><strong>{formatBRL(cash.resultCents)}</strong></div>
          </div>
        )}
      </section>

      <div className="dashboard-columns">
        <section aria-labelledby="accounts-title"><div className="section-heading"><h2 id="accounts-title">Contas</h2><button className="text-button" onClick={() => onNavigate('accounts')}>Ver todas</button></div>{state.accounts.length === 0 ? <CompactEmpty text="Nenhuma conta criada." /> : <div className="plain-list">{state.accounts.slice(0, 4).map((account) => <div className="account-row" key={account.id}><span className="account-icon"><WalletCards size={19} /></span><span><strong>{account.name}</strong><small>{availabilityLabels[account.availability]}</small></span><b>{formatBRL(calculateAccountBalance(state, account.id))}</b></div>)}</div>}</section>
        <section aria-labelledby="recent-title"><div className="section-heading"><h2 id="recent-title">Movimentações recentes</h2><button className="text-button" onClick={() => onNavigate('movements')}>Ver todas</button></div>{recent.length === 0 ? <CompactEmpty text="Nenhum lançamento registrado." /> : <div className="plain-list">{recent.map((event) => <MovementRow event={event} state={state} key={event.id} />)}</div>}</section>
      </div>
    </div>
  );
}

interface MovementsProps {
  state: LocalFinancialState;
  onAdd: () => void;
  onEdit: (event: FinancialEvent) => void;
  onReverse: (event: FinancialEvent) => void;
}

export function MovementsView({ state, onAdd, onEdit, onReverse }: MovementsProps) {
  const activeIds = activeEventIds(state);
  const events = [...state.events].sort((left, right) => right.competenceDate.localeCompare(left.competenceDate));
  return (
    <div className="page-content">
      <PageHeading title="Movimentações" subtitle="Histórico completo, incluindo correções e estornos." action={<button className="button button--primary" onClick={onAdd} disabled={state.accounts.length === 0}><Plus size={18} />Novo lançamento</button>} />
      <div className="local-status"><span><ShieldCheck size={17} />{state.outbox.length} {state.outbox.length === 1 ? 'operação local pendente' : 'operações locais pendentes'}</span><small>Sincronização remota ainda não disponível.</small></div>
      {events.length === 0 ? <EmptyPanel icon={<ArrowLeftRight />} title="Ainda não há movimentações" description="Crie uma conta e registre sua primeira receita, despesa ou transferência." action="Novo lançamento" onAction={onAdd} disabled={state.accounts.length === 0} /> : (
        <div className="history-list">{events.map((event) => {
          const active = activeIds.has(event.id);
          const editable = active && event.status !== 'cancelled' && event.kind !== 'adjustment' && event.reversesEventId === undefined;
          return <article className={`history-row${active ? '' : ' history-row--superseded'}`} key={event.id}><MovementRow event={event} state={state} detailed /><div className="history-actions">{editable ? <><button className="text-button" onClick={() => onEdit(event)}>Editar</button><button className="text-button text-button--danger" onClick={() => onReverse(event)}>Estornar</button></> : <span>{event.reversesEventId !== undefined ? 'Contrapartida preservada' : event.status === 'cancelled' ? 'Cancelamento preservado' : event.replacesEventId !== undefined ? 'Versão atual' : 'Histórico preservado'}</span>}</div></article>;
        })}</div>
      )}
    </div>
  );
}

export function AccountsView({ state, onAdd, onTransfer }: { state: LocalFinancialState; onAdd: () => void; onTransfer: () => void }) {
  return (
    <div className="page-content">
      <PageHeading title="Contas" subtitle="Organize o dinheiro disponível, reservado e restrito." action={<button className="button button--primary" onClick={onAdd}><Plus size={18} />Nova conta</button>} />
      {state.accounts.length === 0 ? <EmptyPanel icon={<WalletCards />} title="Crie sua primeira conta" description="Informe apenas os dados que você deseja manter neste dispositivo." action="Criar conta" onAction={onAdd} /> : <div className="account-grid">{state.accounts.map((account) => <article className="account-card" key={account.id}><div className="account-card__top"><span className="account-icon"><WalletCards size={20} /></span><span className={`availability availability--${account.availability}`}>{availabilityLabels[account.availability]}</span></div><h2>{account.name}</h2><p>{accountKindLabels[account.kind]}</p><strong>{formatBRL(calculateAccountBalance(state, account.id))}</strong></article>)}</div>}
      {state.accounts.length > 1 ? <button className="button button--secondary reserve-action" onClick={onTransfer}><ArrowLeftRight size={18} />Transferir ou separar reserva</button> : null}
    </div>
  );
}

export function CategoriesView({ state, onAdd }: { state: LocalFinancialState; onAdd: () => void }) {
  const parents = new Map(state.categories.map((category) => [category.id, category.name]));
  return (
    <div className="page-content">
      <PageHeading title="Categorias" subtitle="Organize receitas e despesas sem alterar o histórico financeiro." action={<button className="button button--primary" onClick={onAdd}><Plus size={18} />Nova categoria</button>} />
      {state.categories.length === 0 ? <EmptyPanel icon={<FolderOpen />} title="Nenhuma categoria criada" description="Categorias são opcionais e ficam somente neste dispositivo." action="Criar categoria" onAction={onAdd} /> : <div className="category-list">{state.categories.map((category) => <article key={category.id}><span className={`category-dot category-dot--${category.kind}`} /><div><h2>{category.name}</h2><p>{category.kind === 'income' ? 'Receita' : category.kind === 'expense' ? 'Despesa' : 'Receita e despesa'}{category.parentId === undefined ? '' : ` · dentro de ${parents.get(category.parentId) ?? 'categoria'}`}</p></div></article>)}</div>}
    </div>
  );
}

export function BackupView({ state, userId, today, readState, onRecover, busy }: { state: LocalFinancialState; userId: string; today: string; readState: () => Promise<LocalFinancialState>; onRecover: (json: string) => Promise<void>; busy: boolean }) {
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState<string>();
  async function downloadBackup() {
    setFailure(undefined);
    try {
      const latest = await readState();
      const json = serializeLocalBackup(latest, userId);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backupFilename(today);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Exportação solicitada. Confira o arquivo nos downloads e guarde uma cópia fora deste aparelho.');
    } catch (reason) {
      setFailure(reason instanceof Error ? reason.message : 'Não foi possível exportar. Tente novamente.');
    }
  }
  return (
    <div className="page-content">
      <PageHeading title="Backup local" subtitle="Uma cópia independente dos dados deste navegador." />
      <p role="status">{notice}</p>
      {failure === undefined ? null : <p className="form-error" role="alert">{failure}</p>}
      <section className="backup-panel"><span className="backup-icon"><Download size={24} /></span><div><h2>Exportar arquivo JSON</h2><p>Inclui contas, categorias, lançamentos, histórico, centavos exatos e {state.outbox.length} {state.outbox.length === 1 ? 'operação pendente' : 'operações pendentes'}.</p><p className="warning-copy">O arquivo contém dados financeiros sem criptografia própria. Guarde-o em local privado.</p><button className="button button--primary" onClick={downloadBackup}><Download size={18} />Baixar backup</button></div></section>
      <RecoveryPanel onRecover={onRecover} busy={busy} />
      <section className="scope-panel"><RefreshCcw size={21} /><div><h2>Restauração completa ainda não disponível</h2><p>A recuperação mínima acima aceita apenas exportações de I2 em destino vazio ou idêntico. A substituição de bases e as gerações continuam previstas para I4.</p></div></section>
    </div>
  );
}

function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <header className="page-heading"><div><h1>{title}</h1>{subtitle === undefined ? null : <p>{subtitle}</p>}</div>{action}</header>;
}

function MoneyStat({ label, value }: { label: string; value: bigint }) {
  return <div><span>{label}</span><strong>{formatBRL(value)}</strong></div>;
}

function EmptyPanel({ icon, title, description, action, onAction, disabled = false }: { icon: React.ReactNode; title: string; description: string; action: string; onAction: () => void; disabled?: boolean }) {
  return <div className="empty-panel"><span>{icon}</span><h3>{title}</h3><p>{description}</p><button className="button button--primary" disabled={disabled} onClick={onAction}>{action}</button></div>;
}

function CompactEmpty({ text }: { text: string }) {
  return <div className="compact-empty">{text}</div>;
}

function MovementRow({ event, state, detailed = false }: { event: FinancialEvent; state: LocalFinancialState; detailed?: boolean }) {
  const account = state.accounts.find((item) => item.id === event.accountId);
  const category = state.categories.find((item) => item.id === event.categoryId);
  const Icon = event.kind === 'income' ? ArrowDownLeft : event.kind === 'expense' ? ArrowUpRight : ArrowLeftRight;
  return <div className="movement-row"><span className={`movement-icon movement-icon--${event.kind}`}><Icon size={18} /></span><span className="movement-main"><strong>{event.description}</strong><small>{eventLabel(event)} · {account?.name ?? 'Conta'}{category === undefined ? '' : ` · ${category.name}`}{detailed ? ` · ${formatFinancialDate(event.competenceDate)}` : ''}</small></span><span className={`movement-amount movement-amount--${event.kind}`}>{eventAmountSign(event)}{formatBRL(event.amountCents)}</span><span className={`status-text status-text--${event.status}`}>{event.status === 'confirmed' ? 'Realizado' : event.status === 'planned' ? 'Previsto' : 'Cancelado'}</span></div>;
}

function monthLabel(today: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' })
    .format(new Date(`${today}T12:00:00Z`));
}

export type { Page };
