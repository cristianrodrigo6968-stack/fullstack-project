import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useWindowSize } from "../../hooks/useWindowSize";
import ClienteInicio from "./ClienteInicio";
import ClienteProgreso from "./ClienteProgreso";
import ClienteEntregas from "./ClienteEntregas";
import ClienteDatos from "./ClienteDatos";
import ClienteContenido from "./ClienteContenido";
import ClienteMensajes from "./ClienteMensajes";
import ClientePassword from "./ClientePassword";
import ClienteHacerPedido from "./ClienteHacerPedido";
import ClienteMisPedidos from "./ClienteMisPedidos";
const API_URL = "https://taskmanager-backend-ewud.onrender.com";

function ClientePanel() {
  const { token, username, logout, clienteId } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();

  const [section, setSection] = useState("inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    { key: "inicio",     label: "🏠 Inicio" },
    { key: "progreso",   label: "📚 Mi Progreso" },
    { key: "entregas",   label: "📦 Mis Entregas" },
    { key: "datos",      label: "👤 Mis Datos" },
    { key: "contenido",  label: "📁 Mi Contenido" },
    { key: "mensajes",   label: "💬 Mensajes" },
    { key: "password",   label: "🔑 Cambiar Contraseña" },
    { key: "hacerpedido", label: "🛒 Hacer Pedido" },
    { key: "mispedidos", label: "📦 Mis Pedidos" },
  ];

  const handleSection = (key: string) => {
    setSection(key);
    setSidebarOpen(false);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>

      {/* Overlay móvil */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          }}
        />
      )}

      {/* SIDEBAR */}
      <div style={{
        width: 240, background: "#1e293b", padding: 24,
        display: "flex", flexDirection: "column", gap: 8,
        position: isMobile ? "fixed" : "sticky", top: 0,
        left: isMobile ? (sidebarOpen ? 0 : -260) : 0,
        height: "100vh", zIndex: isMobile ? 300 : 1,
        transition: "left 0.3s ease", overflowY: "auto",
      }}>
        <div style={{ marginBottom: 24 }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: "none", border: "none", color: "#94a3b8",
                cursor: "pointer", fontSize: 20, marginBottom: 16,
                display: "block", marginLeft: "auto",
              }}
            >
              ✕
            </button>
          )}
          <div style={{ fontSize: 13, color: "#64748b" }}>Portal del Cliente</div>
          <div style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>👤 {username}</div>
        </div>

        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => handleSection(item.key)}
            style={{
              padding: "10px 16px", border: "none", borderRadius: 8,
              cursor: "pointer", textAlign: "left",
              fontWeight: section === item.key ? "bold" : "normal",
              background: section === item.key ? "#3b82f6" : "#334155",
              color: "white", fontSize: 14,
            }}
          >
            {item.label}
          </button>
        ))}

        <button
          onClick={handleLogout}
          style={{
            marginTop: "auto", padding: "10px 16px", border: "none",
            borderRadius: 8, cursor: "pointer", background: "#ef4444",
            color: "white", fontWeight: "bold", fontSize: 14,
          }}
        >
          🚪 Cerrar sesión
        </button>
      </div>

      {/* CONTENIDO */}
      <div style={{
        flex: 1, padding: isMobile ? 20 : 40,
        color: "white", overflowY: "auto", minWidth: 0,
      }}>
        {/* Header móvil */}
        {isMobile && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 20, background: "#1e293b", padding: "12px 16px", borderRadius: 10,
          }}>
            <span style={{ fontWeight: "bold", fontSize: 15 }}>
              {menuItems.find((m) => m.key === section)?.label || "Panel"}
            </span>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: "#334155", border: "none", color: "white",
                cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontSize: 18,
              }}
            >
              ☰
            </button>
          </div>
        )}

        {/* Secciones */}
        {section === "inicio" && <ClienteInicio />}
        {section === "progreso" && <ClienteProgreso />}
        {section === "entregas" && <ClienteEntregas />}
        {section === "datos" && <ClienteDatos />}
        {section === "contenido" && <ClienteContenido />}
        {section === "mensajes" && <ClienteMensajes />}
        {section === "password" && <ClientePassword />}
        {section === "hacerpedido" && <ClienteHacerPedido />}
        {section === "mispedidos" && <ClienteMisPedidos />}
      </div>
    </div>
  );
}

export default ClientePanel;