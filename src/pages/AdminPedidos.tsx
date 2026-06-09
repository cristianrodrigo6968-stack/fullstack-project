import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";
import { useMesActual } from "../hooks/useMesActual";
import NavegadorMes from "../components/NavegadorMes";


const API_URL = "${import.meta.env.VITE_API_URL}";
interface Edicion {
  id: number;
  numero: number;
  magazine: { id: number; title: string };
}

interface RevisionItem {
  id: number;
  ronda: number;
  autorTipo: string;
  nota: string | null;
  archivos: string[];
  creadoEn: string;
}

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
  edicionId: number | null;
  edicion?: { id: number; numero: number; magazine: { id: number; title: string } } | null;
  revisiones: RevisionItem[];
}

interface Pedido {
  id: number;
  cliente: { id: number; nombreCompleto: string | null; nombres: string | null; apellidoPaterno: string | null };
  estado: string;
  motivoRechazo: string | null;
  montoTotal: number;
  montoPagado: number;
  creadoEn: string;
  items: ItemPedido[];
}

function AdminPedidos() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mesLabel, anio, anterior, siguiente, esActual, filtrarPorMes } = useMesActual();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);

  // Estados para subir avances
  const [notaAvance, setNotaAvance] = useState<Record<number, string>>({});
  const [archivosAvance, setArchivosAvance] = useState<Record<number, File[]>>({});
  const [subiendoAvance, setSubiendoAvance] = useState<number | null>(null);

  // Estado para ajustar precio
  const [editandoPrecio, setEditandoPrecio] = useState(false);
  const [nuevoPrecio, setNuevoPrecio] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const loadPedidos = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/pedidos`, { headers });
    if (res.ok) setPedidos(await res.json());
    setLoading(false);
  };

  const loadEdiciones = async () => {
    const res = await fetch(`${API_URL}/ediciones`, { headers });
    if (res.ok) setEdiciones(await res.json());
  };

  useEffect(() => { loadPedidos(); loadEdiciones(); }, []);

  const rechazar = async (id: number) => {
    if (!motivoRechazo.trim()) return alert("Escribe el motivo del rechazo");
    const res = await fetch(`${API_URL}/pedidos/${id}/rechazar`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ motivoRechazo }),
    });
    if (res.ok) {
      setMotivoRechazo("");
      setRechazandoId(null);
      await loadPedidos();
    }
  };

  const completar = async (id: number) => {
    await fetch(`${API_URL}/pedidos/${id}/completar`, { method: "PUT", headers });
    await loadPedidos();
  };

  const ajustarPrecio = async () => {
    if (!selected || !nuevoPrecio) return;
    const res = await fetch(`${API_URL}/pedidos/${selected.id}/ajustar-precio`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ montoTotal: Number(nuevoPrecio) }),
    });
    if (res.ok) {
      setSelected(prev => prev ? { ...prev, montoTotal: Number(nuevoPrecio) } : null);
      setEditandoPrecio(false);
      await loadPedidos();
    } else alert("Error al ajustar precio");
  };

  const asignarRevista = async (itemId: number, edicionId: number) => {
    const res = await fetch(`${API_URL}/items/${itemId}/asignar-revista`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ edicionId }),
    });
    if (res.ok) {
      if (selected) {
        const detalleRes = await fetch(`${API_URL}/pedidos/${selected.id}`, { headers });
        if (detalleRes.ok) setSelected(await detalleRes.json());
      }
    } else {
      const data = await res.json();
      alert(data.error || "Error al asignar");
    }
  };

  const subirAvance = async (itemId: number) => {
    const nota = notaAvance[itemId]?.trim() || "";
    const archivos = archivosAvance[itemId] || [];
    setSubiendoAvance(itemId);

    const formData = new FormData();
    if (nota) formData.append("nota", nota);
    archivos.forEach(file => formData.append("archivos", file));

    const res = await fetch(`${API_URL}/items/${itemId}/revision`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (res.ok) {
      setNotaAvance(prev => ({ ...prev, [itemId]: "" }));
      setArchivosAvance(prev => ({ ...prev, [itemId]: [] }));
      if (selected) {
        const detalleRes = await fetch(`${API_URL}/pedidos/${selected.id}`, { headers });
        if (detalleRes.ok) setSelected(await detalleRes.json());
      }
    } else {
      alert("Error al subir avance");
    }
    setSubiendoAvance(null);
  };

  const marcarCompletado = async (itemId: number) => {
    await fetch(`${API_URL}/items/${itemId}/completar`, { method: "PUT", headers });
    if (selected) {
      const detalleRes = await fetch(`${API_URL}/pedidos/${selected.id}`, { headers });
      if (detalleRes.ok) setSelected(await detalleRes.json());
    }
  };

  const getEstadoColor = (estado: string) => {
    if (estado === "en proceso") return { bg: "#1e3a5f", color: "#60a5fa" };
    if (estado === "completado") return { bg: "#14532d", color: "#22c55e" };
    if (estado === "rechazado") return { bg: "#7f1d1d", color: "#ef4444" };
    return { bg: "#422006", color: "#f59e0b" };
  };

  const getTipoLabel = (tipo: string) => {
    const map: Record<string, string> = {
      libroA: "📚 Libro Cat. A",
      libroB: "📚 Libro Cat. B",
      libroC: "📚 Libro Cat. C",
      director: "📘 Director de Revista",
      fundador: "🏆 Fundador de Revista",
      autor: "📝 Autor de Artículo",
    };
    return map[tipo] || tipo;
  };

  const pedidosFiltrados = filtrarPorMes(pedidos);

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={btnGray}>← Volver a la lista</button>
        <div style={{ background: "#1e293b", padding: isMobile ? 20 : 28, borderRadius: 14, marginTop: 20 }}>
          <h2 style={{ marginBottom: 6, fontSize: isMobile ? 18 : 24 }}>
            Pedido #{selected.id}
          </h2>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>
            Cliente: {selected.cliente?.nombreCompleto || [selected.cliente?.nombres, selected.cliente?.apellidoPaterno].filter(Boolean).join(" ") || "Sin nombre"}
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 12, padding: "3px 12px", borderRadius: 99,
              background: getEstadoColor(selected.estado).bg,
              color: getEstadoColor(selected.estado).color, fontWeight: "bold",
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

          {/* Ajustar precio */}
          <div style={{ marginBottom: 16, background: "#0f172a", padding: 16, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                Monto total: <strong style={{ color: "#22c55e" }}>Bs {selected.montoTotal?.toFixed(2) || "0.00"}</strong>
              </span>
              {!editandoPrecio ? (
                <button onClick={() => { setEditandoPrecio(true); setNuevoPrecio(String(selected.montoTotal)); }} style={{ ...btnBlue, fontSize: 12, padding: "4px 10px" }}>
                  ✏️ Ajustar
                </button>
              ) : (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="number"
                    value={nuevoPrecio}
                    onChange={e => setNuevoPrecio(e.target.value)}
                    style={{ width: 100, padding: 4, borderRadius: 4, border: "none", background: "#334155", color: "white", fontSize: 13 }}
                  />
                  <button onClick={ajustarPrecio} style={{ ...btnGreen, fontSize: 12, padding: "4px 10px" }}>Guardar</button>
                  <button onClick={() => setEditandoPrecio(false)} style={{ ...btnGray, fontSize: 12, padding: "4px 10px" }}>Cancelar</button>
                </div>
              )}
            </div>
          </div>

          {/* Barra de progreso de pago */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>Progreso de pago</span>
              <span style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
                Bs {selected.montoPagado?.toFixed(2) || "0.00"} / Bs {selected.montoTotal?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div style={{ background: "#334155", borderRadius: 99, height: 10, overflow: "hidden" }}>
              <div style={{
                width: `${selected.montoTotal > 0 ? Math.round((selected.montoPagado / selected.montoTotal) * 100) : 0}%`,
                height: "100%", background: "#22c55e", borderRadius: 99, transition: "width 0.4s ease",
              }} />
            </div>
          </div>

          {selected.estado === "en proceso" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={() => completar(selected.id)} style={btnGreen}>✅ Completar pedido</button>
              {rechazandoId === selected.id ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    placeholder="Motivo del rechazo"
                    value={motivoRechazo}
                    onChange={e => setMotivoRechazo(e.target.value)}
                    style={{ padding: 6, borderRadius: 6, border: "none", background: "#0f172a", color: "white", fontSize: 12 }}
                  />
                  <button onClick={() => rechazar(selected.id)} style={btnRed}>Confirmar</button>
                  <button onClick={() => { setRechazandoId(null); setMotivoRechazo(""); }} style={btnGray}>Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setRechazandoId(selected.id)} style={btnRed}>❌ Rechazar</button>
              )}
            </div>
          )}

          <h3 style={{ marginBottom: 16, color: "#94a3b8", fontSize: 13, textTransform: "uppercase" }}>Ítems del pedido</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {selected.items.map(item => (
              <div key={item.id} style={{ background: "#0f172a", padding: 16, borderRadius: 10, borderLeft: "4px solid #3b82f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#60a5fa", fontWeight: "bold" }}>{getTipoLabel(item.tipo)}</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{item.estado}</span>
                </div>
                {item.titulo && <p style={{ color: "white", marginBottom: 4 }}>📌 {item.titulo}</p>}
                {item.notas && <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>📝 {item.notas}</p>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {item.conSenapi && <span style={badgeStyle}>SENAPI</span>}
                  {item.conIsbn && <span style={badgeStyle}>ISBN</span>}
                  {item.periodicidad && <span style={badgeStyle}>{item.periodicidad}</span>}
                  {item.tipoAutor && <span style={badgeStyle}>{item.tipoAutor === "soloTitulo" ? "Solo título" : "Con contenido"}</span>}
                </div>

                {/* Selector de revista para artículos y fundadores */}
                {(item.tipo === "autor" || item.tipo === "fundador") && (
                  <div style={{ marginTop: 12, background: "#1e293b", padding: 10, borderRadius: 8 }}>
                    <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>Asignar a revista/edición</p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <select
                        value={item.edicionId || ""}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) asignarRevista(item.id, Number(val));
                        }}
                        style={{ flex: 1, padding: 6, borderRadius: 4, border: "none", background: "#334155", color: "white", fontSize: 12 }}
                      >
                        <option value="">-- Seleccionar --</option>
                        {ediciones.map(ed => (
                          <option key={ed.id} value={ed.id}>
                            {ed.magazine.title} - Edición {ed.numero}
                          </option>
                        ))}
                      </select>
                    </div>
                    {item.edicion && (
                      <p style={{ color: "#22c55e", fontSize: 11, marginTop: 4 }}>
                        ✅ Asignado a: {item.edicion.magazine.title} (Ed. {item.edicion.numero})
                      </p>
                    )}
                  </div>
                )}

                {/* Timeline de revisiones */}
                {item.revisiones.length > 0 && (
                  <div style={{ marginTop: 12, borderTop: "1px solid #334155", paddingTop: 12 }}>
                    <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>Historial de revisiones</p>
                    {item.revisiones.map(rev => (
                      <div key={rev.id} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: "2px solid #334155" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: rev.autorTipo === "admin" ? "#60a5fa" : "#a78bfa", fontSize: 12, fontWeight: "bold" }}>
                            {rev.autorTipo === "admin" ? "🔵 Asociación" : "🟣 Cliente"} — Ronda {rev.ronda}
                          </span>
                          <span style={{ color: "#64748b", fontSize: 11 }}>{new Date(rev.creadoEn).toLocaleDateString()}</span>
                        </div>
                        {rev.nota && <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>{rev.nota}</p>}
                        {rev.archivos.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {rev.archivos.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", fontSize: 11, textDecoration: "underline" }}>
                                📎 Archivo {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario de avance (admin) */}
                {item.estado !== "completado" && (
                  <div style={{ marginTop: 12, borderTop: "1px solid #334155", paddingTop: 12 }}>
                    <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>
                      Subir avance
                    </p>
                    <textarea
                      placeholder="Nota del avance (opcional)"
                      value={notaAvance[item.id] || ""}
                      onChange={e => setNotaAvance(prev => ({ ...prev, [item.id]: e.target.value }))}
                      rows={2}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "none", background: "#0f172a", color: "white", fontSize: 12, resize: "none", boxSizing: "border-box", marginBottom: 6 }}
                    />
                    <input
                      type="file"
                      multiple
                      onChange={e => setArchivosAvance(prev => ({ ...prev, [item.id]: Array.from(e.target.files || []) }))}
                      style={{ color: "white", fontSize: 11, marginBottom: 6 }}
                    />
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        onClick={() => subirAvance(item.id)}
                        disabled={subiendoAvance === item.id}
                        style={{ ...btnBlue, fontSize: 12, padding: "6px 12px" }}
                      >
                        {subiendoAvance === item.id ? "Subiendo..." : "📤 Enviar avance"}
                      </button>
                      <button
                        onClick={() => marcarCompletado(item.id)}
                        style={{ ...btnGreen, fontSize: 12, padding: "6px 12px" }}
                      >
                        ✅ Marcar como completado
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>📦 Pedidos</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Gestiona los pedidos de los clientes.
      </p>

      <NavegadorMes
        mesLabel={mesLabel} anio={anio}
        onAnterior={anterior} onSiguiente={siguiente}
        esActual={esActual()}
      />

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Cargando pedidos...</p>
      ) : pedidosFiltrados.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center", padding: 40 }}>No hay pedidos en {mesLabel} {anio}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pedidosFiltrados.map(p => {
            const sc = getEstadoColor(p.estado);
            return (
              <div key={p.id} style={{
                background: "#1e293b", padding: 16, borderRadius: 12,
                borderLeft: `4px solid ${sc.color}`,
                cursor: "pointer",
              }} onClick={() => setSelected(p)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <p style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>
                      Pedido #{p.id} — {p.cliente?.nombreCompleto || [p.cliente?.nombres, p.cliente?.apellidoPaterno].filter(Boolean).join(" ") || "Sin nombre"}
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                      {p.items.length} ítems · {new Date(p.creadoEn).toLocaleDateString()}
                    </p>
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

const btnBlue: React.CSSProperties = { background: "#3b82f6", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnGreen: React.CSSProperties = { background: "#22c55e", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnRed: React.CSSProperties = { background: "#ef4444", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const badgeStyle: React.CSSProperties = { background: "#1e3a5f", color: "#60a5fa", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: "bold" };

export default AdminPedidos;
