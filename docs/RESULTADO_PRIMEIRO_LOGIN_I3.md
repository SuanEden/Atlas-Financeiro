# I3 — primeiro login Google real confirmado

Conferido em 27/10/2026 após o usuário executar a entrada pessoal orientada e enviar o texto da tela. Base anterior: `d9472cd2b8a1c82f79af3d727b7452e418e1d34d`, branch `codex/incremento-3-local-foundation`.

## Evidências observadas

O usuário informou os textos `Confirme a associação inicial online.` e `Login verificado. O envio remoto aguarda liberação.`, com os controles Entrar com Google e Sair e bloquear acesso local. Isso é relato textual da tela real do usuário; não captura inspecionada pelo agente nem execução em seu perfil pessoal.

Consultas administrativas somente de leitura confirmaram:

| Verificação | Resultado |
|---|---|
| Total de usuários | 1 |
| Mesmo UUID privado pré-cadastrado | Sim, igualdade exata |
| Conta confirmada e não anônima | Sim |
| Login registrado no usuário esperado | Sim |
| Identidades Google | 1, vinculada ao UUID esperado |
| Identidade Google em outro usuário | Nenhuma |
| Autorização ativa única para o mesmo UUID | Preservada |
| Tabelas privadas com registros | Nenhuma das sete |
| RLS nas oito tabelas | Ativo |
| Privilégios DML ao cliente | Nenhum nas tabelas privadas/autorização |
| Protocolo transacional posterior | Ausente |

O projeto existente permanece ativo em São Paulo. GET Auth retornou cadastro público fechado e **somente Google habilitado**. HTTP com chave publicável reconfirmou somente `api` exposto, `atlas_private` recusado com 406/PGRST106 e readiness anônimo negado com 401/42501. Nenhum usuário, grant, migração ou configuração remota foi alterado pelo agente nesta conferência.

## Interpretação e limites

Primeiro login Google real e vínculo ao cadastro existente comprovados por registros do servidor e relato da interface, sem duplicação de usuário. O código do adaptador verifica `auth.getUser()`, presença da identidade Google e resposta válida de `api.i3_readiness()` antes de publicar a mensagem de login verificado. O texto informado é compatível com esse caminho autenticado e com readiness financeiro falso.

Não foi extraído token/código nem capturado o tráfego autenticado do navegador pessoal. A inspeção HTTP independente desta etapa usa acesso anônimo e não substitui testes de outro JWT autenticado, expiração, revogação, sessão entre abas ou dois dispositivos. Não declarar toda a matriz de Auth/API aprovada.

A associação inicial **ainda não foi executada**. O app pede associação porque o namespace ainda não está ativo; como a escrita financeira está bloqueada, os controles de associação permanecem indisponíveis. Não liberar escrita, criar/copiar base, importar dados ou aplicar o protocolo posterior somente para ultrapassar essa tela. Nenhum dado financeiro foi criado ou promovido a pessoal. I3 continua incompleto.

Aplicativo, dependências e migrações locais inalterados; suíte anterior não repetida. Somente consultas reais de verificação e documentação sanitizada nesta etapa. Nenhum segredo, UUID, email, identificador Google, token, JSON de credenciais ou arquivo de sessão entra no checkpoint. Sem novo serviço, recurso pago ou publicação.

## Próximo teste pessoal — saída local e nova entrada

O próximo teste proposto permanece sem associação ou operação financeira:

1. Clicar Sair e bloquear acesso local.
2. Conferir aviso de acesso local bloqueado; botão Sair deve desaparecer, mantendo Entrar com Google.
3. Recarregar a página e confirmar que o bloqueio local permanece, sem retorno automático à sessão verificada.
4. Clicar Entrar com Google, escolher a mesma conta e concluir a entrada pessoal nas interfaces oficiais.
5. Ao voltar, conferir novamente a mensagem de login verificado/envio aguardando liberação, sem iniciar associação ou cadastrar dados.
6. Informar o resultado textual para conferência administrativa por leitura e próximo checkpoint.

O usuário executará pessoalmente essas ações; o agente não manipula a sessão do perfil pessoal. A saída implementada usa escopo local e não promete invalidação imediata de todo access token já emitido. Preservar a distinção entre bloqueio visual local e revogação de JWT no servidor.

Depois desse teste, continuar a revisão local do protocolo/gateway e preparar eventual próxima alteração remota como ação concreta para aprovação. Testes com outra conta, sessão expirada, autorização revogada, concorrência independente e dois aparelhos continuam pendentes; não abrir cadastro nem adicionar outra autorização para obter esses testes automaticamente.
