import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useWindowSize } from "../../hooks/useWindowSize";
import Magazines from "./Magazines";
import Books from "./Books";
import Notes from "./Notes";
import Clients from "./Clients";
import Entregas from "./Entregas";
import GlobalSearch from "../../components/GlobalSearch";
import AdminMensajes from "./AdminMensajes";
import AdminPagos from "./AdminPagos";
import AdminProductos from "./AdminProductos";
import ErrorBoundary from "../../components/ErrorBoundary";

const API_URL = import.meta.env.VITE_API_URL;

interface Stats {
  clientes: { total: number; pendientes: number; formularioLlenado: number; enProceso: number; procesados: number };
  entregas: { total: number; pendientes: number; entregadas: number };
  tareas: { manuales: { total: number; pendientes: number; completadas: number }; clientes: { total: number; pendientes: number; completadas: number } };
  revistas: number;
  libros: number;
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "inline-block", width: 20, height: 20, border: "3px solid rgba(255,255,255,0.3)", borderTop: "3px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </>
  );
}

function Admin() {
  const { username, logout, token } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();
  const [section, setSection] = useState("panel");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);

  const handleLogout = () => { logout(); navigate("/"); };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const menuItems = [
    { key: "panel", label: "🏠 Panel" },
    { key: "notes", label: "📌 Notas" },
    { key: "magazines", label: "📘 Revistas" },
    { key: "books", label: "📚 Libros" },
    { key: "clients", label: "👥 Clientes" },
    { key: "entregas", label: "📦 Entregas" },
    { key: "search", label: "🔍 Buscador" },
    { key: "mensajes", label: "💬 Mensajes", badge: unreadMessages },
    { key: "pagos", label: "💰 Pagos", badge: pendingPayments },
    { key: "productos", label: "🛒 Productos" },
  ];

  const handleSection = (key: string) => { setSection(key); setSidebarOpen(false); };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_URL}/stats`, { headers });
      if (res.ok) setStats(await res.json());
    } finally {
      setLoadingStats(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const [msgRes, payRes] = await Promise.all([
        fetch(`${API_URL}/mensajes/no-leidos-count`, { headers }),
        fetch(`${API_URL}/pagos/pendientes-count`, { headers }),
      ]);
      if (msgRes.ok) {
        const data = await msgRes.json();
        setUnreadMessages(data.total ?? 0);
      }
      if (payRes.ok) {
        const data = await payRes.json();
        setPendingPayments(data.total ?? 0);
      }
    } catch (err) {
      console.warn("Error cargando notificaciones", err);
    }
  };

  useEffect(() => {
    if (section === "panel") loadStats();
  }, [section]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Limpiar badge al entrar a la sección
  useEffect(() => {
    if (section === "mensajes") {
      setUnreadMessages(0);
      const timer = setTimeout(loadNotifications, 2000);
      return () => clearTimeout(timer);
    }
    if (section === "pagos") {
      setPendingPayments(0);
      const timer = setTimeout(loadNotifications, 2000);
      return () => clearTimeout(timer);
    }
  }, [section]);

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
          <div style={{ fontSize: 13, color: "#64748b" }}>Bienvenido</div>
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
            {item.badge && item.badge > 0 && (
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
              {menuItems.find(m => m.key === section)?.label || "Panel"}
            </span>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "#334155", border: "none", color: "white", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontSize: 18 }}>☰</button>
          </div>
        )}

        {section === "panel" && (
          <div>
            <h1 style={{ marginBottom: 4, fontSize: isMobile ? 22 : 28 }}>🏠 Panel Editorial</h1>
            <p style={{ color: "#94a3b8", marginBottom: 32, fontSize: isMobile ? 13 : 15 }}>
              Resumen general del sistema.
            </p>

            {loadingStats ? (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}><Spinner /></div>
            ) : stats && (
              <div>
                {(stats.clientes.formularioLlenado > 0 || stats.entregas.pendientes > 0 || stats.tareas.clientes.pendientes > 0) && (
                  <div style={{ marginBottom: 28 }}>
                    <h3 style={{ color: "#f59e0b", marginBottom: 12, fontSize: isMobile ? 14 : 16 }}>⚠️ Requieren atención</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {stats.clientes.formularioLlenado > 0 && (
                        <div onClick={() => handleSection("clients")} style={{ background: "#1e293b", padding: "14px 18px", borderRadius: 10, borderLeft: "4px solid #a78bfa", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: isMobile ? 13 : 15 }}>📝 {stats.clientes.formularioLlenado} cliente(s) con formulario llenado</span>
                          <span style={{ color: "#a78bfa", fontSize: 18 }}>→</span>
                        </div>
                      )}
                      {stats.tareas.clientes.pendientes > 0 && (
                        <div onClick={() => handleSection("tasks")} style={{ background: "#1e293b", padding: "14px 18px", borderRadius: 10, borderLeft: "4px solid #60a5fa", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: isMobile ? 13 : 15 }}>✅ {stats.tareas.clientes.pendientes} tarea(s) de clientes pendientes</span>
                          <span style={{ color: "#60a5fa", fontSize: 18 }}>→</span>
                        </div>
                      )}
                      {stats.entregas.pendientes > 0 && (
                        <div onClick={() => handleSection("entregas")} style={{ background: "#1e293b", padding: "14px 18px", borderRadius: 10, borderLeft: "4px solid #f59e0b", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: isMobile ? 13 : 15 }}>📦 {stats.entregas.pendientes} entrega(s) pendiente(s) de realizar</span>
                          <span style={{ color: "#f59e0b", fontSize: 18 }}>→</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <h3 style={{ color: "#94a3b8", marginBottom: 12, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>👥 Clientes</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: 10, marginBottom: 28 }}>
                  {[
                    { label: "Total", value: stats.clientes.total, color: "#3b82f6" },
                    { label: "Pendientes", value: stats.clientes.pendientes, color: "#f59e0b" },
                    { label: "Llenados", value: stats.clientes.formularioLlenado, color: "#a78bfa" },
                    { label: "En proceso", value: stats.clientes.enProceso, color: "#60a5fa" },
                    { label: "Procesados", value: stats.clientes.procesados, color: "#22c55e" },
                  ].map((s) => (
                    <div key={s.label} onClick={() => handleSection("clients")} style={{ background: "#1e293b", padding: isMobile ? 14 : 18, borderRadius: 12, textAlign: "center", borderTop: `3px solid ${s.color}`, cursor: "pointer" }}>
                      <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: s.color }}>{s.value}</div>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                  <div onClick={() => handleSection("tasks")} style={{ background: "#1e293b", padding: isMobile ? 16 : 20, borderRadius: 12, cursor: "pointer" }}>
                    <h4 style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16 }}>✅ Trabajo de clientes</h4>
                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: "#60a5fa" }}>{stats.tareas.clientes.pendientes}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>Pendientes</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: "#22c55e" }}>{stats.tareas.clientes.completadas}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>Completadas</div>
                      </div>
                    </div>
                    {stats.tareas.clientes.total > 0 && (
                      <div style={{ background: "#334155", borderRadius: 99, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((stats.tareas.clientes.completadas / stats.tareas.clientes.total) * 100)}%`, height: "100%", background: "#22c55e", borderRadius: 99 }} />
                      </div>
                    )}
                  </div>

                  <div onClick={() => handleSection("tasks")} style={{ background: "#1e293b", padding: isMobile ? 16 : 20, borderRadius: 12, cursor: "pointer" }}>
                    <h4 style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16 }}>📋 Tareas del equipo</h4>
                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: "#f59e0b" }}>{stats.tareas.manuales.pendientes}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>Pendientes</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: "#22c55e" }}>{stats.tareas.manuales.completadas}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>Completadas</div>
                      </div>
                    </div>
                    {stats.tareas.manuales.total > 0 && (
                      <div style={{ background: "#334155", borderRadius: 99, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((stats.tareas.manuales.completadas / stats.tareas.manuales.total) * 100)}%`, height: "100%", background: "#22c55e", borderRadius: 99 }} />
                      </div>
                    )}
                  </div>

                  <div onClick={() => handleSection("entregas")} style={{ background: "#1e293b", padding: isMobile ? 16 : 20, borderRadius: 12, cursor: "pointer" }}>
                    <h4 style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16 }}>📦 Entregas</h4>
                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: "#f59e0b" }}>{stats.entregas.pendientes}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>Pendientes</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: "#22c55e" }}>{stats.entregas.entregadas}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>Entregadas</div>
                      </div>
                    </div>
                    {stats.entregas.total > 0 && (
                      <div style={{ background: "#334155", borderRadius: 99, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((stats.entregas.entregadas / stats.entregas.total) * 100)}%`, height: "100%", background: "#22c55e", borderRadius: 99 }} />
                      </div>
                    )}
                  </div>
                </div>

                <h3 style={{ color: "#94a3b8", marginBottom: 12, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>📚 Contenido</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  <div onClick={() => handleSection("magazines")} style={{ background: "#1e293b", padding: isMobile ? 16 : 20, borderRadius: 12, textAlign: "center", cursor: "pointer", borderTop: "3px solid #3b82f6" }}>
                    <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: "bold", color: "#3b82f6" }}>{stats.revistas}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Revistas</div>
                  </div>
                  <div onClick={() => handleSection("books")} style={{ background: "#1e293b", padding: isMobile ? 16 : 20, borderRadius: 12, textAlign: "center", cursor: "pointer", borderTop: "3px solid #22c55e" }}>
                    <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: "bold", color: "#22c55e" }}>{stats.libros}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Libros</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {section === "notes" && <Notes />}
        {section === "magazines" && <Magazines />}
        {section === "books" && <Books />}
        {section === "clients" && <Clients />}
        {section === "entregas" && <Entregas />}
        {section === "search" && <GlobalSearch />}
        {section === "mensajes" && (
          <ErrorBoundary>
            <AdminMensajes />
          </ErrorBoundary>
        )}
        {section === "pagos" && <AdminPagos />}
        {section === "productos" && <AdminProductos />}
      </div>
    </div>
  );
}

export default Admin;