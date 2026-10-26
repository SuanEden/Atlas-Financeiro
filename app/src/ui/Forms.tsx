import { X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { parseBRL, type Account, type Category, type FinancialEvent } from '../domain';
import type { CreateAccountInput, CreateCategoryInput, TransactionInput } from '../application';
import { accountKindLabels, availabilityLabels } from './financial-view';

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
        ...(cents === undefined ? {} : { openingBalanceCents: cents }),
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
      <label>Saldo inicial <span className="field-hint">opcional, pode ser negativo</span><input inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="R$ 0,00" /></label>
      <p className="form-note">O saldo inicial será registrado como ajuste, nunca como renda.</p>
      <FormError message={error} />
      <footer className="dialog-actions"><button className="button button--ghost" type="button" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={busy} type="submit">{busy ? 'Salvando…' : 'Criar conta'}</button></footer>
    </form>
  );
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
  initial?: FinancialEvent;
  defaultKind?: TransactionInput['kind'];
  today: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: TransactionInput) => Promise<void>;
}

export function TransactionForm({ accounts, categories, initial, defaultKind = 'expense', today, busy, onCancel, onSave }: TransactionFormProps) {
  const initialKind = initial?.kind === 'income' || initial?.kind === 'transfer' ? initial.kind : defaultKind;
  const [kind, setKind] = useState<TransactionInput['kind']>(initialKind);
  const [amount, setAmount] = useState(initial === undefined ? '' : centsForInput(initial.amountCents));
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  const [transferAccountId, setTransferAccountId] = useState(initial?.transferAccountId ?? accounts.find((account) => account.id !== accountId)?.id ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.competenceDate ?? today);
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
      await onSave({
        kind,
        amountCents,
        accountId,
        description,
        date,
        realized,
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
      <details className="form-details"><summary>Mais detalhes</summary><div className="form-grid"><label>Status<select value={realized ? 'realized' : 'planned'} onChange={(event) => setRealized(event.target.value === 'realized')}><option value="realized">Realizado</option><option value="planned">Previsto</option></select></label>{realized ? null : <label>Certeza<select value={estimated ? 'estimated' : 'confirmed'} onChange={(event) => setEstimated(event.target.value === 'estimated')}><option value="confirmed">Confirmado</option><option value="estimated">Estimado</option></select></label>}</div></details>
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
