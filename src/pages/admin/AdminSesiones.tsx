import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

interface Sesion {
  id: string;
  dispositivo: string;
  ip: string | null;
  creadoEn: string;
  ultimaActividad: string;
  esActual: boolean;
}

function formatoFecha(fecha: string) {
  return new Date(fecha).toLocaleString("es-BO", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function AdminSesiones() {
  const { token, logout } = useAuth();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [cerrandoId, setCerrandoId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const cargar = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/admin/sesiones`, { headers });
    if (res.ok) setSesiones(await res.json());
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const cerrarSesion = async (sesion: Sesion) => {
    if (sesion.esActual) {
      if (!confirm("Esta es tu sesión actual. Si la cierras, se cerrará tu sesión ahora mismo. ¿Continuar?")) return;
    } else {
      if (!confirm(`¿Cerrar la sesión de "${sesion.dispositivo}"?`)) return;
    }
    setCerrandoId(sesion.id);
    const res = await fetch(`${API_URL}/admin/sesiones/${sesion.id}`, { method: "DELETE", headers });
    if (res.ok) {
      if (sesion.esActual) {
        logout();
        window.location.href = "/login";
        return;
      }
      await cargar();
    }
    setCerrandoId(null);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>🔐 Sesiones activas</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>
        Estos son los dispositivos donde tu cuenta tiene una sesión iniciada. Puedes cerrar cualquiera que no reconozcas.
      </p>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Cargando sesiones...</p>
      ) : sesiones.length === 0 ? (
        <p style={{ color: "#64748b" }}>No hay sesiones activas.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sesiones.map((s) => (
            <div
              key={s.id}
              style={{
                background: "#1e293b", padding: 18, borderRadius: 12,
                borderLeft: `4px solid ${s.esActual ? "#22c55e" : "#334155"}`,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{s.dispositivo}</span>
                  {s.esActual && (
                    <span style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", fontSize: 11, fontWeight: "bold", padding: "2px 10px", borderRadius: 99 }}>
                      Esta sesión
                    </span>
                  )}
                </div>
                {s.ip && <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 2px" }}>IP: {s.ip}</p>}
                <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 2px" }}>Iniciada: {formatoFecha(s.creadoEn)}</p>
                <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>Última actividad: {formatoFecha(s.ultimaActividad)}</p>
              </div>
              <button
                onClick={() => cerrarSesion(s)}
                disabled={cerrandoId === s.id}
                style={{
                  background: "rgba(239,68,68,0.12)", border: "1px solid #ef4444", color: "#ef4444",
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold",
                  opacity: cerrandoId === s.id ? 0.6 : 1,
                }}
              >
                {cerrandoId === s.id ? "Cerrando..." : "Cerrar sesión"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminSesiones;