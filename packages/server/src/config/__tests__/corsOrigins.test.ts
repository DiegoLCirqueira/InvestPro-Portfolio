// @investpro/server
// CORS_ORIGIN aceita uma ou mais origens exatas separadas por vírgula. Lista
// inválida derruba o boot (em produção principalmente) com mensagem clara que não
// ecoa o valor digitado.

import { describe, expect, it } from 'vitest'
import { parseCorsOrigins } from '../corsOrigins.js'

const OLD_ORIGIN = 'https://investpro1-five.vercel.app'
const NEW_ORIGIN = 'https://investpro.dev.br'

describe('parseCorsOrigins — uma origem (comportamento de sempre)', () => {
  it('uma origem devolve lista de um item', () => {
    expect(parseCorsOrigins(OLD_ORIGIN, true)).toEqual([OLD_ORIGIN])
  })

  it('sem variável (ou em branco) usa o padrão de desenvolvimento; em produção isso é recusado', () => {
    expect(parseCorsOrigins(undefined, false)).toEqual(['http://localhost:5173'])
    expect(parseCorsOrigins('   ', false)).toEqual(['http://localhost:5173'])
    expect(() => parseCorsOrigins(undefined, true)).toThrow('explicitamente em produção')
    expect(() => parseCorsOrigins('  ', true)).toThrow('explicitamente em produção')
  })

  it("'*' sozinho segue permitido só fora de produção (comportamento antigo de dev)", () => {
    expect(parseCorsOrigins('*', false)).toEqual(['*'])
    expect(() => parseCorsOrigins('*', true)).toThrow('curinga')
  })
})

describe('parseCorsOrigins — lista', () => {
  it('separa por vírgula, tira espaços, itens vazios e duplicatas, preservando a ordem', () => {
    const raw = ` ${OLD_ORIGIN} , ${NEW_ORIGIN},, ${OLD_ORIGIN} ,`

    expect(parseCorsOrigins(raw, true)).toEqual([OLD_ORIGIN, NEW_ORIGIN])
  })

  it('aceita http com porta (localhost em dev) e https com porta não padrão', () => {
    expect(parseCorsOrigins('http://localhost:5173,https://app.exemplo.com:8443', false)).toEqual([
      'http://localhost:5173',
      'https://app.exemplo.com:8443',
    ])
  })
})

describe('parseCorsOrigins — lista inválida derruba o boot', () => {
  it.each([
    ['origem padrão de dev em produção', 'http://localhost:5173', 'explicitamente em produção'],
    ['origem padrão de dev no meio da lista', `${NEW_ORIGIN},http://localhost:5173`, 'explicitamente em produção'],
    ["'*' sozinho", '*', 'curinga'],
    ["'*' misturado a outras origens", `${NEW_ORIGIN},*`, 'curinga'],
    ['subdomínio com curinga', 'https://*.investpro.dev.br', 'curinga'],
    ['lista vazia (só vírgulas)', ' , ,, ', 'vazia'],
    ['sem esquema', 'investpro.dev.br', 'origem exata'],
    ['esquema não http/https', 'ftp://investpro.dev.br', 'origem exata'],
    ['barra final', 'https://investpro.dev.br/', 'origem exata'],
    ['caminho', 'https://investpro.dev.br/app', 'origem exata'],
    ['porta padrão explícita', 'https://investpro.dev.br:443', 'origem exata'],
    ['host em maiúsculas (o navegador manda minúsculas)', 'https://InvestPro.dev.br', 'origem exata'],
    ['credenciais na URL', 'https://usuario:senha@investpro.dev.br', 'origem exata'],
    ['malformada', 'https://', 'origem exata'],
  ])('em produção: %s', (_case, raw, expectedFragment) => {
    expect(() => parseCorsOrigins(raw, true)).toThrow(expectedFragment)
  })

  it('um item inválido no meio da lista derruba tudo, indicando a posição', () => {
    expect(() => parseCorsOrigins(`${OLD_ORIGIN},https://investpro.dev.br/,${NEW_ORIGIN}`, true)).toThrow('item 2')
  })

  it('a mensagem nunca ecoa o valor digitado (ele pode conter credenciais)', () => {
    const marker = 'segredo-do-operador'
    let message = ''

    try {
      parseCorsOrigins(`https://${marker}:senha@investpro.dev.br/caminho`, true)
    } catch (err) {
      message = (err as Error).message
    }

    expect(message).not.toBe('')
    expect(message).not.toContain(marker)
    expect(message).not.toContain('senha@')
  })

  it('fora de produção o formato também é validado (origem malformada nunca casaria), e curinga misturado é recusado', () => {
    expect(() => parseCorsOrigins('http://localhost:5173/', false)).toThrow('origem exata')
    expect(() => parseCorsOrigins('http://localhost:5173,*', false)).toThrow('curinga')
  })
})
