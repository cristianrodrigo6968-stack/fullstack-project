import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  descuento: number;
  activo: boolean;
  imagenUrl?: string;
  componentes?: Componente[];
}

type TipoComponente = "libro" | "revista" | "otro";
type CategoriaLibro = "A" | "B" | "C";
type SubtipoRevista = "director" | "fundador" | "articulo_rp" | "articulo_sp";

interface Componente {
  tipo: TipoComponente;
  categoria?: CategoriaLibro;
  conIsbn?: boolean;
  conSenapi?: boolean;
  subtipo?: SubtipoRevista;
  meses?: 1 | 3;
}

const SUBTIPO_LABELS: Record<SubtipoRevista, string> = {
  director: "Director de revista",
  fundador: "Fundador",
  articulo_rp: "Artículo — Redacción y publicación",
  articulo_sp: "Artículo — Solo publicación",
};

function componenteLabel(c: Componente): string {
  if (c.tipo === "libro") {
    const extras = [c.conIsbn ? "ISBN" : null, c.conSenapi ? "SENAPI" : null].filter(Boolean).join(" + ");
    return `📖 Libro Cat. ${c.categoria}${extras ? ` (${extras})` : ""}`;
  }
  if (c.tipo === "revista") {
    const sub = c.subtipo ? SUBTIPO_LABELS[c.subtipo] : "";
    const dur = c.meses ? ` (${c.meses} mes${c.meses > 1 ? "es" : ""})` : "";
    return `📰 ${sub}${dur}`;
  }
  return "📦 Otro";
}

function ComponenteEditor({ comp, onChange, onRemove }: {
  comp: Componente;
  onChange: (c: Componente) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ background: "#0a0a14", border: "1px solid #1e1b4b", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Componente</span>
        <button onClick={onRemove} style={{ background: "rgba(239,68,68,0.12)", border: "none", color: "#ef4444", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>✕ Quitar</button>
      </div>

      {/* Tipo */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["libro", "revista", "otro"] as TipoComponente[]).map(t => (
          <button key={t} onClick={() => onChange({ tipo: t })}
            className={`tipo-btn${comp.tipo === t ? " selected" : ""}`}>
            {t === "libro" ? "📖 Libro" : t === "revista" ? "📰 Revista" : "📦 Otro"}
          </button>
        ))}
      </div>

     {/* Sub-opciones Libro */}
      {comp.tipo === "libro" && (
        <>
          <label style={labelStyle}>Categoría</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(["A", "B", "C"] as CategoriaLibro[]).map(c => (
              <button key={c} onClick={() => onChange({ ...comp, categoria: c })}
                className={`tipo-btn${comp.categoria === c ? " selected" : ""}`}>
                Cat. {c}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Extras</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button
              onClick={() => onChange({ ...comp, conIsbn: !comp.conIsbn })}
              className={`tipo-btn${comp.conIsbn ? " selected" : ""}`}
            >
              {comp.conIsbn ? "✓ " : ""}ISBN
            </button>
            <button
              onClick={() => onChange({ ...comp, conSenapi: !comp.conSenapi })}
              className={`tipo-btn${comp.conSenapi ? " selected" : ""}`}
            >
              {comp.conSenapi ? "✓ " : ""}SENAPI
            </button>
          </div>
        </>
      )}

      {/* Sub-opciones Revista */}
      {comp.tipo === "revista" && (
        <>
          <label style={labelStyle}>Tipo de servicio</label>
          <div style={{ marginBottom: 10 }}>
            {(Object.entries(SUBTIPO_LABELS) as [SubtipoRevista, string][]).map(([key, label]) => (
              <div key={key} onClick={() => onChange({ ...comp, subtipo: key, meses: key === "director" ? (comp.meses ?? 1) : undefined })}
                className={`sub-option${comp.subtipo === key ? " selected" : ""}`}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${comp.subtipo === key ? "#6366f1" : "#334155"}`, background: comp.subtipo === key ? "#6366f1" : "transparent", flexShrink: 0, transition: "all 0.15s" }} />
                {label}
              </div>
            ))}
          </div>

          {/* Duración solo para director */}
          {comp.subtipo === "director" && (
            <>
              <label style={labelStyle}>Duración</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {([1, 3] as (1 | 3)[]).map(m => (
                  <button key={m} onClick={() => onChange({ ...comp, meses: m })}
                    className={`tipo-btn${comp.meses === m ? " selected" : ""}`}>
                    {m} {m === 1 ? "mes" : "meses"}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function AdminProductos() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [descuento, setDescuento] = useState("0");
  const [imagen, setImagen] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [componentes, setComponentes] = useState<Componente[]>([{ tipo: "otro" }]);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/productos/admin`, { headers });
    if (res.ok) {
      const data = await res.json();
      setProductos(data.map((p: any) => ({
        ...p,
        componentes: typeof p.componentes === "string" ? JSON.parse(p.componentes) : p.componentes,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetModal = () => {
    setEditId(null); setNombre(""); setDescripcion(""); setPrecio(""); setDescuento("0");
    setImagen(null); setComponentes([{ tipo: "otro" }]);
  };

  const openCreate = () => { resetModal(); setOpen(true); };

  const openEdit = (p: Producto) => {
    resetModal();
    setEditId(p.id);
    setNombre(p.nombre);
    setDescripcion(p.descripcion);
    setPrecio(String(p.precio));
    setDescuento(String(p.descuento));
    setComponentes(p.componentes?.length ? p.componentes : [{ tipo: "otro" }]);
    setOpen(true);
  };

  const save = async () => {
    if (!nombre || !precio) return;
    setSaving(true);
    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("descripcion", descripcion);
    formData.append("precio", precio);
    formData.append("descuento", descuento);
    formData.append("componentes", JSON.stringify(componentes));
    if (imagen) formData.append("imagen", imagen);
    if (editId) {
      await fetch(`${API_URL}/productos/${editId}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: formData });
    } else {
      await fetch(`${API_URL}/productos`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
    }
    setSaving(false); setOpen(false); await load();
  };

  const toggleActivo = async (p: Producto) => {
    const formData = new FormData();
    formData.append("activo", String(!p.activo));
    await fetch(`${API_URL}/productos/${p.id}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: formData });
    await load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`${API_URL}/productos/${id}`, { method: "DELETE", headers });
    await load();
  };

  const precioFinal = (p: Producto) =>
    p.descuento > 0 ? p.precio - (p.precio * p.descuento / 100) : p.precio;

  const updateComponente = (i: number, c: Componente) => {
    setComponentes(prev => prev.map((x, idx) => idx === i ? c : x));
  };

  const removeComponente = (i: number) => {
    setComponentes(prev => prev.filter((_, idx) => idx !== i));
  };

  const addComponente = () => {
    setComponentes(prev => [...prev, { tipo: "otro" }]);
  };

  return (
    <div style={{ fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        .prod-card { background:linear-gradient(160deg, #0d0d1a, #0a0a14); border-radius:16px; border:1px solid #1e1b4b; overflow:hidden; transition:border-color 0.2s,transform 0.2s,box-shadow 0.2s; }
        .prod-card:hover { border-color:rgba(99,102,241,.4); transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,0.4); }
        .action-btn { border:none; cursor:pointer; font-weight:600; font-size:12px; font-family:inherit; border-radius:8px; padding:7px 14px; transition:opacity 0.15s,transform 0.15s; white-space:nowrap; }
        .action-btn:hover { opacity:0.85; transform:translateY(-1px); }
        .action-btn:active { transform:translateY(0); }
        .modal-input { width:100%; padding:11px 14px; margin-bottom:10px; border-radius:10px; border:1px solid #1e1b4b; background:#0a0a14; color:white; font-size:16px; font-family:inherit; box-sizing:border-box; outline:none; transition:border-color 0.2s; }
        .modal-input:focus { border-color:#6366f1; }
        .modal-input::placeholder { color:#475569; }
        .file-label { display:flex; align-items:center; gap:8px; padding:10px 14px; background:#0a0a14; border:1px dashed #1e1b4b; border-radius:10px; color:#64748b; font-size:13px; cursor:pointer; margin-bottom:10px; transition:border-color 0.2s,color 0.2s; }
        .file-label:hover { border-color:#6366f1; color:#94a3b8; }
        .badge-active { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:600; padding:3px 10px; border-radius:99px; letter-spacing:0.3px; }
        .tipo-btn { flex:1; padding:9px 8px; border-radius:10px; border:2px solid #1e1b4b; background:#0a0a14; color:#64748b; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; text-align:center; }
        .tipo-btn.selected { border-color:#6366f1; background:rgba(99,102,241,0.12); color:#a5b4fc; }
        .tipo-btn:hover:not(.selected) { border-color:#1e1b4b; color:#94a3b8; }
        .sub-option { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:2px solid #1e1b4b; background:#0a0a14; color:#64748b; font-size:13px; cursor:pointer; transition:all 0.15s; margin-bottom:6px; }
        .sub-option.selected { border-color:#6366f1; background:rgba(99,102,241,0.1); color:#a5b4fc; }
        .sub-option:hover:not(.selected) { border-color:#1e1b4b; color:#94a3b8; }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.3} }
      `}</style>

      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 14px rgba(99,102,241,.3)" }}>🛒</div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 700, color: "#f1f5f9" }}>Catálogo de Productos</h1>
        </div>
        <p style={{ color: "#475569", fontSize: 13, margin: "0 0 20px 50px" }}>Gestiona los productos del catálogo público</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Total", val: productos.length, color: "#f1f5f9" },
              { label: "Activos", val: productos.filter(p => p.activo).length, color: "#34d399" },
              { label: "Inactivos", val: productos.filter(p => !p.activo).length, color: "#ef4444" },
            ].map(c => (
              <div key={c.label} style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                <div style={{ color: c.color, fontWeight: 700, fontSize: 20 }}>{c.val}</div>
                <div style={{ color: "#475569", fontSize: 11 }}>{c.label}</div>
              </div>
            ))}
          </div>
          <button onClick={openCreate} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", padding: "11px 20px", borderRadius: 10, color: "white", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
            <span style={{ fontSize: 16 }}>＋</span> Nuevo producto
          </button>
        </div>
      </div>

      {/* LISTA */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ background: "#0a0a14", borderRadius: 16, height: 90, border: "1px solid #1e1b4b", opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />)}
        </div>
      ) : productos.length === 0 ? (
        <div style={{ background: "#0a0a14", border: "1px dashed #1e1b4b", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <p style={{ color: "#475569", margin: 0, fontSize: 15 }}>No hay productos creados aún.</p>
          <button onClick={openCreate} style={{ marginTop: 16, background: "#0d0d1a", border: "1px solid #1e1b4b", color: "#94a3b8", padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Crear el primero</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {productos.map(p => (
            <div key={p.id} className="prod-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: "14px 16px", borderLeft: `3px solid ${p.activo ? "#34d399" : "#ef4444"}` }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", flex: 1, minWidth: 0 }}>
                  {p.imagenUrl ? (
                    <img src={p.imagenUrl} alt={p.nombre} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, background: "#0d0d1a", border: "1px solid #1e1b4b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📦</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{p.nombre}</span>
                      <span className="badge-active" style={{ background: p.activo ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: p.activo ? "#34d399" : "#ef4444" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    {/* Tags de componentes */}
                    {p.componentes?.length ? (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 5 }}>
                        {p.componentes.map((c, i) => (
                          <span key={i} style={{ background: "#0d0d1a", color: "#94a3b8", fontSize: 11, padding: "2px 8px", borderRadius: 99, border: "1px solid #1e1b4b" }}>
                            {componenteLabel(c)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p style={{ color: "#475569", fontSize: 12, margin: "0 0 6px", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 36, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.descripcion}</p>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      {p.descuento > 0 && <span style={{ color: "#475569", fontSize: 12, textDecoration: "line-through" }}>Bs {p.precio.toFixed(2)}</span>}
                      <span style={{ color: "#34d399", fontWeight: 700, fontSize: 14 }}>Bs {precioFinal(p).toFixed(2)}</span>
                      {p.descuento > 0 && <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>-{p.descuento}%</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                  <button onClick={() => toggleActivo(p)} className="action-btn" style={{ background: p.activo ? "#0d0d1a" : "rgba(16,185,129,0.15)", color: p.activo ? "#94a3b8" : "#34d399" }}>{p.activo ? "Inactivar" : "✓ Activar"}</button>
                  <button onClick={() => openEdit(p)} className="action-btn" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>✏️ Editar</button>
                  <button onClick={() => remove(p.id)} className="action-btn" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", padding: "28px 24px", borderRadius: 18, width: "100%", maxWidth: 520, color: "white", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>{editId ? "Editar producto" : "Nuevo producto"}</h3>
                <p style={{ margin: "2px 0 0", color: "#475569", fontSize: 12 }}>{editId ? "Modifica los datos del producto" : "Completa los datos del nuevo producto"}</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", color: "#64748b", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>✕</button>
            </div>

            <label style={labelStyle}>Nombre del producto</label>
            <input placeholder="Ej: Membresía Categoría A" value={nombre} onChange={e => setNombre(e.target.value)} className="modal-input" />

            {/* COMPONENTES */}
            <label style={{ ...labelStyle, marginBottom: 10 }}>Componentes del producto</label>
            {componentes.map((comp, i) => (
              <ComponenteEditor
                key={i}
                comp={comp}
                onChange={c => updateComponente(i, c)}
                onRemove={() => removeComponente(i)}
              />
            ))}
            <button onClick={addComponente} style={{ width: "100%", padding: "10px", border: "2px dashed #1e1b4b", borderRadius: 10, background: "transparent", color: "#475569", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 14, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#a5b4fc"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1b4b"; e.currentTarget.style.color = "#475569"; }}>
              ＋ Agregar componente (oferta combinada)
            </button>

            <label style={labelStyle}>Descripción adicional (opcional)</label>
            <textarea placeholder="Detalles adicionales..." value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} className="modal-input" style={{ resize: "vertical", lineHeight: 1.6 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Precio (Bs)</label>
                <input placeholder="0.00" type="number" value={precio} onChange={e => setPrecio(e.target.value)} className="modal-input" />
              </div>
              <div>
                <label style={labelStyle}>Descuento (%)</label>
                <input placeholder="0" type="number" value={descuento} onChange={e => setDescuento(e.target.value)} className="modal-input" />
              </div>
            </div>

            <label style={labelStyle}>Imagen del producto</label>
            <label className="file-label">
              <span style={{ fontSize: 18 }}>🖼️</span>
              <span>{imagen ? imagen.name : "Seleccionar imagen..."}</span>
              <input type="file" accept="image/*" onChange={e => setImagen(e.target.files?.[0] || null)} style={{ display: "none" }} />
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={save} disabled={saving} style={{ flex: 1, background: saving ? "#0d0d1a" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", padding: "12px", borderRadius: 10, color: saving ? "#475569" : "white", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontFamily: "inherit" }}>
                {saving ? "Guardando..." : "💾 Guardar"}
              </button>
              <button onClick={() => setOpen(false)} style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", padding: "12px 20px", borderRadius: 10, color: "#94a3b8", fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", color: "#64748b", fontSize: 11,
  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5,
};

export default AdminProductos;