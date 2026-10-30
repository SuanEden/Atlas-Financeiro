# I3 — provedor Google conferido e primeiro login preparado

**Atualização posterior:** usuário realizou o primeiro login e o mesmo UUID pré-cadastrado foi preservado, com uma identidade Google e sem dados financeiros. [Resultado real e próxima verificação](RESULTADO_PRIMEIRO_LOGIN_I3.md). As seções seguintes preservam a preparação/teste interceptado anterior; não repetir configuração ou tratar o primeiro login como ainda não realizado.

Atualizado em 27/10/2026, após o usuário informar PRONTO ao salvar o provedor Google especificamente autorizado. Base anterior: `4732177dbef689533b6a99237ea176074767771e`, branch `codex/incremento-3-local-foundation`.

## Configuração real observada

- Projeto Supabase existente ativo em São Paulo; organização Free. Única migração remota `20261027152920 / i3_private_foundation`.
- GET `/auth/v1/settings`: 200, `disable_signup: true`, **somente Google habilitado**. Email, anônimo e demais métodos retornados desligados.
- Data API informa somente `api` exposto. Perfis `atlas_private` e `atlas_security`: 406/PGRST106. POST anônimo de readiness: 401/42501, permission denied for schema api.
- Um usuário confirmado, nenhum login registrado, nenhuma identidade Google até esta conferência. Uma autorização ativa coincide exatamente com o UUID privado esperado.
- Oito tabelas com RLS; nenhum DML de cliente nas tabelas privadas/autorização. Sete tabelas privadas vazias. Protocolo transacional posterior ausente.
- Readiness em SQL, com papel authenticated e identidade simulada administrativamente: `protocolVersion: 1`, `financialWritesEnabled: false`.

O usuário forneceu o JSON do cliente Web existente e pediu seu preenchimento na conversa. Origem e callback coincidem com os endereços preparados. Credenciais, Client ID, identificadores Google e JSON não foram copiados para arquivos ou Git, nem usados em comandos/requisições pelo agente. Decisão anterior do usuário sobre o segredo preservada, sem nova exigência de troca. O GET de settings confirma habilitação, **não valida o segredo, consentimento ou primeiro vínculo Google**.

## Preparação local reversível

Fluxo em preparação: tela local → Entrar com Google → OAuth PKCE → retorno `/auth/callback` → identidade Google do usuário pré-cadastrado → readiness sem escrita.

Servidor de desenvolvimento preparado em `http://127.0.0.1:5173/`, exclusivamente loopback, sem publicação. Modo integration aplicado **somente ao processo local** com URL do projeto aprovado e sua chave publicável existente. Nenhum Client Secret, chave administrativa ou senha participa da configuração do frontend. Não foi criado `.env` real nem modificado o modo padrão disabled do código/exemplo.

Essa preparação local é reversível e integra o trabalho local já autorizado. Não altera novamente o provedor remoto e não inicia login, associação ou transmissão. As menções históricas a `.env`/integração local pendentes não devem ser interpretadas como exigência de outra aprovação só para iniciar esse processo sem autenticação.

Para retomar após perda do processo/VM, recuperar o checkpoint e dependências; obter URL/chave publicável do projeto existente por leitura. Na pasta `app`, iniciar em PowerShell usando os valores somente no processo:

```powershell
$env:VITE_ATLAS_REMOTE_MODE='integration'
$env:VITE_SUPABASE_URL='https://<REFERENCIA_SUPABASE>.supabase.co'
$env:VITE_SUPABASE_PUBLISHABLE_KEY='<CHAVE_PUBLICAVEL_EXISTENTE>'
node node_modules/vite/bin/vite.js --host=127.0.0.1 --port=5173 --strictPort
```

Não substituir placeholders no Git. Confirmar disponibilidade da porta antes; não encerrar processo desconhecido. O encaminhamento inicial de flags por `npm run dev` no PowerShell falhou antes de iniciar; execução direta da CLI local Vite resolveu. Sem instalação de dependências ou alteração de código.

## QA da tela e do botão, sem autenticação real

Browser plugin not available. Usado Playwright com Edge instalado, **perfil isolado descartável**, sem ler perfil pessoal. Viewports 1280×900 e 390×844. Capturas inspecionadas visualmente e guardadas no diretório temporário do sistema, fora do Git.

| Check | Resultado observado |
|---|---|
| Identidade da página | URL local e título Atlas Financeiro corretos |
| Tela não vazia | Título, mensagem e botão Entrar com Google visíveis |
| Overlay de framework | Ausente |
| Console e erros de página | Nenhum erro ou aviso nos dois tamanhos |
| Evidência visual | Cartão legível e sem overflow horizontal em desktop/celular |
| Bloqueio de associação | Controles de iniciar/receber/copiar base ausentes |
| Interação | Clique no botão gerou solicitação OAuth com provider google |
| Retorno e PKCE | redirect_to exato `/auth/callback` na origem local, challenge presente e método S256 |

A solicitação de autorização foi **interceptada e respondida localmente antes de sair do navegador**. Todas as demais requisições externas desse perfil estavam bloqueadas; nenhuma outra foi solicitada. Assim, houve prova da ação do botão sem iniciar fluxo remoto, gerar vínculo Google, pedir consentimento ou receber código/token. O perfil foi fechado depois do teste, descartando seu verificador PKCE local. A captura mostra a tela anterior ao clique.

O terminal confirmou Vite pronto, sem erro posterior. Nenhuma edição React/frontend foi necessária; a suíte completa anterior não foi repetida. Esta QA específica não substitui login real, retorno OAuth, JWT/API autenticados, expiração/logout real, concorrência ou dois aparelhos.

## Próxima ação concreta para aprovação

**Primeiro login pessoal controlado**, somente com a conta Google escolhida e pré-cadastrada. Essa ação pode vincular a identidade Google e criar uma sessão no usuário já existente. Deve preservar o UUID e não pode abrir cadastro público para resolver falhas. Não foi executada pelo agente nem pelo teste interceptado.

Após a aprovação, o usuário abrirá a tela local, clicará Entrar com Google, escolherá a conta esperada e fará consentimento/2FA somente nas interfaces oficiais. Antes de dados financeiros, voltar ao app e conferir a mensagem `Login verificado. O envio remoto aguarda liberação.`. O bloqueio do servidor mantém os controles de associação ocultos; não criar/copiar base, importar arquivos ou habilitar escrita para fazer o login passar.

Depois do retorno, verificar administrativamente por leitura: um único usuário, mesmo UUID autorizado, identidade Google ligada a esse usuário, login registrado, autorização ativa preservada e sete tabelas privadas vazias. Verificar o estado renderizado sem extrair tokens, códigos ou dados de armazenamento Auth. Não pedir capturas de URLs com código, credenciais, email ou tokens.

Se aparecer duplicação, acesso negado, falha de callback ou escopos além de identidade básica, preservar o estado e diagnosticar. Não criar outro usuário, alterar cadastro público, remover identidade, mudar segredo ou aplicar o protocolo posterior automaticamente. Escrever o próximo checkpoint com evidência sanitizada e limites reais; I3 continua incompleto.
