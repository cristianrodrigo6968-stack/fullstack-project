import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";
import { useMesActual } from "../hooks/useMesActual";
import NavegadorMes from "../components/NavegadorMes";


const API_URL = "https://taskmanager-backend-ewud.onrender.com";
interface ItemPedido {
  id: number;
  tipo: string;        // "libro", "articulo", "edicion_revista", "fundador"
  titulo: string | null;
  conSenapi: boolean;
  conIsbn: boolean;
  periodicidad: string | null;
  tipoAutor: string | null;
  asociacionEncargaTitulo: boolean;
  notas: string | null;
  archivoWord: string | null;
  archivoPdf: string | null;
  estado: string;      // "pendiente", "en_proceso", "completado", "entregado"
  cliente: {
    id: number;
    nombreCompleto: string | null;
  };
  pedidoId: number;
  creadoEn: string;
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        display: "inline-block", width: 16, height: 16,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTop: "2px solid white", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 9999, padding: "0 20px",
    }}>
      <div style={{
        background: "#1e293b", padding: 32, borderRadius: 16,
        width: "100%", maxWidth: 380, color: "white",
        textAlign: "center", border: "1px solid #334155",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
        <h3 style={{ marginBottom: 10 }}>¿Confirmar?</h3>
        <p style={{ color: "#94a3b8", marginBottom: 28, fontSize: 14 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={btnGray}>Cancelar</button>
          <button onClick={onConfirm} style={btnGreen}>Sí, confirmar</button>
        </div>
      </div>
    </div>
  );
}

function getTipoIcon(tipo: string) {
  if (tipo === "edicion_revista") return "📘";
  if (tipo === "articulo") return "📝";
  if (tipo === "libro") return "📚";
  if (tipo === "fundador") return "🏆";
  return "📋";
}

function getEstadoColor(estado: string) {
  switch (estado) {
    case "completado": return { bg: "#14532d", color: "#22c55e", label: "✅ Completado" };
    case "entregado": return { bg: "#1e3a5f", color: "#60a5fa", label: "📦 Entregado" };
    case "en_proceso": return { bg: "#422006", color: "#f59e0b", label: "⚙️ En proceso" };
    default: return { bg: "#1e293b", color: "#94a3b8", label: "⏳ Pendiente" };
  }
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

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/items-pedido`, { headers });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        console.error("Error al cargar items:", res.status);
      }
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
    const res = await fetch(`${API_URL}/items-pedido/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) await loadItems();
  };

  const updateNotas = async (id: number) => {
    const notas = notasEdit[id];
    if (notas === undefined) return;
    await fetch(`${API_URL}/items-pedido/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ notas }),
    });
    setNotasEdit(prev => { const newPrev = { ...prev }; delete newPrev[id]; return newPrev; });
    await loadItems();
  };

  const subirArchivo = async (id: number, tipo: "word" | "pdf", file: File) => {
    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("tipo", tipo);
    setSubiendoArchivo(id);
    try {
      const res = await fetch(`${API_URL}/items-pedido/${id}/archivo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) await loadItems();
    } catch (error) {
      console.error("Error subiendo archivo:", error);
    } finally {
      setSubiendoArchivo(null);
    }
  };

  // Filtrar por mes de creación del pedido
  const itemsMes = items.filter(item => {
    const fecha = new Date(item.creadoEn);
    return fecha.getMonth() === mes && fecha.getFullYear() === anio;
  });

  // Agrupar por cliente
  const groupedByClient = itemsMes.reduce((acc, item) => {
    const clientId = item.cliente.id;
    if (!acc[clientId]) acc[clientId] = { cliente: item.cliente, items: [] };
    acc[clientId].items.push(item);
    return acc;
  }, {} as Record<number, { cliente: ItemPedido["cliente"]; items: ItemPedido[] }>);

  const pendientesCount = itemsMes.filter(i => i.estado === "pendiente").length;
  const enProcesoCount = itemsMes.filter(i => i.estado === "en_proceso").length;
  const completadosCount = itemsMes.filter(i => i.estado === "completado").length;
  const entregadosCount = itemsMes.filter(i => i.estado === "entregado").length;

  return (
    <div>
      {confirmOpen && (
        <ConfirmModal message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />
      )}

      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>📦 Producción / Entregas</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Gestiona la producción de libros, artículos y ediciones solicitadas por los clientes.
      </p>

      <NavegadorMes mesLabel={mesLabel} anio={anio} onAnterior={anterior} onSiguiente={siguiente} esActual={esActual()} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Pendientes", value: pendientesCount, color: "#94a3b8" },
          { label: "En proceso", value: enProcesoCount, color: "#f59e0b" },
          { label: "Completados", value: completadosCount, color: "#22c55e" },
          { label: "Entregados", value: entregadosCount, color: "#3b82f6" },
        ].map(s => (
          <div key={s.label} style={{ background: "#1e293b", padding: isMobile ? 12 : 16, borderRadius: 12, textAlign: "center", borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: s.color }}>{s.value}</div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}><Spinner /></div>
      ) : Object.keys(groupedByClient).length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#64748b", fontSize: 16 }}>No hay pedidos en {mesLabel} {anio}</p>
        </div>
      ) : (
        Object.values(groupedByClient).map(({ cliente, items: clientItems }) => {
          const isSelected = selectedClientId === cliente.id;
          return (
            <div key={cliente.id} style={{ marginBottom: 24, background: "#0f172a", borderRadius: 12, overflow: "hidden" }}>
              <div
                onClick={() => setSelectedClientId(isSelected ? null : cliente.id)}
                style={{
                  background: "#1e293b", padding: 16, cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <h3 style={{ color: "white", margin: 0 }}>👤 {cliente.nombreCompleto || "Cliente sin nombre"}</h3>
                <span style={{ color: "#64748b", fontSize: 18 }}>{isSelected ? "▲" : "▼"}</span>
              </div>
              {isSelected && (
                <div style={{ padding: 16 }}>
                  {clientItems.map(item => {
                    const estadoStyle = getEstadoColor(item.estado);
                    return (
                      <div key={item.id} style={{ background: "#1e293b", marginBottom: 12, borderRadius: 8, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                          <div>
                            <span style={{ fontSize: 20, marginRight: 8 }}>{getTipoIcon(item.tipo)}</span>
                            <strong style={{ color: "white" }}>{item.titulo || (item.tipo === "libro" ? "Libro sin título" : item.tipo === "articulo" ? "Artículo" : "Edición de revista")}</strong>
                          </div>
                          <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 99, background: estadoStyle.bg, color: estadoStyle.color }}>
                            {estadoStyle.label}
                          </span>
                        </div>

                        {/* Detalles adicionales */}
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                          {item.conSenapi && <span>🔖 SENAPI </span>}
                          {item.conIsbn && <span>📘 ISBN </span>}
                          {item.periodicidad && <span>🔄 {item.periodicidad} </span>}
                          {item.tipoAutor && <span>✍️ {item.tipoAutor}</span>}
                        </div>

                        {/* Notas */}
                        <div style={{ marginBottom: 8 }}>
                          {notasEdit[item.id] !== undefined ? (
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <input
                                value={notasEdit[item.id]}
                                onChange={e => setNotasEdit(prev => ({ ...prev, [item.id]: e.target.value }))}
                                style={{ flex: 1, ...inputStyle, fontSize: 12 }}
                                placeholder="Notas de producción..."
                              />
                              <button onClick={() => updateNotas(item.id)} style={btnGreen}>💾</button>
                              <button onClick={() => setNotasEdit(prev => { const newPrev = { ...prev }; delete newPrev[item.id]; return newPrev; })} style={btnGray}>✖️</button>
                            </div>
                          ) : (
                            <p style={{ fontSize: 12, color: "#cbd5e1", background: "#0f172a", padding: 6, borderRadius: 4 }}>
                              📝 {item.notas || "Sin notas"} 
                              <button onClick={() => setNotasEdit(prev => ({ ...prev, [item.id]: item.notas || "" }))} style={{ marginLeft: 8, ...btnGray, padding: "2px 6px", fontSize: 10 }}>Editar</button>
                            </p>
                          )}
                        </div>

                        {/* Archivos y acciones */}
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                          {item.archivoWord && <a href={item.archivoWord} target="_blank" style={{ color: "#60a5fa", fontSize: 12 }}>📄 Word</a>}
                          {item.archivoPdf && <a href={item.archivoPdf} target="_blank" style={{ color: "#60a5fa", fontSize: 12 }}>📑 PDF</a>}
                          <label style={{ ...btnGray, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
                            📎 Subir Word
                            <input type="file" accept=".doc,.docx" style={{ display: "none" }} onChange={e => e.target.files?.[0] && subirArchivo(item.id, "word", e.target.files[0])} disabled={subiendoArchivo === item.id} />
                          </label>
                          <label style={{ ...btnGray, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
                            📎 Subir PDF
                            <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && subirArchivo(item.id, "pdf", e.target.files[0])} disabled={subiendoArchivo === item.id} />
                          </label>
                          {subiendoArchivo === item.id && <Spinner />}
                          <select
                            value={item.estado}
                            onChange={e => updateEstado(item.id, e.target.value)}
                            style={{ ...inputStyle, fontSize: 11, padding: "4px 8px", width: 130 }}
                          >
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

const btnGreen: React.CSSProperties = { background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const inputStyle: React.CSSProperties = { padding: 6, borderRadius: 4, border: "none", background: "#0f172a", color: "white", fontSize: 12, boxSizing: "border-box" };

export default Entregas;