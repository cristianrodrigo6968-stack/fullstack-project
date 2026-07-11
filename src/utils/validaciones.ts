export function esCorreoValido(correo: string): boolean {
  const correoNormalizado = correo.trim()
  const expresion = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return expresion.test(correoNormalizado)
}

export type Pedido = {
  estado: string
}

export function contarPedidosPendientes(pedidos: Pedido[]): number {
  return pedidos.filter(
    (pedido) => pedido.estado.trim().toLowerCase() === "pendiente"
  ).length
}