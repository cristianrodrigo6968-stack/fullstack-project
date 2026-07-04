import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

function CampoPassword({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>
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
            position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18,
            padding: 10, display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title={visible ? "Ocultar" : "Mostrar"}
        >
          {visible ? "🙈" : "👁️"}
        </button>
      </div>
    </div>
  );
}

interface Props {
  onNavigate?: (section: string) => void;
}

function ClientePassword({ onNavigate }: Props) {
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
    const eraObligatorio = debeCambiarPassword;
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
      if (eraObligatorio) {
        setTimeout(() => onNavigate?.("inicio"), 800);
      }
    }
    setGuardando(false);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24, color: "#f1f5f9" }}>🔑 Cambiar Contraseña</h1>
      <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", padding: "24px 20px", borderRadius: 14, maxWidth: 460, boxSizing: "border-box" }}>
        {debeCambiarPassword && (
          <div style={{ background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ℹ️ Es tu primer ingreso. Elegí una nueva contraseña fácil de recordar.
          </div>
        )}
        {ok && (
          <div style={{ background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)", color: "#34d399", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            ✅ Contraseña actualizada correctamente.
          </div>
        )}
        {error && (
          <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5", padding: 12, borderRadius: 8, marginBottom: 16 }}>
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
            width: "100%", padding: 13, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: "none", borderRadius: 10, color: "white",
            fontWeight: "bold", cursor: guardando ? "not-allowed" : "pointer", fontSize: 14,
            opacity: guardando ? 0.7 : 1,
            boxShadow: guardando ? "none" : "0 4px 16px rgba(99,102,241,.35)",
          }}
        >
          {guardando ? "Guardando..." : "Actualizar contraseña"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: 13, borderRadius: 10, border: "1px solid #1e1b4b",
  background: "#0a0a14", color: "white", fontSize: 16, boxSizing: "border-box",
  outline: "none",
};

export default ClientePassword;