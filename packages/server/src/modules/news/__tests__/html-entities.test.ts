import { describe, expect, it } from 'vitest'
import { decodeHtmlEntities } from '../html-entities.js'
import { normalizeInput, stripHtml } from '../news.domain.js'
import { parseFeed } from '../adapters/rss.js'

describe('decodeHtmlEntities', () => {
  it.each([
    ['hexadecimal (MarketWatch)', 'aren&#x2019;t', 'aren’t'],
    ['decimal (WordPress)', 'Diz &#8220;oi&#8221;', 'Diz “oi”'],
    ['codificada duas vezes', 'aren&amp;#8217;t', 'aren’t'],
    ['acentos nomeados', 'a&ccedil;&atilde;o &Eacute; &Ccedil;', 'ação É Ç'],
    ['pontuação tipográfica', 'a &mdash; b &ndash; c&hellip;', 'a — b – c…'],
    ['espaço inquebrável', 'R$&nbsp;5,19', 'R$ 5,19'],
    ['XML básico', '&lt;b&gt; &amp; &quot;x&quot; &apos;y&apos;', '<b> & "x" \'y\''],
  ])('%s', (_label, input, expected) => {
    expect(decodeHtmlEntities(input)).toBe(expected)
  })

  it('mantém entidade desconhecida ou código inválido como veio', () => {
    expect(decodeHtmlEntities('&naoexiste; &#xD800; &#0;')).toBe('&naoexiste; &#xD800; &#0;')
  })

  it('texto sem entidade passa intacto', () => {
    expect(decodeHtmlEntities('Dólar sobe e fecha a R$ 5,19')).toBe('Dólar sobe e fecha a R$ 5,19')
  })
})

describe('títulos de notícia vindos do RSS', () => {
  it('decodifica entidades no título, inclusive dentro de CDATA', () => {
    const xml = `<rss><channel>
      <item><title>Why investors aren&amp;#x2019;t buying</title><link>https://a.example/1</link></item>
      <item><title><![CDATA[Ibovespa &#8220;dispara&#8221; &#8211; alta de 2%]]></title><link>https://a.example/2</link></item>
    </channel></rss>`

    const titles = parseFeed(xml).map((raw) => normalizeInput(raw, 'Fonte').title)

    expect(titles).toEqual(['Why investors aren’t buying', 'Ibovespa “dispara” – alta de 2%'])
  })

  it('stripHtml remove tags antes de decodificar (texto &lt;b&gt; não vira tag)', () => {
    expect(stripHtml('<p>Alta de 2%</p> &lt;b&gt;texto&lt;/b&gt;')).toBe('Alta de 2% <b>texto</b>')
  })
})
