# I3 — início da configuração externa

Atualizado em 27/10/2026. Complementa [STATUS_I3_LOCAL.md](STATUS_I3_LOCAL.md). As seções de 26/10 abaixo preservam o marco anterior; a consulta desta retomada está registrada a seguir.

## Identidade escolhida e procedimento preparado — 27/10/2026

O usuário escolheu a conta Google e informou seu email na conversa. O valor não foi copiado para Git, documentação, fixtures ou configuração da aplicação. Está preparado o [procedimento administrativo concreto](PRE_CADASTRO_ADMIN_I3.md), com helper local fora do frontend, prévia somente de leitura por padrão e criação explícita de um único usuário com email confirmado, sem senha ou convite. Criação remota **ainda não autorizada nem executada**.

Os testes locais do helper passaram com transporte simulado, incluindo saída sanitizada do CLI real; sintaxe PowerShell e exclusão dos futuros registros privados foram conferidas. Nenhuma chave administrativa foi obtida e nenhum teste usou serviço/usuário real. Próxima etapa com o usuário: autorização específica desse pré-cadastro, conforme a restrição de alterações remotas combinada. Depois orientar entrada privada no terminal local, sem chaves no chat, conferindo projeto/Free e execução uma etapa por vez. A última contagem real observada permanece zero; nenhum Google, SQL de alteração, publicação ou dado financeiro foi configurado.

## Formulário de criação inspecionado — 27/10/2026

A captura do usuário mostra Create a new user com Email address, User Password, Auto confirm user? marcado e aviso de que o formulário não envia email de confirmação. A captura não comprova submissão ou criação. O [código público de CreateUserModal](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Auth/Users/CreateUserModal.tsx), consultado nesta data, exige email válido e senha não vazia. Não assumir que deixar a senha vazia nesse formulário implementa o pré-cadastro sem senha previsto no plano. Não foi testada a versão hospedada por submissão.

A [referência oficial de createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) contém criação administrativa com email e `email_confirm: true`, omitindo senha. Essa alternativa requer ambiente administrativo confiável; chave administrativa não pode ir para frontend/chat/Git. Nenhuma chave administrativa foi solicitada/obtida, nenhum script administrativo foi executado e nenhum usuário foi criado. O conector GitHub de leitura retornou ferramenta indisponível; o código público foi lido por HTTPS como fallback.

**Próxima etapa guiada:** fechar o formulário sem salvar e escolher privadamente a conta Google autorizada, respondendo apenas que a conta foi escolhida, sem enviar email ou senha. Depois preparar procedimento administrativo concreto e revisado para um único usuário confirmado, sem senha e sem convite, com autorização específica antes da criação. Não trocar esse requisito por senha temporária nem abrir cadastro público. Última contagem observada permanece zero; não houve nova contagem nesta inspeção.

## Inventário confirmado por contagem de leitura — 27/10/2026

O usuário informou que atualizar a lista não alterou a divergência. Após reconfirmar o projeto existente com `get_project`, foi feita **consulta SQL remota somente de leitura** pelo conector: `select count(*)::text as total_usuarios from auth.users;`. Resultado: `total_usuarios: "0"`. Não foram selecionados emails, UUIDs, identidades, credenciais ou registros individuais. Nenhum DDL, DML, migração, configuração ou criação de usuário foi executado.

A contagem exata confirma zero usuários naquele momento. O total estimado de 10 exibido no rodapé não corresponde à contagem consultada; a causa da estimativa divergente não foi determinada. Isso resolve a dúvida de inventário abaixo, sem comprovar funcionamento de login ou cadastro restrito. Os registros anteriores de ausência de SQL remoto referem-se aos checkpoints anteriores; nesta etapa houve somente o SELECT agregado documentado.

**Próxima etapa guiada:** abrir Add user → Create new user no painel e inspecionar o formulário ainda vazio, sem salvar/criar usuário. Conferir campos e opções reais antes de preparar o pré-cadastro único com email confirmado, sem convite SMTP e sem senha própria, conforme plano. A identidade Google deve ser escolhida privadamente; não inferir pelo nome administrativo ou GitHub. Criação/configuração efetiva continua dependente de autorização específica; não habilitar provedores ou cadastro público por consequência dessa leitura.

## Inventário anterior inconclusivo na captura — 27/10/2026

Captura enviada pelo usuário mostra o projeto correto em Authentication → Users, campo de busca aparentemente vazio, nenhuma linha e mensagem `No users in your project`. Entretanto, o rodapé mostra `Total: 10 users (estimated)`. Essa estimativa não comprova dez usuários e a mensagem central, diante da divergência, não foi tratada como comprovação definitiva de lista vazia. Causa não determinada; não atribuir a cache, filtro, erro do painel ou registros reais sem evidência adicional.

**Próxima etapa guiada:** clicar no botão de atualizar a lista, ao lado de Add user, e conferir novamente a mensagem central e o total estimado. Se a divergência persistir, investigar por leitura antes de orientar criação. Nenhum usuário foi criado/convidado/excluído; nenhum SQL remoto ou acesso administrativo por segredo foi executado. Não copiar a captura nem dados da conta administrativa para o Git; este registro contém somente a observação técnica sanitizada.

## Vinculação manual confirmada pelo usuário — 27/10/2026

À pergunta explícita se `Allow manual linking` estava desligado, o usuário respondeu afirmativamente. Registrar como **confirmação do usuário no painel**, sem captura ou verificação administrativa independente. A última consulta pública, preservada abaixo, confirmou cadastro fechado e Email, entrada anônima, telefone e Google desabilitados. Nenhuma nova consulta ou alteração remota foi executada nesta confirmação.

**Próxima etapa guiada:** abrir Authentication → Users no projeto existente e informar somente se a lista está vazia ou se já existe algum usuário, sem enviar emails, UUIDs ou outros dados pessoais no chat. O conector disponível não fornece listagem de usuários Auth. Essa conferência é leitura antes de definir privadamente a identidade Google e preparar o pré-cadastro administrativo único; não criar, convidar, excluir ou alterar usuário nesta etapa. Criação/configuração, Google, SQL remoto e publicação continuam sujeitos às autorizações específicas documentadas.

## Email desativado confirmado — 27/10/2026

Após o usuário informar conclusão da etapa Email, `get_project` reconfirmou o projeto existente. GET público de `/auth/v1/settings`, com URL distinta e `Cache-Control: no-cache`, retornou `disable_signup: true` e todos os métodos listados em `external` como `false`, incluindo Email, Google, telefone e entrada anônima. A configuração pública informa cadastro fechado, Email e entrada anônima desabilitados. Não houve tentativa de cadastro/login nem alteração remota pelo agente.

**Próxima etapa:** obter confirmação individual no painel de que `Allow manual linking` está desligado. Essa configuração não consta na resposta pública; o usuário respondeu somente "pronto" após a orientação de Email e a solicitação adicional, sem identificar o estado dessa opção. Não registrar verificação independente nem conclusão integral de Auth. Google continua desabilitado e sua configuração exige etapa própria com autorização específica; não abrir cadastro como atalho. Código/migrações e modo remoto desabilitado preservados, sem SQL remoto, usuários, publicação ou custos novos pelo agente.

## Cadastro fechado confirmado após correção — 27/10/2026

Após novo relato de conclusão do usuário, o projeto existente foi reconfirmado e um GET de `/auth/v1/settings`, com URL distinta e `Cache-Control: no-cache`, retornou `disable_signup: true`, `external.anonymous_users: false`, `external.email: true` e `external.google: false`. A configuração pública agora informa cadastro fechado e entrada anônima desabilitada. Isso substitui a divergência registrada abaixo; não é teste negativo de cadastro/login. Vinculação manual continua não verificada de forma independente, pois não consta na resposta pública e ainda não houve confirmação individual ou captura do painel.

**Próxima etapa guiada:** na mesma página Sign In / Providers, abrir Email, desligar a habilitação do provedor e salvar. Aguardar novo relato e conferir `external.email: false` antes de tratar a etapa como concluída. Solicitar também confirmação individual de que `Allow manual linking` permanece desligado no painel; não habilitar Google nesta etapa. O agente continua somente com leituras remotas e checkpoints documentais, sem alterações de Auth, SQL remoto, criação de usuário ou publicação. Aplicativo remoto desabilitado; custo zero preservado como requisito.

## Reconsulta anterior após relato de conclusão — 27/10/2026

Após o usuário informar que concluiu a etapa do formulário, duas consultas somente de leitura de `/auth/v1/settings` retornaram `disable_signup: false`, `external.anonymous_users: true`, `external.email: true` e `external.google: false`. A segunda requisição usou URL distinta e `Cache-Control: no-cache` para reduzir a possibilidade de reaproveitamento de resposta. O projeto existente foi reconfirmado pelo conector antes das leituras. Nenhum teste de cadastro/login foi executado.

O resultado ainda indica cadastro público aberto e entrada anônima habilitada; diverge do estado solicitado e substitui os valores da primeira consulta abaixo. Não atribuir a causa à interface ou ao usuário sem evidência. Vinculação manual segue não verificada, pois não consta na resposta pública; o relato geral de conclusão não confirma individualmente essa opção.

**Próxima ação continua no mesmo formulário:** orientar o usuário a conferir o projeto correto, deixar `Allow new users to sign up`, `Allow anonymous sign-ins` e `Allow manual linking` desligados e salvar. Reconsultar após novo relato; se houver dificuldade, conferir captura somente desse bloco, sem segredos. Ainda não avançar para Email ou Google. O agente não alterou configuração remota. O próximo checkpoint é exclusivamente documental e não exige repetir os testes locais de código já aprovados.

## Retomada e primeira consulta de Auth — 27/10/2026

A branch `codex/incremento-3-local-foundation` foi recuperada com worktree inicialmente limpo. Após `git fetch origin`, HEAD e `git ls-remote` apontaram para `300098a7c59b41f7cbc972cda91a74753c93317b`, sem commits posteriores na branch antes deste checkpoint documental.

`list_projects` e `get_project` reconfirmaram o projeto existente `atlas-financeiro-i3`, região `sa-east-1`, estado `ACTIVE_HEALTHY`. `get_organization` reconfirmou `plan: free` e `tier: tier_free`. Nenhum projeto foi criado; método de pagamento não foi inspecionado. Continua obrigatório custo zero, sem cartão, upgrade, trial ou adicionais pagos.

Para conferir o estado atual sem obter credenciais administrativas, foi consultado somente por GET o endpoint público `/auth/v1/settings`, usando uma chave publicável ativa obtida pelo conector. A chave não foi gravada em arquivo, configuração do aplicativo ou Git. Resultado observado:

| Configuração | Valor observado | Interpretação |
|---|---|---|
| `disable_signup` | `false` | Cadastro público ainda aberto. |
| `external.email` | `true` | Entrada por email habilitada. |
| `external.google` | `false` | Google desabilitado. |
| `external.anonymous_users` | `false` | Entrada anônima desabilitada. |
| Demais provedores retornados, incluindo telefone | `false` | Desabilitados nessa resposta. |

Vinculação manual não é informada por essa resposta e permanece **não verificada**. O conector disponível não oferece leitura da configuração administrativa de Auth; conferir essa opção no painel com o usuário, sem solicitar token administrativo. A leitura de settings não testa login, bloqueio efetivo de cadastro ou autorização por UUID e não inventaria usuários, tabelas ou métodos adicionais ausentes da resposta.

Próxima etapa guiada, no mesmo formulário Authentication → Sign In / Providers: desligar `Allow new users to sign up`, manter `Allow anonymous sign-ins` e `Allow manual linking` desligados e salvar. Aguardar confirmação do usuário e reconsultar o estado público; a vinculação manual exige evidência do painel. Depois, em etapa separada, orientar a desativação de Email e revisar os métodos de entrada antes de qualquer ativação Google. Nenhuma alteração dessa etapa foi executada ou presumida nesta retomada.

Foram consultados o changelog e a [configuração geral oficial](https://supabase.com/docs/guides/auth/general-configuration) em 27/10/2026. Não houve SQL remoto, criação de usuário, login, alteração de Auth, ativação Google, publicação ou configuração real do aplicativo. Os demais projetos não foram alterados. I3 continua incompleto.

## Marco confirmado

O usuário pediu orientação para a primeira configuração externa, reforçou que não usará cartão/cobrança/trial e criou pessoalmente, no painel, um projeto separado chamado `atlas-financeiro-i3`. A consulta somente de leitura pelo conector Supabase confirmou o nome, região `sa-east-1` (São Paulo), status `ACTIVE_HEALTHY` e organização com `plan: free` / `tier: tier_free`.

Antes disso, o inventário somente de leitura encontrou dois projetos preexistentes sem vínculo confirmado com o Atlas. Eles não foram alterados, reativados ou reutilizados. Não inferir a identidade Google autorizada pelo nome de organização, conta administrativa ou GitHub. Identificadores operacionais da conta/projeto não são necessários neste registro público sanitizado.

O plano Free foi confirmado pela API; método de pagamento não foi inspecionado. A condição expressa pelo usuário permanece: sem cartão, cobrança, upgrade, trial ou adicionais pagos.

## Limite das ações executadas

O agente consultou projetos, organização e documentação oficial. Não executou criação/configuração remota, SQL, migrações, criação de usuário, ativação Google, publicação, cobrança ou conexão local com o serviço. A criação foi feita pelo usuário na interface. O aplicativo continua com modo remoto desabilitado; não há dados pessoais cadastrados pelo agente.

As configurações de Auth, API, tabelas e usuários do novo projeto ainda não foram inspecionadas nem validadas. Não presumir que os defaults já fecham o acesso. A existência de um projeto ativo não comprova nenhuma integração financeira ou critério de conclusão de I3.

## Próxima etapa guiada

Fechar cadastro público em Authentication → Sign In / Providers, manter entrada anônima e vinculação manual desabilitadas e desabilitar login por email antes de ativar somente o provedor Google na etapa apropriada. O usuário fará a configuração guiada; não foi dada autorização genérica ao agente para alterar Auth, aplicar SQL ou publicar.

A documentação oficial confirma que `Allow new users to sign up` desligado permite login apenas de usuários existentes. O pré-cadastro administrativo de um único usuário, primeiro vínculo Google, autorização ativa por UUID e provas negativas continuam pendentes; não abrir cadastros como atalho.

Referência consultada em 26/10/2026: [General configuration](https://supabase.com/docs/guides/auth/general-configuration). Após o usuário salvar cada configuração, distinguir relato/captura, verificação remota e testes reais. Não registrar uma etapa como confirmada só por ter sido orientada.

## Retomada

Reconsultar o inventário pelo conector autorizado, identificar o projeto pelo nome e confirmar plano/estado antes de qualquer ação. Não tocar nos outros projetos nem obter segredos como parte desse inventário. Continuar pelas pendências de [PENDENCIAS_INCREMENTO_3.md](PENDENCIAS_INCREMENTO_3.md). A orientação originalmente solicitada era uma etapa por vez; o usuário depois pediu que os campos do formulário fossem apresentados juntos. Agrupar os campos de uma mesma etapa, aguardando a conclusão antes da próxima.
