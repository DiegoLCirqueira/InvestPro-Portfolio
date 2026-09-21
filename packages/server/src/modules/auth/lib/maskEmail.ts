// @investpro/server
// Máscara de e-mail pra log: o operador reconhece a conta sem o endereço completo
// (ex.: d***@g***.com). Também mascara e-mails soltos dentro de um texto.

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.trim().split('@')
  const [domainName = '', ...tld] = domain.split('.')
  const visible = (value: string): string => (value ? `${value[0]}***` : '***')

  return `${visible(local)}@${[visible(domainName), ...tld].join('.')}`
}

const EMAIL_IN_TEXT = /[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[^\s@<>()"',;]+/g

export function maskEmailsIn(text: string): string {
  return text.replace(EMAIL_IN_TEXT, maskEmail)
}
