# I3 — protocolo remoto instalado, escrita bloqueada

Executado em 27/10/2026 após o usuário pedir prosseguimento e todas as ações necessárias, em resposta à proposta específica da segunda migração com escrita bloqueada. Base anterior: `780b7524e40f42df1db612212923dabec7585893`, branch `codex/incremento-3-local-foundation`.

Autorização interpretada como confirmação dessa aplicação, validação e correções técnicas de apoio no mesmo projeto. Limites anteriores preservados: cadastro fechado, zero contratação/serviço novo, sem publicação, associação ou abertura financeira. Não pedir novamente aprovação para migrações aqui já executadas.

## Prévia e histórico real

Leituras reconfirmaram projeto `atlas-financeiro-i3` existente ativo em São Paulo, organização Free, somente fundação instalada, UUID/autorização exatos preservados, uma identidade Google e sete tabelas privadas vazias. GET Auth: cadastro fechado e somente Google. HTTP: somente `api` exposto; schemas privados recusados.

Aplicado exclusivamente o protocolo preparado, com checksum inalterado. O advisor de desempenho apontou em seguida uma FK sem índice de apoio; criada migração local pela CLI e validada em PostgreSQL nativo antes de aplicá-la como correção de apoio. Ela não altera dados, grants, RLS ou gate.

| Artefato local | Versão no histórico remoto | Resultado |
|---|---|---|
| `20261026164923_i3_private_foundation.sql` | `20261027152920 / i3_private_foundation` | Preexistente, não reaplicado |
| `20261026171659_i3_transaction_protocol.sql` | `20261027163903 / i3_transaction_protocol` | Aplicado nesta etapa |
| `20261027164215_i3_incorporated_bootstrap_index.sql` | `20261027164301 / i3_incorporated_bootstrap_index` | Aplicado nesta etapa |

SHA-256 do protocolo: `d99195c09e3e674816e4ffaf223f28deb6d4c597abfa825b25584485c4fd2187`. Do índice: `879e73a9368c3d1ec611db8b6abded6691818848dc9cfc504954443b644c25b2`. A ferramenta gera versões remotas diferentes do prefixo local; não executar db push nem reaplicar arquivos para conciliar nomes. Comentários históricos nos SQLs não são inventário de execução; conferir histórico e este registro.

## Estrutura e permissões verificadas

- Onze tabelas com RLS ativo: nove privadas e duas de segurança.
- `integration_control`: uma linha e **writes_enabled=false**.
- API contém somente `i3_readiness`, `i3_apply` e `i3_pull`, todas SECURITY INVOKER, EXECUTE autenticado e negado ao anônimo.
- authenticated tem SELECT/INSERT interno nas nove tabelas privadas e UPDATE somente da coluna revision em sync_heads. Sem UPDATE de user_id, DELETE privado ou DML nos controles administrativos. Esses grants são necessários às RPCs invoker; **não representam exposição HTTP das tabelas**.
- anon sem acesso aos schemas privados/API ou às tabelas. Ambos os papéis sem LOGIN PostgreSQL, superuser ou bypass de RLS.
- Índice válido `incorporated_operations_bootstrap(user_id,bootstrap_id)`, apoiando a FK de incorporated_operations para operation_receipts.

## Verificações do protocolo hospedado

Executado [`scripts/sql/i3-verify-protocol-disabled.sql`](../scripts/sql/i3-verify-protocol-disabled.sql), com UUID vinculado privadamente. **24 verificações retornaram true**, usando papéis reais e identidades simuladas administrativamente, sem extrair JWT da sessão pessoal:

| Grupo | Verificações |
|---|---|
| Proprietário/controle de escrita | Readiness false, pull vazio, apply negada com REMOTE_WRITES_DISABLED, cliente não altera autorização/gate, cursor inválido e futuro recusados: 7 |
| authenticated sem identidade | Autorização/controle ocultos e três RPCs negadas: 5 |
| authenticated com outro UUID sintético não cadastrado | Autorização/controle ocultos e três RPCs negadas: 5 |
| anon | Três RPCs e leituras privada/autorização negadas: 5 |
| Inventário após testes | Nove tabelas ainda vazias e gate ainda false: 2 |

O payload de escrita é sintético e válido, mas a RPC o recusa antes de gravar. Nenhuma fixture, usuário ou base financeira foi inserida no projeto hospedado; sucesso inesperado causaria exceção/rollback do bloco de verificação. Tentativas de mudar controles foram negadas por privilégios.

HTTP com chave publicável existente, sem sessão: as três RPCs retornaram **401/42501**; schemas atlas_private e atlas_security retornaram **406/PGRST106**, com lista exposta somente api. GET Auth permanece cadastro fechado/somente Google.

Inventário final por leitura: **1 usuário original, 1 identidade Google, autorização única exata preservada, nove tabelas privadas vazias, gate false, onze tabelas com RLS e índice válido**. Nenhuma associação, lançamento, recibo ou lote remoto criado.

## Advisors e verificações locais

Após o índice de apoio, o advisor não retornou mais FK sem cobertura. Permaneceram quatro INFO de índices ainda não usados em tabelas vazias; preservados. Security advisor retornou somente WARN anterior de proteção de senhas vazadas desligada, com entrada por Email desativada; sem mudanças de plano/configuração para remover esse aviso.

Ferramenta nativa Windows agora carrega todas as migrações locais ordenadas e exercita o script de 24 verificações também no primeiro teste, com gate false. `npm test` em tools/i3-postgres: **10 aprovados**, incluindo as migrações/índice e o script novo. Todos os clusters próprios encerrados; banco PostgreSQL preexistente preservado.

`npm run check` em app aprovado: **201 testes/1 ignorado, build/typecheck, 24 de navegador e 3 PWA**. O ignorado depende do manifesto privado original ausente. Browser plugin ausente: Playwright/Edge já configurado. A suíte cobriu UI local/sintética e PWA offline; não automatizou o perfil pessoal nem um login Google real adicional.

Para preservar o servidor pessoal em 127.0.0.1:5173, a configuração de testes passou a aceitar ATLAS_BROWSER_TEST_PORT, mantendo 5173 por padrão. A execução completa usou 5174; preview PWA usou 4173. O teste de URL usa a origem configurada, e o Vite é iniciado pela CLI local com strictPort. A porta 5173 permaneceu ativa. Nenhuma mudança em componentes React, código financeiro, dependências/lockfile de app ou modo padrão disabled.

## Limites e próximo passo

As negativas HTTP são reais; identidades dos 24 testes SQL são simuladas. Primeiro login/recarga/saída/reentrada e recusa de outra conta foram comprovados nas etapas anteriores, mas isso não transforma o ensaio SQL em prova completa das RPCs novas com JWT assinado.

Escrita e associação continuam bloqueadas. Antes de dados pessoais, permanecem a matriz autenticada das rotas novas, casos de sessão/isolamento restantes, recuperação operacional do recorte, proteção de versões/arquivamento e ensaios com dois aparelhos. Não declarar I3 concluído, publicar ou abrir writes_enabled por consequência do sucesso desta instalação.

Próxima conferência pessoal simples: recarregar a tela local e confirmar que a sessão continua verificada e o envio continua aguardando liberação. Essa observação percorre novamente a readiness autenticada após a migração; não pede segredo, token, URL com código ou associação financeira.
