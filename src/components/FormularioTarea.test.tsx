import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormularioTarea from "./FormularioTarea";

describe("FormularioTarea", () => {
  it("permite escribir y agregar una nueva tarea", async () => {
    // Arrange
    const usuario = userEvent.setup();

    render(<FormularioTarea />);

    const campoTarea = screen.getByRole("textbox", {
      name: /nueva tarea/i,
    });

    const botonAgregar = screen.getByRole("button", {
      name: /agregar tarea/i,
    });

    // Act
    await usuario.type(campoTarea, "Preparar informe del laboratorio");
    await usuario.click(botonAgregar);

    // Assert
    expect(
      screen.getByText("Preparar informe del laboratorio"),
    ).toBeInTheDocument();

    expect(campoTarea).toHaveValue("");
  });

  it("no agrega una tarea cuando el campo está vacío", async () => {
    // Arrange
    const usuario = userEvent.setup();

    render(<FormularioTarea />);

    const botonAgregar = screen.getByRole("button", {
      name: /agregar tarea/i,
    });

    // Act
    await usuario.click(botonAgregar);

    // Assert
    expect(
      screen.getByText("No existen tareas registradas."),
    ).toBeInTheDocument();
  });
});