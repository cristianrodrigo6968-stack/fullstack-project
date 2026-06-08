import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
const API_URL = "https://taskmanager-backend-ewud.onrender.com";

function ClienteContenido() {
  const { token } = useAuth();
  const [archivos, setArchivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/cliente/archivos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setArchivos(d);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando contenido...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>📁 Mi Contenido</h1>
      <p style={{ color: "#94a3b8", marginBottom: 20, fontSize: 14 }}>
        Aquí puedes ver los archivos y títulos que has enviado según tus servicios contratados.
      </p>

      {archivos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: "#1e293b", borderRadius: 14 }}>
          <p style={{ color: "#64748b", fontSize: 16 }}>Aún no has subido ningún contenido.</p>
          <p style={{ color: "#334155", fontSize: 13, marginTop: 8 }}>
            Pronto habilitaremos los formularios de carga para cada servicio.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {archivos.map((a) => (
            <div key={a.id} style={{
              background: "#1e293b", padding: 16, borderRadius: 12,
              borderLeft: `4px solid ${a.tipo === "libro" ? "#22c55e" : a.tipo === "articulo" ? "#60a5fa" : a.tipo === "director" ? "#a78bfa" : "#f59e0b"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{
                    fontSize: 11, padding: "2px 10px", borderRadius: 99,
                    background: "#1e3a5f", color: "#60a5fa", fontWeight: "bold",
                  }}>
                    {a.tipo.toUpperCase()}
                  </span>
                  <p style={{ color: "white", fontWeight: "bold", marginTop: 8 }}>
                    {a.titulo || "Sin título"}
                  </p>
                  {a.notas && <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>📝 {a.notas}</p>}
                </div>
                {a.archivoUrl && (
                  <a
                    href={a.archivoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "#22c55e", border: "none", padding: "8px 16px",
                      borderRadius: 8, color: "white", fontWeight: "bold",
                      fontSize: 13, textDecoration: "none", alignSelf: "center",
                    }}
                  >
                    📥 Ver archivo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClienteContenido;