import { SyncRecoveryPanel } from './SyncRecoveryPanel';
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
  calculateCashTotals,
  calculateFinancialForecast,
  hasReconciledOpeningBalance,
  parseMonthlyRecurrenceRule,
  formatBRL,
  type FinancialEvent,
  type LocalFinancialState,
} from '../domain';
import { backupFilename, serializeLocalBackup } from '../backup';
import { activeEventIds, accountKindLabels, availabilityLabels, eventAmountSign, eventLabel, eventStatusLabel, formatFinancialDate, financialMonthPeriod, isRecurringTemplate } from './financial-view';

type Page = 'dashboard' | 'movements' | 'accounts' | 'categories' | 'backup';

interface DashboardProps {
  integration?:boolean;
  state: LocalFinancialState;
  today: string;
  onAddAccount: () => void;
  onAddTransaction: () => void;
  onNavigate: (page: Page) => void;
}

export function Dashboard({ state, today, onAddAccount, onAddTransaction, onNavigate, integration=false }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const period = financialMonthPeriod(`${selectedMonth}-01`);
  const cash = calculateCashTotals(state, period);
  const forecast = calculateFinancialForecast(state, selectedMonth, 6);
  const activeIds = activeEventIds(state);
  const recent = [...state.events]
    .filter((event) => activeIds.has(event.id) && !isRecurringTemplate(event))
    .sort((left, right) => right.competenceDate.localeCompare(left.competenceDate))
    .slice(0, 4);

  const balanceFor = (accountId: string) => calculateAccountBalance(state, accountId);
  const reconciled = (accountId: string) => hasReconciledOpeningBalance(state, accountId);
  const bankAccounts = state.accounts.filter((account) => ['checking', 'savings', 'digital'].includes(account.kind));
  const cashAccounts = state.accounts.filter((account) => account.kind === 'cash');
  const transportAccounts = state.accounts.filter((account) => account.kind === 'transport');
  const freeAccounts = state.accounts.filter((account) => account.availability === 'free');
  const reservedAccounts = state.accounts.filter((account) => account.availability === 'reserved');
  const bankComplete = bankAccounts.length > 0 && bankAccounts.every((account) => reconciled(account.id));
  const cashComplete = cashAccounts.length > 0 && cashAccounts.every((account) => reconciled(account.id));
  const transportComplete = transportAccounts.length > 0 && transportAccounts.every((account) => reconciled(account.id));
  const freeComplete = freeAccounts.length > 0 && freeAccounts.every((account) => reconciled(account.id));
  const reservedComplete = reservedAccounts.length === 0 || reservedAccounts.every((account) => reconciled(account.id));
  const bankBalance = bankAccounts.filter((account) => reconciled(account.id)).reduce((sum, account) => sum + balanceFor(account.id), 0n);
  const physicalCash = cashAccounts.filter((account) => reconciled(account.id)).reduce((sum, account) => sum + balanceFor(account.id), 0n);
  const transportBalance = transportAccounts.filter((account) => reconciled(account.id)).reduce((sum, account) => sum + balanceFor(account.id), 0n);
  const available = freeAccounts.filter((account) => reconciled(account.id)).reduce((sum, account) => sum + balanceFor(account.id), 0n);
  const reservedBalance = reservedAccounts.filter((account) => reconciled(account.id)).reduce((sum, account) => sum + balanceFor(account.id), 0n);
  const projectedBalance = freeComplete ? available + forecast.projectedCashChangeCents : undefined;
  const obligations = forecast.items.filter((item) => item.obligation).slice(0, 5);
  const grossForecast = forecast.recurringGrossIncomeCents > 0n ? forecast.recurringGrossIncomeCents : forecast.grossIncomeReferenceCents;
  const grossLabel = forecast.recurringGrossIncomeCents > 0n ? 'Salário bruto previsto (6 meses)' : 'Salário bruto de referência';
  const proratedUnknown = state.events.filter((event) => activeIds.has(event.id) && event.recurrenceJson !== undefined).flatMap((event) => {
    const rule = parseMonthlyRecurrenceRule(event.recurrenceJson);
    return rule?.firstOccurrence === 'prorated_unknown' && rule.firstOccurrenceMonth !== undefined ? [{ description: event.description, month: rule.firstOccurrenceMonth }] : [];
  });

  return (
    <div className="page-content">
      <PageHeading title="Visão geral" action={<button className="button button--primary" onClick={onAddTransaction} disabled={state.accounts.length === 0}><Plus size={18} />Novo lançamento</button>} />
      <p className="form-note">{integration ? `Cópia neste navegador. ${state.outbox.length} operações aguardando confirmação ou conferência. Consulte o painel de sincronização e guarde uma cópia em Backup.` : `Dados somente neste navegador. ${state.outbox.length} operações locais ainda sem envio remoto. Guarde uma cópia em Backup.`}</p>

      <section className="money-summary" aria-label="Saldos conciliados">
        <MoneyStat label="Saldo bancário conciliado" value={bankComplete ? formatBRL(bankBalance) : 'A conciliar'} />
        <MoneyStat label="Dinheiro físico" value={cashComplete ? formatBRL(physicalCash) : 'A conciliar'} />
        <MoneyStat label="Bilhete Único" value={transportComplete ? formatBRL(transportBalance) : 'A conciliar'} />
        <MoneyStat label="Valores reservados" value={reservedComplete ? formatBRL(reservedBalance) : 'A conciliar'} />
        <MoneyStat label="Saldo livre" value={freeComplete ? formatBRL(available) : 'A conciliar'} />
      </section>

      <section className="flow-section" aria-labelledby="flow-title">
        <div className="section-heading">
          <div><p className="section-kicker">{monthLabel(`${selectedMonth}-01`)}</p><h2 id="flow-title">Resultado realizado</h2></div>
          <label className="period-filter">Período <input aria-label="Mês do dashboard" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value || today.slice(0, 7))} /></label>
        </div>
        <div className="flow-band">
          <div><span>Entradas realizadas</span><strong className="positive">{formatBRL(cash.incomeCents)}</strong></div>
          <div><span>Saídas realizadas</span><strong className="negative">{formatBRL(cash.expenseCents)}</strong></div>
          <div><span>Resultado realizado</span><strong>{formatBRL(cash.resultCents)}</strong></div>
        </div>
        <p className="form-note">Somente liquidações efetivas entram nestes três indicadores. Previsões, obrigações e regras recorrentes ficam separados abaixo.</p>
      </section>

      <section className="flow-section" aria-labelledby="forecast-title">
        <div className="section-heading"><div><p className="section-kicker">Próximos 6 meses</p><h2 id="forecast-title">Previsões e compromissos</h2></div></div>
        <div className="forecast-grid">
          <MoneyStat label="Receitas previstas (caixa)" value={formatBRL(forecast.plannedIncomeCents)} />
          <MoneyStat label="Despesas previstas" value={formatBRL(forecast.plannedExpenseCents)} />
          <MoneyStat label="Obrigações pendentes" value={formatBRL(forecast.obligationCents)} />
          <MoneyStat label="Despesas recorrentes futuras" value={formatBRL(forecast.recurringExpenseCents)} />
          <MoneyStat label={grossLabel} value={grossForecast > 0n ? formatBRL(grossForecast) : '—'} />
          <MoneyStat label="Saldo projetado" value={projectedBalance === undefined ? 'Concilie as contas' : formatBRL(projectedBalance)} />
        </div>
        {grossForecast > 0n ? <p className="form-note">Valor bruto de referência/projeção; não é dinheiro recebido nem entra no saldo projetado. O primeiro pagamento proporcional e o valor líquido permanecem separados até confirmação.</p> : null}
        {proratedUnknown.map((item) => <p className="form-note" key={item.description}>Primeira ocorrência de {item.description}: competência {monthLabel(item.month + '-01')}; valor proporcional ainda não informado.</p>)}
        <div className="upcoming-obligations">
          <div className="section-heading"><h3>Obrigações próximas</h3><button className="text-button" onClick={() => onNavigate('movements')}>Ver movimentações</button></div>
          {obligations.length === 0 ? <CompactEmpty text="Nenhuma obrigação pendente neste horizonte." /> : obligations.map((item) => <div className="obligation-row" key={item.eventId}><span><strong>{item.description}</strong><small>{item.date === undefined ? `${monthLabel(`${item.month}-01`)} · vencimento não informado` : formatFinancialDate(item.date)}</small></span><b>{formatBRL(item.amountCents)}</b></div>)}
        </div>
      </section>

      <div className="dashboard-columns">
        <section aria-labelledby="accounts-title"><div className="section-heading"><h2 id="accounts-title">Contas</h2><button className="text-button" onClick={() => onNavigate('accounts')}>Ver todas</button></div>{state.accounts.length === 0 ? <CompactEmpty text="Nenhuma conta criada." /> : <div className="plain-list">{state.accounts.slice(0, 4).map((account) => <div className="account-row" key={account.id}><span className="account-icon"><WalletCards size={19} /></span><span><strong>{account.name}</strong><small>{availabilityLabels[account.availability]} · {reconciled(account.id) ? 'Saldo conciliado' : 'Saldo a conciliar'}</small></span><b>{accountBalanceLabel(state, account.id)}</b></div>)}</div>}</section>
        <section aria-labelledby="recent-title"><div className="section-heading"><h2 id="recent-title">Movimentações recentes</h2><button className="text-button" onClick={() => onNavigate('movements')}>Ver todas</button></div>{recent.length === 0 ? <CompactEmpty text="Nenhum lançamento realizado ou previsto." /> : <div className="plain-list">{recent.map((event) => <MovementRow event={event} state={state} key={event.id} />)}</div>}</section>
      </div>
      {state.accounts.length === 0 ? <EmptyPanel icon={<WalletCards />} title="Comece criando sua primeira conta" description="Depois, concilie o saldo atual para habilitar o saldo disponível e o saldo projetado." action="Criar minha primeira conta" onAction={onAddAccount} /> : null}
    </div>
  );
}

interface MovementsProps {
  integration?:boolean;
  state: LocalFinancialState;
  onAdd: () => void;
  onEdit: (event: FinancialEvent) => void;
  onReverse: (event: FinancialEvent) => void;
}

export function MovementsView({ state, onAdd, onEdit, onReverse, integration=false }: MovementsProps) {
  const activeIds = activeEventIds(state);
  const events = [...state.events].sort((left, right) => right.competenceDate.localeCompare(left.competenceDate));
  return (
    <div className="page-content">
      <PageHeading title="Movimentações" subtitle="Histórico completo, incluindo correções e estornos." action={<button className="button button--primary" onClick={onAdd} disabled={state.accounts.length === 0}><Plus size={18} />Novo lançamento</button>} />
      <div className="local-status"><span><ShieldCheck size={17} />{state.outbox.length} {state.outbox.length === 1 ? 'operação local pendente' : 'operações locais pendentes'}</span><small>{integration?'Confira o envio e eventuais conflitos no painel de sincronização.':'Sincronização remota ainda não disponível.'}</small></div>
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

export function AccountsView({ state, onAdd, onReconcile, onTransfer }: { state: LocalFinancialState; onAdd: () => void; onReconcile: (account: LocalFinancialState['accounts'][number]) => void; onTransfer: () => void }) {
  return (
    <div className="page-content">
      <PageHeading title="Contas" subtitle="Organize o dinheiro disponível, reservado e restrito." action={<button className="button button--primary" onClick={onAdd}><Plus size={18} />Nova conta</button>} />
      {state.accounts.length === 0 ? <EmptyPanel icon={<WalletCards />} title="Crie sua primeira conta" description="Informe apenas os dados que você deseja manter neste dispositivo." action="Criar conta" onAction={onAdd} /> : <div className="account-grid">{state.accounts.map((account) => {
        const opening = accountOpeningEvent(state, account.id);
        const confirmed = opening?.status === 'confirmed' && opening.certainty === 'confirmed';
        const estimated = opening?.status === 'planned' && opening.certainty === 'estimated';
        const openingAmount = opening === undefined ? 0n : opening.adjustmentDirection === 'decrease' ? -opening.amountCents : opening.amountCents;
        return <article className="account-card" key={account.id}><div className="account-card__top"><span className="account-icon"><WalletCards size={20} /></span><span className={`availability availability--${account.availability}`}>{availabilityLabels[account.availability]}</span></div><h2>{account.name}</h2><p>{accountKindLabels[account.kind]}</p><strong>{confirmed ? formatBRL(calculateAccountBalance(state, account.id)) : estimated ? `Estimado: ${formatBRL(openingAmount)}` : 'A conciliar'}</strong><p>{confirmed ? `Saldo confirmado em ${formatFinancialDate(opening?.competenceDate ?? '0001-01-01')}` : estimated ? 'Saldo informado como estimativa' : 'Saldo inicial ainda não informado'}</p>{confirmed ? null : <button className="text-button" onClick={() => onReconcile(account)}>{estimated ? 'Confirmar saldo' : 'Conciliar saldo'}</button>}</article>;
      })}</div>}
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

export function BackupView({ state, userId, today, readState, onRecover, busy, integration=false, exportJson, serverId }: { state: LocalFinancialState; userId: string; today: string; readState: () => Promise<LocalFinancialState>; onRecover: (json: string) => Promise<void>; busy: boolean; integration?:boolean; exportJson?:()=>Promise<string>; serverId?:string }) {
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState<string>();
  async function downloadBackup() {
    setFailure(undefined);
    try {
      const json = exportJson?await exportJson():serializeLocalBackup(await readState(), userId);
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
      {integration?<section className="scope-panel"><RefreshCcw size={21} /><div><h2>Cópia de sincronização I3</h2><p>A exportação inclui base confirmada, pendências, conflitos, recibos, cursor e origem da associação. Não contém sessão. O importador I2 não aceita este formato; a recuperação abaixo aceita esta cópia somente na mesma conta e servidor, em destino vazio ou idêntico.</p></div></section>:<RecoveryPanel onRecover={onRecover} busy={busy} />}
      {integration && serverId ? <SyncRecoveryPanel userId={userId} serverId={serverId} onRecover={onRecover} disabled={busy} /> : null}
      <section className="scope-panel"><RefreshCcw size={21} /><div><h2>Restauração completa ainda não disponível</h2><p>A recuperação mínima aceita o formato indicado acima em destino vazio ou idêntico. A substituição de bases e as gerações continuam previstas para I4.</p></div></section>
    </div>
  );
}

function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <header className="page-heading"><div><h1>{title}</h1>{subtitle === undefined ? null : <p>{subtitle}</p>}</div>{action}</header>;
}

function MoneyStat({ label, value }: { label: string; value: bigint | string }) {
  return <div><span>{label}</span><strong>{typeof value === 'bigint' ? formatBRL(value) : value}</strong></div>;
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
  return <div className="movement-row"><span className={`movement-icon movement-icon--${event.kind}`}><Icon size={18} /></span><span className="movement-main"><strong>{event.description}</strong><small>{eventLabel(event)} · {account?.name ?? 'Conta'}{category === undefined ? '' : ` · ${category.name}`}{detailed ? ` · ${formatFinancialDate(event.competenceDate)}${event.dueDate === undefined ? '' : ` · Vence ${formatFinancialDate(event.dueDate)}`}` : ''}</small></span><span className={`movement-amount movement-amount--${event.kind}`}>{eventAmountSign(event)}{formatBRL(event.amountCents)}</span><span className={`status-text status-text--${event.status}`}>{eventStatusLabel(event, state.categories.find((category) => category.id === event.categoryId))}</span></div>;
}

function accountBalanceLabel(state: LocalFinancialState, accountId: string): string {
  const opening = accountOpeningEvent(state, accountId);
  if (opening?.status === 'confirmed' && opening.certainty === 'confirmed') return formatBRL(calculateAccountBalance(state, accountId));
  if (opening?.status === 'planned' && opening.certainty === 'estimated') {
    const amount = opening.adjustmentDirection === 'decrease' ? -opening.amountCents : opening.amountCents;
    return 'Estimado: ' + formatBRL(amount);
  }
  return 'A conciliar';
}

function accountOpeningEvent(state: LocalFinancialState, accountId: string): FinancialEvent | undefined {
  const opening = state.events.filter((event) => event.accountId === accountId && event.source === 'opening_balance');
  const replaced = new Set(opening.flatMap((event) => [event.replacesEventId, event.reversesEventId].filter((id): id is string => id !== undefined)));
  return opening.find((event) => !replaced.has(event.id) && event.status !== 'cancelled');
}

function monthLabel(today: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' })
    .format(new Date(`${today}T12:00:00Z`));
}

export type { Page };
