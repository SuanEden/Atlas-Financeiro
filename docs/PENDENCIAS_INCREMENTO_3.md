# Incremento 3 — decisões e ações do usuário

Atualizado em 26/10/2026. Plano detalhado em [PLANO_INCREMENTO_3.md](PLANO_INCREMENTO_3.md). **Nada desta lista foi configurado ou provisionado nesta tarefa.**

## Decisões antes de autorizar implementação

| ID | Decisão necessária | Recomendação e consequência |
|---|---|---|
| D1 | Aprovar contratos e etapas do plano. | Manter I2; Google com usuário pré-provisionado, cadastro fechado e autorização por UUID. Se o primeiro login falhar, interromper em vez de abrir cadastro. |
| D2 | Onde já existem dados: aparelho, navegador/perfil e endereço exato? | Escolher uma origem inaugural. Inventariar separadamente `127.0.0.1`, `localhost`, portas e perfis; não limpar nenhuma base. Informar apenas localização e se contém dados, sem enviar saldos/lançamentos ao Git. |
| D3 | Há dados independentes no celular e computador? | Se sim, revisar a reconciliação antes de enviar a segunda origem. Mesmo nome/valor não prova duplicidade. Não aceitar dois saldos iniciais para a mesma conta por dedução automática. |
| D4 | Como executar o futuro código I3 na origem que contém a base? | Preferir o mesmo endereço/perfil e associar ali antes de mudar para HTTPS. Se só restou um arquivo de backup ou a origem não pode ser retomada, aprovar recuperação específica ou aguardar I4. |
| D5 | Aprovar o recorte de proteção de recuperação? | Preservar origem, conferir cópia externa, associação retomável e ensaio operacional isolado antes do piloto. Importação genérica e gerações continuam em I4. Se recuperação por arquivo em outro aparelho for obrigatória já em I3, antecipá-la em escopo separado ou adiar dados reais. |
| D6 | Política de sessão expirada e saída. | Permitir trabalho local do último UUID verificado após expiração offline; impedir envio até reautenticar. Saída explícita bloqueia visão local e preserva pendências; usar logout `local` por padrão. Revogação offline imediata e criptografia local não são garantidas. |
| D7 | Conta Google autorizada e eventual conta de teste negativo. | Escolher conta de que o usuário controla acesso e recuperação. Inserir identidade privadamente na configuração administrativa; não registrar email pessoal neste repositório. Uma segunda conta de teste não será autorizada em produção. |
| D8 | Infraestrutura de teste e serviços. | Confirmar se há Docker/CLI/PostgreSQL local disponíveis e projetos/organizações existentes. Criar recursos remotos somente com autorização explícita, após confirmar Free e ausência de faturamento exigido. Não abrir contas para contornar cotas. |
| D9 | Endereço HTTPS estável para os dois aparelhos. | Cloudflare Pages estático conforme direção aprovada; publicação é uma autorização separada. Sem URL acessível nos dois aparelhos, não declarar concluído o teste físico de sincronização/PWA. |
| D10 | Região, exposição dos dados e piloto real. | Escolher região disponível e aceitar armazenamento no provedor e limites gratuitos; autorizar dados reais somente após todos os critérios de integridade, acesso e recuperação. Não pressupor que o GitHub contém o banco do navegador. |

Não são perguntas de senha ou pedidos para colar tokens. Respostas técnicas podem ser registradas de forma sanitizada; identidade pessoal, cópias e configurações sensíveis permanecem fora do Git. As recomendações ainda não foram aprovadas apenas por este documento existir.

## Sequência futura de ações do usuário

1. **Revisar e aprovar o plano e as decisões D1–D10.** Indicar o que está autorizado: implementação local, criação/configuração de serviços, migrações remotas, publicação e piloto real são permissões distintas. Neste momento somente planejamento/documentação estão autorizados.
2. **Localizar e preservar os dados atuais.** Exportar em cada origem que contém dados, salvar fora da VM/aparelho e manter o navegador/base original. Confirmar onde ficará a base inaugural e se há outra base a reconciliar. Não anexar esses arquivos ao repositório público.
3. **Preparar as contas de administração, quando essa etapa for autorizada.** Acessar Supabase e Google com as próprias contas. Confirmar organizações/projetos existentes e o plano Free nas telas reais. Não aceitar trial, cartão, upgrade, recursos pagos ou cobrança por consumo para prosseguir. Se aparecer exigência, interromper e revisar o plano.
4. **Confirmar o ambiente de testes.** Disponibilizar ambiente local de PostgreSQL/Auth adequado e, para a prova Google, projeto hospedado aprovado com dados sintéticos. O teste local usa dois usuários sintéticos; o projeto pessoal autoriza apenas o dono.
5. **Cadastrar a identidade autorizada privadamente.** Em procedimento administrativo, pré-provisionar usuário confirmado, guardar UUID esperado, ativar `app_access` somente para ele e desabilitar cadastros/provedores extras. Essa ação deverá seguir as migrações/configuração então revisadas, não comandos improvisados no projeto pessoal.
6. **Preparar Google Auth Platform e Supabase Google, após autorização.** Cliente Web, escopos básicos, audiência apropriada à conta e retornos exatos definidos pelo ambiente. O usuário insere o Client Secret diretamente no painel seguro do Supabase; ele nunca entra em `VITE_*`, Git, logs ou chat. Não pedir acesso a Gmail/Drive ou domínio pago.
7. **Participar do teste do primeiro login.** Escolher a conta correta, concluir consentimento/2FA na interface Google e confirmar a identidade pré-provisionada. Fazer também o teste negativo da outra conta quando disponível. Falha nessa prova impede a migração financeira.
8. **Autorizar separadamente o endereço HTTPS e sua publicação, quando necessário.** Antes de conectar Git à hospedagem, definir controles para que branches de trabalho e documentação não publiquem automaticamente. Não adicionar dados, backups ou segredos aos ativos do site.
9. **Revisar a prévia de associação.** Conferir origem e destino, contagens e cópia externa. Aprovar o lote; não permitir fusão automática de duas bases distintas. Manter a origem enquanto se comparam recibos, saldos e histórico nos aparelhos.
10. **Executar o teste físico e aprovar o piloto.** Celular Android e computador: login, offline, lançamento, reconexão, correção concorrente, estorno, saída/reentrada e exportação. Conferir recuperação do recorte acordado e cotas. Só depois liberar dados reais e encerrar I3 mediante evidências.

## Dados/configurações por local de armazenamento

| Informação | Destino correto |
|---|---|
| Senha Google, 2FA e recuperação | Somente interfaces oficiais controladas pelo usuário. |
| Email autorizado/UUID operacional | Registro administrativo privado; no Git apenas placeholders e testes sintéticos. |
| OAuth Client Secret, chave secret/service role e senha de banco | Painéis seguros/ambiente administrativo local protegido. Nunca frontend, chat ou Git. |
| URL e chave publicável Supabase | Configuração do frontend na etapa autorizada; sua exposição não concede acesso sem RLS. |
| Backups, dumps, comprovantes e saldos | Armazenamento privado externo à VM/aparelho, sem versionamento. |
| Código, plano, migrações sanitizadas e evidências sem dados reais | Branch de trabalho no GitHub, após revisão dos arquivos preparados. |

## Bloqueios objetivos antes do piloto

- Conta autorizada, primeira vinculação e restrição de cadastro ainda não foram provadas em serviço real.
- Origens com dados e necessidade de reconciliação não foram inventariadas nesta tarefa.
- Estado Free, cotas, faturamento e disponibilidade das contas reais não foram inspecionados.
- Ambiente de testes, URL HTTPS e autorizações futuras precisam ser definidos pelo usuário.
- Proteção da associação, recuperação operacional e política offline/saída precisam de aprovação e teste.
- Restauração completa continua ausente até I4 ou novo recorte explicitamente aprovado.
- Os requisitos pessoais originais citados no histórico estão ausentes da VM; conferir privadamente eventuais restrições adicionais antes de implementar.

Não há início automático de I3, OAuth, banco remoto ou deploy quando este plano for salvo no GitHub.
