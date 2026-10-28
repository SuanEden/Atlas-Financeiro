import {
  Download,
  HardDrive,
  Home,
  ListRestart,
  Moon,
  Plus,
  Settings,
  Sun,
  Tags,
  WalletCards,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  createAccountCommand,
  createCategoryCommand,
  createTransactionCommand,
  replaceEventCommand,
  reverseEventCommand,
  type CreateAccountInput,
  type CreateCategoryInput,
  type TransactionInput,
} from './application';
import type { FinancialEvent } from './domain';
import { AccountForm, CategoryForm, DialogFrame, TransactionForm } from './ui/Forms';
import { AccountsView, BackupView, CategoriesView, Dashboard, MovementsView, type Page } from './ui/Views';
import { useLocalFinance } from './ui/use-local-finance';

type Modal =
  | { type: 'account' }
  | { type: 'category' }
  | { type: 'transaction'; initial?: FinancialEvent; kind?: TransactionInput['kind'] }
  | { type: 'reverse'; event: FinancialEvent };

const desktopNavigation = [
  { page: 'dashboard' as const, label: 'Início', Icon: Home },
  { page: 'movements' as const, label: 'Movimentações', Icon: ListRestart },
  { page: 'accounts' as const, label: 'Contas', Icon: WalletCards },
  { page: 'categories' as const, label: 'Categorias', Icon: Tags },
  { page: 'backup' as const, label: 'Backup', Icon: Download },
];

export function App() {
  return <FinancialWorkspace finance={useLocalFinance()} />;
}

export function FinancialWorkspace({finance,sessionControls,integration=false,exportJson,serverId}:{finance:ReturnType<typeof useLocalFinance>;sessionControls?:ReactNode;integration?:boolean;exportJson?:()=>Promise<string>;serverId?:string}) {
  const { state, loading, busy, error, clearError, execute, recover, readState, context, userId } = finance;
  const [page, setPage] = useState<Page>('dashboard');
  const [modal, setModal] = useState<Modal>();
  const [notice, setNotice] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('atlas-financeiro:theme:v1') === 'dark');
  const today = context.today();

  function toggleTheme() {
    setDark((current) => {
      const next = !current;
      localStorage.setItem('atlas-financeiro:theme:v1', next ? 'dark' : 'light');
      return next;
    });
  }

  async function saveAccount(input: CreateAccountInput) {
    await execute(createAccountCommand(input, context));
    setNotice('Conta salva neste dispositivo.');
    setModal(undefined);
  }

  async function saveCategory(input: CreateCategoryInput) {
    await execute(createCategoryCommand(input, context));
    setNotice('Categoria salva neste dispositivo.');
    setModal(undefined);
  }

  async function saveTransaction(input: TransactionInput) {
    if (modal?.type === 'transaction' && modal.initial !== undefined) {
      await execute(replaceEventCommand(state, modal.initial.id, input, context));
    } else {
      await execute(createTransactionCommand(input, context));
    }
    setNotice('Lançamento salvo neste dispositivo.');
    setModal(undefined);
  }

  async function confirmReverse() {
    if (modal?.type !== 'reverse') return;
    try {
      await execute(reverseEventCommand(state, modal.event.id, context));
      setNotice('Estorno salvo. O histórico foi preservado.');
      setModal(undefined);
    } catch { /* Keep the confirmation open; execute reports persistence errors. */ }
  }

  const openTransaction = () => setModal({ type: 'transaction' });

  return (
    <main className="app-shell" data-theme={dark ? 'dark' : 'light'}>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Navegação principal">{desktopNavigation.map(({ page: target, label, Icon }) => <button className={page === target ? 'is-active' : ''} key={target} onClick={() => setPage(target)}><Icon size={19} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-footer"><HardDrive size={17} /><span><strong>Salvo neste dispositivo</strong><small>{state.outbox.length} pendente{state.outbox.length === 1 ? '' : 's'}</small></span></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div className="mobile-brand"><Brand /></div>{page === 'dashboard' ? null : <button className="button button--primary topbar-create" onClick={openTransaction} disabled={state.accounts.length === 0}><Plus size={17} />Novo lançamento</button>}<span className="device-status"><HardDrive size={16} />Salvo neste dispositivo</span><button className="icon-button" type="button" onClick={toggleTheme} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} aria-pressed={dark}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></header>
        {sessionControls}
        {error === undefined ? null : <div className="error-banner" role="alert"><span>{error}</span><button onClick={clearError}>Fechar</button></div>}
        <div className="sr-only" role="status">{notice}</div>
        {loading ? <div className="loading-state"><span className="spinner" />Carregando dados locais…</div> : (
          <>
            {page === 'dashboard' ? <Dashboard integration={integration} state={state} today={today} onAddAccount={() => setModal({ type: 'account' })} onAddTransaction={openTransaction} onNavigate={setPage} /> : null}
            {page === 'movements' ? <MovementsView integration={integration} state={state} onAdd={openTransaction} onEdit={(event) => setModal({ type: 'transaction', initial: event })} onReverse={(event) => setModal({ type: 'reverse', event })} /> : null}
            {page === 'accounts' ? <AccountsView state={state} onAdd={() => setModal({ type: 'account' })} onTransfer={() => setModal({ type: 'transaction', kind: 'transfer' })} /> : null}
            {page === 'categories' || page === 'backup' ? <div className="mobile-settings-tabs"><button className={page === 'categories' ? 'is-active' : ''} onClick={() => setPage('categories')}>Categorias</button><button className={page === 'backup' ? 'is-active' : ''} onClick={() => setPage('backup')}>Backup</button></div> : null}
            {page === 'categories' ? <CategoriesView state={state} onAdd={() => setModal({ type: 'category' })} /> : null}
            {page === 'backup' ? <BackupView integration={integration} {...(serverId?{serverId}:{})} {...(exportJson?{exportJson}:{})} onRecover={recover} busy={busy} readState={readState} state={state} userId={userId} today={today} /> : null}
          </>
        )}
      </section>

      <nav className="bottom-nav" aria-label="Navegação móvel">
        <MobileNavButton active={page === 'dashboard'} label="Início" Icon={Home} onClick={() => setPage('dashboard')} />
        <MobileNavButton active={page === 'movements'} label="Movimentos" Icon={ListRestart} onClick={() => setPage('movements')} />
        <button className="bottom-add" onClick={openTransaction} disabled={state.accounts.length === 0} aria-label="Novo lançamento"><Plus size={28} /></button>
        <MobileNavButton active={page === 'accounts'} label="Contas" Icon={WalletCards} onClick={() => setPage('accounts')} />
        <MobileNavButton active={page === 'categories' || page === 'backup'} label="Ajustes" Icon={Settings} onClick={() => setPage('categories')} />
      </nav>

      {modal?.type === 'account' ? <DialogFrame title="Nova conta" onClose={() => setModal(undefined)}><AccountForm today={today} busy={busy} onCancel={() => setModal(undefined)} onSave={saveAccount} /></DialogFrame> : null}
      {modal?.type === 'category' ? <DialogFrame title="Nova categoria" onClose={() => setModal(undefined)}><CategoryForm categories={state.categories} busy={busy} onCancel={() => setModal(undefined)} onSave={saveCategory} /></DialogFrame> : null}
      {modal?.type === 'transaction' ? <DialogFrame title={modal.initial === undefined ? 'Novo lançamento' : 'Corrigir lançamento'} onClose={() => setModal(undefined)} wide><TransactionForm defaultKind={modal.kind ?? 'expense'} accounts={state.accounts} categories={state.categories} {...(modal.initial === undefined ? {} : { initial: modal.initial })} today={today} busy={busy} onCancel={() => setModal(undefined)} onSave={saveTransaction} /></DialogFrame> : null}
      {modal?.type === 'reverse' ? <DialogFrame title="Confirmar estorno" onClose={() => setModal(undefined)}><div className="confirm-dialog"><p>O lançamento <strong>{modal.event.description}</strong> não será apagado. Uma contrapartida inversa será adicionada para preservar o histórico.</p><div className="dialog-actions"><button className="button button--ghost" onClick={() => setModal(undefined)}>Cancelar</button><button className="button button--danger" disabled={busy} onClick={() => void confirmReverse()}>{busy ? 'Estornando…' : 'Estornar lançamento'}</button></div></div></DialogFrame> : null}
    </main>
  );
}

function Brand() {
  return <div className="brand"><span className="brand-mark" aria-hidden="true">A</span><strong>Atlas Financeiro</strong></div>;
}

function MobileNavButton({ active, label, Icon, onClick }: { active: boolean; label: string; Icon: typeof Home; onClick: () => void }) {
  return <button className={active ? 'is-active' : ''} onClick={onClick}><Icon size={21} /><span>{label}</span></button>;
}
