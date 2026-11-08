import {
  HardDrive,
  Cloud,
  Landmark,
  Home,
  MoreHorizontal,
  ChevronRight,
  ListRestart,
  Moon,
  Plus,
  Sun,
  Tags,
  WalletCards,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  createAccountCommand,
  createCategoryCommand,
  createTransactionCommand,
  reconcileAccountCommand,
  replaceEventCommand,
  reverseEventCommand,
  type CreateAccountInput,
  type AccountReconciliationInput,
  type CreateCategoryInput,
  type TransactionInput,
} from './application';
import { isEntitySelectable, type Account, type Category, type FinancialEvent } from './domain';
import { AccountForm, AccountReconciliationForm, CategoryForm, DialogFrame, MetadataEditForm, TransactionForm } from './ui/Forms';
import { AccountsView, BackupView, CategoriesView, Dashboard, MovementsView, type Page } from './ui/Views';
import { useLocalFinance } from './ui/use-local-finance';

type Modal =
  | { type: 'account' }
  | { type: 'reconcile'; account: Account }
  | { type: 'category' }
  | { type: 'edit_account'; account: Account }
  | { type: 'edit_category'; category: Category }
  | { type: 'delete_entity'; entity: Account | Category; kind: 'account' | 'category' }
  | { type: 'transaction'; initial?: FinancialEvent; kind?: TransactionInput['kind'] }
  | { type: 'reverse'; event: FinancialEvent };

const desktopNavigation = [
  { page: 'dashboard' as const, label: 'Início', Icon: Home },
  { page: 'movements' as const, label: 'Movimentações', Icon: ListRestart },
  { page: 'accounts' as const, label: 'Contas', Icon: WalletCards },
  { page: 'categories' as const, label: 'Categorias', Icon: Tags },
];

export function App({bankPanel}:{bankPanel?:ReactNode}={}) {
  return <FinancialWorkspace finance={useLocalFinance()} bankPanel={bankPanel} />;
}

export function FinancialWorkspace({finance,sessionControls,integration=false,entityManagementEnabled=true,exportJson,importJson,serverId,bankPanel,testMode=false}:{finance:ReturnType<typeof useLocalFinance>;sessionControls?:ReactNode;integration?:boolean;entityManagementEnabled?:boolean;exportJson?:()=>Promise<string>;importJson?:(json:string)=>Promise<number>;serverId?:string;bankPanel?:ReactNode;testMode?:boolean}) {
  const { state, loading, busy, error, clearError, execute, modifyEntity, recover, readState, context, userId } = finance;
  const [page, setPage] = useState<Page | 'banks' | 'more'>('dashboard');
  const [modal, setModal] = useState<Modal>();
  const [notice, setNotice] = useState('');
  const [deleteFailure, setDeleteFailure] = useState('');
  // Navigation is presentation-only; financial state remains unchanged.
  const [dark, setDark] = useState(() => localStorage.getItem('atlas-financeiro:theme:v2') !== 'light');
  const today = context.today();

  function toggleTheme() {
    setDark((current) => {
      const next = !current;
      localStorage.setItem('atlas-financeiro:theme:v2', next ? 'dark' : 'light');
      return next;
    });
  }

  async function saveAccount(input: CreateAccountInput) {
    await execute(createAccountCommand(input, context));
    setNotice('Conta salva neste dispositivo.');
    setModal(undefined);
  }

  async function saveReconciliation(input: AccountReconciliationInput) {
    if(!isEntitySelectable(state.entityLifecycles??[],userId,'account',input.accountId))throw new Error('Reative a conta antes de conciliar.');
    await execute(reconcileAccountCommand(state, input, context));
    setNotice('Saldo inicial registrado. Confira a condição e a data de referência na conta.');
    setModal(undefined);
  }

  async function saveCategory(input: CreateCategoryInput) {
    await execute(createCategoryCommand(input, context));
    setNotice('Categoria salva neste dispositivo.');
    setModal(undefined);
  }

  async function saveMetadata(changes:{name:string;kind:string;availability?:string;parentId?:string}) {
    if(modal?.type!=='edit_account'&&modal?.type!=='edit_category')return;
    const kind=modal.type==='edit_account'?'account':'category';
    const id=modal.type==='edit_account'?modal.account.id:modal.category.id;
    await modifyEntity('edit',kind,id,changes);
    setNotice('Alterações salvas neste dispositivo.');
    setModal(undefined);
  }

  async function restoreEntity(kind:'account'|'category',id:string) {
    await finance.restoreEntity(kind,id);
    setNotice(kind==='account'?'Conta reativada.':'Categoria reativada.');
  }

  async function deleteEntity() {
    if(modal?.type!=='delete_entity')return;
    const {entity,kind}=modal;
    setDeleteFailure('');
    try {
      if(kind==='account'){
        const links=JSON.parse(localStorage.getItem('atlas:pluggy-mappings:v1:'+userId)||'{}') as Record<string,{atlasAccountId?:string}>;
        if(Object.values(links).some(row=>row?.atlasAccountId===entity.id))
          throw new Error('Desative primeiro a importação bancária vinculada a esta conta.');
      }
      await modifyEntity('delete',kind,entity.id);
      setNotice(integration?(kind==='account'?'Conta arquivada.':'Categoria arquivada.'):(kind==='account'?'Conta sem movimentações excluída.':'Categoria não utilizada excluída.'));
      setModal(undefined);
    } catch (reason) {
      setDeleteFailure(reason instanceof Error ? reason.message : 'Não foi possível excluir.');
    }
  }

  async function saveTransaction(input: TransactionInput) {
    const editingEvent=modal?.type==='transaction'?modal.initial:undefined;
    if(!isEntitySelectable(state.entityLifecycles??[],userId,'account',input.accountId)&&(!editingEvent||editingEvent.accountId!==input.accountId))throw new Error('Escolha uma conta ativa para o novo lançamento.');
    if(input.transferAccountId&&!isEntitySelectable(state.entityLifecycles??[],userId,'account',input.transferAccountId)&&(!editingEvent||editingEvent.transferAccountId!==input.transferAccountId))throw new Error('A conta de destino está arquivada.');
    if(input.categoryId&&!isEntitySelectable(state.entityLifecycles??[],userId,'category',input.categoryId)&&(!editingEvent||editingEvent.categoryId!==input.categoryId))throw new Error('Escolha uma categoria ativa.');
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
        <div className="sidebar-section-label">ESPAÇO FINANCEIRO</div>
        <nav aria-label="Navegação principal">{[...desktopNavigation, ...(integration || bankPanel !== undefined ? [{page:'banks' as const,label:'Bancos',Icon:Landmark}] : [])].map(({ page: target, label, Icon }) => <button className={page === target ? 'is-active' : ''} key={target} onClick={() => setPage(target)}><Icon size={19} /><span>{label}</span></button>)}</nav>
        <button type="button" aria-label="Modo nuvem" className={'sidebar-cloud-hint sidebar-cloud-link'+(page==='backup'?' is-active':'')} onClick={()=>setPage('backup')} aria-current={page==='backup'?'page':undefined}>
          <span className="sidebar-cloud-link-icon"><Cloud size={19}/></span>
          <span className="sidebar-cloud-link-copy"><strong>Modo nuvem</strong><small>{integration?'Cópia local ativa':'Dados neste dispositivo'} · {state.outbox.length} pendente{state.outbox.length===1?'':'s'}</small></span>
          <ChevronRight size={17} className="sidebar-cloud-link-chevron"/>
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar"><div className="mobile-brand"><Brand /></div><div className="topbar-context"><span>VISÃO FINANCEIRA</span><strong>{page === 'dashboard' ? 'Visão geral' : page === 'movements' ? 'Movimentações' : page === 'accounts' ? 'Minhas contas' : page === 'banks' ? 'Bancos' : page === 'categories' ? 'Categorias' : page === 'backup' ? 'Modo nuvem' : 'Mais opções'}</strong></div>{page === 'dashboard' ? null : <button className="button button--primary topbar-create" onClick={openTransaction} disabled={state.accounts.length === 0}><Plus size={17} />Novo lançamento</button>}<span className="device-status"><HardDrive size={16} />{testMode ? 'Modo de teste · local' : integration ? 'Modo nuvem · cópia local' : 'Salvo neste dispositivo'}</span><button className="icon-button" type="button" onClick={toggleTheme} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} aria-pressed={dark}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></header>

        {error === undefined ? null : <div className="error-banner" role="alert"><span>{error}</span><button onClick={clearError}>Fechar</button></div>}
        <div className="sr-only" role="status">{notice}</div>
        {loading ? <div className="loading-state"><span className="spinner" />Carregando dados locais…</div> : (
          <>
            {page === 'banks' ? <section className="page-content banks-page" aria-label="Bancos"><div className="page-heading"><div><p className="section-kicker">Instituições e conexões</p><h1>Bancos conectados</h1><p>Suas conexões financeiras em um só lugar.</p></div></div>{bankPanel ?? <p>Entre com Google para consultar seus bancos.</p>}</section> : null}
            {page === 'more' ? <section className="page-content more-page" aria-labelledby="more-title"><div className="page-heading"><div><p className="section-kicker">Seu espaço</p><h1 id="more-title">Mais opções</h1><p>Organize e proteja seus dados financeiros.</p></div></div><div className="more-menu">
              {(integration || bankPanel !== undefined) ? <button type="button" aria-label="Bancos" onClick={()=>setPage('banks')}><span className="more-menu-icon"><Landmark size={20}/></span><span><strong>Bancos conectados</strong><small>Conexões e movimentações bancárias</small></span><ChevronRight size={20}/></button> : null}
              <button type="button" aria-label="Contas" onClick={()=>setPage('accounts')}><span className="more-menu-icon"><WalletCards size={20}/></span><span><strong>Minhas contas</strong><small>Saldos, reservas e conciliação</small></span><ChevronRight size={20}/></button>
              <button type="button" aria-label="Categorias" onClick={()=>setPage('categories')}><span className="more-menu-icon"><Tags size={20}/></span><span><strong>Categorias</strong><small>Organize entradas e despesas</small></span><ChevronRight size={20}/></button>
              <button type="button" aria-label="Modo nuvem" onClick={()=>setPage('backup')}><span className="more-menu-icon"><Cloud size={20}/></span><span><strong>Modo nuvem</strong><small>Sincronização, backups e recuperação</small></span><ChevronRight size={20}/></button>
              <button type="button" onClick={toggleTheme}><span className="more-menu-icon">{dark?<Sun size={20}/>:<Moon size={20}/>}</span><span><strong>Aparência</strong><small>{dark?'Mudar para tema claro':'Mudar para tema escuro'}</small></span><ChevronRight size={20}/></button>
            </div></section> : null}
            {page === 'dashboard' ? <Dashboard integration={integration} state={state} today={today} userId={userId} onAddAccount={() => setModal({ type: 'account' })} onAddTransaction={openTransaction} onNavigate={(next)=>setPage(next)} /> : null}
            {page === 'movements' ? <MovementsView integration={integration} state={state} onAdd={openTransaction} onEdit={(event) => setModal({ type: 'transaction', initial: event })} onReverse={(event) => setModal({ type: 'reverse', event })} /> : null}
            {page === 'accounts' ? <AccountsView state={state} integration={integration} canManage={entityManagementEnabled} onAdd={() => setModal({ type: 'account' })} onEdit={(account)=>setModal({type:'edit_account',account})} onDelete={(account)=>{setDeleteFailure('');setModal({type:'delete_entity',entity:account,kind:'account'});}} onRestore={(account)=>void restoreEntity('account',account.id).catch(()=>setDeleteFailure('Não foi possível reativar a conta.'))} onReconcile={(account) => setModal({ type: 'reconcile', account })} onTransfer={() => setModal({ type: 'transaction', kind: 'transfer' })} /> : null}
            {page === 'categories' || page === 'backup' ? <div className="mobile-settings-tabs"><button className={page === 'categories' ? 'is-active' : ''} onClick={() => setPage('categories')}>Categorias</button><button className={page === 'backup' ? 'is-active' : ''} onClick={() => setPage('backup')}>Modo nuvem</button></div> : null}
            {page === 'categories' ? <CategoriesView state={state} integration={integration} canManage={entityManagementEnabled} onAdd={() => setModal({ type: 'category' })} onEdit={(category)=>setModal({type:'edit_category',category})} onDelete={(category)=>{setDeleteFailure('');setModal({type:'delete_entity',entity:category,kind:'category'});}} onRestore={(category)=>void restoreEntity('category',category.id).catch(()=>setDeleteFailure('Não foi possível reativar a categoria.'))} /> : null}
            {page === 'backup' ? <div className="cloud-hub" aria-label="Modo nuvem">
              <section className="cloud-hub-header" aria-labelledby="cloud-hub-heading">
                <span className="cloud-hub-symbol" aria-hidden="true"><Cloud size={23}/></span>
                <div><p className="cloud-hub-eyebrow">SEUS DADOS</p><h1 id="cloud-hub-heading">Modo nuvem</h1><p>Sincronização, status da conexão e cópias de segurança em um único lugar.</p></div>
              </section>
              <section className="cloud-hub-section" aria-label="Acesso à nuvem">
                <div className="cloud-hub-section-heading"><Cloud size={19}/><h2 id="cloud-hub-sync-heading">Sincronização</h2></div>
                {sessionControls ?? <div className="cloud-hub-local"><HardDrive size={20}/><div><strong>Dados armazenados neste dispositivo</strong><p>A sincronização remota não está ativa. Você ainda pode exportar e restaurar cópias locais abaixo.</p></div></div>}
              </section>
              <section className="cloud-hub-section cloud-hub-section--backup" aria-label="Backup e recuperação">
                <BackupView testMode={testMode} integration={integration} {...(serverId?{serverId}:{})} {...(exportJson?{exportJson}:{})} {...(importJson?{importJson}:{})} onRecover={recover} busy={busy} readState={readState} state={state} userId={userId} today={today} />
              </section>
            </div> : null}
          </>
        )}
      </section>

      <nav className="bottom-nav" aria-label="Navegação móvel">
        <MobileNavButton active={page === 'dashboard'} label="Início" Icon={Home} onClick={() => setPage('dashboard')} />
        <MobileNavButton active={page === 'movements'} label="Extrato" Icon={ListRestart} onClick={() => setPage('movements')} />
        <button className="bottom-add" onClick={openTransaction} disabled={state.accounts.length === 0} aria-label="Novo lançamento"><Plus size={27} /><span>Adicionar</span></button>
        {(integration || bankPanel !== undefined) ? <MobileNavButton active={page === 'banks'} label="Bancos" Icon={Landmark} onClick={() => setPage('banks')} /> : <MobileNavButton active={page === 'accounts'} label="Contas" Icon={WalletCards} onClick={() => setPage('accounts')} />}
        <MobileNavButton active={['more','categories','backup',...(integration || bankPanel !== undefined ? ['accounts'] : [])].includes(page)} label="Mais" Icon={MoreHorizontal} onClick={() => setPage('more')} />
      </nav>

      {modal?.type === 'account' ? <DialogFrame title="Nova conta" onClose={() => setModal(undefined)}><AccountForm today={today} busy={busy} onCancel={() => setModal(undefined)} onSave={saveAccount} /></DialogFrame> : null}
      {modal?.type === 'reconcile' ? <DialogFrame title="Conciliar saldo inicial" onClose={() => setModal(undefined)}><AccountReconciliationForm account={modal.account} today={today} busy={busy} onCancel={() => setModal(undefined)} onSave={saveReconciliation} /></DialogFrame> : null}
      {modal?.type === 'category' ? <DialogFrame title="Nova categoria" onClose={() => setModal(undefined)}><CategoryForm categories={state.categories.filter(row=>isEntitySelectable(state.entityLifecycles??[],userId,'category',row.id))} busy={busy} onCancel={() => setModal(undefined)} onSave={saveCategory} /></DialogFrame> : null}
      {modal?.type === 'edit_account' ? <DialogFrame title="Editar conta" onClose={()=>setModal(undefined)}><MetadataEditForm entity={modal.account} accounts={state.accounts} busy={busy} onCancel={()=>setModal(undefined)} onSave={saveMetadata}/></DialogFrame> : null}
      {modal?.type === 'edit_category' ? <DialogFrame title="Editar categoria" onClose={()=>setModal(undefined)}><MetadataEditForm entity={modal.category} categories={state.categories.filter(row=>isEntitySelectable(state.entityLifecycles??[],userId,'category',row.id))} busy={busy} onCancel={()=>setModal(undefined)} onSave={saveMetadata}/></DialogFrame> : null}
      {modal?.type === 'delete_entity' ? <DialogFrame title={integration?(modal.kind==='account'?'Arquivar conta':'Arquivar categoria'):(modal.kind==='account'?'Excluir conta':'Excluir categoria')} onClose={()=>setModal(undefined)}><div className="confirm-dialog"><p>Deseja {integration?'arquivar':'excluir'} <strong>{modal.entity.name}</strong>?</p><p className="form-note">{integration?'O registro e todo o histórico financeiro serão preservados. Ele deixará de aparecer nas opções de novos lançamentos e poderá ser reativado.':'A exclusão é permitida apenas para registros sem lançamentos, conciliações, importações vinculadas ou dependências. Caso contrário, será bloqueada para preservar o histórico financeiro.'}</p>{deleteFailure?<p className="form-error" role="alert">{deleteFailure}</p>:null}<footer className="dialog-actions"><button type="button" className="button button--ghost" onClick={()=>setModal(undefined)}>Cancelar</button><button type="button" className="button button--danger" disabled={busy} onClick={()=>void deleteEntity()}>{busy?'Excluindo…':'Confirmar exclusão'}</button></footer></div></DialogFrame> : null}
      {modal?.type === 'transaction' ? <DialogFrame title={modal.initial === undefined ? 'Novo lançamento' : 'Corrigir lançamento'} onClose={() => setModal(undefined)} wide><TransactionForm defaultKind={modal.kind ?? 'expense'} accounts={state.accounts.filter(row=>isEntitySelectable(state.entityLifecycles??[],userId,'account',row.id))} categories={state.categories.filter(row=>isEntitySelectable(state.entityLifecycles??[],userId,'category',row.id))} recurrenceRules={state.events.filter((event) => event.recurrenceJson !== undefined && event.status === 'planned')} {...(modal.initial === undefined ? {} : { initial: modal.initial })} today={today} busy={busy} onCancel={() => setModal(undefined)} onSave={saveTransaction} /></DialogFrame> : null}
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
