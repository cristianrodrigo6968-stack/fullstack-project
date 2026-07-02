import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useMesActual } from "../../hooks/useMesActual";
import NavegadorMes from "../../components/NavegadorMes";

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
  precioUnitario: number | null;
  archivoWord: string | null;
  archivoPdf: string | null;
  estado: string;
  cliente: { id: number; nombreCompleto: string | null };
  pedidoId: number;
  creadoEn: string;
}

interface DesgloseTitulo {
  tipoVisual: "libro" | "revista" | "otro";
  icono: string;
  color: string;
  lineaPrincipal: string;
  lineaSecundaria: string | null;
}

function parsearTitulo(titulo: string | null, tipo: string, tipoAutor: string | null, periodicidad: string | null): DesgloseTitulo {
  const t = (titulo || "").toLowerCase();
  const tip = (tipo || "").toLowerCase();

  // LIBRO
  if (tip === "libro" || t.includes("libro")) {
    let categoria: string | null = null;
    if (t.includes("categoría a") || t.includes("categoria a")) categoria = "Categoría A";
    else if (t.includes("categoría b") || t.includes("categoria b")) categoria = "Categoría B";
    else if (t.includes("categoría c") || t.includes("categoria c")) categoria = "Categoría C";
    return { tipoVisual: "libro", icono: "📖", color: "#3b82f6", lineaPrincipal: "Libro", lineaSecundaria: categoria };
  }

  // REVISTA / ARTÍCULO / DIRECTOR / FUNDADOR
  if (
    tip === "edicion_revista" || tip === "articulo" || tip === "fundador" || tip === "revista" ||
    t.includes("revista") || t.includes("director") || t.includes("artículo") ||
    t.includes("articulo") || t.includes("fundador") || t.includes("redacc") ||
    t.includes("publicac")
  ) {
    let servicio: string | null = null;
    let duracion: string | null = null;
    if (t.includes("director")) servicio = "Director de revista";
    else if (t.includes("fundador")) servicio = "Fundador";
    else if (t.includes("redacc")) servicio = "Artículo — Redacción y publicación";
    else if (t.includes("solo publicac") || t.includes("publicac")) servicio = "Artículo — Solo publicación";
    else if (tipoAutor) servicio = tipoAutor;
    if (t.includes("3 mes") || t.includes("tres mes")) duracion = "3 meses";
    else if (t.includes("1 mes") || t.includes("un mes")) duracion = "1 mes";
    else if (periodicidad) duracion = periodicidad;
    const lineaSecundaria = [servicio, duracion].filter(Boolean).join(" · ") || null;
    return { tipoVisual: "revista", icono: "📰", color: "#f59e0b", lineaPrincipal: "Revista", lineaSecundaria };
  }

  // OTRO
  return { tipoVisual: "otro", icono: "📦", color: "#64748b", lineaPrincipal: titulo || tipo, lineaSecundaria: null };
}

function ChipDesglose({ desglose }: { desglose: DesgloseTitulo }) {
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", gap: 2,
      background: `${desglose.color}15`, border: `1px solid ${desglose.color}40`,
      borderRadius: 10, padding: "6px 12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 15 }}>{desglose.icono}</span>
        <span style={{ color: desglose.color, fontWeight: 700, fontSize: 13 }}>{desglose.lineaPrincipal}</span>
      </div>
      {desglose.lineaSecundaria && (
        <div style={{ color: "#94a3b8", fontSize: 11, paddingLeft: 21 }}>{desglose.lineaSecundaria}</div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "inline-block", width: 18, height: 18, border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "0 20px", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#0f172a", padding: 32, borderRadius: 20, width: "100%", maxWidth: 380, color: "white", textAlign: "center", border: "1px solid #1e293b", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>¿Confirmar acción?</h3>
        <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ background: "#1e293b", border: "1px solid #334155", padding: "10px 22px", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", padding: "10px 22px", borderRadius: 10, color: "white", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

const ESTADO_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pendiente:  { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "#334155", label: "⏳ Pendiente"  },
  completado: { bg: "rgba(34,197,94,0.1)",   color: "#22c55e", border: "#166534", label: "✅ Completado" },
  entregado:  { bg: "rgba(59,130,246,0.1)",  color: "#60a5fa", border: "#1e3a5f", label: "📦 Entregado"  },
};

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
  return (
    <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 600, letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function BarraProgreso({ items }: { items: ItemPedido[] }) {
  const total = items.length;
  const entregados = items.filter(i => i.estado === "entregado").length;
  const completados = items.filter(i => i.estado === "completado").length;
  const pct = total === 0 ? 0 : Math.round(((completados + entregados) / total) * 100);
  const color = pct === 100 ? "#22c55e" : pct > 50 ? "#3b82f6" : "#f59e0b";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ color: "#475569", fontSize: 11 }}>Progreso general</span>
        <span style={{ color, fontSize: 12, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#22c55e" : "linear-gradient(90deg,#3b82f6,#6366f1)", borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>⏳ {items.filter(i => i.estado === "pendiente").length} pendientes</span>
        <span style={{ fontSize: 10, color: "#22c55e" }}>✅ {completados} completados</span>
        <span style={{ fontSize: 10, color: "#60a5fa" }}>📦 {entregados} entregados</span>
      </div>
    </div>
  );
}

function Entregas() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mes, anio, mesLabel, anterior, siguiente, esActual } = useMesActual();

  const [items, setItems] = useState<ItemPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [actualizando, setActualizando] = useState<number | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/items-pedido`, { headers });
      if (res.ok) setItems(await res.json());
    } catch (error) {
      console.error("Error de red:", error);
    }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const showConfirm = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const updateEstado = async (id: number, nuevoEstado: string) => {
    setActualizando(id);
    await fetch(`${API_URL}/items-pedido/${id}`, { method: "PUT", headers, body: JSON.stringify({ estado: nuevoEstado }) });
    await loadItems();
    setActualizando(null);
  };

  const eliminarItem = async (id: number) => {
    setEliminandoId(id);
    await fetch(`${API_URL}/items-pedido/${id}`, { method: "DELETE", headers });
    await loadItems();
    setEliminandoId(null);
  };

  const eliminarTodosCliente = async (clientItems: ItemPedido[]) => {
    for (const item of clientItems) {
      await fetch(`${API_URL}/items-pedido/${item.id}`, { method: "DELETE", headers });
    }
    await loadItems();
  };

  const marcarTodosEntregados = async (clientItems: ItemPedido[]) => {
    const pendientes = clientItems.filter(i => i.estado !== "entregado");
    for (const item of pendientes) {
      await fetch(`${API_URL}/items-pedido/${item.id}`, { method: "PUT", headers, body: JSON.stringify({ estado: "entregado" }) });
    }
    await loadItems();
  };

  const itemsMes = items.filter(item => {
    const fecha = new Date(item.creadoEn);
    return fecha.getMonth() === mes && fecha.getFullYear() === anio;
  });

  const groupedByClient = itemsMes.reduce((acc, item) => {
    const id = item.cliente.id;
    if (!acc[id]) acc[id] = { cliente: item.cliente, items: [] };
    acc[id].items.push(item);
    return acc;
  }, {} as Record<number, { cliente: ItemPedido["cliente"]; items: ItemPedido[] }>);
  const gruposOrdenados = Object.values(groupedByClient).sort((a, b) => {
    const maxA = Math.max(...a.items.map(i => new Date(i.creadoEn).getTime()));
    const maxB = Math.max(...b.items.map(i => new Date(i.creadoEn).getTime()));
    return maxB - maxA;
  });

  const stats = [
    { label: "Pendientes",  value: itemsMes.filter(i => i.estado === "pendiente").length,  color: "#94a3b8", icon: "⏳" },
    { label: "Completados", value: itemsMes.filter(i => i.estado === "completado").length, color: "#22c55e", icon: "✅" },
    { label: "Entregados",  value: itemsMes.filter(i => i.estado === "entregado").length,  color: "#3b82f6", icon: "📦" },
    { label: "Clientes",    value: Object.keys(groupedByClient).length,                    color: "#a855f7", icon: "👤" },
  ];

  return (
    <div style={{ fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.3} }
        .client-card { background:#0f172a; border-radius:16px; border:1px solid #1e293b; overflow:hidden; margin-bottom:16px; transition:border-color 0.2s; }
        .client-card:hover { border-color:#334155; }
        .client-header { padding:16px 20px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:#0f172a; transition:background 0.2s; }
        .client-header:hover { background:#1e293b; }
        .item-card { background:#1e293b; border-radius:12px; padding:16px; margin-bottom:10px; border:1px solid #334155; animation:fadeIn 0.2s ease; transition:border-color 0.2s; }
        .item-card:hover { border-color:#475569; }
        .tag { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:600; }
        .btn-entregado { border:none; padding:8px 16px; border-radius:8px; background:linear-gradient(135deg,#3b82f6,#6366f1); color:white; font-weight:700; font-size:12px; cursor:pointer; font-family:inherit; transition:opacity 0.15s, transform 0.15s; }
        .btn-entregado:hover { opacity:0.85; transform:translateY(-1px); }
        .btn-entregado:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        .estado-btn { padding:6px 14px; border-radius:8px; border:1px solid; font-size:12px; font-family:inherit; cursor:pointer; font-weight:600; transition:all 0.15s; }
        .estado-btn:hover:not(:disabled) { opacity:0.8; }
        .estado-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .btn-eliminar { background:transparent; border:1px solid #ef4444; border-radius:8px; color:#ef4444; font-size:11px; font-weight:600; padding:5px 12px; cursor:pointer; font-family:inherit; transition:background 0.15s; }
        .btn-eliminar:hover:not(:disabled) { background:rgba(239,68,68,0.1); }
        .btn-eliminar:disabled { opacity:0.4; cursor:not-allowed; }
      `}</style>

      {confirmOpen && (
        <ConfirmModal
          message={confirmMessage}
          onConfirm={() => { confirmAction(); setConfirmOpen(false); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#f1f5f9" }}>Producción & Entregas</h1>
            <p style={{ margin: 0, color: "#475569", fontSize: 12 }}>Gestiona la producción de libros, artículos y ediciones</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <NavegadorMes mesLabel={mesLabel} anio={anio} onAnterior={anterior} onSiguiente={siguiente} esActual={esActual()} />
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 20px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: "14px 14px 0 0" }} />
            <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* LISTA */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 16, height: 80, border: "1px solid #1e293b", opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : Object.keys(groupedByClient).length === 0 ? (
        <div style={{ background: "#0f172a", border: "1px dashed #1e293b", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ color: "#475569", margin: 0, fontSize: 15 }}>No hay pedidos en {mesLabel} {anio}</p>
        </div>
      ) : (
        gruposOrdenados.map(({ cliente, items: clientItems }) => {
          const isSelected = selectedClientId === cliente.id;
          const todosEntregados = clientItems.every(i => i.estado === "entregado");
          const desgloses = clientItems.map(i => parsearTitulo(i.titulo, i.tipo, i.tipoAutor, i.periodicidad));

          return (
            <div key={cliente.id} className="client-card">
              <div className="client-header" onClick={() => setSelectedClientId(isSelected ? null : cliente.id)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, marginTop: 2 }}>👤</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{cliente.nombreCompleto || "Cliente sin nombre"}</div>

                    {/* Chips desglose */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {desgloses.map((d, idx) => (
                        <div key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${d.color}15`, border: `1px solid ${d.color}40`, borderRadius: 99, padding: "2px 10px" }}>
                          <span style={{ fontSize: 13 }}>{d.icono}</span>
                          <span style={{ color: d.color, fontSize: 11, fontWeight: 600 }}>
                            {d.lineaPrincipal}{d.lineaSecundaria ? ` · ${d.lineaSecundaria}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Barra de progreso */}
                    <BarraProgreso items={clientItems} />

                    {/* Acciones del cliente */}
                    <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      {!todosEntregados && (
                        <button
                          className="btn-entregado"
                          onClick={() => showConfirm(
                            `¿Marcar todos los ítems de ${cliente.nombreCompleto || "este cliente"} como entregados?`,
                            () => marcarTodosEntregados(clientItems)
                          )}
                        >
                          📦 Marcar todo como entregado
                        </button>
                      )}
                      {todosEntregados && (
                        <span style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, alignSelf: "center" }}>📦 Todo entregado</span>
                      )}
                      <button
                        className="btn-eliminar"
                        onClick={() => showConfirm(
                          `¿Eliminar todos los ítems de ${cliente.nombreCompleto || "este cliente"}? Esta acción no se puede deshacer.`,
                          () => eliminarTodosCliente(clientItems)
                        )}
                      >
                        🗑 Eliminar todos
                      </button>
                    </div>
                  </div>
                </div>
                <span style={{ color: "#334155", fontSize: 20, transition: "transform 0.2s", transform: isSelected ? "rotate(180deg)" : "none", flexShrink: 0, alignSelf: "flex-start", marginTop: 10 }}>▼</span>
              </div>

              {/* ITEMS EXPANDIDOS */}
              {isSelected && (
                <div style={{ padding: "12px 16px 16px" }}>
                  {clientItems.map(item => {
                    const desglose = parsearTitulo(item.titulo, item.tipo, item.tipoAutor, item.periodicidad);
                    const esPendiente = item.estado === "pendiente";
                    const esCompletado = item.estado === "completado";
                    const esEntregado = item.estado === "entregado";
                    return (
                      <div key={item.id} className="item-card">
                        {/* Cabecera */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                          <ChipDesglose desglose={desglose} />
                          <EstadoBadge estado={item.estado} />
                        </div>

                        {/* Tags SENAPI / ISBN */}
                        {(item.conSenapi || item.conIsbn) && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                            {item.conSenapi && <span className="tag" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}>🔖 SENAPI</span>}
                            {item.conIsbn && <span className="tag" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>📘 ISBN</span>}
                          </div>
                        )}

                        {/* Botones de estado + eliminar */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {!esEntregado && (
                            <>
                              <button
                                className="estado-btn"
                                disabled={esPendiente || actualizando === item.id}
                                onClick={() => updateEstado(item.id, "pendiente")}
                                style={{
                                  background: esPendiente ? "rgba(148,163,184,0.15)" : "transparent",
                                  borderColor: esPendiente ? "#94a3b8" : "#334155",
                                  color: esPendiente ? "#94a3b8" : "#475569",
                                }}
                              >
                                ⏳ Pendiente
                              </button>
                              <button
                                className="estado-btn"
                                disabled={esCompletado || actualizando === item.id}
                                onClick={() => updateEstado(item.id, "completado")}
                                style={{
                                  background: esCompletado ? "rgba(34,197,94,0.15)" : "transparent",
                                  borderColor: esCompletado ? "#22c55e" : "#334155",
                                  color: esCompletado ? "#22c55e" : "#475569",
                                }}
                              >
                                ✅ Completado
                              </button>
                              {actualizando === item.id && <Spinner />}
                            </>
                          )}
                          {esEntregado && (
                            <span style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600 }}>📦 Entregado</span>
                          )}
                          <button
                            className="btn-eliminar"
                            disabled={eliminandoId === item.id}
                            onClick={() => showConfirm(
                              "¿Eliminar este ítem permanentemente? Esta acción no se puede deshacer.",
                              () => eliminarItem(item.id)
                            )}
                            style={{ marginLeft: "auto" }}
                          >
                            {eliminandoId === item.id ? "Eliminando..." : "🗑 Eliminar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default Entregas;