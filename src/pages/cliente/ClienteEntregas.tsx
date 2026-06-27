import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

interface ItemPedido {
  id: number;
  tipo: string;
  titulo: string | null;
  estado: string;
  precioUnitario: number;
  productoPadreId?: number; // Para identificar componentes de un mismo paquete
  nombrePadre?: string; // Nombre del producto padre
  creadoEn: string;
  pedidoId: number;
}

// Configuración de colores para cada estado
const ESTADO_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "⏳ Pendiente" },
  en_proceso: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", label: "⚙️ En proceso" },
  completado: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", label: "✅ Completado" },
  entregado: { bg: "rgba(59,130,246,0.1)", color: "#60a5fa", label: "📦 Entregado" },
};

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
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

function ClienteEntregas() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [paquetesExpandidos, setPaquetesExpandidos] = useState<Record<number, boolean>>({});

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cliente/pedidos`, { headers });
      if (res.ok) {
        const pedidos = await res.json();
        // Extraer todos los items de todos los pedidos
        const allItems = pedidos.flatMap((p: any) => p.items.map((i: any) => ({
          ...i,
          pedidoId: p.id,
          creadoEn: p.creadoEn,
        })));
        setItems(allItems);
      }
    } catch (error) {
      console.error("Error cargando entregas:", error);
    }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  // Agrupar items por productoPadreId (paquetes)
  const agruparItems = () => {
    const grupos: Record<string, ItemPedido[]> = {};
    const normales: ItemPedido[] = [];

    items.forEach(item => {
      if (item.productoPadreId) {
        const key = String(item.productoPadreId);
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(item);
      } else {
        normales.push(item);
      }
    });

    const paquetes = Object.entries(grupos).map(([key, items]) => ({
      id: Number(key),
      items,
      nombre: items[0]?.nombrePadre || "Paquete combinado",
      total: items.length,
      completados: items.filter(i => i.estado === "completado" || i.estado === "entregado").length,
    }));

    return { paquetes, normales };
  };

  const { paquetes, normales } = agruparItems();

  // Estadísticas generales
  const totalItems = items.length;
  const completados = items.filter(i => i.estado === "completado" || i.estado === "entregado").length;
  const entregados = items.filter(i => i.estado === "entregado").length;
  const pendientes = items.filter(i => i.estado === "pendiente").length;

  const toggleExpandir = (paqueteId: number) => {
    setPaquetesExpandidos(prev => ({
      ...prev,
      [paqueteId]: !prev[paqueteId],
    }));
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 20px" }}>
        <div style={{ width: 30, height: 30, border: "3px solid #1e293b", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px" }}>
          📦 Mis Entregas
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
          Seguimiento de tus pedidos y entregas
        </p>
      </div>

      {/* Estadísticas */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 28,
      }}>
        {[
          { label: "Total", value: totalItems, color: "#f1f5f9" },
          { label: "Pendientes", value: pendientes, color: "#94a3b8" },
          { label: "Completados", value: completados, color: "#22c55e" },
          { label: "Entregados", value: entregados, color: "#60a5fa" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 12,
            padding: "14px 16px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ color: "#475569", fontSize: 12 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Barra de progreso general */}
      <div style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#64748b", fontSize: 13 }}>Progreso general</span>
          <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>
            {totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0}%
          </span>
        </div>
        <div style={{ height: 6, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            width: `${totalItems > 0 ? (completados / totalItems) * 100 : 0}%`,
            height: "100%",
            background: completados === totalItems ? "#22c55e" : "linear-gradient(90deg, #3b82f6, #6366f1)",
            borderRadius: 99,
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {/* Lista de paquetes y productos normales */}
      {items.length === 0 ? (
        <div style={{
          background: "#0f172a",
          border: "1px dashed #1e293b",
          borderRadius: 16,
          padding: "60px 20px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ color: "#475569", fontSize: 15 }}>No tienes pedidos activos.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Paquetes (productos compuestos) */}
          {paquetes.map(paquete => {
            const expandido = paquetesExpandidos[paquete.id] || false;
            const progreso = Math.round((paquete.completados / paquete.total) * 100);

            return (
              <div key={paquete.id} style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 16,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}>
                {/* Header del paquete */}
                <div
                  onClick={() => toggleExpandir(paquete.id)}
                  style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.02)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>🎁</span>
                    <div>
                      <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>{paquete.nombre}</div>
                      <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>
                        {paquete.total} componente{paquete.total > 1 ? "s" : ""} · {paquete.completados} completado{paquete.completados !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 4, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          width: `${progreso}%`,
                          height: "100%",
                          background: progreso === 100 ? "#22c55e" : "linear-gradient(90deg, #3b82f6, #6366f1)",
                          borderRadius: 99,
                          transition: "width 0.3s",
                        }} />
                      </div>
                      <span style={{ color: "#475569", fontSize: 12, minWidth: 28 }}>{progreso}%</span>
                    </div>
                    <span style={{
                      color: "#334155",
                      fontSize: 18,
                      transition: "transform 0.25s",
                      transform: expandido ? "rotate(180deg)" : "none",
                    }}>▼</span>
                  </div>
                </div>

                {/* Componentes del paquete (expandible) */}
                {expandido && (
                  <div style={{ padding: "8px 16px 16px" }}>
                    {paquete.items.map(item => {
                      const cfg = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.pendiente;
                      return (
                        <div key={item.id} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          marginBottom: 4,
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                          borderBottom: "1px solid #1e293b",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: cfg.color,
                              flexShrink: 0,
                            }} />
                            <span style={{ color: "#cbd5e1", fontSize: 13 }}>{item.titulo || "Sin título"}</span>
                          </div>
                          <EstadoBadge estado={item.estado} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Productos normales (sin componentes) */}
          {normales.map(item => (
            <div key={item.id} style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>📦</span>
                <div>
                  <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 500 }}>{item.titulo || "Producto"}</div>
                  <div style={{ color: "#475569", fontSize: 12 }}>
                    {item.tipo} · Bs {item.precioUnitario?.toFixed(2) || "0.00"}
                  </div>
                </div>
              </div>
              <EstadoBadge estado={item.estado} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClienteEntregas;