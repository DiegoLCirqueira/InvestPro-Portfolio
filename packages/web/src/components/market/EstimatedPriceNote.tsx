// O item com preço estimado é marcado pela borda amarela (sem selo de texto, que poluía a linha);
// para leitor de tela o aviso vai em texto. A faixa do topo da página explica o motivo.
export function EstimatedPriceNote() {
  return <span className="sr-only">preço estimado</span>;
}
