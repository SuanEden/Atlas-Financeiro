# Atlas Financeiro — fluidez, microinterações e liberação segura (21/11/2026)

## Fonte e objetivo
Recomendação do usuário e estudo UX em 21/11/2026. Referências técnicas: React useDeferredValue https://react.dev/reference/react/useDeferredValue ; Google Chrome motion https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/motion ; Web Vitals INP https://web.dev/articles/optimize-inp ; MDN redução de movimento https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion .

## Implementado — branch de UX, sem deploy
- Busca de movimentações responsiva com `useDeferredValue`: texto do campo atualiza imediatamente, resultados podem ser atualizados em segundo plano com indicação acessível; `useMemo` evita recomputar todo o agrupamento e índices de categorias/contas a cada tecla.
- Histórico muito extenso exibe 80 registros por vez com botão acessível para carregar mais, preservando edição, estorno, expansão do histórico e todos os registros no banco. **Não é truncamento de dados nem paginação do servidor**.
- Skeleton acessível no carregamento do ambiente financeiro sem substituir dados por exemplos fictícios.
- Transições suaves na entrada de seções, cartões, navegação e modal nativo, baseadas em `opacity` e `transform`; nada altera valores ou regras de negócio.
- Respeito a `prefers-reduced-motion: reduce` com animações desativadas e teste Playwright no Edge.
- Nenhuma nova dependência de runtime; exemplos de APIs nativas, React e CSS foram adaptados das referências públicas, não copiados de bibliotecas de terceiros.

## Fora do escopo deliberadamente
- Não usar last-write-wins nos lançamentos, apagar IndexedDB, recriar banco, forçar join Supabase, alterar identidades ou ignorar recibos. Isso não é uma melhoria segura em modelo financeiro append-only.
- Não trocar tema existente, alterar layout sem revisão, ligar escrita remota ou publicar staging/produção.
- Não ativar Pluggy/Google/Supabase com dados pessoais sem homologação real autorizada.

## Evidências necessárias para uso diário
- CI verde: Vitest, TypeScript, Vite build, Playwright Edge desktop/mobile, PWA offline.
- Comparar comportamento com muitos lançamentos sintéticos, verificar teclado, leitor de tela e redução de movimento.
- Medir INP real, CLS, LCP em desktop e Android intermediário, antes e depois; não inventar metas atingidas.
- Validar recuperação de I2 e I3, integridade de extrato, centavos, revisões, recibos e saldos.
- Homologar I3 com dois dispositivos de teste reais e transições offline/reconexão, falhas de rede e login.
- Validar integração Pluggy com consentimento e dados apropriados em ambiente isolado; conferir duplicidades e saldo.
- Confirmar autorização explícita antes de merge, deploy ou liberação do gate remoto.

## Critério de pronto
A aprovação dos testes automatizados constitui **validação técnica parcial**, não conclusão de P0. Para uso financeiro diário sincronizado, faltam testes hospedados e físicos com verificação de integridade. Em caso de falha, preservar todos os dados e a origem até reconciliação, sem novas associações.
