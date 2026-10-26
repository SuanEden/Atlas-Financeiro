# Custos e limites

Quadro principal pesquisado em 24/10/2026 e **reconsultado para o planejamento de I3 em 26/10/2026**. Nenhuma conta real, organização, método de pagamento ou configuração de faturamento foi inspecionada. As condições precisam ser reconfirmadas antes de provisionar ou publicar. A consulta não é garantia de gratuidade permanente, capacidade disponível ou elegibilidade da conta.

## Aplicação ao plano proposto de I3

Necessários futuramente: Supabase Auth/PostgreSQL/Data API, cliente Google OAuth Web e, após autorização separada de publicação, frontend HTTPS estático no Cloudflare Pages. Realtime, Storage, Edge Functions, SMTP, SMS e SAML não são necessários a I3. Infraestrutura local de teste deve ser confirmada antes de iniciar; ausência de Docker/CLI não autoriza criar serviço pago.

- O plano Free é da organização Supabase; cotas e disponibilidade de projetos precisam ser conferidas considerando seus membros e recursos existentes. Os dois projetos ativos gratuitos não são uma autorização para criar ambos. Preferir testes locais e apenas o projeto hospedado indispensável. [Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq).
- O tráfego financeiro de RPC/pull não deve ser orçado como se 5 GB cached e 5 GB não cached fossem um único saldo intercambiável. Sincronizar incrementalmente, paginar, limitar payloads e suspender consultas quando a PWA estiver em segundo plano. Não usar polling rápido, logs com payloads ou tráfego artificial para evitar pausa. [Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress).
- Conferir Free e ausência de exigência de cartão/trial/faturamento no fluxo real antes de criar qualquer recurso. Não ativar Pro, paid branching, PITR, domínio de Auth, IPv4 dedicado, Log Drains, Workers/Functions, R2 ou outro adicional. Não presumir que o spend cap de plano pago torna o serviço gratuito ou cobre toda cobrança. [Pricing](https://supabase.com/pricing).
- Usar somente identidade Google básica. O codelab oficial descreve conta/projeto gratuitos, mas não demonstra as telas da conta do usuário; parar se for exigido faturamento, em vez de habilitar trial ou Identity Platform pago. Não contratar Google Workspace para obter audiência Internal. [Google](https://codelabs.developers.google.com/codelabs/sign-in-with-google-button).
- Antes de conectar Git à hospedagem, restringir branches e deploys automáticos. Push documental não autoriza publicação. Para I3, preparar apenas essa decisão; não conectar ou alterar serviços nesta tarefa. [Controles de branch Pages](https://developers.cloudflare.com/pages/configuration/branch-build-controls/).

A ausência de backups automáticos no Free exige proteção da associação e ensaio operacional antes de dados reais; o exportador I2 não promete restauração. Esse recorte está no [plano de I3](PLANO_INCREMENTO_3.md#8-recuperação-antes-de-dados-reais-recorte-proposto) e depende de aprovação. Fontes e mudanças recentes estão em [REFERENCIAS_INCREMENTO_3.md](REFERENCIAS_INCREMENTO_3.md).

## Serviços previstos

| Serviço | Condição verificada | Consequência operacional |
|---|---|---|
| Supabase Free | US$ 0; banco de 500 MB; Storage de 1 GB; 50 mil usuários ativos mensais; 5 GB de egress e 5 GB de cached egress com cotas separadas; até dois projetos ativos. | Usar somente o projeto necessário, sincronização incremental e exportação independente; Storage/anexos ficam fora de I3. [Preços](https://supabase.com/pricing) |
| Supabase: inatividade | Pouca atividade em sete dias pode causar pausa; documentação atual informa janela de restauração de um ano. | Mostrar indisponibilidade e preservar fila local; retomada pelo proprietário no painel. Não gerar tráfego artificial. [Pausa](https://supabase.com/docs/guides/platform/free-project-pausing) |
| Supabase: excedentes | Uso continuado acima das cotas pode provocar restrições, pausa ou respostas HTTP 402. | Reduzir uso ou aguardar recomposição da cota, sem upgrade automático. [Faturamento](https://supabase.com/docs/guides/platform/billing-faq) |
| Supabase: backup | Backups diários gerenciados não integram o Free. | Exportações próprias com cópia fora do aparelho/provedor. [Backups](https://supabase.com/docs/guides/platform/backups) |
| Cloudflare Pages Free | 500 builds/mês, uma simultânea, timeout de 20 minutos; 20 mil arquivos e 25 MiB por arquivo. | Hospedar somente o build estático. Anexos não entram no bundle. [Limites](https://developers.cloudflare.com/pages/platform/limits/) |
| Pages: tráfego | Requisições estáticas gratuitas e ilimitadas; Functions seguem regras de Workers. | Sem Pages Functions, Workers, R2 ou serviços adicionais necessários ao MVP; subdomínio gratuito `pages.dev`. [Preços](https://developers.cloudflare.com/pages/functions/pricing/) |
| Google OAuth | O codelab oficial descreve conta e projeto Google Cloud gratuitos para configurar o login. | Somente identidade básica, sem APIs pagas, Identity Platform, trial ou vínculo de faturamento. [Google Codelab](https://codelabs.developers.google.com/codelabs/sign-in-with-google-button) |

A quota de 500 MB do banco é diferente do disco físico. A documentação atual informa disco Free fixo de 2 GB, proteção de somente leitura aos 95% do disco e possibilidade de indisponibilidade grave em disco cheio. Não prometer que exatamente 500 MB aciona somente leitura ou que toda recuperação será gratuita. [Banco e disco](https://supabase.com/docs/guides/platform/database-size)

## Condição para implantação

- Verificar no fluxo real que Supabase está em organização Free e Pages em Free, sem cartão, cobrança por consumo, assinatura, trial ou complemento pago. A dispensa de cartão não foi comprovada em contas reais nesta pesquisa.
- Se qualquer etapa exigir pagamento ou cartão, interromper apenas essa etapa e manter código, dados, exportação e uso local preservados. Não abrir contas extras para contornar cotas.
- Não ativar transformação de imagens, domínio próprio, SMTP pago, SMS, IA externa ou monitoramento pago. Compressão de comprovantes será local, com limites conservadores.
- Mostrar erros de quota como indisponibilidade, sem apagar pendências. Não afirmar cota global disponível a partir de um contador local de arquivos; métricas administrativas ficam fora do frontend.
- Custos do ambiente de desenvolvimento e do Codex são separados do custo de hospedagem do aplicativo. Gratuidade permanente e disponibilidade contínua de terceiros não são garantidas.

Autenticação futura usa Google e recuperação da conta Google. SMTP não é dependência e não será provisionado. A pesquisa anterior registrou restrições do SMTP padrão; seus limites não foram revalidados nesta revisão por não integrarem I3. Não usar esse serviço como solução improvisada para o primeiro login. [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
