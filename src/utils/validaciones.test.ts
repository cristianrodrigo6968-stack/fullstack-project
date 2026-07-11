import { describe, expect, it } from "vitest"
import {
  contarPedidosPendientes,
  esCorreoValido,
} from "./validaciones"

describe("esCorreoValido", () => {
  it("acepta un correo con formato válido", () => {
    // Arrange
    const correo = "ana@ejemplo.com"

    // Act
    const resultado = esCorreoValido(correo)

    // Assert
    expect(resultado).toBe(true)
  })

  it("rechaza un correo sin dominio", () => {
    // Arrange
    const correo = "ana@"

    // Act
    const resultado = esCorreoValido(correo)

    // Assert
    expect(resultado).toBe(false)
  })
})

describe("contarPedidosPendientes", () => {
  it("cuenta solamente los pedidos pendientes", () => {
    // Arrange
    const pedidos = [
      { estado: "entregado" },
      { estado: "pendiente" },
      { estado: "pendiente" },
    ]

    // Act
    const resultado = contarPedidosPendientes(pedidos)

    // Assert
    expect(resultado).toBe(2)
  })

  it("devuelve cero cuando la lista está vacía", () => {
    // Arrange
    const pedidos: { estado: string }[] = []

    // Act
    const resultado = contarPedidosPendientes(pedidos)

    // Assert
    expect(resultado).toBe(0)
  })
})