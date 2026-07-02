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
  const { token, logout, username } = useAuth();
  const { isMobile } = useWindowSize();
  const [section, setSection] = useState("inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

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

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 10000);
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

  const menuItems = [
    { key: "inicio", label: "🏠 Inicio" },
    
    { key: "contenido", label: "📁 Mi Contenido" },
    { key: "mensajes", label: "💬 Mensajes", badge: unreadMessages },
    { key: "password", label: "🔑 Cambiar Contraseña" },
    { key: "hacer-pedido", label: "🛒 Hacer Pedido" },
    { key: "mis-pedidos", label: "📦 Mis Pedidos" },
  ];

  const handleSection = (key: string) => { setSection(key); setSidebarOpen(false); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200 }} />
      )}

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
            <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20, marginBottom: 16, display: "block", marginLeft: "auto" }}>✕</button>
          )}
          <div style={{ fontSize: 13, color: "#64748b" }}>Portal del Cliente</div>
          <div style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>👤 {username}</div>
        </div>

        {menuItems.map((item) => (
          <button key={item.key} onClick={() => handleSection(item.key)} style={{
            padding: "10px 16px", border: "none", borderRadius: 8,
            cursor: "pointer", textAlign: "left",
            fontWeight: section === item.key ? "bold" : "normal",
            background: section === item.key ? "#3b82f6" : "#334155",
            color: "white", fontSize: 14,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>{item.label}</span>
            {item.badge != null && item.badge > 0 && section !== "mensajes" && (
              <span style={{
                background: "#ef4444", color: "white", fontSize: 11,
                fontWeight: "bold", padding: "2px 8px", borderRadius: 99,
                lineHeight: "1.2",
              }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}

        <button onClick={handleLogout} style={{
          marginTop: "auto", padding: "10px 16px", border: "none",
          borderRadius: 8, cursor: "pointer", background: "#ef4444",
          color: "white", fontWeight: "bold", fontSize: 14,
        }}>
          🚪 Cerrar sesión
        </button>
      </div>

      <div style={{ flex: 1, padding: isMobile ? 20 : 40, color: "white", overflowY: "auto", minWidth: 0 }}>
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: "#1e293b", padding: "12px 16px", borderRadius: 10 }}>
            <span style={{ fontWeight: "bold", fontSize: 15 }}>
              {menuItems.find(m => m.key === section)?.label || "Inicio"}
            </span>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "#334155", border: "none", color: "white", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontSize: 18 }}>☰</button>
          </div>
        )}

        {section === "inicio" && <ClienteInicio onNavigate={handleSection} />}
        {section === "contenido" && <ClienteContenido />}
        {section === "mensajes" && <ClienteMensajes />}
        {section === "password" && <ClientePassword />}
        {section === "hacer-pedido" && <ClienteHacerPedido />}
        {section === "mis-pedidos" && <ClienteMisPedidos />}
      </div>
    </div>
  );
}

export default ClientePanel;