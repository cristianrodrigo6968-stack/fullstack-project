import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";
import ClienteInicio from "./ClienteInicio";
import ClienteMisPedidos from "./ClienteMisPedidos";
import ClienteHacerPedido from "./ClienteHacerPedido";
import ClienteMensajes from "./ClienteMensajes";
import ClienteContenido from "./ClienteContenido";
import ClientePassword from "./ClientePassword";

const API_URL = import.meta.env.VITE_API_URL;

function ClientePanel() {
  const { token, logout, username, debeCambiarPassword } = useAuth();
  const { isMobile } = useWindowSize();
  const [section, setSection] = useState(debeCambiarPassword ? "password" : "inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, sidebarOpen]);
  
const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadTasks, setUnreadTasks] = useState(0);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const handleLogout = () => { logout(); };

  const loadUnreadCount = async () => {
    try {
      const res = await fetch(`${API_URL}/cliente/mensajes/no-leidos-count`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUnreadMessages(data.total ?? 0);
      }
    } catch (err) {
      console.warn("Error cargando mensajes no leídos", err);
    }
  };

  const loadUnreadTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/cliente/tareas/no-vistas-count`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUnreadTasks(data.total ?? 0);
      }
    } catch (err) {
      console.warn("Error cargando tareas no vistas", err);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    loadUnreadTasks();
    const interval = setInterval(() => { loadUnreadCount(); loadUnreadTasks(); }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Al entrar a mensajes, poner a 0 para que al salir no arrastre un número obsoleto
  useEffect(() => {
    if (section === "mensajes") {
      setUnreadMessages(0);
      const timer = setTimeout(loadUnreadCount, 2000);
      return () => clearTimeout(timer);
    }
  }, [section]);

  // Al entrar a Mis Archivos, marcar tareas como vistas
  useEffect(() => {
    if (section === "contenido") {
      setUnreadTasks(0);
      fetch(`${API_URL}/cliente/tareas/vistas`, { method: "PUT", headers }).catch(() => {});
    }
  }, [section]);

 const menuItems = [
    { key: "inicio", label: "🏠 Inicio" },
    { key: "contenido", label: "📋 Mis Archivos", badge: unreadTasks },
    { key: "mensajes", label: "💬 Mensajes", badge: unreadMessages },
    { key: "password", label: "🔑 Cambiar Contraseña" },
    { key: "hacer-pedido", label: "🛒 Hacer Pedido" },
    { key: "mis-pedidos", label: "📦 Mis Pedidos" },
  ];

  const handleSection = (key: string) => { setSection(key); setSidebarOpen(false); };

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "#000" }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, touchAction: "none" }} />
      )}

      <div style={{
        width: 240, background: "linear-gradient(160deg, #0d0d1a, #0a0a14)",
        borderRight: "1px solid #1e1b4b", padding: 24,
        display: "flex", flexDirection: "column", gap: 8,
        position: isMobile ? "fixed" : "sticky", top: 0,
        left: isMobile ? (sidebarOpen ? 0 : -260) : 0,
        height: isMobile ? "100dvh" : "100vh", zIndex: isMobile ? 300 : 1,
        transition: "left 0.3s ease", overflowY: "auto",
      }}>
        <div style={{ marginBottom: 24 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20, marginBottom: 16, display: "block", marginLeft: "auto" }}>✕</button>
          )}
          <div style={{ fontSize: 13, color: "#818cf8", letterSpacing: 1, textTransform: "uppercase" }}>Portal del Cliente</div>
          <div style={{ color: "white", fontWeight: "bold", fontSize: 16, marginTop: 4 }}>👤 {username}</div>
        </div>

        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => { if (!debeCambiarPassword || item.key === "password") handleSection(item.key); }}
            disabled={debeCambiarPassword && item.key !== "password"}
            style={{
            padding: "10px 16px", border: section === item.key ? "1px solid #6366f1" : "1px solid #1e1b4b", borderRadius: 10,
            cursor: (debeCambiarPassword && item.key !== "password") ? "not-allowed" : "pointer",
            textAlign: "left",
            fontWeight: section === item.key ? "bold" : "normal",
            background: section === item.key ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#0a0a14",
            color: "white", fontSize: 14,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            opacity: (debeCambiarPassword && item.key !== "password") ? 0.4 : 1,
            boxShadow: section === item.key ? "0 4px 14px rgba(99,102,241,.35)" : "none",
            transition: "all .2s",
          }}>
            <span>{item.label}</span>
            {item.badge != null && item.badge > 0 && section !== "mensajes" && section !== "contenido" && (
              <span style={{
                background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "white", fontSize: 11,
                fontWeight: "bold", padding: "2px 8px", borderRadius: 99,
                lineHeight: "1.2",
                boxShadow: "0 2px 8px rgba(239,68,68,.4)",
              }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}

        <button onClick={handleLogout} style={{
          marginTop: "auto", padding: "10px 16px", border: "1px solid rgba(239,68,68,.3)",
          borderRadius: 10, cursor: "pointer", background: "linear-gradient(135deg,#ef4444,#dc2626)",
          color: "white", fontWeight: "bold", fontSize: 14,
          boxShadow: "0 4px 14px rgba(239,68,68,.3)",
        }}>
          🚪 Cerrar sesión
        </button>
      </div>

      <div style={{ flex: 1, padding: isMobile ? 20 : 40, color: "white", overflowY: "auto", minWidth: 0, height: isMobile ? "100dvh" : "100vh", boxSizing: "border-box" }}>
        {debeCambiarPassword && (
          <div style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.35)", color: "#fbbf24", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
            🔒 Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
          </div>
        )}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", padding: "12px 16px", borderRadius: 12 }}>
            <span style={{ fontWeight: "bold", fontSize: 15, color: "white" }}>
              {menuItems.find(m => m.key === section)?.label || "Inicio"}
            </span>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontSize: 18 }}>☰</button>
          </div>
        )}

        {section === "inicio" && <ClienteInicio onNavigate={handleSection} />}
        {section === "contenido" && <ClienteContenido />}
        {section === "mensajes" && <ClienteMensajes />}
       {section === "password" && <ClientePassword onNavigate={handleSection} />}
        {section === "hacer-pedido" && <ClienteHacerPedido />}
        {section === "mis-pedidos" && <ClienteMisPedidos />}
      </div>
    </div>
  );
}

export default ClientePanel;