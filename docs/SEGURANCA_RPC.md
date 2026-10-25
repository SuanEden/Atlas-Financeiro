# Segurança, permissões e RPC

**Desenho para I3; não implementado nem validado contra Supabase/PostgreSQL no I1.** A persistência atual é local, sem autenticação. O SQL de referência não configura os grants/policies abaixo e não deve ser publicado como backend pronto.

## Identidade e autorização

Google será o único login. Pré-provisionar administrativamente o usuário com email confirmado, sem definir ou compartilhar senha; manter cadastro público, entrada anônima e outros provedores desativados. O primeiro OAuth deve vincular a identidade Google ao usuário existente. Validar isso no projeto hospedado antes de concluir autenticação. Não criar usuários ou autorizar acesso a partir de email recebido pelo frontend.

`app_access(user_id, active)` será controlada pela administração e consultada a cada operação protegida. Autenticação Google não concede acesso financeiro por si só. RLS de todas as tabelas financeiras combina `auth.uid() = user_id` com autorização ativa; UPDATE usa `USING` e `WITH CHECK`, impedindo transferência de propriedade. FKs compostas barram referências a contas/eventos de outro usuário.

## Superfície HTTP e grants futuros

Expor somente schema `api`, com RPCs específicas. Tabelas financeiras, comprovantes de operações, mudanças e histórico ficam em schemas privados não expostos à Data API. Desativar `pg_graphql`/sua exposição e remover endpoints, views ou funções genéricas que reabram acesso. Não usar views que contornem RLS; qualquer view exposta futura precisará preservar o contexto do chamador.

| Recurso | `anon` | `authenticated` | Administração |
|---|---|---|---|
| Schema `api` | Sem execução de RPC financeira. | USAGE e EXECUTE somente nas RPCs enumeradas; sem criação de objetos. | Gestão da superfície. |
| Schema financeiro privado | Sem acesso. | USAGE e DML mínimo necessário às RPCs `SECURITY INVOKER`; RLS e restrições sempre aplicáveis. Sem acesso pela Data API. | Migrações/gestão confiável, fora do app. |
| `app_access` privado | Sem acesso. | SELECT somente do próprio registro, para avaliar autorização; nenhum INSERT/UPDATE/DELETE. | Concessão e revogação. |
| Recibos idempotentes/mudanças | Sem acesso. | Privilégios mínimos usados pelas RPCs, com propriedade e autorização; invariantes protegidas no banco. | Inspeção operacional confiável. |
| Histórico de auditoria | Sem acesso. | Leitura própria autorizada; sem escrita direta. | Gestão com rastreabilidade. |
| Função interna de auditoria | Sem execução. | Sem execução direta; chamada somente por triggers definidos. | Instalação/revisão. |

**Limite de `SECURITY INVOKER`:** a função executa com os privilégios do chamador. Não é possível revogar todo DML das tabelas ao mesmo papel e esperar que uma RPC invoker continue escrevendo nelas. O bloqueio de acesso HTTP direto vem da ausência de schemas/tabelas expostos; a integridade também precisa existir em constraints e triggers, sem confiar apenas na validação da função ou do frontend.

Revogar `EXECUTE` padrão de `PUBLIC` para funções da aplicação, conceder somente assinaturas necessárias e manter `search_path` fixo/objetos qualificados. Acesso administrativo, `service_role`, senha do banco e OAuth Client Secret nunca entram no bundle, Git, logs ou chat.

## Atomicidade, integridade e histórico

RPCs validarão argumentos/proprietário, autorização ativa e versões esperadas; alterações financeiras, receipt idempotente e registro incremental serão confirmados na mesma transação. Locks/constraints impedirão liquidação acima do evento e transferências incompletas. Mesmo chamadas diretas às RPCs devem falhar sem autorização ou com estado inconsistente.

Restrições entre linhas serão implementadas no banco antes de liberar a superfície: conta/categoria válidas, liquidações permitidas, soma liquidada, contrapartidas compatíveis e impossibilidade de destruir caixa histórico com cancelamento/edição indevida.

Se auditoria exigir elevação, a única exceção planejada é função de trigger interna `SECURITY DEFINER`, com proprietário NOLOGIN de privilégios mínimos, `search_path` seguro, sem parâmetros de SQL e sem execução direta concedida ao cliente. Esse papel somente poderá acrescentar auditoria; não poderá editar finanças, autorizações ou histórico. Não usar definer como atalho para corrigir permissões das RPCs financeiras.

## Proteção do navegador e arquivos

Renderizar descrições como texto, nunca HTML executável. Validar entradas nos limites de persistência e novamente no servidor. Sem logs de dados financeiros/tokens. HTTPS e política de conteúdo restritiva serão aplicados na hospedagem estática; callbacks OAuth terão URLs exatas.

Buckets futuros serão privados, com propriedade e autorização ativa nas políticas. Links assinados expiram; tipo/tamanho de arquivo serão validados. Falha no anexo não remove nem repete o lançamento.

IndexedDB não recebe criptografia própria neste incremento. Isolamento por proprietário não protege contra acesso ao perfil do navegador, devtools, malware ou perda do aparelho. Nunca anunciar criptografia inexistente. Primeiro login e recuperação Google precisam de conexão; uso offline posterior não é uma nova autenticação no servidor.

## Testes obrigatórios de I3

- Usuário autorizado lê/escreve apenas seus dados; usuário autenticado sem autorização não acessa RPC, tabela, exportação ou arquivo. Revogação em `app_access` bloqueia novos acessos mesmo com JWT ainda válido.
- Tentar contornar a interface pela Data API, trocar schema, chamar GraphQL, usar RPC de outro usuário, alterar `user_id` ou montar FK cruzada: tudo deve ser recusado.
- Tentar DML direto por superfícies expostas, função genérica, view ou grant herdado; verificar que nenhuma delas reabre as tabelas privadas.
- Tentar liquidação excessiva, transferência de uma só contrapartida, contrapartida incompatível, receipt forjado, ID idempotente reutilizado com conteúdo diferente e edição/exclusão concorrente.
- Tentar escrever auditoria diretamente, executar helper interno, alterar acesso próprio ou introduzir SQL/HTML em descrições. Fazer rollback integral em cada falha.
- Testar primeiro Google OAuth com usuário pré-criado/cadastro desligado, conta Google diferente, sessão expirada, callback indevido e chamadas anônimas. Não registrar esse conjunto como validado antes da integração real.
