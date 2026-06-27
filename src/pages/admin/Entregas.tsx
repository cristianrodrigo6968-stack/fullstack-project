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
  archivoWord: string | null;
  archivoPdf: string | null;
  estado: string;
  cliente: { id: number; nombreCompleto: string | null };
  pedidoId: number;
  creadoEn: string;
  productoPadreId?: number; // 👈 NUEVO: para agrupar componentes
  nombrePadre?: string;     // 👈 NUEVO: nombre del paquete
  precioUnitario?: number;
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

const TIPO_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  edicion_revista: { icon: "📘", label: "Edición de Revista", color: "#6366f1" },
  articulo:        { icon: "📝", label: "Artículo",           color: "#f59e0b" },
  libro:           { icon: "📚", label: "Libro",              color: "#3b82f6" },
  fundador:        { icon: "🏆", label: "Fundador",           color: "#a855f7" },
};

const ESTADO_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pendiente:   { bg: "rgba(148,163,184,0.1)",  color: "#94a3b8", border: "#334155",  label: "⏳ Pendiente"   },
  en_proceso:  { bg: "rgba(245,158,11,0.1)",   color: "#f59e0b", border: "#92400e",  label: "⚙️ En proceso"  },
  completado:  { bg: "rgba(34,197,94,0.1)",    color: "#22c55e", border: "#166534",  label: "✅ Completado"  },
  entregado:   { bg: "rgba(59,130,246,0.1)",   color: "#60a5fa", border: "#1e3a5f",  label: "📦 Entregado"   },
};

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
  return (
    <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 600, letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
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
  const [subiendoArchivo, setSubiendoArchivo] = useState<number | null>(null);
  const [notasEdit, setNotasEdit] = useState<{ [key: number]: string }>({});

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
    await fetch(`${API_URL}/items-pedido/${id}`, { method: "PUT", headers, body: JSON.stringify({ estado: nuevoEstado }) });
    await loadItems();
  };

  const updateNotas = async (id: number) => {
    const notas = notasEdit[id];
    if (notas === undefined) return;
    await fetch(`${API_URL}/items-pedido/${id}`, { method: "PUT", headers, body: JSON.stringify({ notas }) });
    setNotasEdit(prev => { const n = { ...prev }; delete n[id]; return n; });
    await loadItems();
  };

  const subirArchivo = async (id: number, tipo: "word" | "pdf", file: File) => {
    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("tipo", tipo);
    setSubiendoArchivo(id);
    try {
      const res = await fetch(`${API_URL}/items-pedido/${id}/archivo`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (res.ok) await loadItems();
    } finally {
      setSubiendoArchivo(null);
    }
  };

  const itemsMes = items.filter(item => {
    const fecha = new Date(item.creadoEn);
    return fecha.getMonth() === mes && fecha.getFullYear() === anio;
  });

  // 👇 AGRUPAR ÍTEMS POR CLIENTE Y LUEGO POR PAQUETE
  const groupedByClient = itemsMes.reduce((acc, item) => {
    const id = item.cliente.id;
    if (!acc[id]) acc[id] = { cliente: item.cliente, items: [] };
    acc[id].items.push(item);
    return acc;
  }, {} as Record<number, { cliente: ItemPedido["cliente"]; items: ItemPedido[] }>);

  // Función para agrupar ítems de un cliente en paquetes (por productoPadreId)
  const agruparItemsPorPaquete = (items: ItemPedido[]) => {
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

  const stats = [
    { label: "Pendientes",  value: itemsMes.filter(i => i.estado === "pendiente").length,  color: "#94a3b8", icon: "⏳" },
    { label: "En proceso",  value: itemsMes.filter(i => i.estado === "en_proceso").length,  color: "#f59e0b", icon: "⚙️" },
    { label: "Completados", value: itemsMes.filter(i => i.estado === "completado").length, color: "#22c55e", icon: "✅" },
    { label: "Entregados",  value: itemsMes.filter(i => i.estado === "entregado").length,  color: "#3b82f6", icon: "📦" },
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
        .paquete-card { background:#0f172a; border-radius:12px; padding:12px 16px; margin-bottom:10px; border:1px solid #334155; }
        .paquete-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .paquete-items { display:flex; flex-direction:column; gap:4px; padding-left:8px; border-left:2px solid #334155; }
        .paquete-item { display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border-radius:6px; background:#1e293b; }
        .upload-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px; background:#1e293b; border:1px solid #334155; color:#94a3b8; font-size:12px; cursor:pointer; font-family:inherit; font-weight:500; transition:all 0.15s; }
        .upload-btn:hover { border-color:#3b82f6; color:#60a5fa; }
        .estado-select { padding:6px 10px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:white; font-size:12px; font-family:inherit; cursor:pointer; outline:none; transition:border-color 0.2s; }
        .estado-select:focus { border-color:#3b82f6; }
        .notas-input { width:100%; padding:8px 12px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:white; font-size:13px; font-family:inherit; outline:none; box-sizing:border-box; transition:border-color 0.2s; }
        .notas-input:focus { border-color:#3b82f6; }
        .tag { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:600; }
      `}</style>

      {confirmOpen && (
        <ConfirmModal message={confirmMessage} onConfirm={() => { confirmAction(); setConfirmOpen(false); }} onCancel={() => setConfirmOpen(false)} />
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

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 20px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: "14px 14px 0 0" }} />
            <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ background: "#0f172a", borderRadius: 16, height: 80, border: "1px solid #1e293b", opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />)}
        </div>
      ) : Object.keys(groupedByClient).length === 0 ? (
        <div style={{ background: "#0f172a", border: "1px dashed #1e293b", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ color: "#475569", margin: 0, fontSize: 15 }}>No hay pedidos en {mesLabel} {anio}</p>
        </div>
      ) : (
        Object.values(groupedByClient).map(({ cliente, items: clientItems }) => {
          const isSelected = selectedClientId === cliente.id;
          const completados = clientItems.filter(i => i.estado === "completado" || i.estado === "entregado").length;
          const progreso = Math.round((completados / clientItems.length) * 100);
          const { paquetes, normales } = agruparItemsPorPaquete(clientItems);

          return (
            <div key={cliente.id} className="client-card">
              <div className="client-header" onClick={() => setSelectedClientId(isSelected ? null : cliente.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>👤</div>
                  <div>
                    <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>{cliente.nombreCompleto || "Cliente sin nombre"}</div>
                    <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>
                      {clientItems.length} ítem{clientItems.length !== 1 ? "s" : ""} · {completados} completado{completados !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {!isMobile && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${progreso}%`, height: "100%", background: progreso === 100 ? "#22c55e" : "linear-gradient(90deg,#3b82f6,#6366f1)", borderRadius: 99, transition: "width 0.3s" }} />
                      </div>
                      <span style={{ color: "#475569", fontSize: 12, minWidth: 32 }}>{progreso}%</span>
                    </div>
                  )}
                  <span style={{ color: "#334155", fontSize: 20, transition: "transform 0.2s", transform: isSelected ? "rotate(180deg)" : "none" }}>▼</span>
                </div>
              </div>

              {isSelected && (
                <div style={{ padding: "12px 16px 16px" }}>
                  {/* PAQUETES (productos compuestos) */}
                  {paquetes.map(paquete => (
                    <div key={paquete.id} className="paquete-card">
                      <div className="paquete-header">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>🎁</span>
                          <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{paquete.nombre}</span>
                          <span style={{ color: "#475569", fontSize: 11 }}>({paquete.total} componentes)</span>
                        </div>
                        <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 500 }}>
                          {paquete.completados}/{paquete.total} completado
                        </span>
                      </div>
                      <div className="paquete-items">
                        {paquete.items.map(item => {
                          const tipoCfg = TIPO_CONFIG[item.tipo] || { icon: "📋", label: item.tipo, color: "#64748b" };
                          return (
                            <div key={item.id} className="paquete-item">
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 14 }}>{tipoCfg.icon}</span>
                                <span style={{ color: "#cbd5e1", fontSize: 13 }}>{item.titulo || tipoCfg.label}</span>
                              </div>
                              <EstadoBadge estado={item.estado} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* PRODUCTOS NORMALES (sin componentes) */}
                  {normales.map(item => {
                    const tipoCfg = TIPO_CONFIG[item.tipo] || { icon: "📋", label: item.tipo, color: "#64748b" };
                    return (
                      <div key={item.id} className="item-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${tipoCfg.color}20`, border: `1px solid ${tipoCfg.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{tipoCfg.icon}</div>
                            <div>
                              <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{item.titulo || tipoCfg.label}</div>
                              <div style={{ color: tipoCfg.color, fontSize: 11, fontWeight: 600, marginTop: 1 }}>{tipoCfg.label}</div>
                            </div>
                          </div>
                          <EstadoBadge estado={item.estado} />
                        </div>

                        {/* Resto del item-card (notas, archivos, acciones) igual que antes */}
                        <div style={{ marginBottom: 12 }}>
                          {notasEdit[item.id] !== undefined ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <input value={notasEdit[item.id]} onChange={e => setNotasEdit(prev => ({ ...prev, [item.id]: e.target.value }))} className="notas-input" placeholder="Notas de producción..." />
                              <button onClick={() => updateNotas(item.id)} style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", cursor: "pointer", fontSize: 13, fontFamily: "inherit", whiteSpace: "nowrap" }}>💾 Guardar</button>
                              <button onClick={() => setNotasEdit(prev => { const n = { ...prev }; delete n[item.id]; return n; })} style={{ background: "#1e293b", border: "1px solid #334155", padding: "8px 12px", borderRadius: 8, color: "#94a3b8", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>✕</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f172a", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e293b" }}>
                              <span style={{ fontSize: 13, color: item.notas ? "#cbd5e1" : "#475569", flex: 1 }}>📝 {item.notas || "Sin notas de producción"}</span>
                              <button onClick={() => setNotasEdit(prev => ({ ...prev, [item.id]: item.notas || "" }))} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "2px 6px", borderRadius: 4, transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"} onMouseLeave={e => e.currentTarget.style.color = "#475569"}>✏️ Editar</button>
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {item.archivoWord && <a href={item.archivoWord} target="_blank" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#60a5fa", fontSize: 12, textDecoration: "none", fontWeight: 500 }}>📄 Word</a>}
                          {item.archivoPdf && <a href={item.archivoPdf} target="_blank" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 12, textDecoration: "none", fontWeight: 500 }}>📑 PDF</a>}
                          <label className="upload-btn">📎 Subir Word<input type="file" accept=".doc,.docx" style={{ display: "none" }} onChange={e => e.target.files?.[0] && subirArchivo(item.id, "word", e.target.files[0])} disabled={subiendoArchivo === item.id} /></label>
                          <label className="upload-btn">📎 Subir PDF<input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && subirArchivo(item.id, "pdf", e.target.files[0])} disabled={subiendoArchivo === item.id} /></label>
                          {subiendoArchivo === item.id && <Spinner />}
                          <select value={item.estado} onChange={e => updateEstado(item.id, e.target.value)} className="estado-select" style={{ marginLeft: "auto" }}>
                            <option value="pendiente">⏳ Pendiente</option>
                            <option value="en_proceso">⚙️ En proceso</option>
                            <option value="completado">✅ Completado</option>
                            <option value="entregado">📦 Entregado</option>
                          </select>
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