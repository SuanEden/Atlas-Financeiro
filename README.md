# Atlas Financeiro

**Prioridade atual — 30/10/2026:** [versão inicial para uso local imediato](docs/USAR_AGORA.md). O usuário pediu começar a usar antes de concluir I3. Dados ficam em cada navegador, sem sincronização automática; exportar backup. Arquivamento e I3 continuam pendentes. Não presumir que as bases pessoais ainda estejam vazias.

**Checkpoint posterior, 28/10/2026:** [recuperação JSON I3 implementada localmente, limites e pendências](docs/ENTREGA_RECUPERACAO_I3_CHAT.md). Arquivamento/P03, revisão de navegador e sincronização física permanecem abertos; escrita remota bloqueada. Os marcos seguintes são históricos.

**Retomada de 28/10/2026:** [fonte recuperada e estado externo](docs/RETOMADA_2026_10_28.md), [compatibilidade corrigida, testes e pendências](docs/COMPATIBILIDADE_I3.md). Check final: 252 aprovados/1 ignorado, 24 navegador/3 PWA; runner SQL com 30 aprovados juntos. Login anterior comprovado, envio financeiro bloqueado. Recuperação total I3, arquivamento suportado e uso entre aparelhos físicos ainda pendentes; I3 incompleto.

Aplicação pessoal de gestão financeira com prioridade para celular Android, interface em português brasileiro, valores em BRL e datas financeiras no fuso `America/Fortaleza`.

Os **Incrementos 1 e 2** entregam uma aplicação financeira local verificável: domínio em centavos exatos, persistência Dexie, contas, categorias, receitas, despesas, transferências, reservas simples, edição/estorno imutáveis, dashboard, histórico, outbox, backup JSON e PWA offline. Autenticação, envio remoto e restauração completa pertencem aos incrementos seguintes.

## Desenvolvimento local

O projeto de aplicação está em `app/`. Nesse diretório, executar `npm ci`, `npm run dev` e `npm run check`. Dependências e lockfile são locais ao projeto. Não são necessários Docker, serviços externos, conta ou chave de IA para o uso local.

Requisitos: Node.js >= 22.12 e npm; os testes de navegador usam Microsoft Edge instalado. Desenvolvimento: `npm run dev`, em `http://127.0.0.1:5173`. Para testar a PWA, executar `npm run build` e `npm run preview`, em `http://127.0.0.1:4173`. Aguardar o primeiro carregamento online antes de testar offline. Esses dois endereços têm bases locais distintas; usar sempre o mesmo endereço para reencontrar seus dados.

Em **Backup**, o botão **Baixar backup** exporta JSON com histórico e outbox. Nesta branch de I3, a recuperação mínima autorizada aceita uma exportação I2 em origem/perfil vazio ou exatamente idêntico, sem unir/substituir bases. O arquivo inteiro é validado antes da gravação; IDs e pendências são preservados. Restauração completa e gerações permanecem em I4. Guardar a cópia fora do navegador e do aparelho.

**I3 em implementação, ainda incompleto.** Protocolo SQL, motor, sessão/associação e controles de acesso estão implementados e testados localmente com identidades sintéticas. Fundação, autorização única, API somente `api`, Google e protocolo remoto foram instalados com aprovação; **cadastro público e escrita financeira continuam desligados**. Google real no mesmo usuário, recarga/nova entrada e recusa de outra conta foram conferidos, sem duplicação ou dados financeiros. Dez testes nativos de concorrência, 24 verificações do protocolo hospedado com identidade simulada e regressão local completa passaram. [Evidência e limites atuais](docs/RESULTADO_PROTOCOLO_REMOTO_I3.md). O modo remoto do aplicativo permanece **desabilitado por padrão**; a preparação local usa integração apenas no processo de desenvolvimento, sem `.env` real. A expiração preserva trabalho offline após associação; logout explícito bloqueia a visão e preserva pendências. Matrizes completas de sessão/isolamento, gateway, concorrência e dois aparelhos continuam pendentes. [Resumo vigente e limites](docs/STATUS_I3_LOCAL.md), [recuperação](docs/RECUPERACAO_I3.md), [inventário](docs/INVENTARIO_BASES.md).

No futuro modo de integração, a exportação I3 usa um formato separado para preservar recibos, cursor, conflitos e proveniência, sem sessão. O importador mínimo I2 não aceita essa cópia. Exportação não é prova de restauração; I4 permanece fora do escopo.

[Proteção operacional revisada em 27/10/2026](docs/PROTECAO_OPERACIONAL_I3.md): 12 testes de cópia/retomada da origem, download real após logout/reentrada sintéticos e 7 de dump/restauração administrativa local aprovados. A recuperação do arquivo JSON I3 após perda total do navegador e o ensaio administrativo hospedado continuam pendentes. Escrita financeira permanece bloqueada.

## Documentação

- [Plano aprovado](docs/PLANO_APROVADO.md) e [roadmap completo](docs/ROADMAP.md).
- [Arquitetura](docs/ARQUITETURA.md), [modelo de dados](docs/MODELO_DE_DADOS.md) e [regras financeiras](docs/REGRAS_FINANCEIRAS.md).
- [Contrato de sincronização](docs/SINCRONIZACAO.md) e [backup e restauração](docs/BACKUP_E_RESTAURACAO.md).
- [Segurança e RPC](docs/SEGURANCA_RPC.md), [custos e limites](docs/CUSTOS_E_LIMITES.md) e [referências](docs/REFERENCIAS_E_DECISOES.md).
- [Estado atual](docs/ESTADO_ATUAL.md) e [validação realizada](docs/VALIDACAO.md) registram o que foi efetivamente implementado e testado.
- [Diretrizes de interface](docs/DIRETRIZES_UI_UX.md) e [próxima etapa](docs/PROXIMA_ETAPA.md).
- [Plano de I3 aprovado com limites](docs/PLANO_INCREMENTO_3.md), [decisões e ações](docs/PENDENCIAS_INCREMENTO_3.md) e [fontes oficiais](docs/REFERENCIAS_INCREMENTO_3.md). Implementação local autorizada; serviços remotos, OAuth, publicação e dados reais exigem autorizações específicas.

`database/modelo_inicial.sql` é uma referência de desenho relacional. Não foi aplicado em PostgreSQL, não configura Supabase e não está pronto para implantação.

As especificações privadas originais, dados reais, arquivos de backup, comprovantes e segredos não devem integrar o histórico Git nem artefatos publicados. Este README e `docs/` descrevem somente decisões técnicas sanitizadas. Alterações remotas realizadas e seus limites estão no estado atual; novas configurações remotas, abertura financeira e publicação exigem aprovação específica.
