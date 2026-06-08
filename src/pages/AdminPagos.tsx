import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";
import { useMesActual } from "../hooks/useMesActual";
import NavegadorMes from "../components/NavegadorMes";


const API_URL = "https://taskmanager-backend-ewud.onrender.com";
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
  ci: string | null;
  creadoEn: string;
  pedido?: {
    id: number;
    montoTotal: number;
    montoPagado: number;
    estado: string;
  };
}

// ─── Helpers de color ─────────────────────────────────────────────────────────
const getEstadoColor = (estado: string) => {
  if (estado === "verificado") return { bg: "#14532d", color: "#22c55e", glow: "rgba(34,197,94,0.15)" };
  if (estado === "rechazado")  return { bg: "#7f1d1d", color: "#ef4444", glow: "rgba(239,68,68,0.15)" };
  return                              { bg: "#422006", color: "#f59e0b", glow: "rgba(245,158,11,0.15)" };
};

const TIPO_LABEL: Record<string, string> = {
  imagen: "📷 Comprobante",
  manual: "✍️ Manual",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{
      background: "#1e293b",
      borderRadius: 12,
      padding: "14px 18px",
      borderTop: `3px solid ${color}`,
      flex: 1,
      minWidth: 120,
    }}>
      <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</p>
      <p style={{ color, fontSize: 22, fontWeight: "bold", margin: 0 }}>{value}</p>
      {sub && <p style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

// ─── Badge de estado ──────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const { bg, color } = getEstadoColor(estado);
  return (
    <span style={{
      fontSize: 11, padding: "3px 10px", borderRadius: 99,
      background: bg, color, fontWeight: "bold", letterSpacing: 0.5,
      textTransform: "uppercase",
    }}>
      {estado}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
function AdminPagos() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mes, anio, mesLabel, anterior, siguiente, esActual } = useMesActual();

  const [pagos, setPagos]         = useState<Pago[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Pago | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [rechazandoId, setRechazandoId]   = useState<number | null>(null);
  const [filtro, setFiltro]       = useState<"todos" | "pendiente" | "verificado" | "rechazado">("todos");
  const [panelManual, setPanelManual] = useState(false);

  // Pago manual
  const [manualNombre, setManualNombre]   = useState("");
  const [manualMonto, setManualMonto]     = useState("");
  const [manualCelular, setManualCelular] = useState("");
  const [manualCi, setManualCi]           = useState("");
  const [manualPedidoId, setManualPedidoId] = useState("");
  const [agregandoManual, setAgregandoManual] = useState(false);

  // Editar pago
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editMonto, setEditMonto]   = useState("");

  // Eliminar pago
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ── API calls (sin cambios) ────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/pagos`, { headers });
    if (res.ok) {
      const data = await res.json();
      setPagos(data);
    } else {
      console.error("Error al cargar pagos:", res.status);
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
    const res = await fetch(`${API_URL}/pagos/${id}/verificar`, { method: "PUT", headers });
    if (res.ok) { await load(); setSelected(null); }
  };

  const rechazar = async (id: number) => {
    if (!motivoRechazo.trim()) return alert("Escribe el motivo del rechazo");
    const res = await fetch(`${API_URL}/pagos/${id}/rechazar`, {
      method: "PUT", headers,
      body: JSON.stringify({ motivoRechazo }),
    });
    if (res.ok) {
      setMotivoRechazo(""); setRechazandoId(null);
      await load(); setSelected(null);
    }
  };

  const agregarPagoManual = async () => {
    if (!manualNombre || !manualMonto) return;
    setAgregandoManual(true);
    const body: any = {
      nombreDeclarado: manualNombre,
      monto: Number(manualMonto),
      celular: manualCelular || null,
      ci: manualCi || null,
      pedidoId: manualPedidoId ? Number(manualPedidoId) : null,
    };
    await fetch(`${API_URL}/pagos/manual`, { method: "POST", headers, body: JSON.stringify(body) });
    setManualNombre(""); setManualMonto(""); setManualCelular(""); setManualCi(""); setManualPedidoId("");
    setAgregandoManual(false);
    setPanelManual(false);
    await load();
  };

  const editarPago = async (id: number) => {
    if (!editNombre || !editMonto) return;
    const res = await fetch(`${API_URL}/pagos/${id}`, {
      method: "PUT", headers,
      body: JSON.stringify({ nombreDeclarado: editNombre, monto: Number(editMonto) }),
    });
    if (res.ok) { setEditandoId(null); await load(); }
  };

  const eliminarPago = async (id: number) => {
    if (!confirm("¿Eliminar este pago permanentemente?")) return;
    setEliminandoId(id);
    const res = await fetch(`${API_URL}/pagos/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      setPagos(prev => prev.filter(p => p.id !== id));
      if (selected?.id === id) setSelected(null);
    }
    setEliminandoId(null);
  };

  // ── Stats del mes ──────────────────────────────────────────────────────────
  const totalMes       = pagosMes.reduce((s, p) => s + p.monto, 0);
  const pendientesMes  = pagosMes.filter(p => p.estado === "pendiente");
  const verificadosMes = pagosMes.filter(p => p.estado === "verificado");
  const rechazadosMes  = pagosMes.filter(p => p.estado === "rechazado");

  // ── Animación keyframes ────────────────────────────────────────────────────
  const fadeIn = `
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
      50%       { box-shadow: 0 0 0 4px rgba(245,158,11,0.15); }
    }
  `;

  // ═════════════════════════════════════════════════════════════════════════════
  // VISTA DETALLE
  // ═════════════════════════════════════════════════════════════════════════════
  if (selected) {
    const sc = getEstadoColor(selected.estado);
    const saldoPendiente = selected.pedido
      ? selected.pedido.montoTotal - selected.pedido.montoPagado
      : null;

    return (
      <div>
        <style>{fadeIn}</style>

        {/* Header de detalle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button onClick={() => setSelected(null)} style={{
            background: "#1e293b", border: "1px solid #334155",
            padding: "8px 14px", borderRadius: 8, color: "#94a3b8",
            cursor: "pointer", fontWeight: "bold", fontSize: 13,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            ← Volver
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>Pago #{selected.id}</h2>
            <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
              {new Date(selected.creadoEn).toLocaleString()}
            </p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <EstadoBadge estado={selected.estado} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, animation: "fadeSlideIn 0.3s ease" }}>

          {/* Datos principales */}
          <div style={{ background: "#1e293b", borderRadius: 14, padding: 22, borderTop: `3px solid ${sc.color}` }}>
            <p style={sectionLabel}>👤 Datos del pago</p>
            <InfoRow label="Nombre" value={selected.nombreDeclarado} highlight />
            <InfoRow label="Monto pagado" value={`Bs ${selected.monto.toFixed(2)}`} valueColor="#22c55e" large />
            <InfoRow label="Tipo" value={TIPO_LABEL[selected.tipo] ?? `📝 ${selected.tipo}`} />
            <InfoRow label="Celular" value={selected.celular || "—"} />
            <InfoRow label="C.I." value={selected.ci || "—"} />
            {selected.descripcion && <InfoRow label="Descripción" value={selected.descripcion} />}
          </div>

          {/* Pedido + acciones */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Pedido asociado */}
            {selected.pedido ? (
              <div style={{ background: "#1e293b", borderRadius: 14, padding: 22 }}>
                <p style={sectionLabel}>📦 Pedido asociado</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MiniStat label="Total pedido"   value={`Bs ${selected.pedido.montoTotal.toFixed(2)}`} color="white" />
                  <MiniStat label="Pagado"         value={`Bs ${selected.pedido.montoPagado.toFixed(2)}`} color="#22c55e" />
                  <MiniStat
                    label="Saldo pendiente"
                    value={`Bs ${(selected.pedido.montoTotal - selected.pedido.montoPagado).toFixed(2)}`}
                    color={saldoPendiente! > 0 ? "#ef4444" : "#22c55e"}
                  />
                  <MiniStat label="Estado pedido" value={selected.pedido.estado} color="#60a5fa" />
                </div>
              </div>
            ) : (
              <div style={{ background: "#1e293b", borderRadius: 14, padding: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "#475569", fontSize: 13 }}>Sin pedido asociado</p>
              </div>
            )}

            {/* Comprobante */}
            {selected.imagenUrl && (
              <div style={{ background: "#1e293b", borderRadius: 14, padding: 16 }}>
                <p style={sectionLabel}>🖼 Comprobante</p>
                <img
                  src={selected.imagenUrl}
                  alt="comprobante"
                  style={{ width: "100%", borderRadius: 8, border: "1px solid #334155" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Motivo de rechazo */}
        {selected.motivoRechazo && (
          <div style={{ marginTop: 16, background: "#7f1d1d", padding: "14px 18px", borderRadius: 12, borderLeft: "4px solid #ef4444" }}>
            <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>❌ Motivo: {selected.motivoRechazo}</p>
          </div>
        )}

        {/* Acciones */}
        <div style={{ marginTop: 16, background: "#1e293b", borderRadius: 14, padding: 20 }}>
          <p style={sectionLabel}>⚡ Acciones</p>

          {selected.estado === "pendiente" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button onClick={() => verificar(selected.id)} style={btnGreen}>✅ Verificar pago</button>
              {rechazandoId === selected.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    placeholder="Motivo del rechazo..."
                    value={motivoRechazo}
                    onChange={e => setMotivoRechazo(e.target.value)}
                    style={{ ...inputStyle, width: 240 }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => rechazar(selected.id)} style={btnRed}>Confirmar rechazo</button>
                    <button onClick={() => { setRechazandoId(null); setMotivoRechazo(""); }} style={btnGray}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setRechazandoId(selected.id)} style={btnRed}>❌ Rechazar</button>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {editandoId === selected.id ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input value={editNombre} onChange={e => setEditNombre(e.target.value)} style={inputStyle} placeholder="Nombre" />
                <input value={editMonto} onChange={e => setEditMonto(e.target.value)} style={{ ...inputStyle, width: 100 }} placeholder="Monto" type="number" />
                <button onClick={() => editarPago(selected.id)} style={btnGreen}>Guardar</button>
                <button onClick={() => setEditandoId(null)} style={btnGray}>Cancelar</button>
              </div>
            ) : (
              <button
                onClick={() => { setEditandoId(selected.id); setEditNombre(selected.nombreDeclarado); setEditMonto(String(selected.monto)); }}
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
              {eliminandoId === selected.id ? "Eliminando..." : "🗑 Eliminar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // VISTA LISTA
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div>
      <style>{fadeIn}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28 }}>💰 Pagos</h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            Gestión de pagos de clientes
          </p>
        </div>
        <button
          onClick={() => setPanelManual(v => !v)}
          style={{
            ...btnGreen,
            background: panelManual ? "#334155" : "#22c55e",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {panelManual ? "✕ Cerrar" : "➕ Pago manual"}
        </button>
      </div>

      {/* Panel pago manual — colapsable */}
      {panelManual && (
        <div style={{
          background: "#1e293b", borderRadius: 14, padding: 20,
          marginBottom: 20, border: "1px solid #334155",
          animation: "fadeSlideIn 0.25s ease",
        }}>
          <p style={{ ...sectionLabel, marginBottom: 14 }}>✍️ Registrar pago manual</p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <div>
              <label style={miniLabel}>Nombre *</label>
              <input placeholder="Nombre del cliente" value={manualNombre} onChange={e => setManualNombre(e.target.value)} style={inputStyleFull} />
            </div>
            <div>
              <label style={miniLabel}>Monto (Bs) *</label>
              <input placeholder="0.00" type="number" value={manualMonto} onChange={e => setManualMonto(e.target.value)} style={inputStyleFull} />
            </div>
            <div>
              <label style={miniLabel}>Celular</label>
              <input placeholder="Ej: 70012345" value={manualCelular} onChange={e => setManualCelular(e.target.value)} style={inputStyleFull} />
            </div>
            <div>
              <label style={miniLabel}>C.I.</label>
              <input placeholder="Ej: 1234567" value={manualCi} onChange={e => setManualCi(e.target.value)} style={inputStyleFull} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={miniLabel}>Pedido asociado</label>
            <select value={manualPedidoId} onChange={e => setManualPedidoId(e.target.value)} style={{ ...inputStyleFull, cursor: "pointer" }}>
              <option value="">Sin pedido asociado</option>
            </select>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button onClick={agregarPagoManual} disabled={agregandoManual || !manualNombre || !manualMonto} style={{
              ...btnGreen,
              opacity: (!manualNombre || !manualMonto) ? 0.5 : 1,
              cursor: (!manualNombre || !manualMonto) ? "not-allowed" : "pointer",
            }}>
              {agregandoManual ? "Guardando..." : "💾 Guardar pago"}
            </button>
            <button onClick={() => setPanelManual(false)} style={btnGray}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Stats del mes */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard
          label="Total del mes"
          value={`Bs ${totalMes.toFixed(2)}`}
          color="#60a5fa"
          sub={`${pagosMes.length} pago(s)`}
        />
        <StatCard
          label="Verificados"
          value={`${verificadosMes.length}`}
          color="#22c55e"
          sub={`Bs ${verificadosMes.reduce((s, p) => s + p.monto, 0).toFixed(2)}`}
        />
        <StatCard
          label="Pendientes"
          value={`${pendientesMes.length}`}
          color="#f59e0b"
          sub={`Bs ${pendientesMes.reduce((s, p) => s + p.monto, 0).toFixed(2)}`}
        />
        <StatCard
          label="Rechazados"
          value={`${rechazadosMes.length}`}
          color="#ef4444"
          sub={`Bs ${rechazadosMes.reduce((s, p) => s + p.monto, 0).toFixed(2)}`}
        />
      </div>

      {/* Navegador de mes */}
      <NavegadorMes
        mesLabel={mesLabel}
        anio={anio}
        onAnterior={anterior}
        onSiguiente={siguiente}
        esActual={esActual()}
      />

      {/* Filtros */}
     {/* Filtros */}
<div style={{ display: "flex", gap: 6, margin: "16px 0", flexWrap: "wrap" }}>
  {(["todos", "pendiente", "verificado", "rechazado"] as const).map(f => {
    const counts = {
      todos: pagosMes.length,
      pendiente: pendientesMes.length,
      verificado: verificadosMes.length,
      rechazado: rechazadosMes.length,
    };
    const isActive = filtro === f;
    const buttonStyles: React.CSSProperties = {
      padding: "6px 14px",
      borderRadius: 99,
      background: isActive ? "#3b82f6" : "#1e293b",
      color: isActive ? "white" : "#64748b",
      fontWeight: "bold",
      fontSize: 12,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 6,
      border: isActive ? "none" : "1px solid #334155",
    };
    return (
      <button key={f} onClick={() => setFiltro(f)} style={buttonStyles}>
        {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
        <span
          style={{
            background: isActive ? "rgba(255,255,255,0.2)" : "#334155",
            borderRadius: 99,
            padding: "1px 7px",
            fontSize: 11,
          }}
        >
          {counts[f]}
        </span>
      </button>
    );
  })}
</div>
    

      {/* Lista de pagos */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: "#1e293b", borderRadius: 12, height: 80, opacity: 0.4, animation: "pulseGlow 1.5s infinite" }} />
          ))}
        </div>
      ) : pagosFiltrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🗂</p>
          <p style={{ color: "#64748b", fontSize: 14 }}>No hay pagos con este filtro en {mesLabel} {anio}.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pagosFiltrados.map((p, i) => {
            const sc = getEstadoColor(p.estado);
            const saldoPendiente  = p.pedido ? p.pedido.montoTotal - p.pedido.montoPagado : null;
            const estaPagado      = saldoPendiente !== null && saldoPendiente <= 0;

            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                style={{
                  background: "#1e293b",
                  borderRadius: 12,
                  padding: "14px 18px",
                  borderLeft: `4px solid ${sc.color}`,
                  cursor: "pointer",
                  animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both`,
                  transition: "background 0.15s, transform 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = "#263548";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateX(2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = "#1e293b";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Fila superior */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <p style={{ color: "white", fontWeight: "bold", fontSize: 15, margin: 0 }}>{p.nombreDeclarado}</p>
                      <EstadoBadge estado={p.estado} />
                      {p.tipo !== "declarado" && (
                        <span style={{ fontSize: 11, color: "#475569" }}>
                          {TIPO_LABEL[p.tipo] ?? p.tipo}
                        </span>
                      )}
                    </div>

                    {/* Monto + deuda */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                      <p style={{ color: "#22c55e", fontWeight: "bold", fontSize: 20, margin: 0 }}>
                        Bs {p.monto.toFixed(2)}
                      </p>
                      {saldoPendiente !== null && (
                        <span style={{
                          fontSize: 12,
                          color: estaPagado ? "#22c55e" : "#ef4444",
                          fontWeight: "bold",
                        }}>
                          {estaPagado ? "✅ Saldado" : `⚠️ Deuda: Bs ${saldoPendiente.toFixed(2)}`}
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                      {p.celular && (
                        <span style={{ fontSize: 11, color: "#64748b" }}>📞 {p.celular}</span>
                      )}
                      {p.ci && (
                        <span style={{ fontSize: 11, color: "#64748b" }}>🆔 {p.ci}</span>
                      )}
                      <span style={{ fontSize: 11, color: "#475569" }}>
                        {new Date(p.creadoEn).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  <span style={{ color: "#334155", fontSize: 20, flexShrink: 0 }}>›</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes de detalle ───────────────────────────────────────────────
function InfoRow({ label, value, highlight, valueColor, large }: {
  label: string; value: string;
  highlight?: boolean; valueColor?: string; large?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #0f172a", gap: 8 }}>
      <span style={{ color: "#64748b", fontSize: 12, flexShrink: 0 }}>{label}</span>
      <span style={{
        color: valueColor || (highlight ? "white" : "#cbd5e1"),
        fontSize: large ? 18 : 13,
        fontWeight: large || highlight ? "bold" : "normal",
        textAlign: "right",
      }}>
        {value}
      </span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#0f172a", padding: "10px 12px", borderRadius: 8 }}>
      <p style={{ color: "#475569", fontSize: 11, margin: "0 0 2px" }}>{label}</p>
      <p style={{ color, fontWeight: "bold", fontSize: 14, margin: 0 }}>{value}</p>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const sectionLabel: React.CSSProperties = {
  color: "#64748b", fontSize: 11, textTransform: "uppercase",
  letterSpacing: 1, marginBottom: 12, fontWeight: "bold",
};
const miniLabel: React.CSSProperties = {
  display: "block", color: "#64748b", fontSize: 11,
  marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5,
};
const inputStyle: React.CSSProperties = {
  padding: 8, borderRadius: 6, border: "1px solid #334155",
  background: "#0f172a", color: "white", fontSize: 13,
  boxSizing: "border-box",
};
const inputStyleFull: React.CSSProperties = {
  ...inputStyle, width: "100%",
};
const btnGreen:  React.CSSProperties = { background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnRed:    React.CSSProperties = { background: "#ef4444", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnGray:   React.CSSProperties = { background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnYellow: React.CSSProperties = { background: "#f59e0b", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };

export default AdminPagos;