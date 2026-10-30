import { X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { parseBRL, type Account, type Category, type FinancialEvent } from '../domain';
import type { AccountReconciliationInput, CreateAccountInput, CreateCategoryInput, TransactionInput } from '../application';
import { accountKindLabels, availabilityLabels } from './financial-view';
import { parseMonthlyRecurrenceRule, serializeMonthlyRecurrenceRule, type MonthlyRecurrenceRule } from '../domain';

interface DialogFrameProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function DialogFrame({ title, onClose, children, wide = false }: DialogFrameProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const element = dialog.current!;
    element.showModal();
    element.querySelector<HTMLInputElement>('input')?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  return (
      <dialog ref={dialog} className={`dialog-sheet${wide ? ' dialog-sheet--wide' : ''}`} aria-modal="true" aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button, input, select, summary, [tabindex]')]
          .filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
        <header className="dialog-header">
          <h2 id="dialog-title">{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><X size={22} /></button>
        </header>
        {children}
      </dialog>
  );
}

interface AccountFormProps {
  today: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: CreateAccountInput) => Promise<void>;
}

function FormError({ message }: { message: string | undefined }) {
  const element = useRef<HTMLParagraphElement>(null);
  useEffect(() => { element.current?.scrollIntoView({ block: 'center' }); }, [message]);
  return message === undefined ? null : <p ref={element} className="form-error" role="alert">{message}</p>;
}

export function AccountForm({ today, busy, onCancel, onSave }: AccountFormProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Account['kind']>('checking');
  const [availability, setAvailability] = useState<Account['availability']>('free');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceSource, setOpeningBalanceSource] = useState('');
  const [openingBalanceCertainty, setOpeningBalanceCertainty] = useState<'confirmed' | 'estimated'>('confirmed');
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      if (name.trim().length === 0) throw new TypeError('Informe o nome da conta.');
      const cents = openingBalance.trim() === '' ? undefined : parseBRL(openingBalance);
      await onSave({
        name,
        kind,
        availability: kind === 'transport' ? 'restricted' : availability,
        openingDate: today,
        ...(cents === undefined ? {} : { openingBalanceCents: cents, openingBalanceSource, openingBalanceCertainty }),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a conta.');
    }
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <label>Nome da conta<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Ex.: Conta principal" /></label>
      <div className="form-grid">
        <label>Tipo<select value={kind} onChange={(event) => setKind(event.target.value as Account['kind'])}>{Object.entries(accountKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Disponibilidade<select disabled={kind === 'transport'} value={kind === 'transport' ? 'restricted' : availability} onChange={(event) => setAvailability(event.target.value as Account['availability'])}>{Object.entries(availabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <label>Saldo inicial <span className="field-hint">opcional; aceite zero ou valor negativo</span><input inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="R$ 0,00" /></label>
      {openingBalance.trim() === '' ? null : <div className="form-grid"><label>Origem do saldo<input value={openingBalanceSource} onChange={(event) => setOpeningBalanceSource(event.target.value)} placeholder="Ex.: aplicativo do banco" /></label><label>Condição<select value={openingBalanceCertainty} onChange={(event) => setOpeningBalanceCertainty(event.target.value as 'confirmed' | 'estimated')}><option value="confirmed">Confirmado</option><option value="estimated">Estimado</option></select></label></div>}
      <p className="form-note">O saldo inicial será registrado como ajuste, nunca como renda. Estimativas não entram no saldo conciliado.</p>
      <FormError message={error} />
      <footer className="dialog-actions"><button className="button button--ghost" type="button" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={busy} type="submit">{busy ? 'Salvando…' : 'Criar conta'}</button></footer>
    </form>
  );
}

interface AccountReconciliationFormProps {
  account: Account;
  today: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: AccountReconciliationInput) => Promise<void>;
}

export function AccountReconciliationForm({ account, today, busy, onCancel, onSave }: AccountReconciliationFormProps) {
  const [balance, setBalance] = useState('');
  const [referenceDate, setReferenceDate] = useState(today);
  const [sourceDescription, setSourceDescription] = useState('');
  const [certainty, setCertainty] = useState<'confirmed' | 'estimated'>('confirmed');
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      if (balance.trim() === '') throw new TypeError('Informe o saldo atual, inclusive R$ 0,00 se esse for o valor.');
      if (sourceDescription.trim() === '') throw new TypeError('Informe de onde veio a informação do saldo.');
      await onSave({ accountId: account.id, balanceCents: parseBRL(balance), referenceDate, sourceDescription, certainty });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível conciliar a conta.');
    }
  }

  return <form className="stack-form" onSubmit={submit}>
    <p className="form-note">Conta: <strong>{account.name}</strong>. O saldo informado será a posição inicial na data de referência. Um valor estimado não será tratado como dinheiro confirmado.</p>
    <label>Saldo atual<input autoFocus inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="R$ 0,00" /></label>
    <label>Data de referência<input type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} /></label>
    <label>Origem da informação<input value={sourceDescription} onChange={(event) => setSourceDescription(event.target.value)} placeholder="Ex.: saldo exibido no aplicativo do banco" maxLength={300} /></label>
    <label>Condição<select value={certainty} onChange={(event) => setCertainty(event.target.value as 'confirmed' | 'estimated')}><option value="confirmed">Saldo confirmado</option><option value="estimated">Saldo estimado</option></select></label>
    <FormError message={error} />
    <footer className="dialog-actions"><button className="button button--ghost" type="button" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={busy} type="submit">{busy ? 'Conciliando…' : 'Registrar saldo inicial'}</button></footer>
  </form>;
}
interface CategoryFormProps {
  categories: Category[];
  busy: boolean;
  onCancel: () => void;
  onSave: (input: CreateCategoryInput) => Promise<void>;
}

export function CategoryForm({ categories, busy, onCancel, onSave }: CategoryFormProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Category['kind']>('expense');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      if (name.trim().length === 0) throw new TypeError('Informe o nome da categoria.');
      await onSave({ name, kind, ...(parentId === '' ? {} : { parentId }) });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a categoria.');
    }
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <label>Nome<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Ex.: Mercado" /></label>
      <div className="form-grid">
        <label>Natureza<select value={kind} onChange={(event) => setKind(event.target.value as Category['kind'])}><option value="expense">Despesa</option><option value="income">Receita</option><option value="both">Receita e despesa</option></select></label>
        <label>Categoria superior <span className="field-hint">opcional</span><select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">Nenhuma</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      </div>
      <FormError message={error} />
      <footer className="dialog-actions"><button className="button button--ghost" type="button" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={busy} type="submit">{busy ? 'Salvando…' : 'Criar categoria'}</button></footer>
    </form>
  );
}

interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  recurrenceRules?: FinancialEvent[];
  initial?: FinancialEvent;
  defaultKind?: TransactionInput['kind'];
  today: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: TransactionInput) => Promise<void>;
}

export function TransactionForm({ accounts, categories, recurrenceRules = [], initial, defaultKind = 'expense', today, busy, onCancel, onSave }: TransactionFormProps) {
  const initialKind = initial?.kind === 'income' || initial?.kind === 'transfer' ? initial.kind : defaultKind;
  const [kind, setKind] = useState<TransactionInput['kind']>(initialKind);
  const [amount, setAmount] = useState(initial === undefined ? '' : centsForInput(initial.amountCents));
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  const [transferAccountId, setTransferAccountId] = useState(initial?.transferAccountId ?? accounts.find((account) => account.id !== accountId)?.id ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.competenceDate ?? today);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const initialRule = parseMonthlyRecurrenceRule(initial?.recurrenceJson);
  const [recurring, setRecurring] = useState(initialRule !== undefined);
  const [recurrenceStatus, setRecurrenceStatus] = useState<MonthlyRecurrenceRule['status']>(initialRule?.status ?? 'active');
  const [recurrenceStartMonth, setRecurrenceStartMonth] = useState(initialRule?.startMonth ?? (initial?.competenceDate ?? today).slice(0, 7));
  const [recurrenceStartDate, setRecurrenceStartDate] = useState(initialRule?.startDate ?? '');
  const [recurrenceNextMonth, setRecurrenceNextMonth] = useState(initialRule?.nextOccurrenceMonth ?? (initial?.competenceDate ?? today).slice(0, 7));
  const [recurrenceDueDay, setRecurrenceDueDay] = useState(initialRule?.dueDayOfMonth?.toString() ?? '');
  const [recurrenceNecessity, setRecurrenceNecessity] = useState<MonthlyRecurrenceRule['necessity']>(initialRule?.necessity ?? 'unknown');
  const [recurrenceAmountBasis, setRecurrenceAmountBasis] = useState<MonthlyRecurrenceRule['amountBasis']>(initialRule?.amountBasis ?? 'fixed');
  const [firstOccurrence, setFirstOccurrence] = useState<MonthlyRecurrenceRule['firstOccurrence']>(initialRule?.firstOccurrence ?? 'normal');
  const [firstOccurrenceMonth, setFirstOccurrenceMonth] = useState(initialRule?.firstOccurrenceMonth ?? '');
  const [recurrenceRuleId, setRecurrenceRuleId] = useState(initial?.recurrenceRuleId ?? '');
  const [realized, setRealized] = useState(initial?.status !== 'planned');
  const [estimated, setEstimated] = useState(initial?.certainty === 'estimated');
  const [error, setError] = useState<string>();

  const compatibleCategories = categories.filter((category) => category.kind === 'both' || category.kind === kind);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      if (accountId === '') throw new TypeError('Selecione uma conta.');
      const amountCents = parseBRL(amount);
      if (amountCents <= 0n) throw new TypeError('Informe um valor positivo.');
      if (kind === 'transfer' && (transferAccountId === '' || transferAccountId === accountId)) throw new TypeError('Selecione uma conta de destino diferente.');
      if (recurring && realized) throw new TypeError('Uma regra recorrente é uma previsão; registre cada cobrança separadamente quando ela ocorrer.');
      if (recurring && kind === 'transfer') throw new TypeError('Transferências recorrentes ainda não são suportadas.');
      if (recurring && recurrenceRuleId !== '') throw new TypeError('Um lançamento não pode ser modelo e ocorrência ao mesmo tempo.');
      const recurrenceJson = recurring ? serializeMonthlyRecurrenceRule({
        frequency: 'monthly', status: recurrenceStatus, startMonth: recurrenceStartMonth,
        ...(recurrenceStartDate === '' ? {} : { startDate: recurrenceStartDate }),
        nextOccurrenceMonth: recurrenceNextMonth,
        ...(recurrenceDueDay === '' ? {} : { dueDayOfMonth: Number(recurrenceDueDay) }),
        necessity: recurrenceNecessity, amountBasis: kind === 'income' ? recurrenceAmountBasis : 'fixed',
        firstOccurrence, ...(firstOccurrenceMonth === '' ? {} : { firstOccurrenceMonth }),
      }) : undefined;
      if (recurrenceRuleId !== '' && recurring) throw new TypeError('Desative o modelo antes de vincular uma ocorrência.');
      await onSave({
        kind,
        amountCents,
        accountId,
        description,
        date,
        realized,
        ...(dueDate === '' ? {} : { dueDate }),
        ...(recurrenceJson === undefined ? {} : { recurrenceJson }),
        ...(recurrenceRuleId === '' ? {} : { recurrenceRuleId, recurrenceMonth: date.slice(0, 7) }),
        ...(realized ? {} : { estimated }),
        ...(kind === 'transfer' ? { transferAccountId } : {}),
        ...(kind !== 'transfer' && categoryId !== '' ? { categoryId } : {}),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o lançamento.');
    }
  }

  return (
    <form className="transaction-form" onSubmit={submit}>
      <div className="segment-control" aria-label="Tipo de lançamento">{(['expense', 'income', 'transfer'] as const).map((value) => <button className={kind === value ? 'is-active' : ''} key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setCategoryId(''); }}>{value === 'expense' ? 'Despesa' : value === 'income' ? 'Receita' : 'Transferência'}</button>)}</div>
      <label className="amount-field">Valor<span><span className="currency-prefix">R$</span><input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" aria-label="Valor em reais" /></span></label>
      <div className="form-grid">
        <label>Conta<select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Selecione uma conta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        {kind === 'transfer'
          ? <label>Conta de destino<select value={transferAccountId} onChange={(event) => setTransferAccountId(event.target.value)}><option value="">Selecione o destino</option>{accounts.filter((account) => account.id !== accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          : <label>Categoria <span className="field-hint">opcional</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Sem categoria</option>{compatibleCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
      </div>
      <label>Descrição <span className="field-hint">opcional</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Adicione uma descrição" /></label>
      <label>Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <details className="form-details"><summary>Mais detalhes</summary>
        <div className="form-grid">
          <label>Status<select value={realized ? 'realized' : 'planned'} onChange={(event) => setRealized(event.target.value === 'realized')}><option value="realized">Realizado</option><option value="planned">Previsto / pendente</option></select></label>
          {realized ? null : <label>Certeza<select value={estimated ? 'estimated' : 'confirmed'} onChange={(event) => setEstimated(event.target.value === 'estimated')}><option value="confirmed">Valor confirmado</option><option value="estimated">Estimativa</option></select></label>}
          <label>Vencimento <span className="field-hint">opcional</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        </div>
        {recurrenceRuleId === '' ? <label className="check-field"><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} /> Repetir mensalmente</label> : null}
        {recurring ? <div className="recurrence-fields">
          <div className="form-grid">
            <label>Início da regra<input type="month" value={recurrenceStartMonth} onChange={(event) => setRecurrenceStartMonth(event.target.value)} /></label>
            <label>Data exata de início <span className="field-hint">se conhecida</span><input type="date" value={recurrenceStartDate} onChange={(event) => setRecurrenceStartDate(event.target.value)} /></label>
            <label>Próxima competência<input type="month" value={recurrenceNextMonth} onChange={(event) => setRecurrenceNextMonth(event.target.value)} /></label>
            <label>Dia do vencimento <span className="field-hint">em branco se desconhecido</span><input type="number" min="1" max="31" value={recurrenceDueDay} onChange={(event) => setRecurrenceDueDay(event.target.value)} placeholder="Não informado" /></label>
            <label>Necessidade<select value={recurrenceNecessity} onChange={(event) => setRecurrenceNecessity(event.target.value as MonthlyRecurrenceRule['necessity'])}><option value="unknown">Não classificada</option><option value="essential">Essencial</option><option value="important">Importante</option><option value="optional">Opcional</option></select></label>
            {kind === 'income' ? <label>Base do valor<select value={recurrenceAmountBasis} onChange={(event) => setRecurrenceAmountBasis(event.target.value as MonthlyRecurrenceRule['amountBasis'])}><option value="fixed">Valor de caixa / líquido</option><option value="gross">Salário bruto (não soma ao caixa projetado)</option></select></label> : null}
            <label>Primeira ocorrência<select value={firstOccurrence} onChange={(event) => setFirstOccurrence(event.target.value as MonthlyRecurrenceRule['firstOccurrence'])}><option value="normal">Valor integral</option><option value="prorated_unknown">Proporcional ainda desconhecido</option></select></label>
            {firstOccurrence === 'prorated_unknown' ? <label>Mês da primeira ocorrência<input type="month" value={firstOccurrenceMonth} onChange={(event) => setFirstOccurrenceMonth(event.target.value)} /></label> : null}
            <label>Situação da regra<select value={recurrenceStatus} onChange={(event) => setRecurrenceStatus(event.target.value as MonthlyRecurrenceRule['status'])}><option value="active">Ativa</option><option value="paused">Pausada</option><option value="ended">Encerrada</option></select></label>
          </div>
          <p className="form-note">A regra cria previsões mensais. Nenhuma ocorrência é marcada como paga automaticamente. Se o dia não for informado, a previsão fica apenas no mês.</p>
        </div> : null}
        {recurrenceRules.length > 0 && !recurring ? <label>Vincular a recorrência <span className="field-hint">opcional; registra o histórico da cobrança</span><select value={recurrenceRuleId} onChange={(event) => setRecurrenceRuleId(event.target.value)}><option value="">Não vincular</option>{recurrenceRules.filter((rule) => rule.kind === kind && rule.id !== initial?.id).map((rule) => <option key={rule.id} value={rule.id}>{rule.description}</option>)}</select></label> : null}
      </details>
      <p className="form-note">Salvo somente neste dispositivo. A sincronização remota ainda não está ativa.</p>
      <FormError message={error} />
      <footer className="dialog-actions dialog-actions--sticky"><button className="button button--ghost" type="button" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={busy} type="submit">{busy ? 'Salvando…' : initial === undefined ? 'Salvar lançamento' : 'Salvar correção'}</button></footer>
    </form>
  );
}

function centsForInput(value: bigint): string {
  const reais = value / 100n;
  const cents = (value % 100n).toString().padStart(2, '0');
  return `${reais},${cents}`;
}
