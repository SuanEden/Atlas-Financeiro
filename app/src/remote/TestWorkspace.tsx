import { FinancialWorkspace } from '../App';
import { useLocalFinance } from '../ui/use-local-finance';

export default function TestWorkspace() {
  const finance = useLocalFinance('test');
  return <div className="test-environment">
    <div className="test-environment-banner" role="status">
      <strong>Modo de teste · apenas neste navegador</strong>
      <span>Sem sincronização com a nuvem ou importação bancária. Seus dados reais permanecem separados.</span>
      <a href="/?cloud=1">Voltar ao Atlas real</a>
    </div>
    <FinancialWorkspace finance={finance} testMode />
  </div>;
}
