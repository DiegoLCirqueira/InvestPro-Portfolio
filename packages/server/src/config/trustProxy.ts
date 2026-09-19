// De quais peers o Fastify aceita o X-Forwarded-For pra descobrir o IP do
// cliente (request.ip), que alimenta o rate limit por IP.
//
// Atrás do proxy da Railway o socket é sempre o IP do proxy: sem isso o limite
// por IP não agrupa o mesmo cliente e clientes distintos podem dividir balde.
//
// Por que faixas de rede e não `true` nem um número de saltos:
// - `true` confia em qualquer X-Forwarded-For: o cliente forjaria o header pra
//   ganhar um balde novo a cada request.
// - Número de saltos: o Fastify 5 o desativa (não valida o par imediato, então
//   um cliente que conecta direto forjaria o header).
// Confiando só em peers da rede interna do proxy, uma conexão direta da internet
// (IP público) tem o X-Forwarded-For ignorado, e o IP do cliente é a 1ª entrada,
// da direita pra esquerda, fora dessas faixas: entradas forjadas ficam à esquerda
// do que o proxy anexou. Qualquer nº de saltos internos da Railway é absorvido.
//
// 100.64.0.0/10 é a rede interna dos proxies da Railway (relatos da comunidade,
// não documentada oficialmente); uniquelocal cobre a rede privada IPv6.
const RAILWAY_PROXY_NETWORKS = '100.64.0.0/10,uniquelocal'

// `false` = não confiar em ninguém (desenvolvimento/testes: localhost).
export type TrustProxySetting = string | false

// TRUST_PROXY: lista de IP/CIDR/nomes (loopback, linklocal, uniquelocal) separada
// por vírgula. Vazio = padrão do ambiente; "false" desliga explicitamente.
export function parseTrustProxy(raw: string | undefined, isProduction: boolean): TrustProxySetting {
  const value = raw?.trim()
  if (!value) return isProduction ? RAILWAY_PROXY_NETWORKS : false
  return value.toLowerCase() === 'false' ? false : value
}
