import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        display: "inline-block", width: 18, height: 18,
        border: "3px solid rgba(255,255,255,0.3)",
        borderTop: "3px solid white", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </>
  );
}

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isMobile } = useWindowSize();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "90vh",
      background: "#0f172a",
      padding: "20px",
    }}>
      <div style={{
        background: "#1e293b",
        padding: isMobile ? 24 : 40,
        borderRadius: 16,
        color: "white",
        width: "100%",
        maxWidth: 380,
        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
      }}>
        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56,
            background: "#3b82f6",
            borderRadius: 14,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: "bold",
            fontSize: 28,
            margin: "0 auto 12px",
          }}>
            v
          </div>
          <h2 style={{ fontSize: isMobile ? 20 : 22, marginBottom: 4 }}>
            ESCRITORES VANGUARDISTAS 3.0
          </h2>
          <p style={{ color: "#64748b", fontSize: 13 }}>
            Acceso al panel escritores vanguardistas 3.0
          </p>
        </div>

        {error && (
          <div style={{
            background: "#7f1d1d",
            padding: 12, borderRadius: 8,
            marginBottom: 16, fontSize: 14,
            color: "#fca5a5", textAlign: "center",
          }}>
            ⚠️ {error}
          </div>
        )}

        <label style={labelStyle}>Usuario</label>
        <input
          placeholder="Tu usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={inputStyle}
        />

        <label style={labelStyle}>Contraseña</label>
        <input
          placeholder="Tu contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={{ ...inputStyle, marginBottom: 24 }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 14,
            
           
            color: "white", cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold", fontSize: 16,
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10,
            background: "transparent",
                border: "1px solid #3b82f6",
            

          }}
        >
          {loading ? <><Spinner /> Entrando...</> : "🔐 Iniciar sesión"}
        </button>

        <p style={{
          textAlign: "center",
          color: "#64748b",
          fontSize: 12,
          marginTop: 20,
        }}>
          Solo el equipo editorial puede acceder
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#94a3b8",
  fontSize: 12,
  marginBottom: 6,
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  marginBottom: 14,
  borderRadius: 8,
  border: "none",
  background: "#334155",
  color: "white",
  fontSize: 14,
  boxSizing: "border-box",
};

export default Login;