# I3 local — continuidade após a recuperação

**Marco externo posterior:** o usuário criou o projeto de integração sintética e o agente confirmou, por consultas de leitura, estado ativo, São Paulo e plano Free. Ver [CONFIGURACAO_EXTERNA_I3.md](CONFIGURACAO_EXTERNA_I3.md). Isso atualiza o inventário de serviços, sem alterar código, habilitar integração ou comprovar Auth/SQL/publicação. As referências abaixo a nenhum serviço criado descrevem a entrega local anterior.

Atualizado em 26/10/2026. Este documento é o resumo vigente de implementação. Registros dos primeiros checkpoints foram preservados como histórico em estado/execução/validação.

## Base e checkpoints

- Recuperado do GitHub: `34b65665cf55202361c9b4ea7be1a271f4864f3a`, posterior a `6a7c308`, na branch `codex/incremento-3-local-foundation`.
- `3885cc4`: diagnóstico de recuperação e revalidação do que realmente estava versionado.
- `9699307`: correção dos 9 erros de compilação, proveniência da associação persistida e testes de sessão/controlador.
- Lote seguinte: ligação do runtime às telas, cópia I3 e cenários de navegador. Consultar o HEAD remoto desta mesma branch para o SHA exato; não selecionar um commit antigo pelo número citado nesta documentação.

I1/I2 e `main` não foram alterados. Não houve reset, force push ou merge. [Recuperação e perdas não comprováveis](RECUPERACAO_I3.md).

## Implementação local disponível

1. Modo padrão `VITE_ATLAS_REMOTE_MODE=disabled`: aplicação I2/recuperação mínima e bases anônimas preservadas. Nenhuma configuração real foi adicionada.
2. Modo futuro `integration`: entrada Google via SDK fixado, PKCE, callback exato limpo antes da troca, verificação de usuário/identidade Google e readiness por RPC. Configuração inválida bloqueia a visão; não cai silenciosamente no modo anônimo. O módulo de integração é carregado separadamente.
3. Política local persistida sem tokens: associação inicial exige a mesma sessão verificada; sessão expirada mantém consulta e novas operações offline após associação; envio exige a identidade verificada correspondente ao namespace. Readiness falso impede carga/envio. O SQL versionado continua com escrita desabilitada.
4. Logout bloqueia a visão imediatamente e após recarga, preservando IndexedDB/pendências. Eventos do SDK ou verificações antigas não o desfazem. Outra conta não herda a associação. Logout em uma aba bloqueia a outra pelo evento de armazenamento. Falha ao persistir o bloqueio também publica a política fechada em memória; indisponibilidade total de armazenamento não equivale a proteção durável garantida entre reinícios.
5. Controles de associação explícita: iniciar vazio, receber base existente ou conferir/copiar I2. Não escolhem uma base sintética automaticamente. Metadados guardam proprietário/digest/modo da origem; retomada após commit/resposta perdida usa o mesmo identificador. Origem alterada impede ativação e permanece preservada para conferência.
6. Telas financeiras usam a projeção do namespace I3 e a fila durável. A tela e os formulários são desmontados no bloqueio/troca. Ações de sincronizar, entrar novamente e sair exibem estados, sem promessa de envio com aplicativo fechado.
7. Conflitos ficam fora dos saldos. Aceitar o estado recebido guarda a tentativa original com estado `resolved`, sem apagar seu envelope, tratá-la como enviada ou reenviá-la. Dependências bloqueadas continuam visíveis; não há recriação financeira automática.
8. Exportação `atlas-financeiro-sync-backup`, versão 1: leitura consistente de base confirmada, projeção, envelopes pendentes/conflitantes/resolvidos, recibos, cursor e proveniência. Não lê armazenamento Auth. O importador I2 recusa esse formato; não há restauração completa de I4 nem promessa de recuperação I3 já validada.

Protocolo SQL, envelopes, recibos, feed e motor recuperados continuam cobertos pelos testes embarcados. Dois clientes simulados não são duas conexões PostgreSQL independentes nem dois aparelhos.

## Evidência e limites

Ver [VALIDACAO.md](VALIDACAO.md) para os resultados finais realmente observados. Testes de navegador de Auth substituem somente a entrada de teste por `tests/auth-browser-entry.tsx`, com identidade/transporte sintéticos. Esse módulo, PGlite, fake-indexeddb e fixtures não integram o bundle distribuído. Não há login Google real comprovado.

Navegador: Playwright/Edge, `http://127.0.0.1:5173`, 1280×900 e 390×844; não há Browser plugin disponível nesta sessão. Foram conferidos título/URL/conteúdo, ausência de overlay, console sem erros relevantes, associação, gravação, expiração, recarga, exportação, logout e segunda aba. Capturas ficaram no diretório temporário, fora do Git; contraste do botão de entrada foi corrigido após inspeção visual. PWA de produção foi revalidada no modo local padrão. Desconexão sintética de Auth não comprova ciclo OAuth/PWA autenticado real.

## Pendências locais antes da integração/piloto

- PostgreSQL com conexões independentes e ensaio de concorrência/rollback real. `psql` e Docker não foram encontrados nesta VM; PGlite não substitui essa prova. Preparar o ambiente local sem provisionar remotamente por consequência automática.
- Revisão das permissões e contratos no gateway JWT/PostgREST/Supabase completo, incluindo configuração exclusiva do schema API; os testes atuais simulam papéis/identidade.
- Exercitar associação com abas antigas fechadas e todos os pontos de interrupção, versões antigas de metadados, mais de uma origem e limites medidos. A carga atual recusa mais de 2 MiB/5 mil registros, sem ativação parcial; preparação em partes ainda não foi implementada. Não elevar limites silenciosamente.
- Completar confronto de conflito com a versão remota em detalhes, tratamento explícito das dependências bloqueadas e decisões para origens divergentes. Não criar comandos substitutos sem confirmação.
- Arquivamento/tombstones e proteção contra cliente antigo continuam requisitos pendentes de I3; não declarar a matriz inteira aprovada.
- Validar proteção operacional da cópia I3 e procedimento de recuperação do recorte antes de dados pessoais; exportação sozinha não prova restauração. Não transformar essa pendência em restauração completa/gerações de I4.
- Testes de callback/sessão/cache na PWA com integração autorizada e dois dispositivos físicos. Instalação/teclado/ciclo de vida Android ainda não comprovados.

As próximas ações externas são as de [PENDENCIAS_INCREMENTO_3.md](PENDENCIAS_INCREMENTO_3.md). Nenhum segredo, cadastro financeiro pessoal, conta de teste promovida a pessoal, serviço, OAuth remoto, SQL remoto, publicação, pagamento/trial ou piloto foi realizado. Orientar o usuário uma etapa por vez quando a participação for necessária. I3 está incompleto; I4 não começou.

## Retomar outra VM

`git fetch origin --prune`, conferir branches/commits/worktree e selecionar o HEAD remoto mais recente de I3 sem retroceder. Ler `AGENTS.md`, README, este resumo, plano/estado/validação/pendências. Em `app/`, executar `npm ci` e `npm run check` com Node >=22.12 e Edge. Não configurar `.env` real para rodar testes sintéticos. Confirmar commit e push de cada lote, com revisão dos arquivos e busca de segredos/dados pessoais. Código só está preservado após igualdade de HEAD com `git ls-remote`.
