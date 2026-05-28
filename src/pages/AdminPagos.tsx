import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";
import { useMesActual } from "../hooks/useMesActual";
import NavegadorMes from "../components/NavegadorMes";

const API_URL = import.meta.env.VITE_API_URL;

interface Pago {
  id: number;
  nombreDeclarado: string;
  monto: number;
  tipo: string;
  descripcion: string | null;
  imagenUrl: string | null;
  estado: string;
  motivoRechazo: string | null;
  productos: string | null;
  celular: string | null;
  creadoEn: string;
  pedido?: {
    id: number;
    montoTotal: number;
    montoPagado: number;
    estado: string;
  };
}

function AdminPagos() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mes, anio, mesLabel, anterior, siguiente, esActual } = useMesActual();

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pago | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "pendiente" | "verificado" | "rechazado">("todos");

  const [manualNombre, setManualNombre] = useState("");
  const [manualMonto, setManualMonto] = useState("");
  const [manualCelular, setManualCelular] = useState("");
  const [manualPedidoId, setManualPedidoId] = useState("");
  const [agregandoManual, setAgregandoManual] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editMonto, setEditMonto] = useState("");

  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pagos`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPagos(data);
      } else {
        console.error("Error al cargar pagos:", res.status);
      }
    } catch (err) {
      console.error("Error de red al cargar pagos:", err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pagosMes = pagos.filter(p => {
    const fecha = new Date(p.creadoEn);
    return fecha.getMonth() === mes && fecha.getFullYear() === anio;
  });

  const pagosFiltrados = pagosMes.filter(p => filtro === "todos" || p.estado === filtro);

  const verificar = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/pagos/${id}/verificar`, { method: "PUT", headers });
      if (res.ok) {
        await load();
        setSelected(null);
      }
    } catch (err) {
      console.error("Error al verificar pago:", err);
    }
  };

  const rechazar = async (id: number) => {
    if (!motivoRechazo.trim()) return alert("Escribe el motivo del rechazo");
    try {
      const res = await fetch(`${API_URL}/pagos/${id}/rechazar`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ motivoRechazo }),
      });
      if (res.ok) {
        setMotivoRechazo("");
        setRechazandoId(null);
        await load();
        setSelected(null);
      }
    } catch (err) {
      console.error("Error al rechazar pago:", err);
    }
  };

  const agregarPagoManual = async () => {
    if (!manualNombre || !manualMonto) return;
    setAgregandoManual(true);
    try {
      const body: any = {
        nombreDeclarado: manualNombre,
        monto: Number(manualMonto),
        celular: manualCelular || null,
        pedidoId: manualPedidoId ? Number(manualPedidoId) : null,
      };
      await fetch(`${API_URL}/pagos/manual`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      setManualNombre("");
      setManualMonto("");
      setManualCelular("");
      setManualPedidoId("");
      await load();
    } catch (err) {
      console.error("Error al agregar pago manual:", err);
    }
    setAgregandoManual(false);
  };

  const editarPago = async (id: number) => {
    if (!editNombre || !editMonto) return;
    try {
      const res = await fetch(`${API_URL}/pagos/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ nombreDeclarado: editNombre, monto: Number(editMonto) }),
      });
      if (res.ok) {
        setEditandoId(null);
        await load();
      }
    } catch (err) {
      console.error("Error al editar pago:", err);
    }
  };

  const eliminarPago = async (id: number) => {
    if (!confirm("¿Eliminar este pago permanentemente?")) return;
    setEliminandoId(id);
    try {
      const res = await fetch(`${API_URL}/pagos/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setPagos(prev => prev.filter(p => p.id !== id));
        if (selected?.id === id) setSelected(null);
      } else {
        const errorText = await res.text();
        console.error(`Error ${res.status}:`, errorText);
        alert(`No se pudo eliminar: ${errorText}`);
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Error de conexión");
    } finally {
      setEliminandoId(null);
    }
  };

  const getEstadoColor = (estado: string) => {
    if (estado === "verificado") return { bg: "#14532d", color: "#22c55e" };
    if (estado === "rechazado") return { bg: "#7f1d1d", color: "#ef4444" };
    return { bg: "#422006", color: "#f59e0b" };
  };

  return (
    <div>
      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>💰 Pagos</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Gestiona los pagos de los clientes.
      </p>

      {/* Filtros de estado */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["todos", "pendiente", "verificado", "rechazado"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: "6px 16px",
              borderRadius: 99,
              border: "none",
              background: filtro === f ? "#3b82f6" : "#334155",
              color: "white",
              fontWeight: "bold",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Formulario de pago manual */}
      <div style={{ background: "#1e293b", padding: 16, borderRadius: 12, marginBottom: 24, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Nombre" value={manualNombre} onChange={e => setManualNombre(e.target.value)} style={inputStyle} />
        <input placeholder="Monto" type="number" value={manualMonto} onChange={e => setManualMonto(e.target.value)} style={{ ...inputStyle, width: 100 }} />
        <input placeholder="Celular (opcional)" value={manualCelular} onChange={e => setManualCelular(e.target.value)} style={{ ...inputStyle, width: 140 }} />
        <select value={manualPedidoId} onChange={e => setManualPedidoId(e.target.value)} style={{ ...inputStyle, width: 200, cursor: "pointer" }}>
          <option value="">Sin pedido asociado</option>
        </select>
        <button onClick={agregarPagoManual} disabled={agregandoManual} style={{ ...btnGreen, fontSize: 13, padding: "8px 14px" }}>
          {agregandoManual ? "..." : "➕ Agregar pago manual"}
        </button>
      </div>

      {/* Navegador de mes */}
      <NavegadorMes
        mesLabel={mesLabel}
        anio={anio}
        onAnterior={anterior}
        onSiguiente={siguiente}
        esActual={esActual()}
      />

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Cargando pagos...</p>
      ) : selected ? (
        /* ── VISTA DETALLE ─────────────────────────────── */
        <div>
          <button onClick={() => setSelected(null)} style={{ ...btnGray, marginBottom: 16 }}>← Volver a la lista</button>
          <div style={{ background: "#1e293b", padding: 24, borderRadius: 14 }}>
            <h2 style={{ marginBottom: 12 }}>Pago #{selected.id}</h2>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Nombre</p>
                <p style={{ color: "white", fontWeight: "bold" }}>{selected.nombreDeclarado}</p>
              </div>
              <div>
                <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Monto</p>
                <p style={{ color: "#22c55e", fontWeight: "bold", fontSize: 18 }}>Bs {selected.monto.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Estado</p>
                <span style={{ fontSize: 12, padding: "3px 12px", borderRadius: 99, background: getEstadoColor(selected.estado).bg, color: getEstadoColor(selected.estado).color, fontWeight: "bold" }}>{selected.estado}</span>
              </div>
              <div>
                <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Tipo</p>
                <p style={{ color: "white" }}>{selected.tipo === "imagen" ? "📷 Comprobante" : selected.tipo === "manual" ? "✍️ Manual" : "📝 Declarado"}</p>
              </div>
              <div>
                <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Celular</p>
                <p style={{ color: "white" }}>{selected.celular || "No registrado"}</p>
              </div>
              <div>
                <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Fecha</p>
                <p style={{ color: "white" }}>{new Date(selected.creadoEn).toLocaleString()}</p>
              </div>
            </div>

            {selected.descripcion && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>Descripción</p>
                <p style={{ color: "white" }}>{selected.descripcion}</p>
              </div>
            )}

            {selected.motivoRechazo && (
              <div style={{ marginBottom: 16, background: "#7f1d1d", padding: 12, borderRadius: 8 }}>
                <p style={{ color: "#fca5a5", fontSize: 13 }}>❌ {selected.motivoRechazo}</p>
              </div>
            )}

            {selected.productos && (() => {
              try {
                const prods = JSON.parse(selected.productos);
                if (Array.isArray(prods) && prods.length > 0) {
                  return (
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>Productos solicitados</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {prods.map((prod: any, idx: number) => (
                          <div key={idx} style={{ background: "#0f172a", padding: "8px 12px", borderRadius: 6, color: "#60a5fa" }}>
                            📌 {prod.nombre}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              } catch { return null; }
              return null;
            })()}

            {selected.imagenUrl && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>Comprobante</p>
                <img
                  src={selected.imagenUrl}
                  alt="comprobante"
                  style={{ maxWidth: "100%", borderRadius: 8, cursor: "pointer" }}
                  onClick={() => window.open(selected.imagenUrl!, "_blank")}
                />
              </div>
            )}

            {selected.estado === "pendiente" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => verificar(selected.id)} style={btnGreen}>✅ Verificar</button>
                {rechazandoId === selected.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      placeholder="Motivo del rechazo"
                      value={motivoRechazo}
                      onChange={e => setMotivoRechazo(e.target.value)}
                      style={{ padding: 6, borderRadius: 6, border: "none", background: "#0f172a", color: "white", fontSize: 12, width: 200 }}
                    />
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => rechazar(selected.id)} style={btnRed}>Confirmar</button>
                      <button onClick={() => { setRechazandoId(null); setMotivoRechazo(""); }} style={btnGray}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setRechazandoId(selected.id)} style={btnRed}>❌ Rechazar</button>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {editandoId === selected.id ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <input value={editNombre} onChange={e => setEditNombre(e.target.value)} style={inputStyle} placeholder="Nombre" />
                  <input value={editMonto} onChange={e => setEditMonto(e.target.value)} style={{ ...inputStyle, width: 100 }} placeholder="Monto" type="number" />
                  <button onClick={() => editarPago(selected.id)} style={btnGreen}>Guardar</button>
                  <button onClick={() => setEditandoId(null)} style={btnGray}>Cancelar</button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditandoId(selected.id);
                    setEditNombre(selected.nombreDeclarado);
                    setEditMonto(String(selected.monto));
                  }}
                  style={btnYellow}
                >
                  ✏️ Editar
                </button>
              )}
              <button
                onClick={() => eliminarPago(selected.id)}
                disabled={eliminandoId === selected.id}
                style={btnRed}
              >
                {eliminandoId === selected.id ? "..." : "🗑 Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── LISTA ─────────────────────────────────────── */
        <>
          {pagosFiltrados.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: 40 }}>
              No hay pagos con este filtro en {mesLabel} {anio}.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pagosFiltrados.map(p => {
                const sc = getEstadoColor(p.estado);
                const saldoPendiente = p.pedido ? (p.pedido.montoTotal - p.pedido.montoPagado) : null;
                const estaPagado = saldoPendiente !== null && saldoPendiente <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelected(p)}
                    style={{ background: "#1e293b", padding: 16, borderRadius: 12, borderLeft: `4px solid ${sc.color}`, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <p style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{p.nombreDeclarado}</p>
                        <p style={{ color: "#22c55e", fontWeight: "bold", fontSize: 18, margin: "4px 0" }}>Bs {p.monto.toFixed(2)}</p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: sc.bg, color: sc.color, fontWeight: "bold" }}>{p.estado}</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>{p.tipo === "imagen" ? "📷" : p.tipo === "manual" ? "✍️" : "📝"} {p.tipo}</span>
                          {p.celular && <span style={{ fontSize: 11, color: "#64748b" }}>📞 {p.celular}</span>}
                          <span style={{ fontSize: 11, color: "#64748b" }}>{new Date(p.creadoEn).toLocaleDateString()}</span>
                        </div>
                        {saldoPendiente !== null && (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 11, color: estaPagado ? "#22c55e" : "#ef4444", fontWeight: "bold" }}>
                              {estaPagado ? "✅ Pagado" : `⚠️ Deuda: Bs ${saldoPendiente.toFixed(2)}`}
                            </span>
                          </div>
                        )}
                      </div>
                      <span style={{ color: "#64748b", fontSize: 18 }}>→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const btnGreen: React.CSSProperties = { background: "#22c55e", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnRed: React.CSSProperties = { background: "#ef4444", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnYellow: React.CSSProperties = { background: "#f59e0b", border: "none", padding: "8px 14px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const inputStyle: React.CSSProperties = { padding: 8, borderRadius: 6, border: "none", background: "#0f172a", color: "white", fontSize: 13, boxSizing: "border-box" };

export default AdminPagos;