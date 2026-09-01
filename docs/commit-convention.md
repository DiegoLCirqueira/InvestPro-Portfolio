# Padrão de Commits

A partir deste ponto, todos os commits do InvestPro (Orchestrator, especialistas e Claude Auxiliar) devem seguir o padrão de [iuricode/padroes-de-commits](https://github.com/iuricode/padroes-de-commits).

## Formato

```
<emoji> <tipo>: <descrição sucinta>

<corpo opcional com detalhes>

<rodapé opcional: referências, breaking changes, coautoria>
```

- Primeira linha curta e direta (poucas palavras), no imperativo.
- Corpo (quando necessário) explica o *porquê*, não o *o quê* — o diff já mostra o que mudou.
- Rodapé é o lugar para `BREAKING CHANGE:`, referências a issues/cards e trailers de coautoria.

## Tipos

| Tipo | Emoji | Quando usar |
|---|---|---|
| `feat` | ✨ | Nova funcionalidade ou recurso |
| `fix` | 🐛 | Correção de bug |
| `docs` | 📚 | Documentação e README |
| `test` | 🧪 | Testes novos ou alterados |
| `build` | 📦 | Dependências e configuração de build |
| `perf` | ⚡ | Melhoria de performance |
| `style` | 👌 | Formatação, sem mudança de lógica |
| `refactor` | ♻️ | Reestruturação sem alterar comportamento |
| `chore` | 🔧 | Tarefas e configurações gerais |
| `ci` | 🧱 | Integração contínua |
| `raw` | 🗃️ | Arquivos de configuração/dados |
| `cleanup` | 🧹 | Remoção de código comentado/morto |
| `remove` | 🗑️ | Exclusão de arquivos ou funcionalidades obsoletas |

## Exemplos

```
✨ feat: seed de usuário admin

🐛 fix: corrige loop no cálculo de diversificação

♻️ refactor: extrai validação de CPF para helper

🧪 test: mocka adapters de mercado nos testes unitários
```
