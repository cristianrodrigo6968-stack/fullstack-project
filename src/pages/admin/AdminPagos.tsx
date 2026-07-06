import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useMesActual } from "../../hooks/useMesActual";
import NavegadorMes from "../../components/NavegadorMes";

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
  ci: string | null;
  creadoEn: string;
  pedido?: {
    id: number;
    montoTotal: number;
    montoPagado: number;
    estado: string;
  };
}

interface ProductoCarrito {
  id: number;
  nombre: string;
  precioUnitario: number;
}

type TipoItemManual = "libro" | "revista" | "otro";
type CategoriaLibroManual = "A" | "B" | "C";
type SubtipoRevistaManual = "director" | "fundador" | "articulo_rp" | "articulo_sp";

const SUBTIPO_LABELS_MANUAL: Record<SubtipoRevistaManual, string> = {
  director: "Director de revista",
  fundador: "Fundador",
  articulo_rp: "Artículo (redacción y publicación)",
  articulo_sp: "Artículo (solo publicación)",
};

function tituloSugeridoPago(opts: { tipo: TipoItemManual; categoria?: CategoriaLibroManual; subtipo?: SubtipoRevistaManual; meses?: 1 | 3 }): string {
  if (opts.tipo === "libro" && opts.categoria) return `📖 Libro Categoría ${opts.categoria}`;
  if (opts.tipo === "revista" && opts.subtipo) {
    const dur = opts.subtipo === "director" && opts.meses ? ` (${opts.meses} mes${opts.meses > 1 ? "es" : ""})` : "";
    return `📰 ${SUBTIPO_LABELS_MANUAL[opts.subtipo]}${dur}`;
  }
  return "";
}

const getEstadoColor = (estado: string) => {
  if (estado === "verificado") return { bg: "#14532d", color: "#22c55e", glow: "rgba(34,197,94,0.15)" };
  if (estado === "rechazado")  return { bg: "#7f1d1d", color: "#ef4444", glow: "rgba(239,68,68,0.15)" };
  return { bg: "#422006", color: "#f59e0b", glow: "rgba(245,158,11,0.15)" };
};

const TIPO_LABEL: Record<string, string> = {
  imagen: "📷 Comprobante",
  manual: "✍️ Manual",
};

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{
      background: "linear-gradient(160deg, #0d0d1a, #0a0a14)",
      border: "1px solid #1e1b4b",
      borderRadius: 12,
      padding: "14px 18px",
      borderTop: `3px solid ${color}`,
      flex: 1,
      minWidth: 130,
    }}>
      <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</p>
      <p style={{ color, fontSize: 22, fontWeight: "bold", margin: 0 }}>{value}</p>
      {sub && <p style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

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

function NuevoItemPagoForm({ onAdd }: {
  onAdd: (item: { tipo: TipoItemManual; titulo: string; precioUnitario: number; conIsbn: boolean; conSenapi: boolean }) => void;
}) {
  const [tipo, setTipo] = useState<TipoItemManual>("otro");
  const [categoria, setCategoria] = useState<CategoriaLibroManual | undefined>(undefined);
  const [conIsbn, setConIsbn] = useState(false);
  const [conSenapi, setConSenapi] = useState(false);
  const [subtipo, setSubtipo] = useState<SubtipoRevistaManual | undefined>(undefined);
  const [meses, setMeses] = useState<1 | 3 | undefined>(undefined);
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("");
  const [tituloEditadoManualmente, setTituloEditadoManualmente] = useState(false);

  useEffect(() => {
    if (tituloEditadoManualmente) return;
    setTitulo(tituloSugeridoPago({ tipo, categoria, subtipo, meses }));
  }, [tipo, categoria, subtipo, meses, tituloEditadoManualmente]);

  const reset = () => {
    setTipo("otro"); setCategoria(undefined); setConIsbn(false); setConSenapi(false);
    setSubtipo(undefined); setMeses(undefined); setTitulo(""); setPrecio(""); setTituloEditadoManualmente(false);
  };

  const puedeAgregar = titulo.trim().length > 0 && Number(precio) > 0;

  const agregar = () => {
    if (!puedeAgregar) return;
    onAdd({
      tipo, titulo: titulo.trim(), precioUnitario: Number(precio),
      conIsbn: tipo === "libro" ? conIsbn : false,
      conSenapi: tipo === "libro" ? conSenapi : false,
    });
    reset();
  };

  return (
    <div style={{ background: "#0f172a", border: "1px dashed #334155", borderRadius: 10, padding: 14, marginTop: 4 }}>
      <p style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>➕ Nuevo producto/servicio</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["libro", "revista", "otro"] as TipoItemManual[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTipo(t); setCategoria(undefined); setSubtipo(undefined); setMeses(undefined); }}
            className={`tipo-btn-pago${tipo === t ? " selected" : ""}`}
          >
            {t === "libro" ? "📖 Libro" : t === "revista" ? "📰 Revista" : "📦 Otro"}
          </button>
        ))}
      </div>

      {tipo === "libro" && (
        <>
          <label style={miniLabel}>Categoría</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(["A", "B", "C"] as CategoriaLibroManual[]).map(c => (
              <button key={c} type="button" onClick={() => setCategoria(c)} className={`tipo-btn-pago${categoria === c ? " selected" : ""}`}>Cat. {c}</button>
            ))}
          </div>
          <label style={miniLabel}>Extras</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button type="button" onClick={() => setConIsbn(v => !v)} className={`tipo-btn-pago${conIsbn ? " selected" : ""}`}>{conIsbn ? "✓ " : ""}ISBN</button>
            <button type="button" onClick={() => setConSenapi(v => !v)} className={`tipo-btn-pago${conSenapi ? " selected" : ""}`}>{conSenapi ? "✓ " : ""}SENAPI</button>
          </div>
        </>
      )}

      {tipo === "revista" && (
        <>
          <label style={miniLabel}>Tipo de servicio</label>
          <div style={{ marginBottom: 10 }}>
            {(Object.entries(SUBTIPO_LABELS_MANUAL) as [SubtipoRevistaManual, string][]).map(([key, label]) => (
              <div
                key={key}
                onClick={() => { setSubtipo(key); setMeses(key === "director" ? (meses ?? 1) : undefined); }}
                className={`sub-option-pago${subtipo === key ? " selected" : ""}`}
              >
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${subtipo === key ? "#3b82f6" : "#334155"}`, background: subtipo === key ? "#3b82f6" : "transparent", flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>
          {subtipo === "director" && (
            <>
              <label style={miniLabel}>Duración</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {([1, 3] as (1 | 3)[]).map(m => (
                  <button key={m} type="button" onClick={() => setMeses(m)} className={`tipo-btn-pago${meses === m ? " selected" : ""}`}>{m} {m === 1 ? "mes" : "meses"}</button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <label style={miniLabel}>Nombre del servicio</label>
      <input
        placeholder="Ej: Libro Categoría A, Director de revista..."
        value={titulo}
        onChange={e => { setTitulo(e.target.value); setTituloEditadoManualmente(true); }}
        style={{ ...inputStyleFull, marginBottom: 10 }}
      />

      <label style={miniLabel}>Precio (Bs)</label>
      <input
        type="number"
        placeholder="0.00"
        value={precio}
        onChange={e => setPrecio(e.target.value)}
        style={{ ...inputStyleFull, marginBottom: 12 }}
      />

      <button
        type="button"
        onClick={agregar}
        disabled={!puedeAgregar}
        style={{
          width: "100%", padding: "10px", borderRadius: 8, border: "none",
          background: puedeAgregar ? "#3b82f6" : "#334155",
          color: puedeAgregar ? "white" : "#64748b", fontWeight: "bold", fontSize: 13,
          cursor: puedeAgregar ? "pointer" : "not-allowed",
        }}
      >
        ＋ Agregar a la lista
      </button>
    </div>
  );
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
  const [panelManual, setPanelManual] = useState(false);

  const [manualNombre, setManualNombre] = useState("");
  const [manualMonto, setManualMonto] = useState("");
  const [manualCelular, setManualCelular] = useState("");
  const [manualCi, setManualCi] = useState("");
  const [agregandoManual, setAgregandoManual] = useState(false);

  const [itemsManual, setItemsManual] = useState<{ tempId: string; tipo: TipoItemManual; titulo: string; precioUnitario: number; conIsbn: boolean; conSenapi: boolean }[]>([]);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editMonto, setEditMonto] = useState("");

  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [linkWhatsapp, setLinkWhatsapp] = useState<{ celular: string; mensaje: string } | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

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
    if (res.ok) {
      const data = await res.json();
      if (data.esClienteNuevo && data.clienteCelular && data.clienteToken) {
        const link = `${window.location.origin}/formulario/${data.clienteToken}`;
        const mensaje = `¡Hola! Gracias por tu pago a la Asociación de Escritores Vanguardistas 3.0. Para completar tu registro, por favor llena tus datos aquí: ${link}`;
        setLinkWhatsapp({ celular: data.clienteCelular, mensaje });
      }
      await load();
      setSelected(null);
    }
  };

  const abrirWhatsapp = (celular: string, mensaje: string) => {
    const numeroLimpio = celular.replace(/\D/g, "");
    const numeroConCodigo = numeroLimpio.startsWith("591") ? numeroLimpio : `591${numeroLimpio}`;
    window.open(`https://wa.me/${numeroConCodigo}?text=${encodeURIComponent(mensaje)}`, "_blank");
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

  const agregarItemManual = (item: { tipo: TipoItemManual; titulo: string; precioUnitario: number; conIsbn: boolean; conSenapi: boolean }) => {
    setItemsManual(prev => [...prev, { ...item, tempId: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }]);
  };

  const quitarItemManual = (tempId: string) => setItemsManual(prev => prev.filter(i => i.tempId !== tempId));

  const totalItemsManual = itemsManual.reduce((sum, i) => sum + i.precioUnitario, 0);

  const agregarPagoManual = async () => {
    if (!manualNombre || !manualMonto) return;
    setAgregandoManual(true);
    const body: any = {
      nombreDeclarado: manualNombre,
      monto: Number(manualMonto),
      celular: manualCelular || null,
      ci: manualCi || null,
      productos: itemsManual.map(i => ({
        nombre: i.titulo,
        tipo: i.tipo,
        precioUnitario: i.precioUnitario,
        conIsbn: i.conIsbn,
        conSenapi: i.conSenapi,
      })),
    };
    await fetch(`${API_URL}/pagos/manual`, { method: "POST", headers, body: JSON.stringify(body) });
    setManualNombre(""); setManualMonto(""); setManualCelular(""); setManualCi("");
    setItemsManual([]);
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

  const totalMes = pagosMes.reduce((s, p) => s + (p.monto ?? 0), 0);
  const pendientesMes = pagosMes.filter(p => p.estado === "pendiente");
  const verificadosMes = pagosMes.filter(p => p.estado === "verificado");
  const rechazadosMes = pagosMes.filter(p => p.estado === "rechazado");

  const fadeIn = `
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
      50%       { box-shadow: 0 0 0 4px rgba(245,158,11,0.15); }
    }
    .tipo-btn-pago { flex:1; padding:9px 8px; border-radius:8px; border:2px solid #334155; background:#0f172a; color:#64748b; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; text-align:center; }
    .tipo-btn-pago.selected { border-color:#3b82f6; background:rgba(59,130,246,0.12); color:#93c5fd; }
    .tipo-btn-pago:hover:not(.selected) { border-color:#475569; color:#94a3b8; }
    .sub-option-pago { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; border:2px solid #334155; background:#0f172a; color:#64748b; font-size:13px; cursor:pointer; transition:all 0.15s; margin-bottom:6px; }
    .sub-option-pago.selected { border-color:#3b82f6; background:rgba(59,130,246,0.1); color:#93c5fd; }
    .sub-option-pago:hover:not(.selected) { border-color:#475569; color:#94a3b8; }
  `;

  if (linkWhatsapp) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 20 }}>
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 32, maxWidth: 420, width: "100%", textAlign: "center", border: "1px solid #334155" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <h3 style={{ color: "white", margin: "0 0 8px" }}>Pago verificado</h3>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24 }}>
            Se creó el cliente. ¿Enviarle el link de registro por WhatsApp?
          </p>
          <button
            onClick={() => { abrirWhatsapp(linkWhatsapp.celular, linkWhatsapp.mensaje); setLinkWhatsapp(null); }}
            style={{ width: "100%", background: "#22c55e", border: "none", padding: "12px 20px", borderRadius: 10, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            📱 Enviar por WhatsApp
          </button>
          <button
            onClick={() => setLinkWhatsapp(null)}
            style={{ width: "100%", background: "#334155", border: "none", padding: "10px 20px", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // VISTA DETALLE
  if (selected) {
    const sc = getEstadoColor(selected.estado);
    const saldoPendiente = selected.pedido
      ? selected.pedido.montoTotal - selected.pedido.montoPagado
      : null;

    let productosLista: ProductoCarrito[] = [];
    if (selected.productos) {
      try {
        const parsed = JSON.parse(selected.productos);
        if (Array.isArray(parsed)) {
          productosLista = parsed.map(p => ({
            ...p,
            precioUnitario: typeof p.precioUnitario === 'number' ? p.precioUnitario : Number(p.precioUnitario) || 0
          }));
        }
      } catch (e) {
        console.error("Error parseando productos:", e);
      }
    }

    return (
      <div>
        <style>{fadeIn}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button onClick={() => setSelected(null)} style={{
            background: "#1e293b", border: "1px solid #334155",
            padding: "8px 14px", borderRadius: 8, color: "#94a3b8",
            cursor: "pointer", fontWeight: "bold", fontSize: 13,
            display: "flex", alignItems: "center", gap: 6,
          }}>← Volver</button>
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
          <div style={{ background: "#1e293b", borderRadius: 14, padding: 22, borderTop: `3px solid ${sc.color}` }}>
            <p style={sectionLabel}>👤 Datos del pago</p>
            <InfoRow label="Nombre" value={selected.nombreDeclarado} highlight />
            <InfoRow label="Monto pagado" value={`Bs ${(selected.monto ?? 0).toFixed(2)}`} valueColor="#22c55e" large />
            <InfoRow label="Tipo" value={TIPO_LABEL[selected.tipo] ?? `📝 ${selected.tipo}`} />
            <InfoRow label="Celular" value={selected.celular || "—"} />
            <InfoRow label="C.I." value={selected.ci || "—"} />
            {selected.descripcion && <InfoRow label="Descripción" value={selected.descripcion} />}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {selected.pedido ? (
              <div style={{ background: "#1e293b", borderRadius: 14, padding: 22 }}>
                <p style={sectionLabel}>📦 Pedido asociado</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MiniStat label="Total pedido" value={`Bs ${selected.pedido.montoTotal.toFixed(2)}`} color="white" />
                  <MiniStat label="Pagado" value={`Bs ${selected.pedido.montoPagado.toFixed(2)}`} color="#22c55e" />
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

            <div style={{ background: "#1e293b", borderRadius: 14, padding: 22 }}>
              <p style={sectionLabel}>🛍️ Productos comprados</p>
              {productosLista.length === 0 ? (
                <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>No hay productos registrados en este pago.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {productosLista.map((prod, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: idx !== productosLista.length - 1 ? "1px solid #0f172a" : "none"
                    }}>
                      <span style={{ color: "#cbd5e1", fontSize: 14 }}>{prod.nombre}</span>
                      <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: 14 }}>
                        Bs {(prod.precioUnitario ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "2px solid #334155",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ color: "white", fontWeight: "bold", fontSize: 14 }}>Total productos</span>
                    <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: 16 }}>
                      Bs {productosLista.reduce((sum, p) => sum + (p.precioUnitario ?? 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {selected.imagenUrl && (
              <div style={{ background: "#1e293b", borderRadius: 14, padding: 16 }}>
                <p style={sectionLabel}>🖼 Comprobante</p>
                <img src={selected.imagenUrl} alt="comprobante" style={{ width: "100%", borderRadius: 8, border: "1px solid #334155" }} />
              </div>
            )}
          </div>
        </div>

        {selected.motivoRechazo && (
          <div style={{ marginTop: 16, background: "#7f1d1d", padding: "14px 18px", borderRadius: 12, borderLeft: "4px solid #ef4444" }}>
            <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>❌ Motivo: {selected.motivoRechazo}</p>
          </div>
        )}

        <div style={{ marginTop: 16, background: "#1e293b", borderRadius: 14, padding: 20 }}>
          <p style={sectionLabel}>⚡ Acciones</p>
          {selected.estado === "pendiente" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button onClick={() => verificar(selected.id)} style={btnGreen}>✅ Verificar pago</button>
              {rechazandoId === selected.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input placeholder="Motivo del rechazo..." value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} style={{ ...inputStyle, width: 240 }} />
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
              <button onClick={() => { setEditandoId(selected.id); setEditNombre(selected.nombreDeclarado); setEditMonto(String(selected.monto)); }} style={btnYellow}>✏️ Editar</button>
            )}
            <button onClick={() => eliminarPago(selected.id)} disabled={eliminandoId === selected.id} style={btnRed}>
              {eliminandoId === selected.id ? "Eliminando..." : "🗑 Eliminar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VISTA LISTA
  return (
    <div>
      <style>{fadeIn}</style>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28 }}>💰 Pagos</h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Gestión de pagos de clientes</p>
        </div>
        <button onClick={() => setPanelManual(!panelManual)} style={{
          ...btnGreen,
          background: panelManual ? "#334155" : "#22c55e",
          display: "flex", alignItems: "center", gap: 6,
        }}>{panelManual ? "✕ Cerrar" : "➕ Pago manual"}</button>
      </div>

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
          <div style={{ marginTop: 14 }}>
            <label style={miniLabel}>Productos / servicios de este pago</label>

            {itemsManual.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {itemsManual.map(i => (
                  <div key={i.tempId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: "white", fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{i.titulo}</p>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {i.conIsbn && <span style={{ fontSize: 10, background: "rgba(59,130,246,.15)", color: "#93c5fd", padding: "1px 8px", borderRadius: 99 }}>ISBN</span>}
                        {i.conSenapi && <span style={{ fontSize: 10, background: "rgba(139,92,246,.15)", color: "#c4b5fd", padding: "1px 8px", borderRadius: 99 }}>SENAPI</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: 14 }}>Bs {i.precioUnitario.toFixed(2)}</span>
                      <button onClick={() => quitarItemManual(i.tempId)} style={{ background: "rgba(239,68,68,0.12)", border: "none", color: "#ef4444", borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px" }}>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Total productos</span>
                  <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: 16 }}>Bs {totalItemsManual.toFixed(2)}</span>
                </div>
              </div>
            )}

            <NuevoItemPagoForm onAdd={agregarItemManual} />
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button onClick={agregarPagoManual} disabled={agregandoManual || !manualNombre || !manualMonto} style={{
              ...btnGreen,
              opacity: (!manualNombre || !manualMonto) ? 0.5 : 1,
              cursor: (!manualNombre || !manualMonto) ? "not-allowed" : "pointer",
            }}>
              {agregandoManual ? "Guardando..." : "💾 Guardar pago"}
            </button>
            <button onClick={() => { setPanelManual(false); setPedidoSeleccionado(null); setPedidoBusqueda(""); }} style={btnGray}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total del mes" value={`Bs ${totalMes.toFixed(2)}`} color="#60a5fa" sub={`${pagosMes.length} pago(s)`} />
        <StatCard label="Verificados" value={`${verificadosMes.length}`} color="#22c55e" sub={`Bs ${verificadosMes.reduce((s, p) => s + (p.monto ?? 0), 0).toFixed(2)}`} />
        <StatCard label="Pendientes" value={`${pendientesMes.length}`} color="#f59e0b" sub={`Bs ${pendientesMes.reduce((s, p) => s + (p.monto ?? 0), 0).toFixed(2)}`} />
        <StatCard label="Rechazados" value={`${rechazadosMes.length}`} color="#ef4444" sub={`Bs ${rechazadosMes.reduce((s, p) => s + (p.monto ?? 0), 0).toFixed(2)}`} />
      </div>

      <NavegadorMes mesLabel={mesLabel} anio={anio} onAnterior={anterior} onSiguiente={siguiente} esActual={esActual()} />

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
              <span style={{ background: isActive ? "rgba(255,255,255,0.2)" : "#334155", borderRadius: 99, padding: "1px 7px", fontSize: 11 }}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ background: "#1e293b", borderRadius: 12, height: 80, opacity: 0.4, animation: "pulseGlow 1.5s infinite" }} />)}
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
            const saldoPendiente = p.pedido ? p.pedido.montoTotal - p.pedido.montoPagado : null;
            const estaPagado = saldoPendiente !== null && saldoPendiente <= 0;

            let cantidadProductos = 0;
            if (p.productos) {
              try {
                const prods = JSON.parse(p.productos);
                if (Array.isArray(prods)) cantidadProductos = prods.length;
              } catch (e) {}
            }

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
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <p style={{ color: "white", fontWeight: "bold", fontSize: 15, margin: 0 }}>{p.nombreDeclarado}</p>
                      <EstadoBadge estado={p.estado} />
                      {p.tipo !== "declarado" && <span style={{ fontSize: 11, color: "#475569" }}>{TIPO_LABEL[p.tipo] ?? p.tipo}</span>}
                      {cantidadProductos > 0 && (
                        <span style={{ background: "#3b82f6", color: "white", fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: "bold" }}>
                          🛒 {cantidadProductos} producto{cantidadProductos !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                      <p style={{ color: "#22c55e", fontWeight: "bold", fontSize: 20, margin: 0 }}>
                        Bs {(p.monto ?? 0).toFixed(2)}
                      </p>
                      {saldoPendiente !== null ? (
                        <span style={{ fontSize: 12, color: estaPagado ? "#22c55e" : "#ef4444", fontWeight: "bold" }}>
                          {estaPagado ? "✅ Saldado" : `⚠️ Deuda: Bs ${saldoPendiente.toFixed(2)}`}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: "bold" }}>⚠️ Sin pedido</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                      {p.celular && <span style={{ fontSize: 11, color: "#64748b" }}>📞 {p.celular}</span>}
                      {p.ci && <span style={{ fontSize: 11, color: "#64748b" }}>🆔 {p.ci}</span>}
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

function InfoRow({ label, value, highlight, valueColor, large }: {
  label: string; value: string;
  highlight?: boolean; valueColor?: string; large?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #0f172a", gap: 8 }}>
      <span style={{ color: "#64748b", fontSize: 12, flexShrink: 0 }}>{label}</span>
      <span style={{ color: valueColor || (highlight ? "white" : "#cbd5e1"), fontSize: large ? 18 : 13, fontWeight: large || highlight ? "bold" : "normal", textAlign: "right" }}>
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
const btnGreen: React.CSSProperties = { background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnRed: React.CSSProperties = { background: "#ef4444", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnYellow: React.CSSProperties = { background: "#f59e0b", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };

export default AdminPagos;
