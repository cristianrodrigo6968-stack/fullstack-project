import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

interface Person {
  id: number;
  name: string;
  email?: string;
}

const API_URL = import.meta.env.VITE_API_URL;

function Persons() {
  const { token } = useAuth();
  const [persons, setPersons] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchPersons = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/persons`, { headers });
    if (res.ok) setPersons(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  const addPerson = async () => {
    if (name.trim() === "") return;
    await fetch(`${API_URL}/persons`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, email }),
    });
    setName("");
    setEmail("");
    fetchPersons();
  };

  const deletePerson = async (id: number) => {
    await fetch(`${API_URL}/persons/${id}`, { method: "DELETE", headers });
    fetchPersons();
  };

  return (
    <div>
      <h2 style={{ color: "white", fontSize: 22, marginBottom: 20 }}>👤 Personas</h2>

      <div
        style={{
          background: "linear-gradient(160deg, #0d0d1a, #0a0a14)",
          border: "1px solid #1e1b4b",
          borderRadius: 14,
          padding: 20,
          marginBottom: 24,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <button onClick={addPerson} style={btnPrimary}>
          ➕ Agregar
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Cargando...</p>
      ) : persons.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center", padding: 30 }}>
          No hay personas registradas aún.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {persons.map((p) => (
            <div
              key={p.id}
              style={{
                background: "linear-gradient(160deg, #0d0d1a, #0a0a14)",
                border: "1px solid #1e1b4b",
                borderRadius: 12,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong style={{ color: "white", fontSize: 14 }}>{p.name}</strong>
                {p.email && (
                  <span style={{ color: "#64748b", fontSize: 13, marginLeft: 8 }}>
                    {p.email}
                  </span>
                )}
              </div>
              <button onClick={() => deletePerson(p.id)} style={btnDanger}>
                🗑 Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 160,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #1e1b4b",
  background: "#0a0a14",
  color: "white",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 20px",
  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
  border: "none",
  borderRadius: 10,
  color: "white",
  fontWeight: "bold",
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(99,102,241,.3)",
};

const btnDanger: React.CSSProperties = {
  padding: "8px 14px",
  background: "linear-gradient(135deg,#ef4444,#dc2626)",
  border: "none",
  borderRadius: 8,
  color: "white",
  fontWeight: "bold",
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(239,68,68,.3)",
};

export default Persons;