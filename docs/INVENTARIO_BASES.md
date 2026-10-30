# Inventário de bases — I3

Atualizado em 26/10/2026 após resposta explícita do usuário.

O usuário ainda não usou o Atlas nem cadastrou seus dados financeiros. Só foram executados testes sintéticos pelo agente na VM. Não há base pessoal inaugural escolhida, dado pessoal a migrar ou duas bases pessoais para reconciliar segundo essa informação. Não inferir que o IndexedDB desta VM é a futura base correta.

| Local conhecido | Situação | Tratamento |
|---|---|---|
| VM, Edge automatizado, `http://127.0.0.1:5173` | Testes locais de desenvolvimento, sintéticos e isolados por contexto. | Não associar à conta pessoal nem usar como seed. |
| VM, Edge automatizado, `http://127.0.0.1:4173` | Testes PWA de produção local, sintéticos. | Mesma separação; origem diferente de 5173. |
| Celular/computador pessoal | Sem uso do Atlas informado. Navegador/perfil/endereço definitivos ainda não definidos. | Orientar o primeiro uso quando login/sync e autorização para piloto estiverem prontos. |

Não foram inspecionados perfis pessoais para procurar bancos; o relato do usuário é suficiente para este inventário. Especificações históricas privadas encontradas no Drive não são uma base da aplicação e não autorizam cadastrar seus conteúdos.

No primeiro uso futuro: definir endereço aprovado, aparelho e perfil; confirmar se continua vazio; autenticar online com a conta autorizada; conferir o destino; escolher explicitamente uma base inaugural vazia ou outra origem que o usuário então indicar. Testar primeiro apenas dados sintéticos separados, conferir os dois aparelhos e a recuperação. Só cadastrar dados pessoais após autorização específica do piloto. Se aparecer alguma base antiga, parar a associação e atualizar o inventário sem apagar/unir origens.

Não há ação de exportação pessoal a executar agora. Código no GitHub não contém nem recupera bancos do navegador.
