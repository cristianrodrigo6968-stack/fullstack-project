import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

interface Props {
  onNavigate?: (section: string) => void;
}

const ESTADO_ITEM_LABEL: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "#94a3b8" },
  completado: { label: "Completado", color: "#22c55e" },
  entregado: { label: "Entregado", color: "#60a5fa" },
};

const ESTADO_CLIENTE_LABEL: Record<string, string> = {
  pendiente: "Formulario pendiente de completar",
  "formulario llenado": "Formulario recibido",
  "en proceso": "En proceso de producción",
  procesado: "Proceso completado",
};

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{icon} {label}</div>
    </div>
  );
}

function AccesoCard({ icon, label, sub, badge, onClick }: { icon: string; label: string; sub: string; badge?: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#1e293b", border: "1px solid #334155", borderRadius: 14,
        padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center",
        gap: 14, transition: "border-color 0.15s, transform 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3b82f6"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#334155"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{sub}</div>
      </div>
      {badge != null && badge > 0 && (
        <span style={{ background: "#ef4444", color: "white", fontSize: 11, fontWeight: "bold", padding: "3px 9px", borderRadius: 99 }}>
          {badge}
        </span>
      )}
      <span style={{ color: "#475569", fontSize: 18 }}>→</span>
    </div>
  );
}

function ClienteInicio({ onNavigate }: Props) {
  const { token } = useAuth();
  const [cliente, setCliente] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [noLeidos, setNoLeidos] = useState(0);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const cargar = async () => {
      try {
        const [clienteRes, pedidosRes, noLeidosRes] = await Promise.all([
          fetch(`${API_URL}/cliente/me`, { headers }),
          fetch(`${API_URL}/cliente/pedidos`, { headers }),
          fetch(`${API_URL}/cliente/mensajes/no-leidos-count`, { headers }),
        ]);
        if (clienteRes.ok) setCliente(await clienteRes.json());
        if (pedidosRes.ok) setPedidos(await pedidosRes.json());
        if (noLeidosRes.ok) {
          const d = await noLeidosRes.json();
          setNoLeidos(d.total ?? 0);
        }
      } catch (err) {
        console.warn("Error cargando dashboard:", err);
      }
      setLoading(false);
    };
    cargar();
  }, []);

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando...</p>;

  const nombreCompleto = cliente?.nombreCompleto || [cliente?.nombres, cliente?.apellidoPaterno, cliente?.apellidoMaterno].filter(Boolean).join(" ") || "Cliente";

  const todosLosItems = pedidos.flatMap(p => p.items || []);
  const totalItems = todosLosItems.length;
  const pendientes = todosLosItems.filter(i => i.estado === "pendiente").length;
  const completados = todosLosItems.filter(i => i.estado === "completado").length;
  const entregados = todosLosItems.filter(i => i.estado === "entregado").length;
  const saldoTotal = pedidos.reduce((sum, p) => sum + (p.montoTotal - p.montoPagado), 0);

  const pedidosOrdenados = [...pedidos].sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());
  const ultimoPedido = pedidosOrdenados[0];
  const itemsUltimo = ultimoPedido?.items || [];
  const progresoUltimo = itemsUltimo.length > 0
    ? Math.round((itemsUltimo.filter((i: any) => i.estado === "completado" || i.estado === "entregado").length / itemsUltimo.length) * 100)
    : 0;

  const estadoLabel = cliente?.status ? (ESTADO_CLIENTE_LABEL[cliente.status] || cliente.status) : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {cliente?.fotografia && (
          <img
            src={cliente.fotografia}
            alt="foto"
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #3b82f6", flexShrink: 0 }}
          />
        )}
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>🏠 Bienvenido/a, {nombreCompleto}</h1>
          {estadoLabel && <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0" }}>{estadoLabel}</p>}
        </div>
      </div>

      {/* Aviso de mensajes no leídos */}
      {noLeidos > 0 && (
        <div
          onClick={() => onNavigate?.("mensajes")}
          style={{
            background: "rgba(59,130,246,0.1)", border: "1px solid #1e3a5f", borderRadius: 12,
            padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center",
            gap: 12, cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 20 }}>💬</span>
          <span style={{ color: "#60a5fa", fontSize: 14, flex: 1 }}>
            Tienes {noLeidos} mensaje{noLeidos > 1 ? "s" : ""} nuevo{noLeidos > 1 ? "s" : ""} de la asociación
          </span>
          <span style={{ color: "#60a5fa", fontSize: 16 }}>→</span>
        </div>
      )}

      {/* Estadísticas */}
      {pedidos.length > 0 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 24 }}>
            <StatCard icon="⏳" label="Pendientes" value={pendientes} color="#94a3b8" />
            <StatCard icon="✅" label="Completados" value={completados} color="#22c55e" />
            <StatCard icon="📦" label="Entregados" value={entregados} color="#60a5fa" />
            <StatCard icon="💰" label="Saldo pendiente" value={`Bs ${saldoTotal.toFixed(0)}`} color="#f59e0b" />
          </div>

          {/* Progreso del último pedido */}
          {ultimoPedido && (
            <div
              onClick={() => onNavigate?.("mis-pedidos")}
              style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 20px", marginBottom: 24, cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>📦 Progreso de tu pedido más reciente</span>
                <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{progresoUltimo}%</span>
              </div>
              <div style={{ height: 8, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  width: `${progresoUltimo}%`, height: "100%",
                  background: progresoUltimo === 100 ? "#22c55e" : "linear-gradient(90deg,#3b82f6,#6366f1)",
                  borderRadius: 99, transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: "#0f172a", border: "1px dashed #1e293b", borderRadius: 14, padding: "30px 20px", textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Aún no tienes pedidos. ¡Explora nuestros servicios!</p>
        </div>
      )}

      {/* Accesos rápidos */}
      <h3 style={{ color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Accesos rápidos</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <AccesoCard icon="🛒" label="Hacer Pedido" sub="Explora el catálogo" onClick={() => onNavigate?.("hacer-pedido")} />
        <AccesoCard icon="📦" label="Mis Pedidos" sub={`${totalItems} ítem${totalItems !== 1 ? "s" : ""} en total`} onClick={() => onNavigate?.("mis-pedidos")} />
        <AccesoCard icon="💬" label="Mensajes" sub="Habla con la asociación" badge={noLeidos} onClick={() => onNavigate?.("mensajes")} />
        <AccesoCard icon="📁" label="Mi Contenido" sub="Tus archivos subidos" onClick={() => onNavigate?.("contenido")} />
      </div>
    </div>
  );
}

export default ClienteInicio;