import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

interface ItemPedido {
  id: number;
  tipo: string;
  titulo: string | null;
  conSenapi: boolean;
  conIsbn: boolean;
  periodicidad: string | null;
  tipoAutor: string | null;
  asociacionEncargaTitulo: boolean;
  notas: string | null;
  estado: string;
}

interface Pedido {
  id: number;
  estado: string;
  motivoRechazo: string | null;
  montoTotal: number;
  montoPagado: number;
  creadoEn: string;
  items: ItemPedido[];
}

const ESTADO_ITEM_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "⏳ Pendiente" },
  completado: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", label: "✅ Completado" },
  entregado: { bg: "rgba(59,130,246,0.1)", color: "#60a5fa", label: "📦 Entregado" },
};

function EstadoItemBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_ITEM_CONFIG[estado] || ESTADO_ITEM_CONFIG.pendiente;
  return (
    <span style={{
      fontSize: 11, padding: "2px 10px", borderRadius: 99,
      background: cfg.bg, color: cfg.color, fontWeight: 600,
      border: `1px solid ${cfg.color}33`,
    }}>
      {cfg.label}
    </span>
  );
}

function ClienteMisPedidos() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pedido | null>(null);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/cliente/pedidos`, { headers });
    if (res.ok) setPedidos(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const verDetalle = async (pedidoId: number) => {
    const res = await fetch(`${API_URL}/cliente/pedidos/${pedidoId}`, { headers });
    if (res.ok) setSelected(await res.json());
  };

  const numeroDePedido = (pedidoId: number) => {
    const ordenAscendente = [...pedidos].sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());
    const idx = ordenAscendente.findIndex(p => p.id === pedidoId);
    return idx === -1 ? pedidoId : idx + 1;
  };

  const getEstadoPedidoColor = (estado: string) => {
    if (estado === "completado") return { bg: "#14532d", color: "#22c55e" };
    if (estado === "rechazado") return { bg: "#7f1d1d", color: "#ef4444" };
    return { bg: "#422006", color: "#f59e0b" };
  };

  const getTipoLabel = (item: ItemPedido) => {
    const t = (item.titulo || "").toLowerCase();
    const tip = (item.tipo || "").toLowerCase();
    if (tip === "libro" || t.includes("libro")) {
      let cat = "";
      if (t.includes("categoría a") || t.includes("categoria a")) cat = " — Categoría A";
      else if (t.includes("categoría b") || t.includes("categoria b")) cat = " — Categoría B";
      else if (t.includes("categoría c") || t.includes("categoria c")) cat = " — Categoría C";
      return `📚 Libro${cat}`;
    }
    if (tip === "revista" || t.includes("revista") || t.includes("director") || t.includes("artículo") || t.includes("articulo") || t.includes("fundador")) {
      if (t.includes("director")) return "📘 Director de Revista";
      if (t.includes("fundador")) return "🏆 Fundador de Revista";
      if (t.includes("redacc")) return "📝 Artículo (redacción y publicación)";
      if (t.includes("publicac")) return "📝 Artículo (solo publicación)";
      return "📰 Revista";
    }
    return item.titulo || "📦 Servicio";
  };

  // ── Estadísticas generales (todos los pedidos, todos los ítems) ──
  const todosLosItems = pedidos.flatMap(p => p.items);
  const totalItems = todosLosItems.length;
  const completadosOEntregados = todosLosItems.filter(i => i.estado === "completado" || i.estado === "entregado").length;
  const entregados = todosLosItems.filter(i => i.estado === "entregado").length;
  const pendientes = todosLosItems.filter(i => i.estado === "pendiente").length;
  const progresoGeneral = totalItems > 0 ? Math.round((completadosOEntregados / totalItems) * 100) : 0;

  // ── Vista detalle de un pedido ──
  if (selected) {
    const scPedido = getEstadoPedidoColor(selected.estado);
    const totalItemsPedido = selected.items.length;
    const completadosPedido = selected.items.filter(i => i.estado === "completado" || i.estado === "entregado").length;
    const progresoPedido = totalItemsPedido > 0 ? Math.round((completadosPedido / totalItemsPedido) * 100) : 0;

    return (
      <div>
        <button onClick={() => setSelected(null)} style={btnGray}>← Volver a mis pedidos</button>
        <div style={{ background: "#1e293b", padding: isMobile ? 20 : 28, borderRadius: 14, marginTop: 20 }}>
          <h2 style={{ marginBottom: 6, fontSize: isMobile ? 18 : 24 }}>
            Pedido #{numeroDePedido(selected.id)}
          </h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 12, padding: "3px 12px", borderRadius: 99,
              background: scPedido.bg, color: scPedido.color, fontWeight: "bold",
            }}>
              {selected.estado}
            </span>
            <span style={{ color: "#64748b", fontSize: 12 }}>
              {new Date(selected.creadoEn).toLocaleDateString()}
            </span>
          </div>
          {selected.motivoRechazo && (
            <div style={{ background: "#7f1d1d", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <p style={{ color: "#fca5a5", fontSize: 13 }}>❌ {selected.motivoRechazo}</p>
            </div>
          )}

          {/* Saldo pendiente */}
          <div style={{ marginBottom: 16, background: "#0f172a", padding: 16, borderRadius: 10 }}>
            <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>
              💰 Saldo pendiente: <strong style={{ color: "#f59e0b" }}>Bs {(selected.montoTotal - selected.montoPagado).toFixed(2)}</strong>
            </p>
            <div style={{ background: "#334155", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{
                width: `${selected.montoTotal > 0 ? Math.round((selected.montoPagado / selected.montoTotal) * 100) : 0}%`,
                height: "100%", background: "#22c55e", borderRadius: 99, transition: "width 0.4s ease",
              }} />
            </div>
          </div>

          {/* Progreso de producción del pedido */}
          <div style={{ marginBottom: 20, background: "#0f172a", padding: 16, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>📦 Progreso de producción</span>
              <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 12 }}>{progresoPedido}%</span>
            </div>
            <div style={{ background: "#334155", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{
                width: `${progresoPedido}%`,
                height: "100%",
                background: progresoPedido === 100 ? "#22c55e" : "linear-gradient(90deg, #3b82f6, #6366f1)",
                borderRadius: 99, transition: "width 0.4s ease",
              }} />
            </div>
          </div>

          <h3 style={{ marginBottom: 16, color: "#94a3b8", fontSize: 13, textTransform: "uppercase" }}>Ítems del pedido</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selected.items.map(item => {
              const sc = getEstadoPedidoColor(item.estado);
              return (
                <div key={item.id} style={{ background: "#0f172a", padding: 16, borderRadius: 10, borderLeft: `4px solid ${ESTADO_ITEM_CONFIG[item.estado]?.color || "#94a3b8"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "#60a5fa", fontWeight: "bold" }}>{getTipoLabel(item)}</span>
                    <EstadoItemBadge estado={item.estado} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {item.conSenapi && <span style={badgeStyle}>SENAPI</span>}
                    {item.conIsbn && <span style={badgeStyle}>ISBN</span>}
                    {item.periodicidad && <span style={badgeStyle}>{item.periodicidad}</span>}
                    {item.tipoAutor && <span style={badgeStyle}>{item.tipoAutor === "soloTitulo" ? "Solo título" : "Con contenido"}</span>}
                    {item.asociacionEncargaTitulo && <span style={badgeStyle}>Título por asociación</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Vista lista de pedidos ──
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>📦 Mis Pedidos</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24 }}>
        Revisa el estado de tus pedidos y el progreso de producción.
      </p>

      {!loading && pedidos.length > 0 && (
        <>
          {/* Estadísticas generales */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}>
            {[
              { label: "Total ítems", value: totalItems, color: "#f1f5f9" },
              { label: "Pendientes", value: pendientes, color: "#94a3b8" },
              { label: "Completados", value: completadosOEntregados - entregados, color: "#22c55e" },
              { label: "Entregados", value: entregados, color: "#60a5fa" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                padding: "14px 16px", textAlign: "center",
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ color: "#475569", fontSize: 12 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Barra de progreso general */}
          <div style={{
            background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
            padding: "16px 20px", marginBottom: 28,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#64748b", fontSize: 13 }}>Progreso general</span>
              <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{progresoGeneral}%</span>
            </div>
            <div style={{ height: 6, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                width: `${progresoGeneral}%`, height: "100%",
                background: progresoGeneral === 100 ? "#22c55e" : "linear-gradient(90deg, #3b82f6, #6366f1)",
                borderRadius: 99, transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        </>
      )}

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Cargando pedidos...</p>
      ) : pedidos.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center", padding: 40 }}>
          No tienes pedidos aún. ¡Haz tu primer pedido!
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pedidos.map(p => {
            const sc = getEstadoPedidoColor(p.estado);
            const totalPedido = p.items.length;
            const completadosItemPedido = p.items.filter(i => i.estado === "completado" || i.estado === "entregado").length;
            const progresoItemPedido = totalPedido > 0 ? Math.round((completadosItemPedido / totalPedido) * 100) : 0;
            return (
              <div key={p.id} style={{
                background: "#1e293b", padding: 16, borderRadius: 12,
                borderLeft: `4px solid ${sc.color}`,
                cursor: "pointer",
              }} onClick={() => verDetalle(p.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>
                      Pedido #{numeroDePedido(p.id)}
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                      {p.items.length} ítems · {new Date(p.creadoEn).toLocaleDateString()}
                    </p>
                    <p style={{ color: "#f59e0b", fontSize: 12 }}>
                      Saldo pendiente: Bs {(p.montoTotal - p.montoPagado).toFixed(2)}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <div style={{ flex: 1, maxWidth: 140, height: 5, background: "#334155", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          width: `${progresoItemPedido}%`, height: "100%",
                          background: progresoItemPedido === 100 ? "#22c55e" : "linear-gradient(90deg, #3b82f6, #6366f1)",
                          borderRadius: 99,
                        }} />
                      </div>
                      <span style={{ color: "#475569", fontSize: 11 }}>{progresoItemPedido}%</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      fontSize: 11, padding: "2px 10px", borderRadius: 99,
                      background: sc.bg, color: sc.color, fontWeight: "bold",
                    }}>
                      {p.estado}
                    </span>
                    <span style={{ color: "#64748b", fontSize: 18 }}>→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const badgeStyle: React.CSSProperties = { background: "#1e3a5f", color: "#60a5fa", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: "bold" };

export default ClienteMisPedidos;