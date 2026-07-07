import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

function Admin2FA() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [habilitado, setHabilitado] = useState(false);

  const [qr, setQr] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [activando, setActivando] = useState(false);

  const [passwordDesactivar, setPasswordDesactivar] = useState("");
  const [desactivando, setDesactivando] = useState(false);
  const [mostrarDesactivar, setMostrarDesactivar] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const cargarEstado = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/admin/2fa/estado`, { headers });
    if (res.ok) {
      const data = await res.json();
      setHabilitado(data.enabled);
    }
    setLoading(false);
  };

  useEffect(() => { cargarEstado(); }, []);

  const iniciarConfiguracion = async () => {
    setError(""); setMensaje("");
    const res = await fetch(`${API_URL}/admin/2fa/setup`, { method: "POST", headers });
    const data = await res.json();
    if (res.ok) {
      setQr(data.qr);
    } else {
      setError(data.error || "Error al generar el código QR");
    }
  };

  const activar = async () => {
    if (!codigo || codigo.length < 6) {
      setError("Ingresa el código de 6 dígitos de tu app");
      return;
    }
    setActivando(true);
    setError(""); setMensaje("");
    const res = await fetch(`${API_URL}/admin/2fa/activar`, {
      method: "POST", headers,
      body: JSON.stringify({ codigo }),
    });
    const data = await res.json();
    if (res.ok) {
      setMensaje("✅ 2FA activado correctamente. A partir de ahora, cada inicio de sesión pedirá el código.");
      setQr(null);
      setCodigo("");
      setHabilitado(true);
    } else {
      setError(data.error || "Código incorrecto");
    }
    setActivando(false);
  };

  const desactivar = async () => {
    if (!passwordDesactivar) {
      setError("Ingresa tu contraseña para confirmar");
      return;
    }
    setDesactivando(true);
    setError(""); setMensaje("");
    const res = await fetch(`${API_URL}/admin/2fa/desactivar`, {
      method: "POST", headers,
      body: JSON.stringify({ password: passwordDesactivar }),
    });
    const data = await res.json();
    if (res.ok) {
      setMensaje("2FA desactivado.");
      setHabilitado(false);
      setPasswordDesactivar("");
      setMostrarDesactivar(false);
    } else {
      setError(data.error || "Contraseña incorrecta");
    }
    setDesactivando(false);
  };

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>🔒 Verificación en dos pasos (2FA)</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>
        Agrega una capa extra de seguridad: además de tu contraseña, se pedirá un código generado por una app en tu celular.
      </p>

      <div style={{ background: "#1e293b", padding: 28, borderRadius: 14, maxWidth: 480 }}>
        {mensaje && (
          <div style={{ background: "#14532d", color: "#22c55e", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {mensaje}
          </div>
        )}
        {error && (
          <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {habilitado ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <p style={{ color: "white", margin: 0, fontWeight: "bold" }}>2FA está activado en tu cuenta.</p>
            </div>

            {!mostrarDesactivar ? (
              <button
                onClick={() => setMostrarDesactivar(true)}
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid #ef4444", color: "#ef4444", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}
              >
                Desactivar 2FA
              </button>
            ) : (
              <div>
                <label style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Confirma tu contraseña para desactivar
                </label>
                <input
                  type="password"
                  value={passwordDesactivar}
                  onChange={(e) => setPasswordDesactivar(e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "#334155", color: "white", fontSize: 14, boxSizing: "border-box", marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={desactivar}
                    disabled={desactivando}
                    style={{ background: "#ef4444", border: "none", padding: "10px 20px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13, opacity: desactivando ? 0.6 : 1 }}
                  >
                    {desactivando ? "Desactivando..." : "Confirmar desactivación"}
                  </button>
                  <button
                    onClick={() => { setMostrarDesactivar(false); setPasswordDesactivar(""); }}
                    style={{ background: "#334155", border: "none", padding: "10px 20px", borderRadius: 8, color: "white", cursor: "pointer", fontSize: 13 }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        ) : !qr ? (
          <button
            onClick={iniciarConfiguracion}
            style={{ background: "#3b82f6", border: "none", padding: "12px 24px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 14 }}
          >
            🔧 Configurar 2FA
          </button>
        ) : (
          <div>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              1. Instala <strong style={{ color: "white" }}>Google Authenticator</strong> en tu celular (gratis, en Play Store / App Store).<br />
              2. Abre la app y escanea este código QR.<br />
              3. Ingresa el código de 6 dígitos que aparece en la app para confirmar.
            </p>
            <div style={{ background: "white", padding: 16, borderRadius: 12, display: "inline-block", marginBottom: 16 }}>
              <img src={qr} alt="Código QR" style={{ width: 200, height: 200, display: "block" }} />
            </div>
            <label style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Código de verificación
            </label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "#334155", color: "white", fontSize: 18, textAlign: "center", letterSpacing: 4, boxSizing: "border-box", marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={activar}
                disabled={activando}
                style={{ background: "#22c55e", border: "none", padding: "10px 20px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13, opacity: activando ? 0.6 : 1 }}
              >
                {activando ? "Verificando..." : "✅ Activar 2FA"}
              </button>
              <button
                onClick={() => { setQr(null); setCodigo(""); setError(""); }}
                style={{ background: "#334155", border: "none", padding: "10px 20px", borderRadius: 8, color: "white", cursor: "pointer", fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin2FA;