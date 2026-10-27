# I3 — conferência das RPCs pela sessão pessoal, sem escrita

Preparada em 27/10/2026, após a confirmação textual do usuário de login verificado/envio bloqueado ao recarregar a aplicação depois do protocolo remoto. Base anterior: `df1751eb8ba167e703978a15b7d2d5ba503c9993`.

## Evidência atual e lacuna específica

O usuário informou novamente os textos de associação pendente e login verificado/envio aguardando liberação, com Entrar com Google. É relato textual da tela; a transcrição parcial não comprova visibilidade de todos os controles, captura de tráfego, renovação ou validade atual de cada token. Não inferir falha de logout ou conclusão da matriz de sessão a partir desse recorte.

SELECTs desta etapa preservaram exatamente um usuário original e sua autorização ativa, gate false e zero registros nas nove tabelas privadas. Nenhuma configuração, migração, identidade, autorização ou dado remoto foi alterado pelo agente.

As verificações anteriores das três RPCs usavam papéis reais com identidade simulada em SQL e requisições HTTP anônimas. Para exercitar as rotas novas com a sessão pessoal sem extrair tokens, foi preparada uma página manual de desenvolvimento.

## Tela manual local

Abrir **na mesma janela/perfil do Atlas autenticado**:

```text
http://127.0.0.1:5173/tests/live-protocol-check.html
```

Clicar **Conferir conexão**. O SDK usa internamente a sessão existente; o usuário não copia token, credencial, código OAuth ou URL de retorno. A página não renderiza nem registra valores privados. Não abre IndexedDB, não cria outbox, não executa associação, não efetua logout e não constrói um comando financeiro válido.

Fluxo:

1. Verificar usuário Google e readiness pelas mesmas portas do aplicativo.
2. Exigir sessão ainda válida e escrita financeira explicitamente false. Se o envio estiver habilitado, interromper antes das demais chamadas.
3. Chamar pull, exigindo versão correta, mesmo proprietário e cursor/base remotos vazios. Qualquer divergência interrompe o teste sem mostrar registros.
4. Chamar apply **apenas com `{protocolVersion: 0}`**, payload deliberadamente inválido, e exigir recusa normalizada de acesso. Mesmo se o gate mudar concorrentemente, essa versão é inválida e a RPC a rejeita antes de inserir head/dados. Não confundir falha de rede ou sessão vencida com prova de bloqueio.
5. Mostrar somente frases fixas de resultado. Mensagens brutas de backend/URL não são propagadas.

Resultado esperado:

```text
Sessão Google verificada.
Envio financeiro continua bloqueado.
Consulta ao servidor concluída: base remota vazia.
Tentativa inválida de envio recusada.
Conferência concluída. Nenhuma base foi associada.
```

A mensagem normalizada de recusa não expõe o texto bruto da RPC. A conferência valida o caminho autenticado de recusa; a identificação exata de REMOTE_WRITES_DISABLED está sustentada pelas verificações SQL anteriores. Não é teste de escrita financeira bem-sucedida.

A página exige DEV e hostname de loopback. Fica em `app/tests/`, fora da entrada/bundle de produção, sem mudanças em componentes ou fluxo financeiro. O build não contém diretório tests nem essa página. Reutiliza o cliente durante a permanência na página para evitar múltiplas instâncias por clique. A integração padrão permanece disabled; o servidor local preparado usa integration apenas no processo.

## QA antes da execução pessoal

Dez testes unitários novos aprovados: caminho esperado, payload exclusivamente inválido, escrita habilitada, sessão vencida, resposta de outro proprietário/estado não vazio, falha de leitura, falha de sessão/rede durante recusa, sucesso inesperado e supressão de dados privados. Typecheck aprovado.

Browser plugin not available. Playwright/Edge em perfis isolados, viewports 1280×900 e 390×844. Sessão e respostas remotas **sintéticas**, interceptadas antes do servidor; nenhuma autenticação real ou chamada ao projeto foi feita nesse ensaio.

| Check | Resultado |
|---|---|
| Identidade | URL local, título e heading corretos |
| Conteúdo | Cartão, instruções e botão visíveis |
| Overlay | Ausente |
| Console | Sem erros inesperados; 403 previsto da tentativa negada identificado separadamente |
| Visual | Sem overflow horizontal, desktop/celular inspecionados |
| Interação | Clique percorreu getUser, readiness, pull e apply inválida e apresentou quatro confirmações |
| Privacidade | Nenhum identificador de usuário/token renderizado; nenhuma requisição externa deixou o perfil de teste |

Capturas temporárias `atlas-live-check-1280.png` e `atlas-live-check-390.png`, fora do Git. Primeiro ensaio de QA falhou no locator devido à codificação do pipe PowerShell, corrigido para locator compatível. Segundo ensaio identificou o log HTTP 403 esperado; classificado como prova de recusa, sem mascarar outros erros. O ensaio seguinte passou nos dois tamanhos. Não foram necessárias mudanças no aplicativo financeiro.

`ATLAS_BROWSER_TEST_PORT=5174`, modo de teste disabled, `npm run check`: **211 aprovados/1 ignorado**, build/typecheck, **24 de navegador e 3 de PWA**. O ignorado continua dependendo do manifesto privado original ausente. O servidor pessoal 5173 permaneceu ativo e a página de conferência/diretório tests não integram o build. Nenhuma dependência, migração ou configuração remota mudou nesta etapa.

## Continuidade e limites

**A execução com a sessão pessoal ainda aguarda o usuário clicar e informar os textos de resultado.** Os resultados sintéticos acima não comprovam as RPCs novas com seu JWT real. Depois do relato, conferir por SELECT se usuário/autorização e gate continuam preservados e as nove tabelas privadas permanecem vazias. Não extrair tokens ou operar o perfil pessoal por automação.

Se a página pedir entrada, voltar ao Atlas, entrar com a mesma conta e repetir. Se mostrar envio habilitado, divergência de base/conta ou falha de recusa, interromper e diagnosticar antes de qualquer associação. Não abrir escrita, criar usuários, remover dados ou alterar serviços para fazer o teste passar. I3 continua incompleto, sem piloto/dados pessoais, publicação ou recursos pagos.
