# ADR 0001: Soft-delete em Portfolio e Position (em vez de CASCADE físico)

- **Status:** Aceito
- **Data:** 2026-09-16

## Contexto

No checkup de banco de 2026-09-16, o database-specialist identificou que a migration
`20260905022746_add_explicit_ondelete_constraints` deixou explícito `onDelete: CASCADE`
de `User` para `Portfolio`, `Position`, `RefreshToken`, `PasswordResetToken` e
`BankAccount`. Para `Portfolio`/`Position` isso significa que apagar um `User` no banco
apaga fisicamente e em silêncio o saldo e as posições de investimento dele, sem trilha
de auditoria — dado financeiro que pode ter requisito de retenção/compliance (o
histórico de patrimônio do cliente).

`RefreshToken` e `PasswordResetToken` não representam histórico financeiro (são
artefatos de sessão/autenticação com TTL curto) e não entram nesta decisão.
`BankAccount` também ficou de fora do escopo pedido — permanece CASCADE por ora; se
precisar do mesmo tratamento, é uma decisão separada.

Hoje não existe nenhum fluxo de produção que apague um `User` (só um helper de teste,
`deleteUser` em `integration.helpers.ts`, que já remove `Position`/`Portfolio`
manualmente antes do `User`, sem depender de CASCADE). Esta é uma correção preventiva
de schema, não uma resposta a um incidente.

## Opções consideradas

1. **Manter CASCADE.** Simples, mas perde dado financeiro sem trilha nenhuma — não
   aceitável para saldo/posições.
2. **Trocar para `Restrict`, sem soft-delete.** Bloqueia o delete físico do `User`
   enquanto existir `Portfolio`, mas não dá um caminho de "encerrar conta" — a app
   ficaria travada sem alternativa.
3. **Soft-delete (`deletedAt` nullable) em `Portfolio`/`Position` + FK `Restrict`.**
   O dado nunca é apagado por cascade; "apagar" um usuário passa a exigir que a
   aplicação marque `deletedAt` explicitamente (fluxo ainda não implementado). A FK
   `Restrict` garante que ninguém consiga apagar fisicamente o `User` por engano
   enquanto o `Portfolio`/`Position` (soft-deletado ou não) ainda existir — a
   ausência de um dado é sempre uma decisão de query (`deletedAt: null`), nunca uma
   perda física.

## Decisão

Opção 3. Adicionado `deletedAt DateTime?` em `Portfolio` e `Position`; a FK de
`Portfolio.userId → User.id` e `Position.portfolioId → Portfolio.id` mudou de
`Cascade` para `Restrict`. `RefreshToken`, `PasswordResetToken` e `BankAccount`
permanecem `Cascade` (não são histórico financeiro / fora do escopo).

Queries de leitura que listam portfólio/posições (`getPortfolio`, `getHistory`,
`getDiversification` em `portfolio.service.ts`) agora filtram `deletedAt: null` por
padrão, tanto no `Portfolio` quanto no `include`/`select` de `positions`.

Fora de escopo desta mudança: o fechamento de posição a zero via venda
(`order.service.ts`, `tx.position.delete` quando `applySellFill` retorna `null`)
continua sendo um delete físico — é um evento de negócio normal (posição zerada),
não uma cascata de exclusão de usuário, e seu histórico já fica preservado nas
`Order`s. Os caminhos transacionais de escrita (`order.service.ts`,
`transfer.service.ts`) também não foram alterados para filtrar `deletedAt`, pois
nenhum fluxo hoje cria um `Portfolio`/`Position` soft-deletado — quando um fluxo de
"encerrar conta"/exclusão de usuário for implementado, ele deve setar `deletedAt`
explicitamente e, nesse momento, os caminhos de escrita devem passar a checar
`deletedAt: null` também.

## Consequências

- Nenhuma perda de dado financeiro por cascade a partir de agora: apagar um `User`
  fisicamente só é possível depois que `Portfolio`/`Position` deixarem de existir
  (o que hoje, sem um fluxo de soft-delete implementado, na prática bloqueia
  qualquer `DELETE FROM "User"` enquanto ele tiver portfólio — comportamento
  esperado e desejado).
- Precisa de um fluxo de aplicação (futuro) que, ao "excluir" um usuário, marque
  `deletedAt` em `Portfolio`/`Position` em vez de fazer `DELETE`. Esta ADR não
  implementa esse fluxo, só remove a armadilha de perda silenciosa.
- `@@unique([portfolioId, ticker])` em `Position` não considera `deletedAt` — se um
  dia `Position` puder ser soft-deletada em fluxos normais (não é o caso hoje), um
  novo registro para o mesmo ticker colidiria com o soft-deletado. Reavaliar
  (índice único parcial `WHERE "deletedAt" IS NULL`) quando esse cenário existir.
- Migration `20260917013605_soft_delete_portfolio_position` é aditiva/segura
  (`ADD COLUMN` nullable + troca de ação de FK) — sem backfill necessário, aplicada
  diretamente no banco de dev (`investpro-dev`).
