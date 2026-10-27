# I3 — início da configuração externa

Atualizado em 27/10/2026. Complementa [STATUS_I3_LOCAL.md](STATUS_I3_LOCAL.md). As seções de 26/10 abaixo preservam o marco anterior; a consulta desta retomada está registrada a seguir.

## Projeto Google sem conta de faturamento, conforme painel relatado — 27/10/2026

Após abrir a consulta de faturamento do projeto Google criado, o usuário informou a mensagem explícita: `Este projeto não tem uma conta de faturamento`. Evidência classificada como relato específico do texto do painel, sem consulta independente à API Google. Isso resolve a pendência anterior de vínculo para esse projeto naquele momento; não inventaria cartões/contas de pagamento do usuário nem garante gratuidade permanente de outros recursos. Não vincular faturamento, ativar trial ou recursos pagos.

**Próxima etapa reversível:** abrir a visão geral Google Auth Platform com o projeto já criado selecionado. Se houver Começar na área de configuração de autenticação, abrir o formulário e conferir os campos antes de salvar/criar configuração. Não inferir que OAuth já está configurado. Supabase e pré-cadastro único permanecem preservados; login Google continua pendente. Nenhum cliente OAuth, provedor Google ou configuração de consentimento foi executado pelo agente. A autorização de criação do projeto não é autorização genérica para outras alterações remotas.

## Projeto Google criado pelo usuário; faturamento ainda não conferido — 27/10/2026

Após a orientação de criação condicionada à concordância específica, o usuário enviou captura das configurações do novo projeto `Atlas Financeiro`. Nome e identificador correspondem ao formulário preparado; a tela também mostra número de projeto e indicação de Nenhuma organização. Registrar criação feita pelo usuário e evidência por captura, sem alegar consulta independente à API Google. Identificador/número operacionais e captura ficam fora do Git. O Supabase existente e seu único pré-cadastro permanecem preservados.

A seção Conta de faturamento aparece somente no limite inferior cortado; **não é possível afirmar, por essa captura, se existe conta vinculada**. Próxima etapa somente de leitura: rolar até essa seção e conferir o trecho antes de qualquer configuração OAuth. Nenhum vínculo de faturamento, trial, cartão, serviço pago ou cliente OAuth foi orientado/executado pelo agente. A autorização usada nesta etapa foi para criar esse projeto Google, sem ampliar autorização para outras configurações.

## Formulário Google pronto para decisão de criação — 27/10/2026

Captura do usuário mostra formulário Novo projeto preenchido com nome `Atlas Financeiro`, identificador gerado visível somente na interface, organização e recurso pai como Nenhuma organização, aviso de oito projetos restantes na cota e botão Criar. Não há campo de faturamento visível na captura completa do formulário. Isso não comprova criação ou situação de faturamento após criar; cota não deve ser alterada e projetos existentes não devem ser excluídos para esta etapa.

Ação concreta proposta: criar **somente esse projeto Google Cloud**, para preparar o login, sem ativar trial, vincular faturamento, fornecer cartão ou criar serviço pago. O Supabase existente permanece o mesmo. Após apresentar nome/escopo/condição de custo zero, orientar que o próprio usuário clique Criar **se concordar em autorizar essa criação específica**; não exigir uma resposta afirmativa adicional antes de ele executar a ação na interface. A criação ainda não foi executada ou observada. Depois conferir projeto selecionado e faturamento por leitura antes de configurar OAuth. Identificador operacional e captura fora do Git.

## Lista de projetos Google e preparação do formulário — 27/10/2026

Capturas posteriores mostram a aba Todos com quatro projetos preexistentes no contexto selecionado e busca por Atlas sem resultados. Nenhum projeto foi identificado como o alvo do Atlas; isso não comprova inexistência em outras contas/contextos nem a finalidade dos projetos com nomes genéricos. Nomes/IDs externos e capturas não foram versionados.

Proposta ainda não executada: projeto Google Cloud separado, nome sugerido `Atlas Financeiro`, somente para preparar o login Google, sem vincular faturamento, iniciar trial ou criar recursos pagos. O projeto Supabase `atlas-financeiro-i3` permanece o mesmo. **Próxima etapa reversível:** abrir Novo projeto, preparar o nome e conferir o formulário real antes de clicar Criar, inclusive se há qualquer seleção de faturamento. A criação Google ainda precisa de autorização específica sobre o formulário concreto; a autorização anterior era somente para o pré-cadastro Auth já concluído.

Fontes oficiais consultadas nesta data: [criação de projetos Google](https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects) e [login Google no Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google). A documentação diferencia projeto e vínculo de faturamento; conferir a interface real, sem presumir custo/configuração da conta. Nenhuma alteração Google executada.

## Inventário inicial do Google Cloud — 27/10/2026

Após o pré-cadastro, o usuário abriu o console Google Cloud e enviou captura da tela inicial. Ela mostra um projeto preexistente sem vínculo confirmado com o Atlas, além de oferta de trial/crédito. Nome/IDs desse projeto e dados da conta não são necessários neste registro público. Não inferir identidade de login autorizada pelo avatar, conta administrativa ou projeto selecionado. Oferta visível não comprova situação de faturamento nem autorização para ativação.

**Próxima etapa somente de leitura:** dispensar a oferta sem iniciar trial, abrir o seletor de projetos no topo e conferir a lista antes de decidir se existe projeto adequado para o Atlas. Não modificar, reutilizar ou excluir projeto preexistente por suposição. Nenhum projeto Google, cliente OAuth, escopo, faturamento ou configuração de provedor foi criado/alterado pelo agente. Supabase existente e pré-cadastro concluído permanecem preservados. Configuração Google efetiva continua dependente de autorização específica após identificação do alvo e preparação do procedimento.

## Pré-cadastro único criado e conferido — 27/10/2026

A execução especificamente autorizada concluiu com `USUARIO_CRIADO_E_CONFERIDO`. O SDK listou base vazia antes de criar, enviou somente email escolhido e `email_confirm: true`, conferiu um único usuário e releu-o pelo mesmo UUID. Comparações locais do recibo com o alvo privado confirmaram projeto e conta corretos, UUID válido e email confirmado, sem imprimir valores pessoais. Uma captura posterior do usuário confirmou a mensagem sanitizada de sucesso. Chave recebida somente pela entrada oculta local, sem valor no chat/arquivos/Git.

Verificação remota independente, somente agregada: **1 usuário, 1 email confirmado, 0 anônimos, 0 usuários com login realizado e 0 identidades Google**. GET público reconfirmou `disable_signup: true`, Email/anônimo/Google desabilitados e todos os demais métodos retornados desabilitados. Vinculação manual permanece conforme confirmação anterior do usuário no painel. Projeto ativo e organização Free foram reconfirmados nesta retomada. Nenhum outro projeto alterado, convite enviado pelo helper, dado financeiro, SQL de alteração, migração, Google ou publicação executados.

**Correção da expectativa sobre senha:** o payload não continha senha, mas a contagem de campo `encrypted_password` não vazio retornou **1**. O [código oficial de adminUserCreate](https://github.com/supabase/auth/blob/master/internal/api/admin.go) gera senha aleatória interna quando ela é omitida; o resultado observado é compatível. Não declarar senha ausente do banco nem login por senha testado. Nenhuma senha adicional foi fornecida ao usuário ou lida pelo agente; nenhum hash foi obtido. Não executar alteração para apagar esse campo. [Procedimento com resultado e limites](PRE_CADASTRO_ADMIN_I3.md).

**Retomada futura:** preservar marcador/recibo privados e não repetir o helper de criação. Esses arquivos são ignorados e descartáveis com a VM; a existência do usuário no serviço deve ser reconferida por leitura em outra VM antes de qualquer ação. Email/UUID operacionais ficam fora do Git. Google, autorização ativa por UUID, schema/API, testes negativos, publicação e dois dispositivos continuam pendentes e sujeitos às autorizações específicas; I3 incompleto.

## Retomada da entrada privada e diagnóstico de chave pública — 27/10/2026

Na retomada solicitada pelo usuário, a janela anterior já estava fechada, sem tentativa ou recibo. Projeto ativo, Free e zero usuários/confirmados/com senha foram reconfirmados por leituras agregadas. A nova entrada parou na validação de formato, antes de qualquer requisição. O helper foi ajustado para remover espaços externos, aceitar Secret key e JWT administrativo legado `service_role`, distinguir Publishable/anon e não mostrar valores privados. Onze testes locais aprovados; sintaxe Node/PowerShell aprovada. Classificação local não valida assinatura ou privilégios; essa validação cabe à API do projeto.

Uma entrada posterior foi identificada pelo helper como **Publishable**, recusada antes de rede ou marcador. A captura mostra somente a mensagem sanitizada e a entrada oculta. Nenhuma chave foi copiada ao chat ou Git. As janelas de falha já concluídas foram encerradas e seus resultados sanitizados arquivados no diretório privado; não houve exclusão de marcador ou nova tentativa após criação incerta. Não havia marcador/recibo antes de cada reabertura.

Foi aberta outra janela privada para a chave administrativa existente. Orientação atual: na página API Keys, usar `service_role` da aba Legacy anon, service_role API keys, ou uma Secret key existente, nunca Publishable/anon. Última conferência ainda sem tentativa/recibo; criação não comprovada. O modo Select do console foi observado e o usuário foi orientado a sair com Esc antes de colar. Autorização de criação única permanece; conferir resultado e estado real antes de repetir ou declarar sucesso.

## Execução autônoma autorizada, janela de entrada privada aberta — 27/10/2026

O usuário pediu execução autônoma e somente o resultado, reduzindo as etapas interativas anteriores. A autorização específica de um único pré-cadastro permanece válida. O wrapper agora pode ler o alvo escolhido de arquivo privado ignorado e gravar apenas estado sanitizado, mantendo a chave somente em entrada oculta/memória/stdin. Nove testes Node novamente aprovados, parser PowerShell aprovado e teste real não interativo recusou alvo privado ausente antes de solicitar chave ou acessar a rede.

Foi aberta uma única janela PowerShell interativa na mesma sessão Windows do desktop, com título **Atlas I3 - chave privada**, aguardando apenas a chave administrativa existente. O alvo está preenchido privadamente; a chave não passa pelo chat nem pelo Git. Após a entrada, `-Criar` faz precondições somente de leitura, tentativa única e conferência automaticamente, sem exigir prévia isolada/segunda entrada da chave. Na última conferência local, janela ativa, sem marcador de tentativa ou recibo; **nenhuma criação comprovada ainda**. Não lançar outra janela ou repetir enquanto o resultado estiver pendente. Conferir `.private/i3-admin/resultado.json`, recibo privado e estado remoto antes de declarar criação ou decidir retomada. Autonomia não amplia autorização para Google, outras contas, SQL de alteração ou publicação.

## Pré-cadastro autorizado, entrada privada pendente — 27/10/2026

O usuário respondeu afirmativamente à autorização específica para criar **um único cadastro da conta escolhida**, no projeto existente, com email confirmado, sem senha adicional e sem envio de convite. Essa autorização permanece válida para o [procedimento preparado](PRE_CADASTRO_ADMIN_I3.md), sem exigir nova confirmação do mesmo escopo. Não abrange outras contas, Google, SQL de alteração, publicação, cobrança ou piloto.

Antes da execução, `get_project` reconfirmou o projeto ativo; `get_organization` reconfirmou Free e um SELECT agregado de leitura reconfirmou **zero usuários**. Nenhum usuário foi criado, chave administrativa obtida, helper interativo executado ou janela iniciada nesta etapa. A execução depende de o usuário localizar uma chave secreta existente no painel e inseri-la privadamente no terminal local. Próxima orientação: abrir Settings → API Keys e informar apenas se há chave em Secret keys, sem copiar valor ou enviar captura de segredo ao chat. Depois orientar prévia somente de leitura e conferir seu resultado antes da criação já autorizada.

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
