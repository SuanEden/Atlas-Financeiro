# I3 — procedimento administrativo de pré-cadastro

Preparado em 27/10/2026; **criação especificamente autorizada pelo usuário nesta data, ainda não executada contra o projeto real**. Usuário escolheu a conta Google; seu email não integra este documento nem o código. [Estado externo vigente](CONFIGURACAO_EXTERNA_I3.md).

**Preferência posterior do usuário:** executar autonomamente o escopo autorizado e apresentar o resultado, reduzindo interações. A execução com `-Criar` pode fazer as leituras de precondições e prosseguir à tentativa única na mesma execução; não exige prévia isolada nem segunda entrada da chave. Cadastro, métodos fechados e inventário vazio continuam precondições obrigatórias no helper. Falha nessas leituras impede a criação.

## Ação especificamente autorizada

Criar um único usuário Auth no projeto existente `atlas-financeiro-i3`, usando a conta escolhida pelo usuário, com email confirmado, sem definir senha e sem enviar convite. O payload administrativo contém somente `email` e `email_confirm: true`. Essa ação não configura Google, autorização financeira por UUID, schema, migrações, publicação ou dados financeiros; essas etapas continuam separadas. Cadastro público e provedores permanecem desligados.

A [API oficial createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) documenta o email confirmado sem senha. O formulário do painel exige senha no código público consultado; por isso ele não será usado para esse pré-cadastro. Não executar INSERT/UPDATE em tabelas Auth para contornar a API administrativa.

## Ferramenta local preparada

Os arquivos [i3-user-admin.ps1](../scripts/i3-user-admin.ps1) e [i3-user-admin.mjs](../scripts/i3-user-admin.mjs) ficam fora de `app/` e não são importados pelo frontend. Usam Node >=22.12 e a versão de `@supabase/supabase-js` já fixada em `app/package-lock.json`; dependências devem estar instaladas por `npm ci` em `app/`.

O wrapper PowerShell pede o email no terminal e uma chave administrativa existente `sb_secret_...` por entrada oculta. A chave não é senha Google. **Nunca pedir/colar chave, senha ou código de verificação no chat.** O conector disponível não oferece criação de usuário Auth; a execução futura exige entrada privada local pelo próprio usuário. Nenhuma chave administrativa foi obtida ou gravada para preparar estes arquivos.

Entrada segue para o processo Node por stdin, sem credenciais nos argumentos, `.env` ou código. Não ativar depuração, transcrição de terminal ou captura enquanto inserir valores privados. O programa suprime mensagens brutas do SDK/HTTP, retorna estado sanitizado e não imprime email, chave ou UUID. Segredos existem na memória do processo durante o uso; limpar referências não garante apagar todas as cópias em memória.

Após confirmar o projeto por consulta de leitura e autorizar a ação, orientar uma etapa por vez. Com o terminal na raiz do repositório, a prévia tem esta forma, com o identificador operacional obtido privadamente do projeto existente:

```powershell
.\scripts\i3-user-admin.ps1 -ProjectRef '<identificador-do-projeto-existente>'
```

Sem `-Criar`, o comando é somente de leitura. Ele exige cadastro fechado e todos os métodos retornados desabilitados e verifica lista vazia pela API administrativa. Não consulta faturamento/plano; confirmar Free separadamente antes da execução. A vinculação manual não aparece na configuração pública; sua conferência no painel continua sendo necessária.

**A autorização específica já foi concedida** para o comando com `-Criar`, que realiza uma tentativa de criação. Não solicitar novamente aprovação para o mesmo escopo. A aprovação autoriza esse pré-cadastro concreto; não autoriza outros usuários, configuração Google, SQL de alteração ou publicação. Pode executar diretamente `-Criar` com as precondições internas, conforme preferência posterior de autonomia. A prévia isolada permanece disponível para diagnóstico, sem ser etapa obrigatória adicional.

`-AlvoPrivado` lê email e projeto de `.private/i3-admin/alvo.json`, validando o projeto contra `-ProjectRef`, e evita pedir novamente o email escolhido. Esse arquivo contém dados operacionais privados, sem chave. `-SalvarResultado` grava somente estado sanitizado e horário em `.private/i3-admin/resultado.json`. O agente pode abrir a janela interativa local **Atlas I3 - chave privada** para que o próprio usuário insira a chave oculta; o valor não é capturado pelo chat. Após a entrada, verificações/criação/recibo seguem automaticamente dentro do escopo autorizado. Consultar resultado/recibo e conferir o projeto por leitura antes de informar sucesso. Não abrir uma segunda janela enquanto a primeira estiver ativa ou existir tentativa sem esclarecimento.

Antes da chamada, grava `.private/i3-admin/tentativa.json` em modo exclusivo. Tentativa existente impede nova criação por esse helper, mesmo se a resposta anterior tiver sido perdida. Após a chamada, confere pela API que só há um usuário, com o mesmo UUID e email confirmado, não anônimo, sem identidade Google ainda. Guarda email/UUID no recibo privado `.private/i3-admin/usuario.json`, sem chave ou sessão. Esses caminhos estão ignorados pelo Git. No Windows, proteção efetiva dos arquivos depende das permissões do perfil/diretório; não há criptografia própria e a VM continua descartável.

Se houver falha depois de iniciar a tentativa, **não repetir, apagar o marcador ou excluir usuário automaticamente**. Conferir por leitura se houve criação e preservar o estado antes de decidir a retomada. Verificar também a ausência de senha por consulta administrativa de leitura apropriada após a execução autorizada; o helper confirma a omissão de senha no pedido, sem ler o campo de hash do banco.

## Limites e validação local

Listagem, criação e verificação são chamadas distintas, sem transação conjunta. Evitar qualquer outra operação administrativa concorrente; uma contagem inesperada após criar exige revisão, sem exclusão automática. Prévia não garante que a execução posterior ocorrerá nas mesmas condições. Não há prova de autenticação Google, primeiro vínculo ou autorização financeira por esse pré-cadastro.

Testes locais: `node --test scripts/i3-user-admin.test.mjs`. Cobrem prévia sem escrita, payload sem senha/convite, inventário não vazio, repetição, configurações abertas/incompletas, entrada inválida, falha de leitura/marcador, resposta perdida sem retry, divergência de identidade/confirmação, falha de recibo e saída sanitizada do CLI real. SDK/transporte são simulados; nenhuma credencial ou usuário real foi usado nos testes. A sintaxe PowerShell foi conferida com o parser local; entrada interativa e integração administrativa hospedada ainda não foram exercitadas.

Fontes consultadas em 27/10/2026: [createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [listUsers](https://supabase.com/docs/reference/javascript/auth-admin-listusers) e [chaves de API](https://supabase.com/docs/guides/getting-started/api-keys).
