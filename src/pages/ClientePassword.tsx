import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = "https://taskmanager-backend-ewud.onrender.com";

function ClientePassword() {
  const { token } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = async () => {
    setError("");
    setOk(false);

    if (!actual || !nueva || !confirmar) {
      setError("Completa todos los campos.");
      return;
    }
    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (nueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setGuardando(true);
    const res = await fetch(`${API_URL}/cliente/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al cambiar la contraseña.");
    } else {
      setOk(true);
      setActual("");
      setNueva("");
      setConfirmar("");
    }
    setGuardando(false);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>🔑 Cambiar Contraseña</h1>
      <div style={{ background: "#1e293b", padding: 28, borderRadius: 14, maxWidth: 460 }}>
        {ok && (
          <div style={{ background: "#14532d", color: "#22c55e", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            ✅ Contraseña actualizada correctamente.
          </div>
        )}
        {error && (
          <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Contraseña actual</label>
          <input
            type="password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Nueva contraseña</label>
          <input
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Confirmar nueva contraseña</label>
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          onClick={cambiar}
          disabled={guardando}
          style={{
            width: "100%", padding: 12, background: "#3b82f6",
            border: "none", borderRadius: 8, color: "white",
            fontWeight: "bold", cursor: "pointer", fontSize: 14,
            opacity: guardando ? 0.7 : 1,
          }}
        >
          {guardando ? "Guardando..." : "Actualizar contraseña"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: 10, borderRadius: 8, border: "none",
  background: "#334155", color: "white", fontSize: 14, boxSizing: "border-box",
};

export default ClientePassword;