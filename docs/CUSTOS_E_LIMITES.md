# Custos e limites

Pesquisa técnica em fontes oficiais consultadas em **24/10/2026**. Nenhuma conta real, organização, método de pagamento ou configuração de faturamento foi inspecionada. As condições precisam ser reconfirmadas antes de provisionar ou publicar.

## Serviços previstos

| Serviço | Condição verificada | Consequência operacional |
|---|---|---|
| Supabase Free | US$ 0; banco de 500 MB; Storage de 1 GB; 50 mil usuários ativos mensais; 5 GB de egress e 5 GB de cached egress com cotas separadas; até dois projetos ativos. | Começar com um projeto e poucos anexos, sincronização incremental e exportação independente. [Preços](https://supabase.com/pricing) |
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

Autenticação futura usa Google e recuperação da conta Google. O SMTP padrão Supabase não é dependência: ele é restrito a endereços da equipe, atualmente limitado a duas mensagens/hora e sem SLA. [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
