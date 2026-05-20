import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

function ClienteDatos() {
  const { token } = useAuth();
  const [cliente, setCliente] = useState<any>(null);
  const [editando, setEditando] = useState<any>({});
  const [bloqueado, setBloqueado] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/cliente/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setCliente(data);
        setEditando({
          nombres: data.nombres || "",
          apellidoPaterno: data.apellidoPaterno || "",
          apellidoMaterno: data.apellidoMaterno || "",
          sexo: data.sexo || "",
          ciudad: data.ciudad || "",
          direccion: data.direccion || "",
          fechaNacimiento: data.fechaNacimiento || "",
          profesion: data.profesion || "",
          celular: data.celular || "",
          email: data.email || "",
        });
        if (data.credencialesGeneradaAt) {
          const generado = new Date(data.credencialesGeneradaAt);
          const limite = new Date(generado.getTime() + 10 * 60 * 60 * 1000);
          const ahora = new Date();
          if (ahora > limite) {
            setBloqueado(true);
          } else {
            const diff = limite.getTime() - ahora.getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setTiempoRestante(`${h}h ${m}min`);
          }
        }
        setLoading(false);
      });
  }, []);

  const guardar = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/cliente/datos`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editando),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar");
      } else {
        alert("Datos actualizados correctamente.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>👤 Mis Datos</h1>

      {bloqueado && (
        <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: 16, borderRadius: 10, marginBottom: 20 }}>
          ⚠️ El tiempo de edición ha vencido. Contacta al administrador.
        </div>
      )}

      {!bloqueado && tiempoRestante && (
        <div style={{ background: "#1e3a5f", color: "#60a5fa", padding: 12, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
          ⏳ Te quedan <strong>{tiempoRestante}</strong> para editar tus datos
        </div>
      )}

      {error && <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: "#1e293b", padding: 24, borderRadius: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {Object.entries(editando).map(([campo, valor]: any) => (
          <div key={campo}>
            <label style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{campo}</label>
            <input
              disabled={bloqueado}
              value={valor}
              onChange={(e) => setEditando({ ...editando, [campo]: e.target.value })}
              style={{
                width: "100%", padding: 10, borderRadius: 8, border: "none",
                background: bloqueado ? "#1e293b" : "#334155",
                color: bloqueado ? "#64748b" : "white",
                fontSize: 14, boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>

      {!bloqueado && (
        <button
          onClick={guardar}
          disabled={saving}
          style={{
            marginTop: 20, background: "#3b82f6", border: "none",
            padding: "12px 24px", borderRadius: 8, color: "white",
            cursor: "pointer", fontWeight: "bold", fontSize: 14,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Guardando..." : "💾 Guardar cambios"}
        </button>
      )}
    </div>
  );
}

export default ClienteDatos;