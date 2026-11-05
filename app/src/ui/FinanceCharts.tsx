import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, GripVertical, Maximize2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { calculateFinancialForecast, formatBRL, type LocalFinancialState } from '../domain';
import { DialogFrame } from './Forms';

export type ChartType = 'bar' | 'line' | 'area' | 'donut' | 'pie';
export type ChartSource = 'realized' | 'forecast';
export type ChartMeasure = 'income' | 'expense' | 'both' | 'net';
export type ChartDimension = 'month' | 'category' | 'account';
export type ChartSize = 'compact' | 'half' | 'wide';
export type ChartMonths = 1 | 3 | 6 | 12;

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  source: ChartSource;
  measure: ChartMeasure;
  dimension: ChartDimension;
  months: ChartMonths;
  /** Optional inclusive calendar-day interval. Old layouts keep their monthly preset. */
  dateStart?: string | undefined;
  dateEnd?: string | undefined;
  /** Individual chosen days; absent means preset or inclusive range. */
  selectedDates?: string[] | undefined;
  accountId: string;
  /** Selected accounts; empty means all. Absent means legacy accountId. */
  accountIds?: string[];
  categoryId: string;
  /** Selected categories; an empty array means all. Absent means legacy categoryId. */
  categoryIds?: string[];
  size: ChartSize;
  /** Optional free-size overrides. Older saved chart layouts remain compatible. */
  widthColumns?: number;
  heightPx?: number;
  /** Positions in the 60-column dotted board; omitted in old saved layouts. */
  gridX?: number;
  gridY?: number;
}
export interface ChartRow { label: string; income: bigint; expense: bigint }

const types: ChartType[] = ['bar', 'line', 'area', 'donut', 'pie'];
const sources: ChartSource[] = ['realized', 'forecast'];
const measures: ChartMeasure[] = ['income', 'expense', 'both', 'net'];
const dimensions: ChartDimension[] = ['month', 'category', 'account'];
const sizes: ChartSize[] = ['compact', 'half', 'wide'];
const periods: ChartMonths[] = [1, 3, 6, 12];
const palette = ['#16876b', '#477ed0', '#f1a64f', '#9d78cf', '#e27d79', '#36a9a2', '#91a84e', '#d17eab', '#728da0'];
const money = (value: bigint): number => Number(value) / 100;
const monthAt = (month: string, offset: number): string => {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
};
const monthLabel = (month: string): string => new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z')).replace('.', '');
const isOneOf = <T extends string | number>(value: unknown, options: readonly T[]): value is T => options.includes(value as T);
const validDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === value;
};
const lastDayOfMonth = (month:string) => {
  const year = Number(month.slice(0,4));
  const number = Number(month.slice(5,7));
  return new Date(Date.UTC(year,number,0)).toISOString().slice(0,10);
};
const calendarMonths = (start:string,end:string) => {
  const sy = Number(start.slice(0,4)), sm = Number(start.slice(5,7));
  const ey = Number(end.slice(0,4)), em = Number(end.slice(5,7));
  return (ey-sy)*12+em-sm+1;
};

export const defaultCharts = (): ChartConfig[] => [
  { id: 'default-realized', title: 'Entradas e saídas realizadas', type: 'bar', source: 'realized', measure: 'both', dimension: 'month', months: 6, accountId: '', categoryId: '', size: 'half' },
  { id: 'default-forecast', title: 'Compromissos e receitas previstos', type: 'area', source: 'forecast', measure: 'both', dimension: 'month', months: 6, accountId: '', categoryId: '', size: 'half' },
  { id: 'default-categories', title: 'Despesas pagas por categoria', type: 'donut', source: 'realized', measure: 'expense', dimension: 'category', months: 1, accountId: '', categoryId: '', size: 'wide' },
];

export function normalizeChartConfig(raw: unknown): ChartConfig | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== 'string' || value.id.length < 1 || value.id.length > 100) return null;
  if (!isOneOf(value.type, types) || !isOneOf(value.source, sources) || !isOneOf(value.measure, measures)
    || !isOneOf(value.dimension, dimensions) || !isOneOf(value.months, periods) || !isOneOf(value.size, sizes)) return null;
  const isCircular = value.type === 'donut' || value.type === 'pie';
  return {
    id: value.id,
    title: typeof value.title === 'string' && value.title.trim() ? value.title.trim().slice(0, 80) : 'Gráfico sem título',
    type: value.type,
    source: value.source,
    measure: isCircular && (value.measure === 'both' || value.measure === 'net') ? 'expense' : value.measure,
    dimension: value.dimension,
    months: value.months,
    ...(validDate(value.dateStart) && validDate(value.dateEnd) && value.dateStart <= value.dateEnd && calendarMonths(value.dateStart,value.dateEnd) <= 24 ? {dateStart:value.dateStart,dateEnd:value.dateEnd} : {}),
    ...(Array.isArray(value.selectedDates) ? {selectedDates:[...new Set(value.selectedDates.filter(validDate))].sort().slice(0,730)} : {}),
    accountId: typeof value.accountId === 'string' ? value.accountId.slice(0, 100) : '',
    ...(Array.isArray(value.accountIds) ? { accountIds: [...new Set(value.accountIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 100))].slice(0, 200) } : {}),
    categoryId: typeof value.categoryId === 'string' ? value.categoryId.slice(0, 100) : '',
    ...(Array.isArray(value.categoryIds) ? { categoryIds: [...new Set(value.categoryIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 100))].slice(0, 200) } : {}),
    size: value.size,
    ...(typeof value.widthColumns === 'number' && Number.isInteger(value.widthColumns) && value.widthColumns >= 3 && value.widthColumns <= 12 ? { widthColumns: value.widthColumns } : {}),
    ...(typeof value.heightPx === 'number' && Number.isInteger(value.heightPx) && value.heightPx >= 250 && value.heightPx <= 800 ? { heightPx: value.heightPx } : {}),
    ...(typeof value.gridX === 'number' && Number.isInteger(value.gridX) && value.gridX >= 0 && value.gridX < 60 ? { gridX: value.gridX } : {}),
    ...(typeof value.gridY === 'number' && Number.isInteger(value.gridY) && value.gridY >= 0 && value.gridY <= 2000 ? { gridY: value.gridY } : {}),
  };
}

export function readChartLayout(ownerId: string): ChartConfig[] {
  if (typeof localStorage === 'undefined') return defaultCharts();
  try {
    const saved = localStorage.getItem('atlas-financeiro:charts:v1:' + ownerId);
    if (!saved) return defaultCharts();
    const data: unknown = JSON.parse(saved);
    if (!data || typeof data !== 'object' || (data as {version?: unknown}).version !== 1 || !Array.isArray((data as {charts?: unknown}).charts)) return defaultCharts();
    const unique = new Set<string>();
    return (data as {charts: unknown[]}).charts.slice(0, 20).map(normalizeChartConfig).filter((chart): chart is ChartConfig => {
      if (!chart || unique.has(chart.id)) return false;
      unique.add(chart.id);
      return true;
    });
  } catch { return defaultCharts(); }
}


// A dotted, collision-aware dashboard. Five neighboring grid units are five dots.
const BOARD_COLUMNS = 60;
const BOARD_ROW = 19;
const columnsFor = (chart: ChartConfig, minCols: number): number =>
  Math.min(BOARD_COLUMNS, 5 * Math.max(minCols, chart.widthColumns ?? ({compact:4,half:6,wide:12} as const)[chart.size]));
const rowsFor = (chart: ChartConfig): number => Math.ceil((chart.heightPx ?? 380) / BOARD_ROW);
type BoardRect = { id:string; x:number; y:number; w:number; h:number };
const overlaps = (a:BoardRect,b:BoardRect):boolean =>
  a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
export function findFreeChartPosition(rects:readonly BoardRect[], id:string, desiredX:number, desiredY:number, width:number, height:number):{x:number;y:number}{
  const maxX=Math.max(0,BOARD_COLUMNS-width);
  const x=Math.max(0,Math.min(maxX,Math.round(desiredX)));
  const y=Math.max(0,Math.min(2000,Math.round(desiredY)));
  const occupied=rects.filter(rect=>rect.id!==id);
  const free=(nx:number,ny:number)=>!occupied.some(rect=>overlaps({id,x:nx,y:ny,w:width,h:height},rect));
  if(free(x,y))return {x,y};
  // Prefer nearby free dots, without ever allowing an overlapping drop.
  for(let radius=1;radius<=220;radius++){
    for(let dx=-Math.min(radius,maxX);dx<=Math.min(radius,maxX);dx++){
      const nx=x+dx;
      if(nx<0||nx>maxX)continue;
      const dy=radius-Math.abs(dx);
      if(dy<0)continue;
      if(y-dy>=0&&free(nx,y-dy))return {x:nx,y:y-dy};
      if(y+dy<=2000&&free(nx,y+dy))return {x:nx,y:y+dy};
    }
  }
  throw new Error('Não há espaço livre suficiente no painel.');
}

export function buildChartRows(state: LocalFinancialState, month: string, config: ChartConfig): ChartRow[] {
  const explicitDays = Array.isArray(config.selectedDates) && config.selectedDates.length > 0
    ? [...new Set(config.selectedDates.filter(validDate))].sort() : [];
  if (config.selectedDates !== undefined && explicitDays.length === 0) return [];
  const daySelection = explicitDays.length > 0;
  const chosenDays = new Set(explicitDays);
  const custom = !daySelection && validDate(config.dateStart) && validDate(config.dateEnd) && config.dateStart <= config.dateEnd && calendarMonths(config.dateStart,config.dateEnd) <= 24;
  const start = daySelection ? explicitDays[0]!.slice(0,7) : custom ? config.dateStart!.slice(0,7) : config.source === 'realized' ? monthAt(month, 1 - config.months) : month;
  const end = daySelection ? explicitDays[explicitDays.length-1]!.slice(0,7) : custom ? config.dateEnd!.slice(0,7) : config.source === 'realized' ? month : monthAt(month, config.months - 1);
  const monthSpan = custom || daySelection ? calendarMonths(start,end) : config.months;
  const eventById = new Map(state.events.map((event) => [event.id, event]));
  const accountNames = new Map(state.accounts.map((account) => [account.id, account.name]));
  const categoryNames = new Map(state.categories.map((category) => [category.id, category.name]));
  const selectedAccounts = config.accountIds === undefined ? (config.accountId ? new Set([config.accountId]) : null)
    : (config.accountIds.length ? new Set(config.accountIds) : null);
  const selectedCategories = config.categoryIds === undefined ? (config.categoryId ? new Set([config.categoryId]) : null)
    : (config.categoryIds.length ? new Set(config.categoryIds) : null);
  const totals = new Map<string, ChartRow>();
  if (config.dimension === 'month') {
    for (let index = 0; index < monthSpan; index += 1) {
      const key = monthAt(start, index);
      totals.set(key, { label: monthLabel(key), income: 0n, expense: 0n });
    }
  }
  const accumulate = (eventId: string, date: string | undefined, kind: 'income' | 'expense', amount: bigint) => {
    if (!date) return;
    const dateMonth = date.slice(0,7);
    if (daySelection && !chosenDays.has(date)) return;
    if (custom && (date.length !== 10 || date < config.dateStart! || date > config.dateEnd!)) return;
    if (dateMonth < start || dateMonth > end) return;
    const event = eventById.get(eventId);
    if (!event || (selectedAccounts && !selectedAccounts.has(event.accountId)) || (selectedCategories && !selectedCategories.has(event.categoryId ?? ''))) return;
    const key = config.dimension === 'month' ? dateMonth
      : config.dimension === 'category' ? (categoryNames.get(event.categoryId ?? '') ?? 'Sem categoria')
      : (accountNames.get(event.accountId) ?? 'Conta removida');
    const row = totals.get(key) ?? { label: key, income: 0n, expense: 0n };
    if (kind === 'income') row.income += amount;
    else row.expense += amount;
    totals.set(key, row);
  };
  if (config.source === 'realized') {
    // Exactly the same cash basis as calculateCashTotals: effective settlements, not planned events.
    for (const settlement of state.settlements) {
      const event = eventById.get(settlement.eventId);
      if (event?.kind !== 'income' && event?.kind !== 'expense') continue;
      accumulate(event.id, settlement.settlementDate, event.kind,
        settlement.amountCents * (event.reversesEventId === undefined ? 1n : -1n));
    }
  } else {
    // Forecast items explicitly exclude gross-only reference amounts and already realized cash.
    const forecast = calculateFinancialForecast(state, custom || daySelection ? start : month, monthSpan);
    for (const item of forecast.items) {
      if (item.amountBasis !== 'cash') continue;
      // A forecast with month only cannot be allocated honestly to a custom day range.
      accumulate(item.eventId, custom || daySelection ? item.date : item.month, item.kind, item.amountCents);
    }
  }
  const rows = [...totals.values()];
  if (config.dimension === 'month') return rows;
  const selected = (row: ChartRow): bigint => config.measure === 'income' ? row.income
    : config.measure === 'expense' ? row.expense
    : config.measure === 'net' ? row.income - row.expense : row.income + row.expense;
  const abs = (value: bigint): bigint => value < 0n ? -value : value;
  rows.sort((a, b) => {
    const av = abs(selected(a)), bv = abs(selected(b));
    return av === bv ? a.label.localeCompare(b.label, 'pt-BR') : av > bv ? -1 : 1;
  });
  const nonzero = rows.filter((row) => row.income !== 0n || row.expense !== 0n);
  if (nonzero.length <= 9) return nonzero;
  const rest = nonzero.slice(8).reduce((sum, row) => ({ label: 'Outros', income: sum.income + row.income, expense: sum.expense + row.expense }), { label: 'Outros', income: 0n, expense: 0n });
  return [...nonzero.slice(0, 8), rest];
}

const measureLabel: Record<ChartMeasure, string> = { income: 'Entradas', expense: 'Saídas', both: 'Entradas e saídas', net: 'Resultado líquido' };
const dimensionLabel: Record<ChartDimension, string> = { month: 'Mês', category: 'Categoria', account: 'Conta' };
const typeLabel: Record<ChartType, string> = { bar: 'Barras', line: 'Linhas', area: 'Área', donut: 'Rosca', pie: 'Pizza' };
const sizeLabel: Record<ChartSize, string> = { compact: 'Compacto', half: 'Médio', wide: 'Largo' };

function ChartVisual({ rows, config }: { rows: ChartRow[]; config: ChartConfig }) {
  const circular = config.type === 'donut' || config.type === 'pie';
  const series = config.measure === 'both'
    ? [{ key: 'income' as const, name: 'Entradas', color: 'var(--positive)' }, { key: 'expense' as const, name: 'Saídas', color: 'var(--negative)' }]
    : [{ key: config.measure, name: measureLabel[config.measure], color: config.measure === 'income' ? 'var(--positive)' : config.measure === 'expense' ? 'var(--negative)' : '#5487cc' }];
  const getValue = (row: ChartRow, key: 'income' | 'expense' | 'net') => key === 'net' ? row.income - row.expense : row[key];
  const data = rows.map((row) => ({ ...row, net: row.income - row.expense }));
  const anyData = data.some((row) => series.some((s) => getValue(row, s.key) !== 0n));
  if (!anyData) return <div className="finance-chart-empty">Ainda não há valores para este gráfico.</div>;
  if (circular) {
    const positive = data.map((row) => ({ label: row.label, value: getValue(row, config.measure === 'income' ? 'income' : 'expense') })).filter((row) => row.value > 0n);
    const total = positive.reduce((sum, row) => sum + row.value, 0n);
    if (total <= 0n) return <div className="finance-chart-empty">Nenhum valor positivo disponível para a distribuição.</div>;
    let offset = 0;
    const parts = positive.map((row, index) => {
      const portion = Number(row.value * 10000n / total) / 100;
      const from = offset;
      offset += portion;
      return { ...row, color: palette[index % palette.length]!, from, to: offset };
    });
    const gradient = 'conic-gradient(' + parts.map((part) => part.color + ' ' + part.from + '% ' + part.to + '%').join(', ') + ')';
    return <div className="chart-pie-layout">
      <div className={'finance-donut' + (config.type === 'pie' ? ' chart-pie-solid' : '')} style={{ background: gradient }} role="img" aria-label={parts.map((part) => part.label + ': ' + formatBRL(part.value)).join('; ')}>
        {config.type === 'donut' ? <div><small>Total</small><strong>{formatBRL(total)}</strong></div> : null}
      </div>
      <div className="finance-category-legend">{parts.map((part) => <div key={part.label}><i style={{ background: part.color }} /><span>{part.label}</span><strong>{formatBRL(part.value)}</strong></div>)}</div>
    </div>;
  }
  const values = data.flatMap((row) => series.map((s) => money(getValue(row, s.key))));
  const max = Math.max(1, ...values, 0);
  const min = Math.min(0, ...values);
  const upper = max === min ? max + 1 : max * 1.12;
  const lower = min < 0 ? min * 1.12 : 0;
  const y = (value: number) => 210 - (value - lower) / (upper - lower) * 178;
  const zero = y(0);
  const step = 444 / Math.max(data.length, 1);
  const x = (index: number) => 54 + step * (index + 0.5);
  const path = (key: 'income' | 'expense' | 'net') => data.map((row, index) => (index === 0 ? 'M ' : ' L ') + x(index).toFixed(2) + ' ' + y(money(getValue(row, key))).toFixed(2)).join('');
  return <>
    <svg viewBox="0 0 530 258" role="img" aria-label={config.title} className="finance-chart-svg" preserveAspectRatio="xMidYMid meet">
      {[0, 1, 2, 3, 4].map((tick) => {
        const value = lower + (upper - lower) * (4 - tick) / 4;
        return <g key={tick}><line x1="52" x2="508" y1={y(value)} y2={y(value)} stroke="currentColor" opacity=".12" /><text x="45" y={y(value) + 4} fontSize="10" textAnchor="end" fill="currentColor" opacity=".75">{new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}</text></g>;
      })}
      {min < 0 ? <line x1="52" x2="508" y1={zero} y2={zero} stroke="currentColor" opacity=".45" strokeDasharray="4 3" /> : null}
      {series.map((s, seriesIndex) => config.type === 'bar' ? <g key={s.key}>{data.map((row, index) => {
        const value = money(getValue(row, s.key));
        const width = Math.min(34, step / (series.length + 0.6));
        const barX = x(index) - (series.length * width) / 2 + seriesIndex * width;
        return <rect key={index} x={barX} y={Math.min(y(value), zero)} width={Math.max(2, width - 3)} height={Math.max(0.5, Math.abs(y(value) - zero))} rx="3" fill={s.color}><title>{row.label}: {formatBRL(getValue(row, s.key))}</title></rect>;
      })}</g> : <g key={s.key}>
        {config.type === 'area' ? <path d={path(s.key) + ' L ' + x(data.length - 1) + ' ' + zero + ' L ' + x(0) + ' ' + zero + ' Z'} fill={s.color} opacity=".14" /> : null}
        <path d={path(s.key)} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((row, index) => <circle key={index} cx={x(index)} cy={y(money(getValue(row, s.key)))} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="1.5"><title>{row.label}: {formatBRL(getValue(row, s.key))}</title></circle>)}
      </g>)}
      {data.map((row, index) => <text key={index} x={x(index)} y="240" fontSize={data.length > 8 ? '9' : '12'} textAnchor="middle" fill="currentColor">{row.label.length > (data.length > 8 ? 6 : 11) ? row.label.slice(0, data.length > 8 ? 5 : 10) + '…' : row.label}</text>)}
    </svg>
    <div className="finance-chart-legend">{series.map((s) => <span key={s.key}><i className="finance-dot" style={{ background: s.color }} />{s.name}</span>)}</div>
  </>;
}

function ChartDetails({ rows, config }: { rows: ChartRow[]; config: ChartConfig }) {
  return <details className="chart-data-details"><summary>Ver valores detalhados</summary>
    <div className="chart-data-scroll"><table><thead><tr><th scope="col">{dimensionLabel[config.dimension]}</th>{config.measure === 'both' ? <><th scope="col">Entradas</th><th scope="col">Saídas</th></> : <th scope="col">{measureLabel[config.measure]}</th>}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{config.measure === 'both' ? <><td>{formatBRL(row.income)}</td><td>{formatBRL(row.expense)}</td></> : <td>{formatBRL(config.measure === 'net' ? row.income - row.expense : row[config.measure])}</td>}</tr>)}</tbody>
    </table></div>
  </details>;
}

type FilterOption = { id: string; name: string };
function ChartMultiFilter({ title, allLabel, options, selected, onChange }: {
  title: string; allLabel: string; options: FilterOption[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = options.filter((option) => option.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')));
  const selectedSet = new Set(selected);
  const toggle = (id: string) => onChange(selectedSet.has(id) ? selected.filter((entry) => entry !== id) : [...selected, id]);
  return <div className="chart-field chart-filter-compact">
    <span>{title}</span>
    <details className="chart-filter-details">
      <summary aria-label={title + ': escolher'}>{selected.length === 0 ? allLabel : selected.length + (selected.length === 1 ? ' selecionada' : ' selecionadas')}</summary>
      <div className="chart-filter-dropdown">
        <div className="chart-filter-toolbar">
          <span className="chart-category-caption">Escolha uma ou várias opções</span>
          {selected.length ? <button type="button" className="chart-filter-reset" onClick={() => onChange([])}>Limpar filtro</button> : null}
        </div>
        {options.length > 6 ? <input type="search" className="chart-filter-search" aria-label={'Pesquisar ' + title.toLocaleLowerCase('pt-BR')} placeholder="Pesquisar opções…" value={search} onChange={(event) => setSearch(event.target.value)} /> : null}
        <div className="chart-category-list" role="group" aria-label={title}>
          <label className="chart-category-choice chart-category-choice--all"><input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} />{allLabel}</label>
          {filtered.map((option) => <label key={option.id} className="chart-category-choice"><input type="checkbox" checked={selectedSet.has(option.id)} onChange={() => toggle(option.id)} />{option.name}</label>)}
          {filtered.length === 0 ? <p className="chart-filter-empty">Nenhuma opção encontrada.</p> : null}
        </div>
      </div>
    </details>
  </div>;
}

type CalendarSelectionMode = 'range' | 'days';
function ChartCalendar({mode, start, end, days, focusMonth, onRange, onDays, onClear}:{
  mode:CalendarSelectionMode; start:string; end:string; days:string[]; focusMonth:string;
  onRange:(start:string,end:string)=>void; onDays:(days:string[])=>void; onClear:()=>void;
}){
  const [shownMonth,setShownMonth] = useState(focusMonth);
  const anchor = useRef<string|null>(null);
  const pointerOrigin = useRef<string|null>(null);
  const dragged = useRef(false);
  const selected = new Set(days);
  const now = new Date();
  const todayMonth = String(now.getFullYear()).padStart(4,'0')+'-'+String(now.getMonth()+1).padStart(2,'0');
  const selectionDescription = mode==='range'
    ? start&&end ? 'De '+start.split('-').reverse().join('/')+' até '+end.split('-').reverse().join('/') : 'Selecione o primeiro dia'
    : days.length+' '+(days.length===1?'dia selecionado':'dias selecionados');
  const renderMonth=(month:string)=>{
    const first = new Date(month+'-01T12:00:00Z').getUTCDay();
    const offset = (first+6)%7;
    const total=Number(lastDayOfMonth(month).slice(8));
    return <div className="chart-calendar-month" key={month}>
      <strong>{new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'))}</strong>
      <div className="chart-calendar-days">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((label,i)=><span key={'weekday-'+i} className="chart-calendar-weekday">{label}</span>)}
        {Array.from({length:offset},(_,i)=><span key={'padding-'+i} aria-hidden="true" />)}
        {Array.from({length:total},(_,i)=>{
          const date=month+'-'+String(i+1).padStart(2,'0');
          const marked=mode==='days'?selected.has(date):Boolean(start && end && date>=start && date<=end);
          return <button type="button" key={date} data-chart-date={date}
            aria-label={date} aria-pressed={marked} className={'chart-calendar-day'+(marked?' is-selected':'')+(mode==='range' && (date===start||date===end)?' is-endpoint':'')}
            onPointerDown={mode==='range' ? (event)=>{
              if(event.button!==0)return;
              event.preventDefault();
              if(anchor.current){const a=anchor.current;onRange(a<date?a:date,a<date?date:a);anchor.current=null;pointerOrigin.current=null;return;}
              anchor.current=date;pointerOrigin.current=date;dragged.current=false;onRange(date,date);
              try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Browser may decline capture; click selection remains available. */ }
            }:undefined}
            onPointerEnter={mode==='range' ? (event)=>{
              if(!pointerOrigin.current || (event.buttons&1)===0)return;
              const a=pointerOrigin.current;
              if(date!==a)dragged.current=true;
              onRange(a<date?a:date,a<date?date:a);
            }:undefined}
            onClick={(event)=>{
              if(mode==='days'){onDays(selected.has(date)?days.filter(d=>d!==date):[...days,date].sort());return;}
              if(event.detail!==0)return;
              if(anchor.current){const a=anchor.current;onRange(a<date?a:date,a<date?date:a);anchor.current=null;}
              else {anchor.current=date;onRange(date,date);}
            }}
          >{i+1}</button>;
        })}
      </div>
    </div>;
  };
  const dayAtPointer=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const target=event.currentTarget.ownerDocument.elementFromPoint(event.clientX,event.clientY);
    return target instanceof Element ? target.closest<HTMLButtonElement>('[data-chart-date]')?.dataset.chartDate : undefined;
  };
  return <div className="chart-calendar" onPointerMove={(event)=>{
    if(mode!=='range'||!pointerOrigin.current)return;
    if((event.buttons&1)===0 && event.pointerType==='mouse')return;
    const date=dayAtPointer(event);
    if(!date)return;
    const a=pointerOrigin.current;
    if(date!==a)dragged.current=true;
    onRange(a<date?a:date,a<date?date:a);
  }} onPointerUp={(event)=>{
    if(mode!=='range'||!pointerOrigin.current)return;
    const date=dayAtPointer(event);
    if(date){const a=pointerOrigin.current;onRange(a<date?a:date,a<date?date:a);}
    if(dragged.current)anchor.current=null;
    pointerOrigin.current=null;dragged.current=false;
  }} onPointerCancel={()=>{pointerOrigin.current=null;dragged.current=false;}}>
    <div className="chart-calendar-toolbar">
      <div className="chart-calendar-toolbar-title"><strong>{mode==='range'?'Escolha um intervalo':'Escolha dias específicos'}</strong><span>{mode==='range'?'Arraste entre duas datas ou clique no início e no fim.':'Clique nos dias para marcar ou desmarcar.'}</span></div>
      <div className="chart-calendar-nav">
        <button type="button" className="chart-calendar-today" onClick={()=>setShownMonth(todayMonth)}>Hoje</button>
        <button type="button" aria-label="Meses anteriores" onClick={()=>setShownMonth(m=>monthAt(m,-1))}>‹</button>
        <button type="button" aria-label="Próximos meses" onClick={()=>setShownMonth(m=>monthAt(m,1))}>›</button>
      </div>
    </div>
    <div className="chart-calendar-months">{renderMonth(shownMonth)}{renderMonth(monthAt(shownMonth,1))}</div>
    <div className="chart-calendar-footer" aria-live="polite"><span>{selectionDescription}</span><button type="button" onClick={()=>{anchor.current=null;pointerOrigin.current=null;onClear();}}>Limpar seleção</button></div>
  </div>;
}

function ChartEditor({ initial, state, month, onSave, onCancel }: { initial: ChartConfig; state: LocalFinancialState; month: string; onSave: (chart: ChartConfig) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const preview = useMemo(() => buildChartRows(state, month, draft), [state, month, draft]);
  const set = <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const circular = draft.type === 'donut' || draft.type === 'pie';
  const dayPeriod = draft.selectedDates !== undefined;
  const customPeriod = dayPeriod || draft.dateStart !== undefined || draft.dateEnd !== undefined;
  const periodValid = dayPeriod
    ? Boolean(draft.selectedDates?.length && draft.selectedDates.length<=730 && draft.selectedDates.every(validDate)
      && calendarMonths(draft.selectedDates[0]!,draft.selectedDates[draft.selectedDates.length-1]!)<=24)
    : !customPeriod || (validDate(draft.dateStart) && validDate(draft.dateEnd) && draft.dateStart<=draft.dateEnd && calendarMonths(draft.dateStart,draft.dateEnd)<=24);
  const changePeriod = (value:string) => setDraft(previous => value === 'custom'
    ? {...previous,selectedDates:undefined,dateStart: previous.dateStart ?? (previous.source === 'realized' ? monthAt(month,1-previous.months) + '-01' : month + '-01'),
      dateEnd: previous.dateEnd ?? lastDayOfMonth(previous.source === 'realized' ? month : monthAt(month,previous.months-1))}
    : value === 'days' ? {...previous,selectedDates:[],dateStart:undefined,dateEnd:undefined}
    : {...previous,months:Number(value) as ChartMonths,selectedDates:undefined,dateStart:undefined,dateEnd:undefined});
  const selectedAccountIds = draft.accountIds ?? (draft.accountId ? [draft.accountId] : []);
  const selectedCategoryIds = draft.categoryIds ?? (draft.categoryId ? [draft.categoryId] : []);
  const selectAccounts = (ids: string[]) => setDraft((previous) => ({ ...previous, accountId: '', accountIds: ids }));
  const selectCategories = (ids: string[]) => setDraft((previous) => ({ ...previous, categoryId: '', categoryIds: ids }));
  return <DialogFrame title={initial.title ? 'Editar gráfico' : 'Novo gráfico'} onClose={onCancel} wide>
    <form className="chart-editor" onSubmit={(event) => { event.preventDefault(); if (!periodValid) return; onSave({ ...draft, title: draft.title.trim() || 'Meu gráfico' }); }}>
      <div className="chart-editor-fields">
        <label className="chart-field chart-field--full">Título do gráfico<input maxLength={80} value={draft.title} onChange={(event) => set('title', event.target.value)} placeholder="Ex.: Minhas despesas" /></label>
        <label className="chart-field">Visualização<select value={draft.type} onChange={(event) => {
          const type = event.target.value as ChartType;
          setDraft((previous) => ({ ...previous, type, measure: (type === 'pie' || type === 'donut') && (previous.measure === 'both' || previous.measure === 'net') ? 'expense' : previous.measure }));
        }}>{types.map((type) => <option key={type} value={type}>{typeLabel[type]}</option>)}</select></label>
        <label className="chart-field">Origem dos dados<select value={draft.source} onChange={(event) => set('source', event.target.value as ChartSource)}><option value="realized">Realizado · valores pagos/recebidos</option><option value="forecast">Previsto · compromissos futuros</option></select></label>
        <label className="chart-field">Valores<select value={draft.measure} onChange={(event) => set('measure', event.target.value as ChartMeasure)}>{measures.filter((measure) => !circular || (measure !== 'both' && measure !== 'net')).map((measure) => <option key={measure} value={measure}>{measureLabel[measure]}</option>)}</select></label>
        <label className="chart-field">Agrupar por<select value={draft.dimension} onChange={(event) => set('dimension', event.target.value as ChartDimension)}>{dimensions.map((dimension) => <option key={dimension} value={dimension}>{dimensionLabel[dimension]}</option>)}</select></label>
        <label className="chart-field">Período<select value={dayPeriod ? 'days' : customPeriod ? 'custom' : String(draft.months)} onChange={(event) => changePeriod(event.target.value)}>{periods.map((period) => <option key={period} value={period}>{period === 1 ? '1 mês' : period + ' meses'}</option>)}<option value="custom">Calendário · intervalo</option><option value="days">Calendário · dias específicos</option></select></label>
        <label className="chart-field">Tamanho<select value={draft.size} onChange={(event) => set('size', event.target.value as ChartSize)}>{sizes.map((size) => <option key={size} value={size}>{sizeLabel[size]}</option>)}</select></label>
        {customPeriod ? <div className="chart-custom-period chart-field--full">
          <ChartCalendar key={dayPeriod?'days':'range'} mode={dayPeriod?'days':'range'} start={draft.dateStart ?? ''} end={draft.dateEnd ?? ''}
            days={draft.selectedDates ?? []} focusMonth={dayPeriod ? (draft.selectedDates?.[0]?.slice(0,7)??month) : (draft.dateStart?.slice(0,7)??month)}
            onRange={(dateStart,dateEnd)=>setDraft(previous=>({...previous,dateStart,dateEnd}))}
            onDays={(selectedDates)=>setDraft(previous=>({...previous,selectedDates}))}
            onClear={()=>setDraft(previous=>dayPeriod?{...previous,selectedDates:[]}:{...previous,dateStart:'',dateEnd:''})} />
          {!periodValid ? <p className="chart-period-error" role="alert">Selecione datas válidas em um intervalo de até 24 meses (máximo de 730 dias).</p> :
            <p className="chart-category-caption">{draft.source==='forecast'?'Previsões sem dia definido não entram no recorte diário.':'O filtro usa as datas efetivas de pagamento e recebimento.'}</p>}
        </div> : null}
        <div className="chart-editor-section-heading chart-field--full"><strong>Filtros dos dados</strong><span>Escolha várias contas ou categorias nas listas abaixo.</span></div>
        <ChartMultiFilter title="Filtrar por conta" allLabel="Todas as contas" options={state.accounts} selected={selectedAccountIds} onChange={selectAccounts} />
        <ChartMultiFilter title="Filtrar por categoria" allLabel="Todas as categorias" options={state.categories} selected={selectedCategoryIds} onChange={selectCategories} />
      </div>
      <p className="chart-editor-hint">{draft.source === 'realized' ? 'Somente liquidações efetivas; transferências e ajustes não entram nas receitas ou despesas.' : 'Previsões não são dinheiro realizado. Valores brutos sem líquido informado ficam de fora.'} {circular ? 'Pizza e rosca exibem apenas valores positivos.' : ''}</p>
      <div className="chart-editor-preview"><strong>Prévia</strong><ChartVisual rows={preview} config={draft} /></div>
      <div className="chart-editor-actions"><button type="button" className="button button--secondary" onClick={onCancel}>Cancelar</button><button type="submit" className="button button--primary" disabled={!periodValid}>Salvar gráfico</button></div>
    </form>
  </DialogFrame>;
}

export function FinanceCharts({ state, month, ownerId = 'local' }: { state: LocalFinancialState; month: string; ownerId?: string }) {
  const storageKey = 'atlas-financeiro:charts:v1:' + ownerId;
  const [charts, setCharts] = useState<ChartConfig[]>(() => readChartLayout(ownerId));
  const [editing, setEditing] = useState<ChartConfig | null>(null);
  const [organizing, setOrganizing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [sizeMenu, setSizeMenu] = useState<string | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startY: number; columns: number; height: number; columnWidth: number; desktop: boolean } | null>(null);
  const moveRef = useRef<{ id:string; startX:number; startY:number; x:number; y:number; targetX:number; targetY:number } | null>(null);
  const [dragPreview,setDragPreview] = useState<{id:string;x:number;y:number}|null>(null);
  const [desktop,setDesktop] = useState(()=>typeof window!=='undefined'&&window.innerWidth>780);
  // A narrow dashboard must not put editable controls and legends into 200px cards.
  // Width overrides remain stored unchanged; the visible width is clamped to fit.
  const minimumColumns = gridWidth > 0 ? Math.min(12, Math.max(3, Math.ceil(12 * (330 + 16) / (gridWidth + 16)))) : 6;
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const update = () => { setGridWidth(grid.getBoundingClientRect().width); setDesktop(window.innerWidth>780); };
    window.addEventListener('resize',update);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    return () => { observer.disconnect(); window.removeEventListener('resize',update); };
  }, [charts.length === 0]);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, charts })); setStorageError(false); }
    catch { setStorageError(true); }
  }, [storageKey, charts]);
  const freeBoard=desktop&&gridWidth>0&&charts.length>0&&charts.every(chart=>chart.gridX!==undefined&&chart.gridY!==undefined);
  const rectangles=(list:readonly ChartConfig[]):BoardRect[]=>list.filter(chart=>chart.gridX!==undefined&&chart.gridY!==undefined).map(chart=>({
    id:chart.id,x:Math.min(60-columnsFor(chart,minimumColumns),chart.gridX!),y:chart.gridY!,
    w:columnsFor(chart,minimumColumns),h:rowsFor(chart),
  }));
  const startOrganizing=()=>{
    if(organizing){setOrganizing(false);setDragPreview(null);setDragId(null);setSizeMenu(null);return;}
    if(!freeBoard&&desktop&&gridRef.current){
      const board=gridRef.current;
      const root=board.getBoundingClientRect();
      const unit=root.width/BOARD_COLUMNS;
      const measured:BoardRect[]=[];
      const next=charts.map(chart=>{
        const card=[...board.querySelectorAll<HTMLElement>('.chart-studio-card')].find(element=>element.dataset.chartId===chart.id);
        if(!card)return chart;
        const rect=card.getBoundingClientRect();
        const width=columnsFor(chart,minimumColumns);
        const heightPx=Math.min(800,Math.max(250,Math.ceil(rect.height/BOARD_ROW)*BOARD_ROW));
        const height=Math.ceil(heightPx/BOARD_ROW);
        const spot=findFreeChartPosition(measured,chart.id,Math.round((rect.left-root.left)/unit),Math.round((rect.top-root.top)/BOARD_ROW),width,height);
        measured.push({id:chart.id,x:spot.x,y:spot.y,w:width,h:height});
        return {...chart,gridX:spot.x,gridY:spot.y,heightPx};
      });
      setCharts(next);
    }
    setOrganizing(true);
  };
  const moveStart=(event:ReactPointerEvent<HTMLElement>,chart:ChartConfig)=>{
    if(!organizing||!freeBoard||event.button!==0)return;
    moveRef.current={id:chart.id,startX:event.clientX,startY:event.clientY,x:chart.gridX??0,y:chart.gridY??0,targetX:chart.gridX??0,targetY:chart.gridY??0};
    setDragId(chart.id);setDragPreview({id:chart.id,x:chart.gridX??0,y:chart.gridY??0});
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{/* A synthetic or unsupported pointer still offers keyboard controls. */}
    event.preventDefault();
  };
  const movePointer=(event:ReactPointerEvent<HTMLElement>)=>{
    const origin=moveRef.current;
    if(!origin||!freeBoard)return;
    const chart=charts.find(item=>item.id===origin.id);
    if(!chart)return;
    const desiredX=origin.x+Math.round((event.clientX-origin.startX)/(gridWidth/BOARD_COLUMNS));
    const desiredY=origin.y+Math.round((event.clientY-origin.startY)/BOARD_ROW);
    const spot=findFreeChartPosition(rectangles(charts),origin.id,desiredX,desiredY,columnsFor(chart,minimumColumns),rowsFor(chart));
    moveRef.current={...origin,targetX:spot.x,targetY:spot.y};
    setDragPreview({id:origin.id,...spot});
  };
  const moveEnd=()=>{
    const origin=moveRef.current;
    if(origin)
      setCharts(current=>current.map(chart=>chart.id===origin.id?{...chart,gridX:origin.targetX,gridY:origin.targetY}:chart));
    moveRef.current=null;setDragPreview(null);setDragId(null);
  };
  const shiftChart=(id:string,dx:number,dy:number)=>{
    setCharts(current=>{
      const chart=current.find(c=>c.id===id);
      if(!chart||chart.gridX===undefined||chart.gridY===undefined)return current;
      const spot=findFreeChartPosition(rectangles(current),id,chart.gridX+dx,chart.gridY+dy,columnsFor(chart,minimumColumns),rowsFor(chart));
      return current.map(c=>c.id===id?{...c,gridX:spot.x,gridY:spot.y}:c);
    });
  };
  const positionByKeyboard=(event:ReactKeyboardEvent<HTMLButtonElement>,id:string)=>{
    if(!freeBoard)return;
    const direction:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    const offset=direction[event.key];
    if(!offset)return;
    event.preventDefault();
    shiftChart(id,offset[0]*(event.shiftKey?5:1),offset[1]*(event.shiftKey?5:1));
  };
  const resizeWithPosition=(id:string,widthColumns:number,heightPx:number)=>{
    setCharts(current=>{
      const chart=current.find(c=>c.id===id);
      if(!chart)return current;
      const resized={...chart,widthColumns,heightPx,size:widthColumns===4?'compact' as const:widthColumns===6?'half' as const:widthColumns===12?'wide' as const:chart.size};
      if(!freeBoard||chart.gridX===undefined||chart.gridY===undefined)return current.map(c=>c.id===id?resized:c);
      const spot=findFreeChartPosition(rectangles(current),id,chart.gridX,chart.gridY,columnsFor(resized,minimumColumns),rowsFor(resized));
      return current.map(c=>c.id===id?{...resized,gridX:spot.x,gridY:spot.y}:c);
    });
  };
  const move = (id: string, to: number) => setCharts((current) => {
    const from = current.findIndex((chart) => chart.id === id);
    if (from < 0 || to < 0 || to >= current.length || from === to) return current;
    const next = [...current];
    next.splice(to, 0, next.splice(from, 1)[0]!);
    return next;
  });
  const resizeChart = resizeWithPosition;
  const resizeStart = (event: ReactPointerEvent<HTMLButtonElement>, chart: ChartConfig) => {
    if (!organizing || event.button !== 0) return;
    const grid = event.currentTarget.closest('.chart-studio-grid');
    const card = event.currentTarget.closest('.chart-studio-card');
    if (!(grid instanceof HTMLElement) || !(card instanceof HTMLElement)) return;
    const desktop = window.innerWidth > 760;
    const gap = freeBoard?0:(Number.parseFloat(getComputedStyle(grid).columnGap) || 16);
    const columnWidth = (grid.clientWidth + gap) / 12;
    setResizingId(chart.id);
    resizeRef.current = {
      id: chart.id, startX: event.clientX, startY: event.clientY,
      columns: Math.max(minimumColumns, chart.widthColumns ?? ({ compact: 4, half: 6, wide: 12 } as const)[chart.size]),
      height: chart.heightPx ?? Math.max(250, Math.round(card.getBoundingClientRect().height)),
      columnWidth, desktop,
    };
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{/* A synthetic or unsupported pointer still offers keyboard controls. */}
    event.preventDefault();
  };
  const resizeMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = resizeRef.current;
    if (!origin) return;
    const widthColumns = origin.desktop ? Math.max(minimumColumns, Math.min(12, Math.round(origin.columns + (event.clientX - origin.startX) / origin.columnWidth))) : origin.columns;
    const heightPx = Math.max(250, Math.min(800, Math.round((origin.height + event.clientY - origin.startY) / BOARD_ROW) * BOARD_ROW));
    resizeChart(origin.id, widthColumns, heightPx);
  };
  const resizeEnd = () => { resizeRef.current = null; setResizingId(null); };
  const save = (chart: ChartConfig) => {
    setCharts((current) => {
      if(current.some(item=>item.id===chart.id))return current.map(item=>item.id===chart.id?chart:item);
      if(!freeBoard)return [...current,chart];
      const maxBottom=Math.max(0,...rectangles(current).map(rect=>rect.y+rect.h));
      const width=columnsFor(chart,minimumColumns);
      const spot=findFreeChartPosition(rectangles(current),chart.id,0,maxBottom+5,width,rowsFor(chart));
      return [...current,{...chart,gridX:spot.x,gridY:spot.y,heightPx:chart.heightPx??380}];
    });
    setEditing(null);
  };
  const create = () => {
    if (charts.length >= 20) return;
    setEditing({ id: crypto.randomUUID(), title: '', type: 'bar', source: 'realized', measure: 'both', dimension: 'month', months: 6, accountId: '', categoryId: '', size: 'half' });
  };
  return <section className="finance-charts" aria-label="Gráficos financeiros">
    <div className="chart-studio-heading">
      <div><p className="section-kicker">Análise visual · seu painel</p><h2>Gráficos financeiros</h2><p>Escolha os dados, personalize os gráficos e organize o espaço do seu jeito.</p></div>
      <div className="chart-studio-actions"><button type="button" className={'button button--secondary' + (organizing ? ' chart-organize-active' : '')} onClick={startOrganizing} aria-pressed={organizing}><GripVertical size={17} />{organizing ? 'Concluir' : 'Organizar'}</button><button type="button" className="button button--primary" onClick={create} disabled={charts.length >= 20}><Plus size={17} />Novo gráfico</button></div>
    </div>
    {organizing ? <p className="chart-organize-help" role="status">Arraste pelo título ou pela alça para posicionar livremente. Cada bolinha representa uma unidade: você pode deixar cinco ou mais bolinhas entre os gráficos. Posições são salvas ao soltar. As setas movem cinco bolinhas.{dragPreview ? ` Posição atual: coluna ${dragPreview.x + 1}, linha ${dragPreview.y + 1}.` : ''}</p> : null}
    {storageError ? <p className="chart-storage-warning" role="alert">Não foi possível salvar o layout neste navegador. Verifique o armazenamento disponível.</p> : null}
    {charts.length === 0 ? <div className="chart-empty-board"><BarChart3 size={34} /><h3>Seu painel está pronto para começar</h3><p>Crie seu primeiro gráfico para visualizar os dados que importam.</p><button className="button button--primary" onClick={create}><Plus size={17} />Criar gráfico</button><button className="text-button" onClick={() => setCharts(defaultCharts())}>Restaurar gráficos sugeridos</button></div> : <div ref={gridRef} className={'finance-chart-grid chart-studio-grid' + (freeBoard ? ' chart-studio-grid--free' : '') + (organizing && freeBoard ? ' chart-studio-grid--lattice' : '') + (dragId || resizingId ? ' chart-studio-grid--guides' : '')} aria-label="Área de organização dos gráficos" onDragOver={organizing ? (event) => event.preventDefault() : undefined} onDrop={organizing ? (event) => { event.preventDefault(); if (dragId) move(dragId, charts.length - 1); setDragId(null); } : undefined}>
      {charts.map((chart, index) => {
        const rows = buildChartRows(state, month, chart);
        const requestedColumns = chart.widthColumns ?? ({compact:4,half:6,wide:12} as const)[chart.size];
        const visibleColumns = Math.max(minimumColumns, requestedColumns);
        const placed=freeBoard&&chart.gridX!==undefined&&chart.gridY!==undefined;
        const x=dragPreview?.id===chart.id?dragPreview.x:chart.gridX??0;
        const y=dragPreview?.id===chart.id?dragPreview.y:chart.gridY??0;
        return <article key={chart.id} data-chart-id={chart.id} style={placed?{gridColumn:`${Math.min(BOARD_COLUMNS-columnsFor(chart,minimumColumns),x)+1} / span ${columnsFor(chart,minimumColumns)}`,gridRow:`${y+1} / span ${rowsFor(chart)}`,minHeight:chart.heightPx??380}:{gridColumn:`span ${visibleColumns}`,...(chart.heightPx?{minHeight:chart.heightPx}:{})}} className={'finance-chart-card chart-studio-card chart-studio-card--' + chart.size + (dragId === chart.id ? ' chart-studio-card--dragging' : '')} onDragOver={!freeBoard&&organizing ? (event) => event.preventDefault() : undefined} onDrop={!freeBoard&&organizing ? (event) => { event.preventDefault(); event.stopPropagation(); if (dragId) move(dragId, index); setDragId(null); } : undefined}>
          <div className={"chart-card-heading" + (organizing && freeBoard ? " chart-card-heading--movable" : "")} onPointerDown={organizing && freeBoard ? (event) => { if ((event.target as HTMLElement).closest("button")) return; moveStart(event, chart); } : undefined} onPointerMove={organizing && freeBoard ? movePointer : undefined} onPointerUp={organizing && freeBoard ? moveEnd : undefined} onPointerCancel={organizing && freeBoard ? moveEnd : undefined}><div className="chart-card-title"><h3>{chart.title}</h3><p>{chart.source === 'realized' ? 'Realizado' : 'Previsto'} · {chart.months === 1 ? '1 mês' : chart.months + ' meses'} · por {dimensionLabel[chart.dimension].toLocaleLowerCase('pt-BR')}</p></div><div className="chart-card-actions">
            {organizing ? <><button type="button" className="chart-drag-handle" draggable={!freeBoard} onPointerDown={(event)=>moveStart(event,chart)} onKeyDown={(event)=>positionByKeyboard(event,chart.id)} onDragStart={!freeBoard?(event)=>{setDragId(chart.id);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',chart.id);}:undefined} onDragEnd={!freeBoard?()=>setDragId(null):undefined} title="Arrastar gráfico para qualquer posição livre" aria-label={'Posicionar '+chart.title}><GripVertical size={18}/></button><button type="button" onClick={()=>freeBoard?shiftChart(chart.id,-5,0):move(chart.id,index-1)} disabled={!freeBoard&&index===0} title="Mover cinco bolinhas para esquerda" aria-label={'Mover '+chart.title+' para antes'}><ArrowLeft size={17}/><ArrowUp className="chart-move-mobile" size={17}/></button><button type="button" onClick={()=>freeBoard?shiftChart(chart.id,5,0):move(chart.id,index+1)} disabled={!freeBoard&&index===charts.length-1} title="Mover cinco bolinhas para direita" aria-label={'Mover '+chart.title+' para depois'}><ArrowRight size={17}/><ArrowDown className="chart-move-mobile" size={17}/></button></> : null}
            {organizing ? <><button type="button" className="chart-size-toggle" onClick={() => setSizeMenu(sizeMenu === chart.id ? null : chart.id)} aria-label={'Tamanho de ' + chart.title} aria-expanded={sizeMenu === chart.id} title="Alterar tamanho"><Maximize2 size={16} /><span>Tamanho</span></button>
            <button type="button" onClick={() => setEditing(chart)} aria-label={'Editar ' + chart.title} title="Editar gráfico"><Pencil size={17} /></button>
            <button type="button" onClick={() => { if (window.confirm('Excluir o gráfico "' + chart.title + '"? Os lançamentos financeiros não serão afetados.')) setCharts((current) => current.filter((item) => item.id !== chart.id)); }} aria-label={'Excluir ' + chart.title} title="Excluir gráfico"><Trash2 size={17} /></button></> : null}
          </div></div>
          {organizing && sizeMenu === chart.id ? <div className="chart-size-panel" aria-label={'Ajustar tamanho de ' + chart.title}>
            <div><strong>Largura</strong><div className="chart-size-options">{([['compact', 'P'], ['half', 'M'], ['wide', 'G']] as const).map(([size, label]) => <button key={size} type="button" className={(chart.widthColumns ?? ({compact:4,half:6,wide:12} as const)[chart.size]) === ({compact:4,half:6,wide:12} as const)[size] ? 'is-selected' : ''} onClick={() => resizeWithPosition(chart.id,({compact:4,half:6,wide:12} as const)[size],chart.heightPx??380)} aria-label={'Largura ' + sizeLabel[size]}>{label}</button>)}</div></div>
            <div><strong>Altura</strong><div className="chart-size-options">{([['Baixo', 280], ['Médio', 380], ['Alto', 540]] as const).map(([label, height]) => <button key={height} type="button" className={chart.heightPx === height ? 'is-selected' : ''} onClick={() => resizeWithPosition(chart.id,chart.widthColumns??({compact:4,half:6,wide:12} as const)[chart.size],height)}>{label}</button>)}</div></div>
            {requestedColumns < minimumColumns ? <span className="chart-size-limit">A largura mínima é ajustada automaticamente para não cortar o gráfico.</span> : null}
            <button type="button" className="chart-size-close" onClick={() => setSizeMenu(null)} aria-label="Fechar opções de tamanho">Concluir</button>
          </div> : null}
          <div className="chart-visual-frame"><ChartVisual rows={rows} config={chart} /></div>
          <ChartDetails rows={rows} config={chart} />
          {organizing ? <button type="button" className="chart-resize-handle" aria-label={'Arraste para redimensionar ' + chart.title} title="Arraste para ajustar largura e altura" onPointerDown={(event) => resizeStart(event, chart)} onPointerMove={resizeMove} onPointerUp={resizeEnd} onPointerCancel={resizeEnd}><Maximize2 size={16} /></button> : null}
        </article>;
      })}
      {!freeBoard&&(dragId || resizingId) ? <div className="chart-guides-hint" role="status">{resizingId ? 'Bolinhas: espaço disponível para ampliar o gráfico' : 'Bolinhas: área livre para reposicionar o gráfico'}</div> : null}
    </div>}
    <div className="chart-studio-footer"><span>As configurações dos gráficos ficam salvas neste navegador, separadas dos lançamentos financeiros.</span>{charts.length > 0 ? <button className="text-button" type="button" onClick={() => { if (window.confirm('Restaurar os três gráficos sugeridos e substituir o layout atual?')) setCharts(defaultCharts()); }}><RotateCcw size={14} />Restaurar padrão</button> : null}</div>
    {editing ? <ChartEditor key={editing.id} initial={editing} state={state} month={month} onSave={save} onCancel={() => setEditing(null)} /> : null}
  </section>;
}
