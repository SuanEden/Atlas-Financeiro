import { calculateCashTotals, calculateFinancialForecast, formatBRL, type LocalFinancialState } from '../domain';

function monthAt(month: string, offset: number): string {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}
const money = (value: bigint) => Number(value) / 100;
const labels = (month: string) => new Intl.DateTimeFormat('pt-BR', {month: 'short', timeZone: 'UTC'}).format(new Date(month + '-01T12:00:00Z')).replace('.', '');

export function FinanceCharts({ state, month }: { state: LocalFinancialState; month: string }) {
  const historical = Array.from({length: 6}, (_, index) => {
    const m = monthAt(month, index - 5);
    const end = new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0)).getUTCDate();
    const totals = calculateCashTotals(state, {start: m + '-01', end: m + '-' + String(end).padStart(2,'0')});
    return {month: m, income: totals.incomeCents, expense: totals.expenseCents};
  });
  const forecast = calculateFinancialForecast(state, month, 6);
  const future = Array.from({length: 6}, (_, index) => {
    const m = monthAt(month, index);
    const items = forecast.items.filter((item) => item.month === m && item.amountBasis === 'cash');
    return {
      month: m,
      income: items.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amountCents, 0n),
      expense: items.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amountCents, 0n),
    };
  });
  const eventById = new Map(state.events.map((event) => [event.id, event]));
  const categoryById = new Map(state.categories.map((category) => [category.id, category.name]));
  const categories = new Map<string, bigint>();
  for (const payment of state.settlements) {
    if (payment.settlementDate.slice(0, 7) !== month) continue;
    const event = eventById.get(payment.eventId);
    if (event?.kind !== 'expense') continue;
    const key = event.categoryId === undefined ? 'Sem categoria' : categoryById.get(event.categoryId) ?? 'Sem categoria';
    const sign = event.reversesEventId === undefined ? 1n : -1n;
    categories.set(key, (categories.get(key) ?? 0n) + payment.amountCents * sign);
  }
  const categoryItems = [...categories].filter(([,value]) => value > 0n).sort((a,b) => Number(b[1]-a[1])).slice(0, 8);
  return <section className="finance-charts" aria-label="Gráficos financeiros">
    <div className="section-heading"><div><p className="section-kicker">Análise visual</p><h2>Gráficos financeiros</h2></div></div>
    <div className="finance-chart-grid">
      <ComparisonChart title="Entradas e saídas realizadas" subtitle="Últimos seis meses · somente pagamentos e recebimentos efetivos" rows={historical} />
      <ComparisonChart title="Compromissos e receitas previstos" subtitle="Próximos seis meses · não representam pagamentos realizados" rows={future} />
      <CategoryChart categories={categoryItems} />
    </div>
    <p className="form-note">Transferências, ajustes de saldo e salários brutos desconhecidos não aumentam artificialmente as entradas ou despesas. A projeção não inclui remuneração líquida ainda não informada.</p>
  </section>;
}

function ComparisonChart({title, subtitle, rows}: {title:string;subtitle:string;rows:{month:string;income:bigint;expense:bigint}[]}) {
  const largest = Math.max(1, ...rows.flatMap((row) => [money(row.income), money(row.expense)]));
  const anyData = rows.some((row) => row.income !== 0n || row.expense !== 0n);
  return <article className="finance-chart-card">
    <h3>{title}</h3><p>{subtitle}</p>
    {!anyData ? <div className="finance-chart-empty">Ainda não há valores para este gráfico.</div> : <svg viewBox="0 0 520 260" role="img" aria-label={title} className="finance-chart-svg">
      {[0,1,2,3,4].map((step) => <line key={step} x1="50" x2="500" y1={20+step*46} y2={20+step*46} stroke="currentColor" opacity=".12" />)}
      {rows.map((row, index) => {
        const x=61+index*73;
        const ih=184*money(row.income)/largest;
        const eh=184*money(row.expense)/largest;
        return <g key={row.month}>
          <rect x={x} y={204-ih} width="25" height={ih} rx="4" fill="var(--positive)" ><title>{labels(row.month)}: entradas {formatBRL(row.income)}</title></rect>
          <rect x={x+28} y={204-eh} width="25" height={eh} rx="4" fill="var(--negative)"><title>{labels(row.month)}: saídas {formatBRL(row.expense)}</title></rect>
          <text x={x+26} y="227" textAnchor="middle" fontSize="14" fill="currentColor">{labels(row.month)}</text>
        </g>;
      })}
    </svg>}
    <div className="finance-chart-legend"><span><i className="finance-dot finance-dot--income" />Entradas</span><span><i className="finance-dot finance-dot--expense" />Saídas</span></div>
    <div className="finance-chart-details">{rows.map((row) => <div key={row.month}><strong>{row.month}</strong><span>{formatBRL(row.income)}</span><span>{formatBRL(row.expense)}</span></div>)}</div>
  </article>;
}

function CategoryChart({categories}: {categories:[string,bigint][]}) {
  const total = categories.reduce((sum,[,amount])=>sum+amount,0n);
  const colors = ['#27846b','#3a79c4','#cb8a37','#9369b0','#d16c61','#4aaba4','#6c8d36','#aa7291'];
  let offset = 0;
  const portions = categories.map(([name,amount], index) => {
    const portion = total === 0n ? 0 : Number(amount)*100/Number(total);
    const from = offset;
    offset += portion;
    return {name,amount, color:colors[index], from, portion};
  });
  const gradient = portions.map((part)=>`${part.color} ${part.from}% ${part.from+part.portion}%`).join(', ');
  return <article className="finance-chart-card">
    <h3>Despesas pagas por categoria</h3><p>Distribuição do mês selecionado · somente valores liquidados</p>
    {total === 0n ? <div className="finance-chart-empty">Nenhuma despesa paga neste período.</div> : <>
      <div className="finance-donut" role="img" aria-label={`Distribuição de despesas pagas: ${portions.map((part)=>part.name+' '+formatBRL(part.amount)).join(', ')}`} style={{background:`conic-gradient(${gradient})`}}><div><small>Total pago</small><strong>{formatBRL(total)}</strong></div></div>
      <div className="finance-category-legend">{portions.map((part)=> <div key={part.name}><i style={{background:part.color}}/><span>{part.name}</span><strong>{formatBRL(part.amount)}</strong></div>)}</div>
    </>}
  </article>;
}
