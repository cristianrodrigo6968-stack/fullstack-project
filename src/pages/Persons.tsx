import { useEffect, useState } from "react";

interface Person {
  id: number;
  name: string;
  email?: string;
}

const API_URL = "https://taskmanager-backend-ewud.onrender.com";

function Persons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const fetchPersons = async () => {
    const res = await fetch(`${API_URL}/persons`);
    const data = await res.json();
    setPersons(data);
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  const addPerson = async () => {
    if (name.trim() === "") return;

    await fetch(`${API_URL}/persons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email }),
    });

    setName("");
    setEmail("");
    fetchPersons();
  };

  const deletePerson = async (id: number) => {
    await fetch(`${API_URL}/persons/${id}`, {
      method: "DELETE",
    });

    fetchPersons();
  };

  return (
    <div>
      <h2 style={{ color: "white" }}>Personas</h2>

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button onClick={addPerson}>Agregar</button>
      </div>

      {persons.map((p) => (
        <div key={p.id} style={{ marginBottom: "10px" }}>
          <strong>{p.name}</strong> - {p.email}
          <button onClick={() => deletePerson(p.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}

export default Persons;