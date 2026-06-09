import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";


const API_URL = import.meta.env.VITE_API_URL;
function ClienteInicio() {
  const { token } = useAuth();
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/cliente/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setCliente(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando...</p>;

  const nombreCompleto = [cliente?.nombres, cliente?.apellidoPaterno, cliente?.apellidoMaterno]
    .filter(Boolean).join(" ");

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>🏠 Bienvenido/a, {nombreCompleto}</h1>
      <div style={{ background: "#1e293b", padding: 28, borderRadius: 14, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        {cliente?.fotografia && (
          <img
            src={cliente.fotografia}
            alt="foto"
            style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "3px solid #3b82f6" }}
          />
        )}
        <div>
          <p style={{ color: "#94a3b8" }}>Estado: <span style={{ color: "white", fontWeight: "bold" }}>{cliente?.status}</span></p>
          <p style={{ color: "#94a3b8" }}>Email: <span style={{ color: "white" }}>{cliente?.email}</span></p>
          <p style={{ color: "#94a3b8" }}>Celular: <span style={{ color: "white" }}>{cliente?.celular}</span></p>
        </div>
      </div>
    </div>
  );
}

export default ClienteInicio;
