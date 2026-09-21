# Backlog

Itens conhecidos que **não bloqueiam** o deploy, registrados por decisão do Diego (20/09/2026).

## Próximo Work Item

- **Idempotência completa nas escritas financeiras** (`Idempotency-Key` em ordens, câmbio e caixinha). Hoje o front trava o duplo envio no cliente, mas o servidor não protege contra retry de timeout/409 nem duplo clique em outra aba.

## Melhorias futuras

- **Gráfico "Evolução do Patrimônio" e variação % do Painel usam histórico fabricado** (`portfolio.service.ts`, onda seno + tendência de +5% sobre o saldo atual). Substituir por histórico real (snapshots do patrimônio) ou rotular como ilustrativo. Não bloqueia; é dado falso apresentado como real, então tratar em seguida.
- **Cache de cotação compartilhado entre réplicas** (hoje por processo; sem efeito com 1 réplica).
- **Preço de seed em Ordens/Análise**: além do aviso visual, obter cotações reais (chave da Brapi, decisão pendente do Diego) para a prévia bater com o executado.
- **Recomendações**: hoje conteúdo estático rotulado como exemplo; avaliar recomendações reais.
- **Placeholders padrão do Tailwind nos campos Telefone e CPF do Perfil** com 3,31:1 no claro (abaixo de AA).
- **KYC do CPF** em produção real (hoje só validação de dígitos e senha atual para definir).
- **Teclado numérico real e dispositivos reais** não foram exercitados nos testes mobile (só emulação por WebView/user agent).
