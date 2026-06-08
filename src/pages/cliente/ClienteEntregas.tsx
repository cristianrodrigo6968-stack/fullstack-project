import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";


const API_URL = "https://taskmanager-backend-ewud.onrender.com";
function ClienteEntregas() {
  const { token } = useAuth();
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/cliente/entregas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setEntregas(d);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando entregas...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>📦 Mis Entregas</h1>
      {entregas.length === 0 ? (
        <p style={{ color: "#64748b" }}>No tienes entregas registradas aún.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entregas.map((e) => (
            <div key={e.id} style={{
              background: "#1e293b", padding: 16, borderRadius: 12,
              borderLeft: `4px solid ${e.estado === "entregado" ? "#22c55e" : "#f59e0b"}`,
            }}>
              <p style={{ color: "white", fontWeight: "bold" }}>{e.cliente?.nombreCompleto}</p>
              <p style={{ color: "#94a3b8", fontSize: 13 }}>
                Estado: <span style={{ color: e.estado === "entregado" ? "#22c55e" : "#f59e0b", fontWeight: "bold" }}>{e.estado}</span>
              </p>
              {e.fechaEntrega && (
                <p style={{ color: "#64748b", fontSize: 12 }}>
                  Entregado el {new Date(e.fechaEntrega).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClienteEntregas;