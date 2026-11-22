import { useEffect, useState, type ChangeEvent } from 'react';
import type { Account, Category, LocalFinancialState } from '../domain';
import { calculateAccountBalance, hasReconciledOpeningBalance, formatBRL, parseBRL } from '../domain';
import {
  emptyPlan, proposedGoals, proposedRecurringNames, positiveCents, reservedForAccount, canReserve, sumGoalAllocations,
  sharedSummary, type FinancialPlan, type Goal, type PlannedRecurrence, type PlannedObligation,
  type SharedExpense, type ApprovedRule, type AccountPreference, type PlanFrequency, type Importance,
} from './model';
import { readPlanning, mutatePlanning, exportPlanning, importPlanning } from './store';

type Tab='goals'|'recurrences'|'shared'|'obligations'|'rules'|'accounts';
type Editor=(change:(plan:FinancialPlan)=>FinancialPlan)=>Promise<void>;
const money=(cents:number|null|undefined)=>cents==null?'Não informado':formatBRL(BigInt(cents));
const cents=(value:string,optional=false):number|null=>{
  if(optional&&!value.trim())return null;
  return positiveCents(parseBRL(value));
};
const same=(a:string,b:string)=>a.trim().toLocaleLowerCase('pt-BR')===b.trim().toLocaleLowerCase('pt-BR');
const updateItem=<T extends {id:string}>(items:T[],id:string,fn:(item:T)=>T):T[]=>items.map(item=>item.id===id?fn(item):item);
const frequencyLabel:Record<PlanFrequency,string>={
  once:'Única',weekly:'Semanal',biweekly:'Quinzenal',monthly:'Mensal',
  quarterly:'Trimestral',semiannual:'Semestral',annual:'Anual',custom:'Personalizada'
};
const necessityLabel:Record<Importance,string>={essential:'Essencial',important:'Importante',optional:'Opcional'};

export function PersonalPlanning({ownerId,accounts,categories,ledger}:{ownerId:string;accounts:Account[];categories:Category[];ledger:LocalFinancialState}) {
  const [plan,setPlan]=useState<FinancialPlan>(()=>emptyPlan(ownerId));
  const [tab,setTab]=useState<Tab>('goals');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    let active=true;
    setLoading(true);setPlan(emptyPlan(ownerId));setError('');
    void readPlanning(ownerId).then(next=>{if(active)setPlan(next);})
      .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Erro ao abrir planejamento.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[ownerId]);
  const change:Editor=async(transform)=>{
    if(busy)throw new Error('Aguarde a operação em andamento.');
    setBusy(true);setError('');setNotice('');
    try{
      const updated=await mutatePlanning(ownerId,previous=>{
        const next=transform(previous);
        return {...next,revision:previous.revision+1};
      });
      setPlan(updated);setNotice('Planejamento salvo somente neste navegador.');
    }catch(e){
      const message=e instanceof Error?e.message:'Não foi possível salvar.';
      setError(message);throw e;
    }finally{setBusy(false);}
  };
  async function loadBackup(event:ChangeEvent<HTMLInputElement>){
    const file=event.currentTarget.files?.[0];
    event.currentTarget.value='';
    if(!file)return;
    if(file.size>1_000_000){setError('Cópia excede 1 MB.');return;}
    if(!window.confirm('Importar planejamento? Novos registros serão acrescentados; conflitos serão bloqueados. Isto não importa lançamentos bancários.'))return;
    setBusy(true);setError('');
    try{
      const updated=await importPlanning(ownerId,await file.text());
      setPlan(updated);setNotice('Planejamento importado sem substituir registros conflitantes.');
    }catch(e){setError(e instanceof Error?e.message:'Importação inválida.');}
    finally{setBusy(false);}
  }
  function download(){
    try{
      const json=exportPlanning(plan);
      const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
      const anchor=document.createElement('a');anchor.href=url;
      anchor.download='atlas-planejamento-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.append(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
      setNotice('Cópia exportada. Guarde o arquivo em local privado.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível exportar.');}
  }
  const onFailure=(reason:unknown)=>setError(reason instanceof Error?reason.message:'Não foi possível validar o formulário.');
  const tabs:{id:Tab;label:string}[]=[
    {id:'goals',label:'Metas'}, {id:'recurrences',label:'Recorrências'},
    {id:'shared',label:'Compartilhadas'}, {id:'obligations',label:'Obrigações'},
    {id:'rules',label:'Classificação'}, {id:'accounts',label:'Contas'}
  ];
  return <section className="page-content planning-page" aria-label="Planejamento pessoal">
    <div className="page-heading"><div><p className="section-kicker">ORGANIZAÇÃO PESSOAL</p><h1>Planejamento financeiro</h1><p>Metas, compromissos e regras — sem lançar ou movimentar dinheiro automaticamente.</p></div></div>
    <p className="form-note" role="status"><strong>Salvo somente neste navegador.</strong> Não há sincronização automática destas informações entre dispositivos nem inclusão no backup do extrato. Exporte uma cópia antes de trocar de aparelho.</p>
    <div className="planning-backup"><button type="button" className="button button--secondary" disabled={busy||loading} onClick={download}>Exportar planejamento</button><label className="button button--ghost">Importar cópia JSON <input type="file" accept=".json,application/json" onChange={event=>void loadBackup(event)} disabled={busy||loading} /></label></div>
    {error?<p className="form-error" role="alert">{error}</p>:null}
    {notice?<p role="status">{notice}</p>:null}
    {loading?<p role="status">Carregando planejamento local…</p>:<><div className="planning-tabs" role="tablist" aria-label="Áreas do planejamento">
      {tabs.map(item=><button type="button" role="tab" aria-selected={tab===item.id} className={tab===item.id?'is-active':''} key={item.id} onClick={()=>setTab(item.id)}>{item.label}</button>)}
    </div>
    {tab==='goals'?<Goals plan={plan} accounts={accounts} ledger={ledger} change={change} busy={busy} onFailure={onFailure}/>:null}
    {tab==='recurrences'?<Recurrences plan={plan} categories={categories} change={change} busy={busy} onFailure={onFailure}/>:null}
    {tab==='shared'?<Shared plan={plan} change={change} busy={busy} onFailure={onFailure}/>:null}
    {tab==='obligations'?<Obligations plan={plan} change={change} busy={busy} onFailure={onFailure}/>:null}
    {tab==='rules'?<Rules plan={plan} categories={categories} change={change} busy={busy} onFailure={onFailure}/>:null}
    {tab==='accounts'?<AccountPreferences plan={plan} accounts={accounts} change={change} busy={busy} onFailure={onFailure}/>:null}
    </>}
  </section>;
}

function Goals({plan,accounts,ledger,change,busy,onFailure}:{plan:FinancialPlan;accounts:Account[];ledger:LocalFinancialState;change:Editor;busy:boolean;onFailure:(reason:unknown)=>void}){
  const [name,setName]=useState('');
  const [target,setTarget]=useState('');
  const [deadline,setDeadline]=useState('');
  const [priority,setPriority]=useState<Goal['priority']>('unset');
  const [selected,setSelected]=useState('');
  const [accountId,setAccountId]=useState('');
  const [allocation,setAllocation]=useState('');
  const free=accounts.filter(a=>a.availability==='free'&&hasReconciledOpeningBalance(ledger,a.id));
  async function addGoal(){
    const title=name.trim();if(!title)throw new TypeError('Informe o nome da meta.');
    const value=cents(target,true);
    await change(prev=>{
      if(prev.goals.some(g=>same(g.name,title)))throw new TypeError('Esta meta já existe.');
      return {...prev,goals:[...prev.goals,{id:crypto.randomUUID(),name:title,targetCents:value,deadline:deadline||null,priority,status:'active',allocations:[]}]};
    });
    setName('');setTarget('');setDeadline('');
  }
  async function allocate(){
    const value=cents(allocation);
    if(value===null||!accountId||!selected)throw new TypeError('Escolha uma meta, conta e valor.');
    const account=free.find(a=>a.id===accountId);
    if(!account)throw new TypeError('Somente contas livres com saldo conciliado podem ser usadas.');
    const bankCents=calculateAccountBalance(ledger,accountId);
    if(bankCents>BigInt(Number.MAX_SAFE_INTEGER))throw new TypeError('Saldo fora do limite de cálculo.');
    await change(prev=>{
      if(!canReserve(prev,accountId,value,Number(bankCents)))throw new TypeError('Reserva maior que o dinheiro livre não reservado nesta conta.');
      const targetGoal=prev.goals.find(g=>g.id===selected);
      if(!targetGoal||targetGoal.status!=='active')throw new TypeError('Meta não está ativa.');
      return {...prev,goals:updateItem(prev.goals,selected,g=>({...g,allocations:[...g.allocations,{
        id:crypto.randomUUID(),accountId,cents:value,on:new Date().toISOString().slice(0,10)
      }]}))};
    });
    setAllocation('');
  }
  return <section className="planning-section" aria-labelledby="planning-goals">
    <h2 id="planning-goals">Metas e valores reservados</h2>
    <p className="form-note">Uma reserva é uma anotação vinculada a uma conta existente, não uma movimentação. O sistema limita a soma das reservas ao saldo conciliado das contas livres.</p>
    <div className="planning-presets" aria-label="Nomes sugeridos">{proposedGoals.map(n=><button key={n} type="button" onClick={()=>setName(n)}>{n}</button>)}</div>
    <div className="planning-grid">
      <label>Nome da meta<input value={name} onChange={e=>setName(e.target.value)} maxLength={200}/></label>
      <label>Valor-alvo (opcional)<input inputMode="decimal" placeholder="Desconhecido" value={target} onChange={e=>setTarget(e.target.value)}/></label>
      <label>Prazo (opcional)<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
      <label>Prioridade<select value={priority} onChange={e=>setPriority(e.target.value as Goal['priority'])}><option value="unset">A definir</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
    </div>
    <button type="button" className="button button--primary" disabled={busy||!name.trim()} onClick={()=>void addGoal().catch(onFailure)}>Adicionar meta</button>
    <div className="planning-records">{plan.goals.map(goal=>{
      const allocated=sumGoalAllocations(goal);
      return <article className="planning-record" key={goal.id}><div><strong>{goal.name}</strong><p>Reservado: {money(allocated)} · Alvo: {money(goal.targetCents)} · {goal.deadline??'Sem prazo'}</p><small>{goal.allocations.length} registro(s) de reserva · prioridade {goal.priority==='unset'?'não definida':goal.priority}</small><div className="planning-history">{goal.allocations.map(a=><div key={a.id}><small>{a.on}: {money(a.cents)} · {accounts.find(account=>account.id===a.accountId)?.name??'Conta não encontrada'} {a.canceledAt?'· Cancelada em '+a.canceledAt:''}</small>{!a.canceledAt?<button type="button" className="text-button" disabled={busy} onClick={()=>void change(prev=>({...prev,goals:updateItem(prev.goals,goal.id,g=>({...g,allocations:updateItem(g.allocations,a.id,old=>({...old,canceledAt:new Date().toISOString().slice(0,10)}))}))})).catch(onFailure)}>Cancelar reserva</button>:null}</div>)}</div></div>
        <label>Estado<select aria-label={'Estado '+goal.name} value={goal.status} disabled={busy} onChange={e=>void change(prev=>({...prev,goals:updateItem(prev.goals,goal.id,g=>({...g,status:e.target.value as Goal['status']}))})).catch(onFailure)}><option value="active">Ativa</option><option value="paused">Pausada</option><option value="completed">Concluída</option></select></label>
      </article>;
    })}</div>
    {plan.goals.some(g=>g.status==='active')?<div className="planning-contribution"><h3>Reservar valor para uma meta</h3><div className="planning-grid">
      <label>Meta<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Selecione</option>{plan.goals.filter(g=>g.status==='active').map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label>Conta livre conciliada<select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Selecione</option>{free.map(a=><option value={a.id} key={a.id}>{a.name} · disponível para novas reservas: {money(Math.max(0,Number(calculateAccountBalance(ledger,a.id))-reservedForAccount(plan,a.id)))}</option>)}</select></label>
      <label>Valor da reserva<input inputMode="decimal" value={allocation} onChange={e=>setAllocation(e.target.value)}/></label>
    </div><button type="button" className="button button--secondary" disabled={busy||!selected||!accountId||!allocation} onClick={()=>void allocate().catch(onFailure)}>Reservar sem movimentar saldo</button></div>:null}
  </section>;
}

function Recurrences({plan,categories,change,busy,onFailure}:{plan:FinancialPlan;categories:Category[];change:Editor;busy:boolean;onFailure:(reason:unknown)=>void}){
  const [name,setName]=useState('');
  const [direction,setDirection]=useState<'income'|'expense'>('expense');
  const [amount,setAmount]=useState('');
  const [frequency,setFrequency]=useState<PlanFrequency>('monthly');
  const [intervalDays,setIntervalDays]=useState('30');
  const [day,setDay]=useState('');
  const [necessity,setNecessity]=useState<Importance>('optional');
  const [categoryId,setCategoryId]=useState('');
  const [shared,setShared]=useState(false);
  async function add(){
    const title=name.trim();const value=cents(amount,true);
    if(!title)throw new TypeError('Informe a recorrência.');
    await change(prev=>{
      if(prev.recurrences.some(r=>same(r.name,title)&&r.direction===direction))throw new TypeError('Recorrência já cadastrada neste planejamento.');
      const next:PlannedRecurrence={
        id:crypto.randomUUID(),name:title,direction,cents:value,frequency,
        customIntervalDays:frequency==='custom'?Number(intervalDays):null,
        dueDay:day?Number(day):null,necessity:direction==='expense'?necessity:null,
        status:'draft',categoryId:categoryId||null,shared
      };
      return {...prev,recurrences:[...prev.recurrences,next]};
    });
    setName('');setAmount('');setDay('');
  }
  return <section className="planning-section"><h2>Recorrências planejadas</h2><p className="form-note">Nenhuma recorrência daqui gera pagamentos, receitas ou cobranças no extrato. O estado inicial é rascunho, mesmo quando o valor foi informado.</p>
    <div className="planning-presets">{proposedRecurringNames.map(n=><button type="button" key={n} onClick={()=>setName(n)}>{n}</button>)}</div>
    <div className="planning-grid">
      <label>Descrição<input value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Tipo<select value={direction} onChange={e=>{setDirection(e.target.value as 'income'|'expense');setCategoryId('')}}><option value="expense">Despesa prevista</option><option value="income">Receita prevista</option></select></label>
      <label>Valor (opcional)<input placeholder="Sem confirmação" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      <label>Frequência<select value={frequency} onChange={e=>setFrequency(e.target.value as PlanFrequency)}>{Object.entries(frequencyLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      {frequency==='custom'?<label>Intervalo em dias<input type="number" min="1" max="3650" value={intervalDays} onChange={e=>setIntervalDays(e.target.value)}/></label>:null}
      <label>Dia da cobrança (opcional)<input type="number" min="1" max="31" value={day} onChange={e=>setDay(e.target.value)}/></label>
      {direction==='expense'?<label>Necessidade<select value={necessity} onChange={e=>setNecessity(e.target.value as Importance)}>{Object.entries(necessityLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>:null}
      <label>Categoria (opcional)<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Não definida</option>{categories.filter(c=>c.kind===direction||c.kind==='both').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {direction==='expense'?<label className="planning-check"><input type="checkbox" checked={shared} onChange={e=>setShared(e.target.checked)}/>Despesa compartilhada</label>:null}
    </div>
    <button type="button" className="button button--primary" disabled={busy||!name.trim()} onClick={()=>void add().catch(onFailure)}>Salvar rascunho</button>
    <div className="planning-records">{plan.recurrences.map(item=><article key={item.id} className="planning-record"><div><strong>{item.name}</strong><p>{money(item.cents)} · {frequencyLabel[item.frequency]} · {item.dueDay?'dia '+item.dueDay:'vencimento desconhecido'} {item.shared?'· Compartilhada':''}</p><small>{item.necessity?necessityLabel[item.necessity]:'Receita'} · somente planejamento</small></div>
      <label>Estado<select disabled={busy} value={item.status} onChange={e=>void change(prev=>({...prev,recurrences:updateItem(prev.recurrences,item.id,row=>({...row,status:e.target.value as PlannedRecurrence['status']}))})).catch(onFailure)}><option value="draft">Rascunho</option><option value="active" disabled={item.cents===null}>Confirmada para planejar</option><option value="paused">Pausada</option></select></label>
    </article>)}</div>
  </section>;
}

function Obligations({plan,change,busy,onFailure}:{plan:FinancialPlan;change:Editor;busy:boolean;onFailure:(reason:unknown)=>void}){
  const [name,setName]=useState('');
  const [amount,setAmount]=useState('');
  const [status,setStatus]=useState<PlannedObligation['status']>('needs_confirmation');
  const [dueDate,setDueDate]=useState('');
  const [notes,setNotes]=useState('');
  async function add(){
    const title=name.trim();if(!title)throw new TypeError('Informe a obrigação.');
    await change(prev=>{
      if(prev.obligations.some(item=>same(item.name,title)))throw new TypeError('Obrigação já registrada no planejamento.');
      return {...prev,obligations:[...prev.obligations,{
        id:crypto.randomUUID(),name:title,cents:cents(amount,true),status,
        dueDate:dueDate||null,linkedEventId:null,notes
      }]};
    });
    setName('');setAmount('');setDueDate('');setNotes('');
  }
  return <section className="planning-section"><h2>Obrigações e referências históricas</h2>
    <p className="form-note">Apenas referências — sem criar dívida, cobrar ou marcar pagamento. Concilie com lançamentos comprovados antes de registrar quitação no extrato.</p>
    <div className="planning-grid">
      <label>Descrição<input value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Valor (opcional)<input value={amount} inputMode="decimal" onChange={e=>setAmount(e.target.value)}/></label>
      <label>Situação<select value={status} onChange={e=>setStatus(e.target.value as PlannedObligation['status'])}><option value="needs_confirmation">Precisa confirmar</option><option value="historical">Referência histórica</option><option value="planned">Planejamento futuro</option></select></label>
      <label>Vencimento (opcional)<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
      <label>Observações<input value={notes} maxLength={1000} onChange={e=>setNotes(e.target.value)}/></label>
    </div>
    <button type="button" className="button button--primary" disabled={busy||!name.trim()} onClick={()=>void add().catch(onFailure)}>Registrar referência</button>
    <div className="planning-records">{plan.obligations.map(item=><article className="planning-record" key={item.id}><div><strong>{item.name}</strong><p>{money(item.cents)} · {item.dueDate??'Sem vencimento'} · {item.status==='historical'?'Histórico':item.status==='planned'?'Planejamento':'Pendente de confirmação'}</p><small>{item.notes}</small></div><label>Situação<select value={item.status} disabled={busy} onChange={e=>void change(prev=>({...prev,obligations:updateItem(prev.obligations,item.id,row=>({...row,status:e.target.value as PlannedObligation['status']}))})).catch(onFailure)}><option value="needs_confirmation">Confirmar</option><option value="historical">Histórico</option><option value="planned">Planejado</option></select></label></article>)}</div>
  </section>;
}

function Shared({plan,change,busy,onFailure}:{plan:FinancialPlan;change:Editor;busy:boolean;onFailure:(reason:unknown)=>void}){
  const [name,setName]=useState('');
  const [total,setTotal]=useState('');
  const [personal,setPersonal]=useState('');
  const [participants,setParticipants]=useState('');
  const [selected,setSelected]=useState('');
  const [person,setPerson]=useState('');
  const [contribution,setContribution]=useState('');
  async function add(){
    const title=name.trim(),totalCents=cents(total),personalCents=cents(personal,true)??0;
    if(!title||totalCents===null||personalCents>totalCents)throw new TypeError('Informe valores válidos e participação pessoal menor ou igual ao total.');
    const names=participants.split(',').map(x=>x.trim()).filter(Boolean);
    if(!names.length||new Set(names).size!==names.length)throw new TypeError('Informe participantes distintos, separados por vírgulas.');
    await change(prev=>{
      if(prev.shared.some(x=>same(x.name,title)))throw new TypeError('Compartilhamento já cadastrado.');
      const item:SharedExpense={id:crypto.randomUUID(),name:title,totalCents,personalCents,participants:names,contributions:[],carriedCreditCents:0,status:'active'};
      return {...prev,shared:[...prev.shared,item]};
    });
    setName('');setTotal('');setPersonal('');setParticipants('');
  }
  async function addContribution(){
    const amount=cents(contribution);
    if(!selected||!person||amount===null)throw new TypeError('Informe o pagamento recebido e o participante.');
    await change(prev=>{
      const existing=prev.shared.find(s=>s.id===selected);
      if(!existing||!existing.participants.includes(person))throw new TypeError('Participante não pertence ao compartilhamento.');
      return {...prev,shared:updateItem(prev.shared,selected,row=>({...row,contributions:[...row.contributions,{
        id:crypto.randomUUID(),participant:person,cents:amount,on:new Date().toISOString().slice(0,10)
      }]}))};
    });
    setContribution('');
  }
  const active=plan.shared.find(s=>s.id===selected);
  return <section className="planning-section"><h2>Despesas compartilhadas</h2>
    <p className="form-note">Contribuições de outras pessoas são dinheiro administrado para terceiros e <strong>não são renda pessoal</strong>. Registros daqui não criam transações bancárias.</p>
    <div className="planning-grid">
      <label>Assinatura/despesa<input value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Valor total<input inputMode="decimal" value={total} onChange={e=>setTotal(e.target.value)}/></label>
      <label>Minha parte (vazio = R$ 0,00)<input inputMode="decimal" value={personal} onChange={e=>setPersonal(e.target.value)}/></label>
      <label>Participantes (separados por vírgulas)<input value={participants} onChange={e=>setParticipants(e.target.value)}/></label>
    </div>
    <button type="button" className="button button--primary" disabled={busy||!name.trim()||!total} onClick={()=>void add().catch(onFailure)}>Criar controle compartilhado</button>
    <div className="planning-records">{plan.shared.map(row=>{
      const summary=sharedSummary(row);
      return <article className="planning-record" key={row.id}><div><strong>{row.name}</strong><p>Total {money(row.totalCents)} · Minha parte {money(row.personalCents)}</p><small>Recebido {money(summary.receivedCents)} · Pendente {money(summary.pendingCents)} · Crédito excedente {money(summary.surplusCents)}</small></div>
      <button className="button button--ghost" type="button" onClick={()=>{setSelected(row.id);setPerson('')}}>Contribuições</button></article>;
    })}</div>
    {active?<div className="planning-contribution"><h3>Registrar contribuição: {active.name}</h3>
      <div className="planning-grid"><label>Participante<select value={person} onChange={e=>setPerson(e.target.value)}><option value="">Selecione</option>{active.participants.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
      <label>Valor recebido<input inputMode="decimal" value={contribution} onChange={e=>setContribution(e.target.value)}/></label></div>
      <button className="button button--secondary" type="button" disabled={busy||!person||!contribution} onClick={()=>void addContribution().catch(onFailure)}>Registrar somente no controle compartilhado</button>
      <ul>{active.contributions.map(c=><li key={c.id}>{c.participant}: {money(c.cents)} em {c.on} {c.canceledAt?'(anulado em '+c.canceledAt+')':<button className="text-button" type="button" disabled={busy} onClick={()=>void change(prev=>({...prev,shared:updateItem(prev.shared,active.id,row=>({...row,contributions:updateItem(row.contributions,c.id,old=>({...old,canceledAt:new Date().toISOString().slice(0,10)}))}))})).catch(onFailure)}>Anular anotação</button>}</li>)}</ul>
    </div>:null}
  </section>;
}

function Rules({plan,categories,change,busy,onFailure}:{plan:FinancialPlan;categories:Category[];change:Editor;busy:boolean;onFailure:(reason:unknown)=>void}){
  const [identifierType,setIdentifierType]=useState<ApprovedRule['identifierType']>('merchant_id');
  const [identifier,setIdentifier]=useState('');
  const [categoryId,setCategoryId]=useState('');
  const [ack,setAck]=useState(false);
  async function add(){
    if(!ack||!identifier.trim()||!categoryId)throw new TypeError('Confirme o identificador estável e a categoria.');
    await change(prev=>{
      if(prev.rules.some(r=>r.identifierType===identifierType&&r.identifier===identifier.trim()))
        throw new TypeError('Já existe regra para esse identificador.');
      return {...prev,rules:[...prev.rules,{
        id:crypto.randomUUID(),identifierType,identifier:identifier.trim(),
        categoryId,approvedAt:new Date().toISOString().slice(0,10),enabled:true
      }]};
    });
    setIdentifier('');setAck(false);
  }
  return <section className="planning-section"><h2>Regras inteligentes aprovadas</h2><p className="form-note">Somente identificadores estáveis e verificados, nunca nomes parecidos. Estas regras ficam registradas para futura vinculação ao importador bancário; <strong>não alteram automaticamente os lançamentos atuais</strong>.</p>
    <div className="planning-grid">
      <label>Tipo de identificação<select value={identifierType} onChange={e=>setIdentifierType(e.target.value as ApprovedRule['identifierType'])}><option value="merchant_id">Identificador confiável do estabelecimento</option><option value="counterparty_id">Identificador confiável do destinatário</option></select></label>
      <label>Identificador verificado<input value={identifier} onChange={e=>setIdentifier(e.target.value)} maxLength={160} placeholder="ID exato da origem autorizada"/></label>
      <label>Categoria<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Selecione</option>{categories.filter(c=>c.kind==='income'||c.kind==='expense'||c.kind==='both').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    </div>
    <label className="planning-check"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>Eu conferi o identificador na origem e autorizo memorizar a categoria.</label>
    <button type="button" className="button button--primary" disabled={busy||!ack||!identifier.trim()||!categoryId} onClick={()=>void add().catch(onFailure)}>Memorizar regra</button>
    <div className="planning-records">{plan.rules.map(row=><article className="planning-record" key={row.id}><div><strong>{row.identifierType==='merchant_id'?'Estabelecimento':'Destinatário'}: {row.identifier}</strong><p>{categories.find(c=>c.id===row.categoryId)?.name??'Categoria não encontrada'} · autorizado em {row.approvedAt}</p></div>
      <label>Regra<select value={row.enabled?'enabled':'disabled'} disabled={busy} onChange={e=>void change(prev=>({...prev,rules:updateItem(prev.rules,row.id,item=>({...item,enabled:e.target.value==='enabled'}))})).catch(onFailure)}><option value="enabled">Guardada</option><option value="disabled">Desativada</option></select></label></article>)}</div>
  </section>;
}

function AccountPreferences({plan,accounts,change,busy,onFailure}:{plan:FinancialPlan;accounts:Account[];change:Editor;busy:boolean;onFailure:(reason:unknown)=>void}){
  const [accountId,setAccountId]=useState('');
  const current=plan.accountPreferences.find(x=>x.accountId===accountId);
  const [institution,setInstitution]=useState('');
  const [liquidity,setLiquidity]=useState<AccountPreference['liquidity']>('unknown');
  const [restriction,setRestriction]=useState('');
  useEffect(()=>{setInstitution(current?.institution??'');setLiquidity(current?.liquidity??'unknown');setRestriction(current?.usageRestriction??'');},[accountId,current?.institution,current?.liquidity,current?.usageRestriction]);
  async function save(){
    if(!accounts.some(a=>a.id===accountId))throw new TypeError('Conta não encontrada.');
    await change(prev=>({
      ...prev,accountPreferences:[...prev.accountPreferences.filter(x=>x.accountId!==accountId),
        {accountId,institution:institution.trim(),liquidity,usageRestriction:restriction.trim()}]
    }));
  }
  return <section className="planning-section"><h2>Preferências de conta</h2><p className="form-note">Instituição, liquidez e restrições são anotações. Não alteram saldo, titularidade, instituição na Pluggy nem o cadastro original da conta.</p>
    <div className="planning-grid">
      <label>Conta existente<select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Selecione</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label>Instituição<input value={institution} maxLength={120} onChange={e=>setInstitution(e.target.value)}/></label>
      <label>Liquidez<select value={liquidity} onChange={e=>setLiquidity(e.target.value as AccountPreference['liquidity'])}><option value="unknown">A confirmar</option><option value="immediate">Disponível imediatamente</option><option value="restricted">Resgate/uso restrito</option></select></label>
      <label>Restrição de uso<input value={restriction} maxLength={240} onChange={e=>setRestriction(e.target.value)} placeholder="Ex.: transporte, prazo de resgate"/></label>
    </div>
    <button type="button" className="button button--primary" disabled={busy||!accountId} onClick={()=>void save().catch(onFailure)}>Salvar anotação</button>
    <div className="planning-records">{accounts.map(a=><article key={a.id} className="planning-record"><div><strong>{a.name}</strong><p>{a.availability==='restricted'?'Uso restrito':a.availability==='reserved'?'Reservada':'Livre'} · {plan.accountPreferences.find(p=>p.accountId===a.id)?.institution||'Instituição não informada'}</p><small>{plan.accountPreferences.find(p=>p.accountId===a.id)?.usageRestriction||'Sem observações adicionais'}</small></div></article>)}</div>
  </section>;
}
