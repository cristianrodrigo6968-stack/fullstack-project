import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

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
  estado: string; // "pendiente", "en revision", "completado"
  revisiones: RevisionItem[];
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

function ClienteMisPedidos() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [archivosObs, setArchivosObs] = useState<Record<number, File[]>>({});
  const [enviandoObs, setEnviandoObs] = useState<number | null>(null);

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

  const enviarObservacion = async (itemId: number) => {
    const nota = observaciones[itemId]?.trim();
    const archivos = archivosObs[itemId] || [];
    if (!nota && archivos.length === 0) return alert("Escribe una observación o adjunta un archivo");

    setEnviandoObs(itemId);
    const formData = new FormData();
    if (nota) formData.append("nota", nota);
    archivos.forEach(file => formData.append("archivos", file));

    const res = await fetch(`${API_URL}/cliente/items/${itemId}/revision`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      setObservaciones(prev => ({ ...prev, [itemId]: "" }));
      setArchivosObs(prev => ({ ...prev, [itemId]: [] }));
      if (selected) await verDetalle(selected.id);
    } else {
      alert("Error al enviar observación");
    }
    setEnviandoObs(null);
  };

  const getEstadoColor = (estado: string) => {
    if (estado === "completado") return { bg: "#14532d", color: "#22c55e" };
    if (estado === "en revision") return { bg: "#1e3a5f", color: "#60a5fa" };
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

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={btnGray}>← Volver a mis pedidos</button>
        <div style={{ background: "#1e293b", padding: isMobile ? 20 : 28, borderRadius: 14, marginTop: 20 }}>
          <h2 style={{ marginBottom: 6, fontSize: isMobile ? 18 : 24 }}>
            Pedido #{selected.id}
          </h2>
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

          {/* Saldo pendiente */}
          <div style={{ marginBottom: 20, background: "#0f172a", padding: 16, borderRadius: 10 }}>
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

          <h3 style={{ marginBottom: 16, color: "#94a3b8", fontSize: 13, textTransform: "uppercase" }}>Ítems del pedido</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {selected.items.map(item => {
              const sc = getEstadoColor(item.estado);
              return (
                <div key={item.id} style={{ background: "#0f172a", padding: 16, borderRadius: 10, borderLeft: `4px solid ${sc.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#60a5fa", fontWeight: "bold" }}>{getTipoLabel(item.tipo)}</span>
                    <span style={{
                      fontSize: 11, padding: "2px 10px", borderRadius: 99,
                      background: sc.bg, color: sc.color, fontWeight: "bold",
                    }}>
                      {item.estado}
                    </span>
                  </div>
                  {item.titulo && <p style={{ color: "white", marginBottom: 4 }}>📌 {item.titulo}</p>}
                  {item.notas && <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>📝 {item.notas}</p>}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {item.conSenapi && <span style={badgeStyle}>SENAPI</span>}
                    {item.conIsbn && <span style={badgeStyle}>ISBN</span>}
                    {item.periodicidad && <span style={badgeStyle}>{item.periodicidad}</span>}
                    {item.tipoAutor && <span style={badgeStyle}>{item.tipoAutor === "soloTitulo" ? "Solo título" : "Con contenido"}</span>}
                    {item.asociacionEncargaTitulo && <span style={badgeStyle}>Título por asociación</span>}
                  </div>

                  {/* Timeline de revisiones */}
                  {item.revisiones.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: "1px solid #334155", paddingTop: 12 }}>
                      <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>Historial de revisiones</p>
                      {item.revisiones.map(rev => (
                        <div key={rev.id} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: "2px solid #334155" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ color: rev.autorTipo === "admin" ? "#60a5fa" : "#a78bfa", fontSize: 12, fontWeight: "bold" }}>
                              {rev.autorTipo === "admin" ? "🔵 Asociación" : "🟣 Tú"} — Ronda {rev.ronda}
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

                  {/* Enviar observación (solo si no está completado) */}
                  {item.estado !== "completado" && (
                    <div style={{ marginTop: 12, borderTop: "1px solid #334155", paddingTop: 12 }}>
                      <textarea
                        placeholder="Escribe tu observación..."
                        value={observaciones[item.id] || ""}
                        onChange={e => setObservaciones(prev => ({ ...prev, [item.id]: e.target.value }))}
                        rows={2}
                        style={{ width: "100%", padding: 8, borderRadius: 6, border: "none", background: "#1e293b", color: "white", fontSize: 12, resize: "none", boxSizing: "border-box", marginBottom: 6 }}
                      />
                      <input
                        type="file"
                        multiple
                        onChange={e => setArchivosObs(prev => ({ ...prev, [item.id]: Array.from(e.target.files || []) }))}
                        style={{ color: "white", fontSize: 11, marginBottom: 6 }}
                      />
                      <button
                        onClick={() => enviarObservacion(item.id)}
                        disabled={enviandoObs === item.id}
                        style={{ ...btnBlue, marginTop: 6, fontSize: 12, padding: "6px 12px" }}
                      >
                        {enviandoObs === item.id ? "Enviando..." : "📤 Enviar observación"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>📦 Mis Pedidos</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24 }}>
        Revisa el estado de tus pedidos y el historial de revisiones.
      </p>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Cargando pedidos...</p>
      ) : pedidos.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center", padding: 40 }}>
          No tienes pedidos aún. ¡Haz tu primer pedido!
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pedidos.map(p => {
            const sc = getEstadoColor(p.estado);
            return (
              <div key={p.id} style={{
                background: "#1e293b", padding: 16, borderRadius: 12,
                borderLeft: `4px solid ${sc.color}`,
                cursor: "pointer",
              }} onClick={() => verDetalle(p.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <p style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>
                      Pedido #{p.id}
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                      {p.items.length} ítems · {new Date(p.creadoEn).toLocaleDateString()}
                    </p>
                    <p style={{ color: "#f59e0b", fontSize: 12 }}>
                      Saldo pendiente: Bs {(p.montoTotal - p.montoPagado).toFixed(2)}
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
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const badgeStyle: React.CSSProperties = { background: "#1e3a5f", color: "#60a5fa", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: "bold" };

export default ClienteMisPedidos;
