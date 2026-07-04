import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

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
    <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 14, padding: "14px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, wordBreak: "break-word" }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4, wordBreak: "break-word" }}>{icon} {label}</div>
    </div>
  );
}

function AccesoCard({ icon, label, sub, badge, onClick }: { icon: string; label: string; sub: string; badge?: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="card-catalogo"
      style={{
        background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 14,
        padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{sub}</div>
      </div>
      {badge != null && badge > 0 && (
        <span style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "white", fontSize: 11, fontWeight: "bold", padding: "3px 9px", borderRadius: 99, boxShadow: "0 2px 8px rgba(239,68,68,.4)" }}>
          {badge}
        </span>
      )}
      <span style={{ color: "#818cf8", fontSize: 18 }}>→</span>
    </div>
  );
}

function ClienteInicio({ onNavigate }: Props) {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
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
            style={{ width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #6366f1", boxShadow: "0 0 20px rgba(99,102,241,.35)", flexShrink: 0 }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: isMobile ? 18 : 22, margin: 0, wordBreak: "break-word", color: "white" }}>🏠 Bienvenido/a, {nombreCompleto}</h1>
          {estadoLabel && <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0" }}>{estadoLabel}</p>}
        </div>
      </div>

      {/* Aviso de mensajes no leídos */}
      {noLeidos > 0 && (
        <div
          onClick={() => onNavigate?.("mensajes")}
          style={{
            background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.3)", borderRadius: 12,
            padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center",
            gap: 12, cursor: "pointer", transition: "border-color .2s",
          }}
        >
          <span style={{ fontSize: 20 }}>💬</span>
          <span style={{ color: "#a5b4fc", fontSize: 14, flex: 1 }}>
            Tienes {noLeidos} mensaje{noLeidos > 1 ? "s" : ""} nuevo{noLeidos > 1 ? "s" : ""} de la asociación
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 16 }}>→</span>
        </div>
      )}

      {/* Estadísticas */}
      {pedidos.length > 0 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))", gap: 10, marginBottom: 24 }}>
            <StatCard icon="⏳" label="Pendientes" value={pendientes} color="#94a3b8" />
            <StatCard icon="✅" label="Completados" value={completados} color="#34d399" />
            <StatCard icon="📦" label="Entregados" value={entregados} color="#a5b4fc" />
            <StatCard icon="💰" label="Saldo pendiente" value={`Bs ${saldoTotal.toFixed(0)}`} color="#f59e0b" />
          </div>

          {/* Progreso del último pedido */}
          {ultimoPedido && (
            <div
              onClick={() => onNavigate?.("mis-pedidos")}
              style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 14, padding: "16px 20px", marginBottom: 24, cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>📦 Progreso de tu pedido más reciente</span>
                <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{progresoUltimo}%</span>
              </div>
              <div style={{ height: 8, background: "#1e1b4b", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  width: `${progresoUltimo}%`, height: "100%",
                  background: progresoUltimo === 100 ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                  borderRadius: 99, transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: "#0a0a14", border: "1px dashed #1e1b4b", borderRadius: 14, padding: "30px 20px", textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Aún no tienes pedidos. ¡Explora nuestros servicios!</p>
        </div>
      )}

      {/* Accesos rápidos */}<h3 style={{ color: "#818cf8", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>Accesos rápidos</h3>
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