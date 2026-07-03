import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

function CampoPassword({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16,
          }}
          title={visible ? "Ocultar" : "Mostrar"}
        >
          {visible ? "🙈" : "👁️"}
        </button>
      </div>
    </div>
  );
}

function ClientePassword() {
  const { token, debeCambiarPassword, clearDebeCambiarPassword } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = async () => {
    setError("");
    setOk(false);

    if (!debeCambiarPassword && !actual) {
      setError("Ingresa tu contraseña actual.");
      return;
    }
    if (!nueva || !confirmar) {
      setError("Completa la nueva contraseña y su confirmación.");
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
      body: JSON.stringify(
        debeCambiarPassword
          ? { passwordNueva: nueva }
          : { passwordActual: actual, passwordNueva: nueva }
      ),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al cambiar la contraseña.");
    } else {
      setOk(true);
      setActual("");
      setNueva("");
      setConfirmar("");
      clearDebeCambiarPassword();
    }
    setGuardando(false);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>🔑 Cambiar Contraseña</h1>
      <div style={{ background: "#1e293b", padding: 28, borderRadius: 14, maxWidth: 460 }}>
        {debeCambiarPassword && (
          <div style={{ background: "#1e3a5f", color: "#93c5fd", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ℹ️ Es tu primer ingreso. Elegí una nueva contraseña fácil de recordar.
          </div>
        )}
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

        {!debeCambiarPassword && (
          <CampoPassword label="Contraseña actual" value={actual} onChange={setActual} />
        )}
        <CampoPassword label="Nueva contraseña" value={nueva} onChange={setNueva} />
        <div style={{ marginBottom: 20 }}>
          <CampoPassword label="Confirmar nueva contraseña" value={confirmar} onChange={setConfirmar} />
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