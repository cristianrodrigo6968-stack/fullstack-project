import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";


const API_URL = import.meta.env.VITE_API_URL;
function Barra({ label, actual, total, color, icon }: any) {
  const pct = total === 0 ? 0 : Math.round((actual / total) * 100);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: "white", wordBreak: "break-word", minWidth: 0 }}>{icon} {label}</span>
        <span style={{ color: "#94a3b8", fontSize: 13, flexShrink: 0 }}>{actual}/{total}</span>
      </div>
      <div style={{ background: "#1e1b4b", borderRadius: 99, height: 10 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
      <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{pct}% completado</p>
    </div>
  );
}

function ClienteProgreso() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/cliente/progreso`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando progreso...</p>;

  return (
    <div>
      <h1 style={{ fontSize: isMobile ? 20 : 24, marginBottom: 24 }}>📚 Mi Progreso</h1>
      <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", padding: isMobile ? "20px 18px" : 28, borderRadius: 14, boxSizing: "border-box" }}>
        {data?.pideLibros && <Barra icon="📚" label="Libros" actual={data.librosHechos} total={data.cantLibros} color="#34d399" />}
        {data?.pideArticulos && <Barra icon="📝" label="Artículos" actual={data.articulosHechos} total={data.cantArticulos} color="#a5b4fc" />}
        {data?.pideDirector && <Barra icon="📘" label="Ediciones como Director" actual={data.edicionesHechas} total={3} color="#818cf8" />}
        {data?.pideFundador && <p style={{ color: "#f59e0b", marginBottom: 12 }}>🏆 Fundador — Servicio especial con participación en revista</p>}
        {!data?.pideLibros && !data?.pideArticulos && !data?.pideDirector && !data?.pideFundador && (
          <p style={{ color: "#64748b" }}>No tienes servicios contratados aún.</p>
        )}
      </div>
    </div>
  );
}

export default ClienteProgreso;
