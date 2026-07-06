import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useMesActual } from "../../hooks/useMesActual";
import NavegadorMes from "../../components/NavegadorMes";

const API_URL = import.meta.env.VITE_API_URL;

interface Comentario {
  id: number;
  autorTipo: string;
  texto: string | null;
  archivos: string[];
  creadoEn: string;
}

interface Tarea {
  id: number;
  titulo: string;
  descripcion: string | null;
  completada: boolean;
  comentarios: Comentario[];
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
  precioUnitario: number | null;
  archivoWord: string | null;
  archivoPdf: string | null;
  estado: string;
  cliente: { id: number; nombreCompleto: string | null };
  pedidoId: number;
  creadoEn: string;
  tareas: Tarea[];
}

interface DesgloseTitulo {
  tipoVisual: "libro" | "revista" | "otro";
  icono: string;
  color: string;
  lineaPrincipal: string;
  lineaSecundaria: string | null;
}
// ── Entrega manual ──────────────────────────────────────
interface ClienteBusqueda {
  id: number;
  nombreCompleto: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  ci: string | null;
  celular: string | null;
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

function tituloSugerido(opts: { tipo: TipoItemManual; categoria?: CategoriaLibroManual; subtipo?: SubtipoRevistaManual; meses?: 1 | 3 }): string {
  if (opts.tipo === "libro" && opts.categoria) return `📖 Libro Categoría ${opts.categoria}`;
  if (opts.tipo === "revista" && opts.subtipo) {
    const dur = opts.subtipo === "director" && opts.meses ? ` (${opts.meses} mes${opts.meses > 1 ? "es" : ""})` : "";
    return `📰 ${SUBTIPO_LABELS_MANUAL[opts.subtipo]}${dur}`;
  }
  return "";
}

const miniLabelManual: React.CSSProperties = { display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 };
const inputManualStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #1e1b4b", background: "#0a0a14", color: "white", fontSize: 16, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
function parsearTitulo(titulo: string | null, tipo: string, tipoAutor: string | null, periodicidad: string | null): DesgloseTitulo {
  const t = (titulo || "").toLowerCase();
  const tip = (tipo || "").toLowerCase();

  if (tip === "libro" || t.includes("libro")) {
    let categoria: string | null = null;
    if (t.includes("categoría a") || t.includes("categoria a")) categoria = "Categoría A";
    else if (t.includes("categoría b") || t.includes("categoria b")) categoria = "Categoría B";
    else if (t.includes("categoría c") || t.includes("categoria c")) categoria = "Categoría C";
    return { tipoVisual: "libro", icono: "📖", color: "#6366f1", lineaPrincipal: "Libro", lineaSecundaria: categoria };
  }

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
      <div style={{ display: "inline-block", width: 18, height: 18, border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "0 20px", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", padding: 32, borderRadius: 20, width: "100%", maxWidth: 380, color: "white", textAlign: "center", border: "1px solid #1e1b4b", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>¿Confirmar acción?</h3>
        <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ background: "#0a0a14", border: "1px solid #1e1b4b", padding: "10px 22px", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none", padding: "10px 22px", borderRadius: 10, color: "white", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ── Formulario para armar un item dentro de la entrega manual ──
function NuevoItemForm({ onAdd }: {
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
    setTitulo(tituloSugerido({ tipo, categoria, subtipo, meses }));
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
    <div style={{ background: "#0a0a14", border: "1px dashed #1e1b4b", borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <p style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>➕ Nuevo item</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["libro", "revista", "otro"] as TipoItemManual[]).map(t => (
          <button
            key={t}
            onClick={() => { setTipo(t); setCategoria(undefined); setSubtipo(undefined); setMeses(undefined); }}
            className={`tipo-btn${tipo === t ? " selected" : ""}`}
          >
            {t === "libro" ? "📖 Libro" : t === "revista" ? "📰 Revista" : "📦 Otro"}
          </button>
        ))}
      </div>

      {tipo === "libro" && (
        <>
          <label style={miniLabelManual}>Categoría</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(["A", "B", "C"] as CategoriaLibroManual[]).map(c => (
              <button key={c} onClick={() => setCategoria(c)} className={`tipo-btn${categoria === c ? " selected" : ""}`}>Cat. {c}</button>
            ))}
          </div>
          <label style={miniLabelManual}>Extras</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={() => setConIsbn(v => !v)} className={`tipo-btn${conIsbn ? " selected" : ""}`}>{conIsbn ? "✓ " : ""}ISBN</button>
            <button onClick={() => setConSenapi(v => !v)} className={`tipo-btn${conSenapi ? " selected" : ""}`}>{conSenapi ? "✓ " : ""}SENAPI</button>
          </div>
        </>
      )}

      {tipo === "revista" && (
        <>
          <label style={miniLabelManual}>Tipo de servicio</label>
          <div style={{ marginBottom: 10 }}>
            {(Object.entries(SUBTIPO_LABELS_MANUAL) as [SubtipoRevistaManual, string][]).map(([key, label]) => (
              <div
                key={key}
                onClick={() => { setSubtipo(key); setMeses(key === "director" ? (meses ?? 1) : undefined); }}
                className={`sub-option${subtipo === key ? " selected" : ""}`}
              >
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${subtipo === key ? "#6366f1" : "#334155"}`, background: subtipo === key ? "#6366f1" : "transparent", flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>
          {subtipo === "director" && (
            <>
              <label style={miniLabelManual}>Duración</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {([1, 3] as (1 | 3)[]).map(m => (
                  <button key={m} onClick={() => setMeses(m)} className={`tipo-btn${meses === m ? " selected" : ""}`}>{m} {m === 1 ? "mes" : "meses"}</button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <label style={miniLabelManual}>Nombre del servicio</label>
      <input
        placeholder="Ej: Libro Categoría A, Director de revista..."
        value={titulo}
        onChange={e => { setTitulo(e.target.value); setTituloEditadoManualmente(true); }}
        style={{ ...inputManualStyle, marginBottom: 10 }}
      />

      <label style={miniLabelManual}>Precio (Bs)</label>
      <input
        type="number"
        placeholder="0.00"
        value={precio}
        onChange={e => setPrecio(e.target.value)}
        style={{ ...inputManualStyle, marginBottom: 12 }}
      />

      <button
        onClick={agregar}
        disabled={!puedeAgregar}
        style={{
          width: "100%", padding: "10px", borderRadius: 10, border: "none",
          background: puedeAgregar ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1e1b4b",
          color: puedeAgregar ? "white" : "#475569", fontWeight: 700, fontSize: 13,
          cursor: puedeAgregar ? "pointer" : "not-allowed", fontFamily: "inherit",
        }}
      >
        ＋ Agregar a la lista
      </button>
    </div>
  );
}

// ── Modal principal: crear entrega manual ──
function ModalAgregarEntrega({ token, onClose, onCreated }: { token: string | null; onClose: () => void; onCreated: () => void }) {
  const [clientes, setClientes] = useState<ClienteBusqueda[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteBusqueda | null>(null);
  const [items, setItems] = useState<{ tempId: string; tipo: TipoItemManual; titulo: string; precioUnitario: number; conIsbn: boolean; conSenapi: boolean }[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      setLoadingClientes(true);
      try {
        const res = await fetch(`${API_URL}/clients`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setClientes(await res.json());
      } finally {
        setLoadingClientes(false);
      }
    };
    cargar();
  }, [token]);

  const nombreCliente = (c: ClienteBusqueda) => c.nombreCompleto || [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(" ") || "Sin nombre";

  const clientesFiltrados = busqueda.trim().length === 0 ? [] : clientes.filter(c => {
    const q = busqueda.trim().toLowerCase();
    return nombreCliente(c).toLowerCase().includes(q) || (c.ci || "").toLowerCase().includes(q);
  }).slice(0, 8);

  const agregarItem = (item: { tipo: TipoItemManual; titulo: string; precioUnitario: number; conIsbn: boolean; conSenapi: boolean }) => {
    setItems(prev => [...prev, { ...item, tempId: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }]);
  };

  const quitarItem = (tempId: string) => setItems(prev => prev.filter(i => i.tempId !== tempId));

  const total = items.reduce((sum, i) => sum + i.precioUnitario, 0);

  const guardar = async () => {
    if (!clienteSeleccionado) { setError("Selecciona un cliente."); return; }
    if (items.length === 0) { setError("Agrega al menos un item."); return; }
    setError("");
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/pedidos/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          items: items.map(i => ({ tipo: i.tipo, titulo: i.titulo, precioUnitario: i.precioUnitario, conIsbn: i.conIsbn, conSenapi: i.conSenapi })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo crear la entrega.");
        setGuardando(false);
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Error de conexión.");
      setGuardando(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9998, padding: 20 }}>
      <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", padding: "26px 24px", borderRadius: 18, width: "100%", maxWidth: 560, color: "white", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>➕ Agregar entrega manual</h3>
            <p style={{ margin: "2px 0 0", color: "#475569", fontSize: 12 }}>Crea un pedido/entrega sin pasar por el flujo de compra y pago</p>
          </div>
          <button onClick={onClose} style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", color: "#64748b", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <label style={miniLabelManual}>Cliente</label>
        {clienteSeleccionado ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a14", border: "1px solid #6366f1", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <div>
              <p style={{ margin: 0, color: "white", fontWeight: 700, fontSize: 14 }}>{nombreCliente(clienteSeleccionado)}</p>
              <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 12 }}>{clienteSeleccionado.ci ? `CI: ${clienteSeleccionado.ci}` : "Sin CI"} {clienteSeleccionado.celular ? `· 📱 ${clienteSeleccionado.celular}` : ""}</p>
            </div>
            <button onClick={() => setClienteSeleccionado(null)} style={{ background: "transparent", border: "1px solid #1e1b4b", color: "#94a3b8", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12 }}>Cambiar</button>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <input
              placeholder="Buscar por nombre o C.I..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={inputManualStyle}
            />
            {loadingClientes ? (
              <p style={{ color: "#475569", fontSize: 12, marginTop: 8 }}>Cargando clientes...</p>
            ) : busqueda.trim().length > 0 && (
              <div style={{ marginTop: 8, border: "1px solid #1e1b4b", borderRadius: 10, overflow: "hidden" }}>
                {clientesFiltrados.length === 0 ? (
                  <p style={{ color: "#475569", fontSize: 12, padding: 12, margin: 0 }}>Sin resultados.</p>
                ) : clientesFiltrados.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { setClienteSeleccionado(c); setBusqueda(""); }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #1e1b4b" }}
                  >
                    <p style={{ margin: 0, color: "white", fontSize: 13, fontWeight: 600 }}>{nombreCliente(c)}</p>
                    <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 11 }}>{c.ci ? `CI: ${c.ci}` : "Sin CI"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <label style={{ ...miniLabelManual, marginTop: 4 }}>Productos / servicios de la entrega</label>

        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {items.map(i => (
              <div key={i.tempId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a14", border: "1px solid #1e1b4b", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: "white", fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{i.titulo}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    {i.conIsbn && <span style={{ fontSize: 10, background: "rgba(99,102,241,.12)", color: "#a5b4fc", padding: "1px 8px", borderRadius: 99 }}>ISBN</span>}
                    {i.conSenapi && <span style={{ fontSize: 10, background: "rgba(139,92,246,.12)", color: "#c4b5fd", padding: "1px 8px", borderRadius: 99 }}>SENAPI</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ color: "#34d399", fontWeight: 700, fontSize: 14 }}>Bs {i.precioUnitario.toFixed(2)}</span>
                  <button onClick={() => quitarItem(i.tempId)} style={{ background: "rgba(239,68,68,0.12)", border: "none", color: "#ef4444", borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontSize: 12 }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <NuevoItemForm onAdd={agregarItem} />

        {items.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a14", border: "1px solid #1e1b4b", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
            <span style={{ color: "#64748b", fontSize: 13 }}>Total</span>
            <span style={{ color: "#34d399", fontWeight: 800, fontSize: 20 }}>Bs {total.toFixed(2)}</span>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#fca5a5", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={guardar}
            disabled={guardando || !clienteSeleccionado || items.length === 0}
            style={{
              flex: 1, padding: 12, borderRadius: 10, border: "none",
              background: (guardando || !clienteSeleccionado || items.length === 0) ? "#1e1b4b" : "linear-gradient(135deg,#10b981,#059669)",
              color: (guardando || !clienteSeleccionado || items.length === 0) ? "#475569" : "white",
              fontWeight: 700, fontSize: 14, cursor: (guardando || !clienteSeleccionado || items.length === 0) ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}
          >
            {guardando ? "Guardando..." : "💾 Crear entrega"}
          </button>
          <button onClick={onClose} style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", padding: "12px 20px", borderRadius: 10, color: "#94a3b8", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

const ESTADO_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pendiente:  { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "#1e1b4b", label: "⏳ Pendiente"  },
  completado: { bg: "rgba(16,185,129,0.1)",  color: "#34d399", border: "rgba(16,185,129,.35)", label: "✅ Completado" },
  entregado:  { bg: "rgba(99,102,241,0.1)",  color: "#a5b4fc", border: "rgba(99,102,241,.35)", label: "📦 Entregado"  },
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
  const color = pct === 100 ? "#34d399" : pct > 50 ? "#6366f1" : "#f59e0b";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ color: "#475569", fontSize: 11 }}>Progreso de este pedido</span>
        <span style={{ color, fontSize: 12, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: "#1e1b4b", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>⏳ {items.filter(i => i.estado === "pendiente").length} pendientes</span>
        <span style={{ fontSize: 10, color: "#34d399" }}>✅ {completados} completados</span>
        <span style={{ fontSize: 10, color: "#a5b4fc" }}>📦 {entregados} entregados</span>
      </div>
    </div>
  );
}

function renderArchivos(archivos: string[]) {
  if (!archivos?.length) return null;
  return (
    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
      {archivos.map((url, i) => {
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        if (isImage) {
          return (
            <a key={i} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="adjunto" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #1e1b4b" }} />
            </a>
          );
        }
        const fileName = url.split("/").pop() || "Documento";
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer" style={{ background: "#0a0a14", border: "1px solid #1e1b4b", padding: "4px 10px", borderRadius: 6, color: "#a5b4fc", textDecoration: "none", fontSize: 11 }}>
            📄 {fileName}
          </a>
        );
      })}
    </div>
  );
}

function TareaAdminCard({ tarea, token, onRefresh }: { tarea: Tarea; token: string | null; onRefresh: () => void }) {
  const [texto, setTexto] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setArchivos(prev => [...prev, ...Array.from(files)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removerArchivo = (i: number) => setArchivos(prev => prev.filter((_, idx) => idx !== i));

  const enviar = async () => {
    if (!texto.trim() && archivos.length === 0) return;
    setEnviando(true);
    const formData = new FormData();
    if (texto.trim()) formData.append("texto", texto);
    archivos.forEach(f => formData.append("archivos", f));
    await fetch(`${API_URL}/tareas/${tarea.id}/comentarios`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    setTexto("");
    setArchivos([]);
    setEnviando(false);
    onRefresh();
  };

  const toggleCompletada = async () => {
    setActualizando(true);
    await fetch(`${API_URL}/tareas/${tarea.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ completada: !tarea.completada }),
    });
    setActualizando(false);
    onRefresh();
  };

  const eliminarTarea = async () => {
    if (!confirm(`¿Eliminar la tarea "${tarea.titulo}" y todos sus comentarios?`)) return;
    setEliminando(true);
    await fetch(`${API_URL}/tareas/${tarea.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setEliminando(false);
    onRefresh();
  };

  return (
    <div style={{ background: "#0a0a14", border: "1px solid #1e1b4b", borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div>
          <p style={{ color: "white", fontWeight: "bold", fontSize: 13, margin: 0 }}>{tarea.titulo}</p>
          {tarea.descripcion && <p style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 0" }}>{tarea.descripcion}</p>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={toggleCompletada}
            disabled={actualizando}
            style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: "bold", border: "none", cursor: "pointer",
              background: tarea.completada ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
              color: tarea.completada ? "#34d399" : "#f59e0b",
            }}
          >
            {tarea.completada ? "✅ Completada" : "⏳ Marcar completada"}
          </button>
          <button onClick={eliminarTarea} disabled={eliminando} style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, fontSize: 11, padding: "3px 8px", cursor: "pointer" }}>
            {eliminando ? "..." : "🗑"}
          </button>
        </div>
      </div>

      {tarea.comentarios.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, marginBottom: 10 }}>
          {tarea.comentarios.map(c => {
            const esAdmin = c.autorTipo === "admin";
            return (
              <div key={c.id} style={{
                alignSelf: esAdmin ? "flex-end" : "flex-start", maxWidth: "85%",
                background: esAdmin ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#0d0d1a", color: "white",
                padding: "8px 12px", borderRadius: 8, fontSize: 12,
                border: esAdmin ? "none" : "1px solid #1e1b4b",
              }}>
                <p style={{ margin: 0, fontSize: 10, opacity: 0.7 }}>{esAdmin ? "Tú (admin)" : "Cliente"}</p>
                {c.texto && <p style={{ margin: "3px 0 0", whiteSpace: "pre-wrap" }}>{c.texto}</p>}
                {renderArchivos(c.archivos)}
                <p style={{ fontSize: 9, opacity: 0.6, marginTop: 4, marginBottom: 0, textAlign: "right" }}>
                  {new Date(c.creadoEn).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {archivos.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {archivos.map((file, i) => (
            <div key={i} style={{ position: "relative" }}>
              {file.type.startsWith("image/") ? (
                <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
              ) : (
                <div style={{ width: 40, height: 40, background: "#0d0d1a", border: "1px solid #1e1b4b", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📄</div>
              )}
              <button onClick={() => removerArchivo(i)} style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", border: "none", borderRadius: "50%", width: 15, height: 15, color: "white", fontSize: 8, cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
        <input type="file" multiple ref={fileInputRef} onChange={handleFiles} style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current?.click()} style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", borderRadius: 6, color: "white", cursor: "pointer", padding: "7px 9px", fontSize: 13 }}>📎</button>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
          placeholder="Escribe un comentario..."
          style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #1e1b4b", background: "#0d0d1a", color: "white", fontSize: 16 }}
        />
        <button
          onClick={enviar}
          disabled={enviando || (!texto.trim() && archivos.length === 0)}
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", padding: "8px 14px", borderRadius: 6, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 12, opacity: enviando || (!texto.trim() && archivos.length === 0) ? 0.6 : 1 }}
        >
          {enviando ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}

function TareasPanel({ item, token, onRefresh }: { item: ItemPedido; token: string | null; onRefresh: () => void }) {
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [creando, setCreando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  const crearTarea = async () => {
    if (!nuevoTitulo.trim()) return;
    setCreando(true);
    await fetch(`${API_URL}/items/${item.id}/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ titulo: nuevoTitulo, descripcion: nuevaDescripcion || undefined }),
    });
    setNuevoTitulo("");
    setNuevaDescripcion("");
    setCreando(false);
    setMostrarForm(false);
    onRefresh();
  };

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid #1e1b4b", paddingTop: 12 }}>
      <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 }}>📋 Tareas para el cliente</p>

      {item.tareas.map(tarea => (
        <TareaAdminCard key={tarea.id} tarea={tarea} token={token} onRefresh={onRefresh} />
      ))}

      {mostrarForm ? (
        <div style={{ background: "#0a0a14", border: "1px dashed #1e1b4b", borderRadius: 10, padding: 12 }}>
          <input
            placeholder="Título de la tarea (ej: Enviar foto y biografía)"
            value={nuevoTitulo}
            onChange={e => setNuevoTitulo(e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #1e1b4b", background: "#0d0d1a", color: "white", fontSize: 16, marginBottom: 8, boxSizing: "border-box" }}
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={nuevaDescripcion}
            onChange={e => setNuevaDescripcion(e.target.value)}
            rows={2}
            style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #1e1b4b", background: "#0d0d1a", color: "white", fontSize: 16, marginBottom: 8, boxSizing: "border-box", resize: "none" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={crearTarea} disabled={creando || !nuevoTitulo.trim()} style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none", padding: "7px 14px", borderRadius: 6, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 12, opacity: !nuevoTitulo.trim() ? 0.5 : 1 }}>
              {creando ? "Creando..." : "✅ Crear tarea"}
            </button>
            <button onClick={() => setMostrarForm(false)} style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", padding: "7px 14px", borderRadius: 6, color: "white", cursor: "pointer", fontSize: 12 }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setMostrarForm(true)}
          style={{ background: "transparent", border: "1px dashed #1e1b4b", borderRadius: 8, color: "#64748b", padding: "8px 14px", cursor: "pointer", fontSize: 12, width: "100%" }}
        >
          ＋ Agregar tarea
        </button>
      )}
    </div>
  );
}

function Entregas() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mes, anio, mesLabel, anterior, siguiente, esActual } = useMesActual();

  const [items, setItems] = useState<ItemPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [actualizando, setActualizando] = useState<number | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [modalAgregarOpen, setModalAgregarOpen] = useState(false);

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

  const eliminarTodosPedido = async (pedidoItems: ItemPedido[]) => {
    for (const item of pedidoItems) {
      await fetch(`${API_URL}/items-pedido/${item.id}`, { method: "DELETE", headers });
    }
    await loadItems();
  };

  const marcarTodosEntregados = async (pedidoItems: ItemPedido[]) => {
    const pendientes = pedidoItems.filter(i => i.estado !== "entregado");
    for (const item of pendientes) {
      await fetch(`${API_URL}/items-pedido/${item.id}`, { method: "PUT", headers, body: JSON.stringify({ estado: "entregado" }) });
    }
    await loadItems();
  };

  // Numeración de pedido relativa a cada cliente (calculada sobre TODOS los items, sin filtrar por mes)
  const numeroPedidoMap = (() => {
    const pedidosPorCliente: Record<number, { pedidoId: number; creadoEn: string }[]> = {};
    items.forEach(item => {
      const cid = item.cliente.id;
      if (!pedidosPorCliente[cid]) pedidosPorCliente[cid] = [];
      if (!pedidosPorCliente[cid].some(p => p.pedidoId === item.pedidoId)) {
        pedidosPorCliente[cid].push({ pedidoId: item.pedidoId, creadoEn: item.creadoEn });
      }
    });
    const map: Record<number, number> = {};
    Object.values(pedidosPorCliente).forEach(lista => {
      const ordenado = [...lista].sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());
      ordenado.forEach((p, idx) => { map[p.pedidoId] = idx + 1; });
    });
    return map;
  })();

  const itemsMes = items.filter(item => {
    const fecha = new Date(item.creadoEn);
    return fecha.getMonth() === mes && fecha.getFullYear() === anio;
  });

  // Agrupar por PEDIDO, no por cliente — evita mezclar pedidos viejos completados con nuevos pendientes
  const groupedByPedido = itemsMes.reduce((acc, item) => {
    const id = item.pedidoId;
    if (!acc[id]) acc[id] = { cliente: item.cliente, pedidoId: item.pedidoId, items: [] };
    acc[id].items.push(item);
    return acc;
  }, {} as Record<number, { cliente: ItemPedido["cliente"]; pedidoId: number; items: ItemPedido[] }>);

  const gruposOrdenados = Object.values(groupedByPedido).sort((a, b) => {
    const maxA = Math.max(...a.items.map(i => new Date(i.creadoEn).getTime()));
    const maxB = Math.max(...b.items.map(i => new Date(i.creadoEn).getTime()));
    return maxB - maxA;
  });

  const clientesUnicos = new Set(itemsMes.map(i => i.cliente.id)).size;

  const stats = [
    { label: "Pendientes",  value: itemsMes.filter(i => i.estado === "pendiente").length,  color: "#94a3b8", icon: "⏳" },
    { label: "Completados", value: itemsMes.filter(i => i.estado === "completado").length, color: "#34d399", icon: "✅" },
    { label: "Entregados",  value: itemsMes.filter(i => i.estado === "entregado").length,  color: "#a5b4fc", icon: "📦" },
    { label: "Clientes",    value: clientesUnicos,                                          color: "#818cf8", icon: "👤" },
  ];

  return (
    <div style={{ fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.3} }
        .client-card { background:linear-gradient(160deg, #0d0d1a, #0a0a14); border-radius:16px; border:1px solid #1e1b4b; overflow:hidden; margin-bottom:16px; transition:border-color 0.2s; }
        .client-card:hover { border-color:rgba(99,102,241,.4); }
        .client-header { padding:16px 20px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:transparent; transition:background 0.2s; }
        .client-header:hover { background:rgba(99,102,241,.06); }
        .item-card { background:#0a0a14; border-radius:12px; padding:16px; margin-bottom:10px; border:1px solid #1e1b4b; animation:fadeIn 0.2s ease; transition:border-color 0.2s; }
        .item-card:hover { border-color:rgba(99,102,241,.4); }
        .tag { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:600; }
        .btn-entregado { border:none; padding:8px 16px; border-radius:8px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; font-weight:700; font-size:12px; cursor:pointer; font-family:inherit; transition:opacity 0.15s, transform 0.15s; box-shadow:0 4px 14px rgba(99,102,241,.3); }
        .btn-entregado:hover { opacity:0.85; transform:translateY(-1px); }
        .btn-entregado:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        .estado-btn { padding:6px 14px; border-radius:8px; border:1px solid; font-size:12px; font-family:inherit; cursor:pointer; font-weight:600; transition:all 0.15s; }
        .estado-btn:hover:not(:disabled) { opacity:0.8; }
        .estado-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .btn-eliminar { background:transparent; border:1px solid #ef4444; border-radius:8px; color:#ef4444; font-size:11px; font-weight:600; padding:5px 12px; cursor:pointer; font-family:inherit; transition:background 0.15s; }
        .btn-eliminar:hover:not(:disabled) { background:rgba(239,68,68,0.1); }
        .btn-eliminar:disabled { opacity:0.4; cursor:not-allowed; }
        .tipo-btn { flex:1; padding:9px 8px; border-radius:10px; border:2px solid #1e1b4b; background:#0a0a14; color:#64748b; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; text-align:center; }
        .tipo-btn.selected { border-color:#6366f1; background:rgba(99,102,241,0.12); color:#a5b4fc; }
        .tipo-btn:hover:not(.selected) { border-color:#1e1b4b; color:#94a3b8; }
        .sub-option { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:2px solid #1e1b4b; background:#0a0a14; color:#64748b; font-size:13px; cursor:pointer; transition:all 0.15s; margin-bottom:6px; }
        .sub-option.selected { border-color:#6366f1; background:rgba(99,102,241,0.1); color:#a5b4fc; }
        .sub-option:hover:not(.selected) { border-color:#1e1b4b; color:#94a3b8; }
      `}</style>

      {confirmOpen && (
        <ConfirmModal
          message={confirmMessage}
          onConfirm={() => { confirmAction(); setConfirmOpen(false); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {modalAgregarOpen && (
        <ModalAgregarEntrega
          token={token}
          onClose={() => setModalAgregarOpen(false)}
          onCreated={loadItems}
        />
      )}

      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 14px rgba(99,102,241,.3)" }}>📦</div>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#f1f5f9" }}>Producción & Entregas</h1>
              <p style={{ margin: 0, color: "#475569", fontSize: 12 }}>Gestiona la producción de libros, artículos y ediciones</p>
            </div>
          </div>
          <button
            onClick={() => setModalAgregarOpen(true)}
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", padding: "11px 20px",
              borderRadius: 10, color: "white", fontWeight: 600, cursor: "pointer", fontSize: 13,
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7,
              boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
            }}
          >
            <span style={{ fontSize: 16 }}>＋</span> Agregar entrega
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <NavegadorMes mesLabel={mesLabel} anio={anio} onAnterior={anterior} onSiguiente={siguiente} esActual={esActual()} />
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 14, padding: "16px 20px", position: "relative", overflow: "hidden" }}>
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
            <div key={i} style={{ background: "#0a0a14", borderRadius: 16, height: 80, border: "1px solid #1e1b4b", opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : gruposOrdenados.length === 0 ? (
        <div style={{ background: "#0a0a14", border: "1px dashed #1e1b4b", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ color: "#475569", margin: 0, fontSize: 15 }}>No hay pedidos en {mesLabel} {anio}</p>
        </div>
      ) : (
        gruposOrdenados.map(({ cliente, pedidoId, items: pedidoItems }) => {
          const isSelected = selectedPedidoId === pedidoId;
          const todosEntregados = pedidoItems.every(i => i.estado === "entregado");
          const desgloses = pedidoItems.map(i => parsearTitulo(i.titulo, i.tipo, i.tipoAutor, i.periodicidad));
          const numeroPedido = numeroPedidoMap[pedidoId] || pedidoId;

          return (
            <div key={pedidoId} className="client-card">
              <div className="client-header" onClick={() => setSelectedPedidoId(isSelected ? null : pedidoId)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, marginTop: 2 }}>👤</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>{cliente.nombreCompleto || "Cliente sin nombre"}</span>
                      <span style={{ background: "rgba(99,102,241,.12)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99 }}>
                        Pedido #{numeroPedido}
                      </span>
                    </div>

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
                    <BarraProgreso items={pedidoItems} />

                    {/* Acciones del pedido */}
                    <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      {!todosEntregados && (
                        <button
                          className="btn-entregado"
                          onClick={() => showConfirm(
                            `¿Marcar todos los ítems del Pedido #${numeroPedido} de ${cliente.nombreCompleto || "este cliente"} como entregados?`,
                            () => marcarTodosEntregados(pedidoItems)
                          )}
                        >
                          📦 Marcar todo como entregado
                        </button>
                      )}
                      {todosEntregados && (
                        <span style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 600, alignSelf: "center" }}>📦 Todo entregado</span>
                      )}
                      <button
                        className="btn-eliminar"
                        onClick={() => showConfirm(
                          `¿Eliminar todos los ítems del Pedido #${numeroPedido} de ${cliente.nombreCompleto || "este cliente"}? Esta acción no se puede deshacer.`,
                          () => eliminarTodosPedido(pedidoItems)
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
                  {pedidoItems.map(item => {
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
                            {item.conSenapi && <span className="tag" style={{ background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.35)" }}>🔖 SENAPI</span>}
                            {item.conIsbn && <span className="tag" style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.35)" }}>📘 ISBN</span>}
                          </div>
                        )}
                              
                        {/* 👇 PANEL DE TAREAS (AGREGADO AQUÍ) */}
                        <TareasPanel item={item} token={token} onRefresh={loadItems} />

                        {/* Botones de estado + eliminar */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            className="estado-btn"
                            disabled={esPendiente || actualizando === item.id}
                            onClick={() => updateEstado(item.id, "pendiente")}
                            style={{
                              background: esPendiente ? "rgba(148,163,184,0.15)" : "transparent",
                              borderColor: esPendiente ? "#94a3b8" : "#1e1b4b",
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
                              background: esCompletado ? "rgba(16,185,129,0.15)" : "transparent",
                              borderColor: esCompletado ? "#34d399" : "#1e1b4b",
                              color: esCompletado ? "#34d399" : "#475569",
                            }}
                          >
                            ✅ Completado
                          </button>
                          <button
                            className="estado-btn"
                            disabled={esEntregado || actualizando === item.id}
                            onClick={() => updateEstado(item.id, "entregado")}
                            style={{
                              background: esEntregado ? "rgba(99,102,241,0.15)" : "transparent",
                              borderColor: esEntregado ? "#a5b4fc" : "#1e1b4b",
                              color: esEntregado ? "#a5b4fc" : "#475569",
                            }}
                          >
                            📦 Entregado
                          </button>
                          {actualizando === item.id && <Spinner />}
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