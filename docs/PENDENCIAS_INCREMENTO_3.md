# Incremento 3 — decisões e ações do usuário

**Estado vigente:** [STATUS_I3_LOCAL.md](STATUS_I3_LOCAL.md) separa o que já funciona em teste local das provas pendentes. Controles de sessão/associação/envio já estão ligados às telas com identidades sintéticas; não se exige participação do usuário para executar esses testes. O roteiro de ações externas abaixo continua condicionado às autorizações específicas. Nenhuma base sintética será associada como pessoal.

Retomada da VM em 26/10/2026: [diagnóstico](RECUPERACAO_I3.md). Nenhuma participação/configuração externa é necessária para corrigir e testar o lote local de sessão/associação. O protocolo SQL e o motor já existem, com testes embarcados reexecutados; integração real e concorrência entre conexões continuam pendentes.

Atualizado em 26/10/2026. [Plano aprovado com limites](PLANO_INCREMENTO_3.md) e [execução atual](EXECUCAO_INCREMENTO_3.md). **Implementação local autorizada; integração real ainda não autorizada nem comprovada.**

## Decisões já respondidas

| Tema | Decisão vigente |
|---|---|
| Plano e execução | Aprovados: branch própria, código, migrações versionadas, testes locais e checkpoints GitHub. Preservar I2. |
| Recuperação | Antecipar somente exportar I2 e recuperar em nova origem/dispositivo, preservando IDs/centavos/histórico/outbox, validação antes de escrever e sem gravações parciais/duplicação. Comprovar com sintéticos antes de dados reais. Sem restauração completa de I4. |
| Offline/expiração | Após associação inicial online, consultar e gravar offline. Expiração preserva pendências e exige autenticar para transmitir. |
| Logout/troca | Logout explícito bloqueia visão até nova autenticação, preservando pendências; documentar proteção local limitada. Não prometer sync com app fechado. |
| Originais privados | Os quatro arquivos foram encontrados e lidos no Drive. Nada a reenviar agora; manifesto antigo de hashes continua ausente. |
| Bases existentes | O usuário nunca usou nem cadastrou dados financeiros. Só testes sintéticos na VM. Não escolher esses testes como inaugural nem mesclar. Ver inventário. |
| Serviços/segredos | Criação/configuração externa, OAuth, SQL remoto e publicação exigem autorização específica. Não ativar pagamento/trial/faturamento. Nunca solicitar senhas ou tokens no chat. |
| Entrega/piloto | Separar local, simulado e real. Não concluir I3 sem login restrito, isolamento e dois dispositivos reais. Piloto real e I4 exigem autorização. |

## O que ainda depende do usuário

Neste checkpoint **não é necessário cadastrar dados, escolher uma base de teste como pessoal ou configurar qualquer serviço**. O próximo lote de contratos/RPCs/testes locais continua autorizado e independe dessas configurações.

Quando a etapa de integração estiver preparada e revisada, apresentar a ação concreta para aprovação, nesta ordem:

1. **Inventariar contas e ambiente do provedor.** Informar se já possui organização/projeto Supabase e conta Google sob seu controle. Conferir plano Free, cotas compartilhadas, região disponível, pausa e ausência de exigência de cartão/trial/pagamento nas telas atuais. Não criar recursos para contornar limites. A condição real das contas ainda não foi verificada.
2. **Autorizar um projeto de integração sintética.** Identificar projeto/ambiente/região aprovados antes de qualquer criação/configuração ou aplicação de migração. Os arquivos desta branch ainda são fundação parcial e não devem ser aplicados como backend pronto. Testes de concorrência precisam de PostgreSQL com conexões independentes; PGlite não os substitui.
3. **Definir identidade privadamente.** Escolher a conta Google autorizada e, se disponível, outra conta controlada para teste negativo. Registrar email/UUID operacional só no procedimento administrativo privado. Não inferir identidade pelo GitHub; não cadastrar a conta negativa como autorizada em produção.
4. **Aprovar e executar configuração de Auth.** Após procedimento revisado, pré-provisionar um único usuário com email confirmado, guardar UUID esperado, ativar autorização por UUID; desativar cadastro público, login anônimo, email/senha/OTP e provedores extras. Não abrir cadastro se o primeiro vínculo falhar.
5. **Configurar Google somente após autorização específica.** Cliente Web com escopos básicos e callbacks exatos Google → Supabase e Supabase → app. Inserir Client Secret diretamente no painel seguro Supabase. Nunca em `VITE_*`, Git, logs ou chat. Não pedir acesso a Gmail/Drive/contatos. URL/chave publicável do frontend só serão usadas na etapa autorizada, sem chave administrativa no cliente.
6. **Concluir pessoalmente o primeiro login.** Conta correta, consentimento/2FA nas interfaces oficiais, mesmo UUID pré-provisionado e nenhuma conta duplicada; repetir login/logout e testar conta negada/revogação/callback inválido. São provas obrigatórias antes de associar finanças.
7. **Definir endereço estável para celular e PC.** Publicação HTTPS depende de autorização separada e revisão que impeça deploy automático de branches de trabalho. Push de código não autoriza deploy. Duas abas/perfis no mesmo PC não cumprem o teste físico.
8. **Seguir a orientação de primeiro uso, ainda com sintéticos.** Definir aparelho, navegador/perfil e endereço, conferir base vazia e confirmar associação explicitamente. Se surgirem dados antigos, atualizar inventário e preservar cópia/origem; não unir automaticamente.
9. **Executar provas nos dois aparelhos.** Offline/reconexão, lançamentos, estorno/correção concorrente, queda após commit, logout/expiração, cópia/recuperação e verificação de centavos/histórico. Conferir cotas e riscos remanescentes.
10. **Autorizar separadamente o piloto pessoal.** Só após critérios obrigatórios aprovados, orientar cadastro real passo a passo. Não iniciar I4 nem tratar o piloto como já autorizado.

## Onde cada informação fica

| Informação | Local correto |
|---|---|
| Senha Google/2FA/recuperação | Interfaces oficiais sob controle do usuário. |
| Email autorizado/UUID operacional | Registro administrativo privado; somente placeholders no Git. |
| OAuth Client Secret, chave secret/service role, senha de banco | Painéis/ambiente administrativo protegido. Nunca frontend/chat/Git. |
| URL e chave publicável Supabase | Configuração de frontend futura revisada; RLS e autorização continuam obrigatórias. |
| Bases, cópias, comprovantes, dumps e exportações | Armazenamento privado externo à VM/aparelho. |
| Código, migrações e documentação sanitizada | Branch própria no GitHub, após revisão dos arquivos preparados. |

## Bloqueios antes de dados reais

Login Google restrito com cadastro fechado, isolamento por JWT/API, RPCs transacionais e idempotentes, associação retomável, feed/cursor, conflitos, sessão/logout e sincronização física continuam pendentes. Recuperação local I2 passou com dados sintéticos; não comprova recuperação de uma futura base sincronizada nem ensaio administrativo remoto. Não há gratuidade permanente garantida; limites oficiais em [CUSTOS_E_LIMITES.md](CUSTOS_E_LIMITES.md) precisam ser conferidos de novo antes de provisionar.
