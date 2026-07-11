import { useState, type FormEvent } from "react";

function FormularioTarea() {
  const [descripcion, setDescripcion] = useState("");
  const [tareas, setTareas] = useState<string[]>([]);

  const agregarTarea = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    const tareaLimpia = descripcion.trim();

    if (!tareaLimpia) {
      return;
    }

    setTareas((tareasAnteriores) => [...tareasAnteriores, tareaLimpia]);
    setDescripcion("");
  };

  return (
    <section>
      <h2>Gestión de tareas</h2>

      <form onSubmit={agregarTarea}>
        <label htmlFor="descripcion-tarea">Nueva tarea</label>

        <input
          id="descripcion-tarea"
          type="text"
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
        />

        <button type="submit">Agregar tarea</button>
      </form>

      <h3>Tareas registradas</h3>

      {tareas.length === 0 ? (
        <p>No existen tareas registradas.</p>
      ) : (
        <ul>
          {tareas.map((tarea, indice) => (
            <li key={`${tarea}-${indice}`}>{tarea}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default FormularioTarea;