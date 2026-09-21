// @investpro/server
// Falha de entrega do Resend: status HTTP e nome do erro (ex.: validation_error)
// ficam em campos próprios pro log. A mensagem do provedor pode conter o e-mail do
// destinatário, então quem cria o erro a mascara antes.

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly providerError?: string
  ) {
    super(message)
    this.name = 'EmailDeliveryError'
  }
}
