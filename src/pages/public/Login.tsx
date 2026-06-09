import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const API_URL = "${import.meta.env.VITE_API_URL}";

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        display: "inline-block", width: 16, height: 16,
        border: "2px solid rgba(255,255,255,0.25)",
        borderTop: "2px solid white", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    // Ojo abierto
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    // Ojo cerrado
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
               a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8
               a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isMobile } = useWindowSize();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Completa todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Credenciales incorrectas");
        return;
      }

      login(data.token, data.username, data.role, data.clienteId);
      if (data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/cliente");
      }
    } catch {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-card {
          animation: fadeUp 0.4s ease both;
        }
        .login-input:focus {
          outline: none;
          border-color: #3b82f6 !important;
          background: #1e3a5f !important;
        }
        .login-input::placeholder {
          color: #475569;
        }
        .login-btn:not(:disabled):hover {
          background: #2563eb !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59,130,246,0.4);
        }
        .login-btn:not(:disabled):active {
          transform: translateY(0);
        }
        .toggle-eye:hover {
          color: #94a3b8;
        }
      `}</style>

      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 60%, #0c1a35 100%)",
        padding: "20px",
      }}>
        <div className="login-card" style={{
          background: "#111827",
          padding: isMobile ? "28px 24px" : "44px 40px",
          borderRadius: 20,
          color: "white",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)",
        }}>

          {/* LOGO */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 60, height: 60,
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              borderRadius: 16,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontWeight: "900",
              fontSize: 26,
              fontStyle: "italic",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
              letterSpacing: -1,
            }}>
              V
            </div>
            <h2 style={{
              fontSize: isMobile ? 17 : 18,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 6,
              color: "#f1f5f9",
            }}>
              Escritores Vanguardistas 3.0
            </h2>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4 }}>
              Panel de acceso editorial
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div style={{
              background: "rgba(127,29,29,0.5)",
              border: "1px solid rgba(239,68,68,0.3)",
              padding: "11px 14px",
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 13,
              color: "#fca5a5",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* USUARIO */}
          <label style={labelStyle}>Usuario</label>
          <input
            className="login-input"
            placeholder="Tu usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoComplete="off"
            style={inputStyle}
          />

          {/* CONTRASEÑA */}
          <label style={labelStyle}>Contraseña</label>
          <div style={{ position: "relative", marginBottom: 28 }}>
            <input
              className="login-input"
              placeholder="Tu contraseña"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="current-password"
              style={{ ...inputStyle, marginBottom: 0, paddingRight: 44 }}
            />
            <button
              className="toggle-eye"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                padding: 4,
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s",
              }}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>

          {/* BOTÓN */}
          <button
            className="login-btn"
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 0",
              background: "#3b82f6",
              border: "none",
              borderRadius: 10,
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
              opacity: loading ? 0.7 : 1,
              letterSpacing: 0.3,
            }}
          >
            {loading ? <><Spinner /> Entrando...</> : "Iniciar sesión"}
          </button>

          <p style={{
            textAlign: "center",
            color: "#334155",
            fontSize: 12,
            marginTop: 24,
            letterSpacing: 0.2,
          }}>
            Solo el equipo editorial puede acceder
          </p>
        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 11,
  marginBottom: 7,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  marginBottom: 16,
  borderRadius: 10,
  border: "1px solid #1e293b",
  background: "#0f172a",
  color: "white",
  fontSize: 14,
  boxSizing: "border-box",
  transition: "border-color 0.2s, background 0.2s",
};

export default Login;
