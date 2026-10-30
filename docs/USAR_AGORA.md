# Atlas Financeiro — começar pelo modo local

Prioridade expressa do usuário em 30/10/2026: começar a usar o controle financeiro o mais rápido possível, sem esperar a conclusão da sincronização.

## Versão inicial

Build estático do aplicativo existente, modo remoto desabilitado, sem valores ou contas de exemplo. Publicação privada pelo Sites; origem estável publicada: `https://atlas-financeiro-local-suan.projetochatplus.chatgpt.site`. Publicação confirmada como succeeded pelo serviço em 30/10/2026. O navegador de QA confirmou a barreira privada “Continuar com o ChatGPT”; não foi feito login pessoal no site publicado. Acesso privado pode exigir a mesma conta ChatGPT proprietária. Isso não é o login Google/Supabase do I3.

Contas, categorias, receitas/despesas previstas e realizadas, transferências, dashboard, edição, estorno e backup local são as funções disponíveis. Nenhuma alteração foi feita nas regras financeiras ou no banco remoto. O código-fonte continua no GitHub, em `codex/uso-local-rapido`, derivada de `4fa623d`.

## Primeiro uso

1. Abra o link no navegador do aparelho pessoal que pretende usar diariamente. Evite navegação anônima.
2. Clique em **Criar minha primeira conta**. Informe um nome (ex.: Carteira ou Banco) e o saldo atual. Esse saldo é ajuste inicial, não receita do mês.
3. Use **Novo lançamento** para registrar receitas, despesas ou transferências. Confira conta, valor, data e se o movimento já foi realizado.
4. Ao terminar, abra **Backup → Baixar backup** e guarde o JSON fora do navegador. Ele contém dados financeiros sem criptografia própria.

## Limites que precisam ficar claros

- Os dados ficam no IndexedDB de cada navegador/perfil e endereço. O site não envia lançamentos ao Supabase nesta versão.
- Celular e computador não compartilham dados automaticamente. Comece usando um único navegador/aparelho. Não mantenha duas bases independentes esperando união automática.
- Não limpe dados do site nem troque a origem sem exportar uma cópia. Histórico de Git/publicação não é backup financeiro do usuário.
- Recuperação local aceita arquivo I2 em destino vazio ou exatamente idêntico; não une nem substitui uma base diferente. Para recuperar em outro aparelho, use o backup e um navegador vazio, mantendo a origem anterior preservada.
- PWA existe no código; instalação e teclado em Android físico não foram comprovados neste lote. Não declarar funcionamento com aplicativo fechado ou sincronização de fundo.
- I3, arquivamento e sincronização real permanecem incompletos. O usuário poderá agora ter dados pessoais locais: não presumir base vazia, não associar automaticamente e não promover fixtures.

## Hospedagem e continuidade

Site privado: `appgprj_6ae4b84c33a88191837fe5c291d8232f`.
Manifesto da cópia hospedada: `.openai/hosting.json`, `static.directory=dist`.
Commit da fonte estática empacotada: `a03dda818a702f6d3a5391b0483e2e3ae6fbdc41`.
Deploy inicial: `appgdep_6ae4b92c7bdc81918916be087f939f38`.
Esses identificadores não são credenciais. Credenciais temporárias de fonte não foram gravadas.

Não trocar domínio/slug desta versão sem planejar a migração via exportação: IndexedDB pertence à origem. Preservar audiência privada. Nenhum cartão, trial, upgrade, API paga, D1/R2 ou sincronização remota foi configurado neste lote. Não prometer gratuidade permanente de provedores.

## Validação observada

`npm ci --no-audit --no-fund`, `npm run build`/typecheck aprovados. Suíte final `npm run test -- --maxWorkers=2`: 271 aprovados, um ignorado (manifesto privado original ausente), 21 arquivos.

Prévia gerenciada `http://terminal.local:4173/` em Chrome via CUA. Primeiro uso vazio, criação de conta sintética com 10000 centavos, despesa de 2000 centavos e saldo 8000 comprovados na tela; reload preservou a base. Download real do backup foi lido: uma conta, dois eventos, saldo de 8000 centavos e duas operações locais preservadas. Nenhum desses dados é parte dos arquivos estáticos publicados. Sem erro de aplicação após a correção; console contém erros da extensão do ambiente, separados do aplicativo. A prévia HTTP não fornece Web Locks/service worker; recuperação visual e offline nesse endereço não são declarados aprovados. Testes unitários de recuperação/atomicidade passaram.

Foi corrigida uma tela branca em prévia HTTP: `crypto.randomUUID` não existe ali. O gerador local mantém UUID v4 com `crypto.getRandomValues` quando a API nativa não está disponível; não usa `Math.random`. Dois testes cobrem caminho nativo e bits/entropia do fallback. Nenhum ID existente foi alterado. Ajustado seletor de heading no E2E de Auth para `exact:true`, pois os títulos da cópia e da recuperação se sobrepunham.

Suíte completa de navegador e PWA não foi reexecutada neste lote. O fluxo principal foi verificado manualmente na prévia. O arquivamento incompleto da tentativa anterior não estava em checkpoint remoto e não integra esta entrega.
