// @investpro/server
// Decodifica entidades HTML de títulos/resumos de feeds RSS. O fast-xml-parser
// só resolve as 5 entidades do XML (&amp; &lt; &gt; &quot; &apos;): numéricas
// (&#8217; &#x2019;), nomeadas do HTML (&ccedil; &mdash;) e o texto de CDATA
// chegavam cruas na tela ("aren&#x2019;t").

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', bull: '•', middot: '·',
  lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„',
  laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›',
  deg: '°', ordm: 'º', ordf: 'ª', sup1: '¹', sup2: '²', sup3: '³',
  frac12: '½', frac14: '¼', frac34: '¾', times: '×', divide: '÷',
  plusmn: '±', percnt: '%', euro: '€', pound: '£', yen: '¥', cent: '¢',
  copy: '©', reg: '®', trade: '™', sect: '§', para: '¶',
  iexcl: '¡', iquest: '¿', shy: '',
}

// Letras acentuadas do Latin-1: &aacute; &Ccedil; &atilde; ...
const ACCENTED_LETTERS: Record<string, string> = {
  acute: 'áéíóúýÁÉÍÓÚÝ',
  grave: 'àèìòùÀÈÌÒÙ',
  circ: 'âêîôûÂÊÎÔÛ',
  tilde: 'ãñõÃÑÕ',
  uml: 'äëïöüÿÄËÏÖÜ',
  cedil: 'çÇ',
  ring: 'åÅ',
}

for (const [suffix, letters] of Object.entries(ACCENTED_LETTERS)) {
  for (const letter of letters) {
    const base = letter.normalize('NFD')[0]
    NAMED_ENTITIES[`${base}${suffix}`] = letter
  }
}

const ENTITY_PATTERN = /&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi
// Feeds às vezes codificam duas vezes (&amp;#8217;): uma passada extra resolve.
const MAX_PASSES = 2

function decodeCodePoint(codePoint: number, original: string): string {
  const isValid =
    codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
  return isValid ? String.fromCodePoint(codePoint) : original
}

function decodeEntity(match: string, body: string): string {
  if (body[0] === '#') {
    const isHex = body[1] === 'x' || body[1] === 'X'
    return decodeCodePoint(parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10), match)
  }
  return NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()] ?? match
}

export function decodeHtmlEntities(value: string): string {
  let decoded = value
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const next = decoded.replace(ENTITY_PATTERN, decodeEntity)
    if (next === decoded) break
    decoded = next
  }
  return decoded
}
