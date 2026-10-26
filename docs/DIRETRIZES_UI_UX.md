# Diretrizes de UI e UX — Incremento 2

Diretrizes fornecidas pelo usuário em 26/10/2026. Aplicam-se à interface existente, preservando a arquitetura e os contratos financeiros aprovados.

- Priorizar celular Android, com boa experiência no computador. Manter branco, verde profundo, tipografia sóbria e valores fáceis de ler; preservar também o tema escuro existente.
- Dar hierarquia e contraste aos títulos, campos, estados e ações. Usar dígitos tabulares e alinhamento consistente nos valores monetários, sem conversão financeira para ponto flutuante.
- Manter novo lançamento acessível nas telas pertinentes. No primeiro uso sem contas, orientar a criação da primeira conta.
- Abrir o formulário rápido com foco no valor. Conta, categoria e descrição devem ser fáceis de preencher; detalhes ficam em área opcional.
- Manter navegação inferior confortável no celular, navegação lateral no desktop e áreas de toque adequadas. Respeitar áreas seguras e a redução do espaço disponível pelo teclado. Formulários devem rolar e suas ações permanecer acessíveis.
- Usar estados vazios reais, carregamento explícito, retorno de sucesso, erro compreensível e confirmação antes de estornar. Conservar os campos em caso de erro.
- Garantir rótulos acessíveis, foco visível, navegação por teclado, foco contido no diálogo, fechamento por Escape e retorno de foco à ação de origem.
- Informar que os dados estão neste navegador/dispositivo, que a outbox contém operações locais ainda sem envio e que é necessário exportar uma cópia fora do aparelho. Nunca apresentar dados locais como sincronizados.
- Apresentar a função de I2 como exportação JSON. Informar explicitamente que a restauração completa está prevista para I4 e não está disponível nesta versão.
- Evitar excesso de cartões, sombras, gradientes, animações e espaços vazios. Aplicar esses recursos apenas quando ajudarem a compreensão; respeitar redução de movimento.
- Não acrescentar dependências decorativas. Usar fontes do sistema e os ícones Lucide já presentes; não buscar fontes ou recursos externos em tempo de execução. A marca SVG e os PNGs da PWA são recursos próprios do projeto.
- Entregar a base vazia. Dados sintéticos pertencem somente a testes isolados; não inserir nomes pessoais, saldos ou indicadores fictícios na aplicação distribuída.
- Fazer ajustes pontuais na interface existente. Não ampliar funcionalidades nem reconstruir a aplicação por preferência estética.

Validação visual e funcional, comandos executados e limites do teste móvel estão em [VALIDACAO.md](VALIDACAO.md). Instalação física no Android não é comprovada pela emulação de viewport no Edge.
