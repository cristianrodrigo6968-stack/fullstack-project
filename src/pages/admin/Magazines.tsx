import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useMesActual } from "../../hooks/useMesActual";
import NavegadorMes from "../../components/NavegadorMes";

const API_URL = import.meta.env.VITE_API_URL;

interface Person { id: number; name: string; }
interface ArticleItem {
  id: number; title: string;
  authors: Person[];
  cliente?: ClienteItem | null;
  edicion?: { id: number; numero: number } | null;
}
interface ClienteItem {
  id: number;
  nombreCompleto: string | null;
  ci: string | null;
  extension: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  sexo: string | null;
  direccion: string | null;
  celular: string | null;
  email: string | null;
  fechaNacimiento: string | null;
  ciudad: string | null;
  profesion: string | null;
  fotografia: string | null;
}
interface EdicionItem {
  id: number; numero: number;
  archivoUrl?: string | null;
  articles: ArticleItem[];
  items: { id: number; titulo: string | null; pedido: { cliente: { nombreCompleto: string | null; nombres: string | null; apellidoPaterno: string | null } } }[];
}
interface Magazine {
  id: number; title: string; director: Person;
  articles: ArticleItem[]; notas: string | null;
  cliente: ClienteItem | null; createdAt: string;
  archivoUrl: string | null;
  ediciones: EdicionItem[];
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void; }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "0 20px" }}>
      <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", padding: 32, borderRadius: 16, width: "100%", maxWidth: 360, color: "white", textAlign: "center", border: "1px solid #1e1b4b" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
        <h3 style={{ marginBottom: 10 }}>¿Eliminar?</h3>
        <p style={{ color: "#94a3b8", marginBottom: 28, fontSize: 14 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={btnGray}>Cancelar</button>
          <button onClick={onConfirm} style={btnRed}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}
function generarDocumentoParticipantesEdicion(m: Magazine, ed: EdicionItem, numeroTexto: string) {
  type Persona = { nombre: string; profesion: string; foto: string | null };
  const personas: Persona[] = [];
  const vistos = new Set<number>();

  if (m.cliente) {
    personas.push({
      nombre: m.cliente.nombreCompleto || [m.cliente.nombres, m.cliente.apellidoPaterno, m.cliente.apellidoMaterno].filter(Boolean).join(" "),
      profesion: m.cliente.profesion || "—",
      foto: m.cliente.fotografia || null,
    });
    vistos.add(m.cliente.id);
  }

  (ed.articles || []).forEach(a => {
    if (a.cliente && !vistos.has(a.cliente.id)) {
      vistos.add(a.cliente.id);
      personas.push({
        nombre: a.cliente.nombreCompleto || [a.cliente.nombres, a.cliente.apellidoPaterno, a.cliente.apellidoMaterno].filter(Boolean).join(" "),
        profesion: a.cliente.profesion || "—",
        foto: a.cliente.fotografia || null,
      });
    }
  });

  if (personas.length === 0) {
    alert("No hay personas con datos vinculados en esta edición todavía.");
    return;
  }

  const filas = personas.map(p => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #ccc;">
        ${p.foto ? `<img src="${p.foto}" width="70" height="70" style="object-fit:cover;border-radius:50%;" />` : "—"}
      </td>
      <td style="padding:10px;border-bottom:1px solid #ccc;font-weight:bold;">${p.nombre}</td>
      <td style="padding:10px;border-bottom:1px solid #ccc;">${p.profesion}</td>
    </tr>
  `).join("");

  const html = `
    <html><head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;">
      <h2>${m.title} — ${numeroTexto} Edición</h2>
      <p>Listado de participantes</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          <th style="text-align:left;padding:10px;">Foto</th>
          <th style="text-align:left;padding:10px;">Nombre</th>
          <th style="text-align:left;padding:10px;">Profesión</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </body></html>
  `;

  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${m.title.replace(/\s+/g, "_")}_${numeroTexto}_participantes.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
const buildSenapiJSON = (cliente: ClienteItem): object => ({
  nombres: cliente.nombres || "",
  apellidoPaterno: cliente.apellidoPaterno || "",
  apellidoMaterno: cliente.apellidoMaterno || "",
  sexo: cliente.sexo || "",
  ci: cliente.ci || "",
  extension: cliente.extension || "",
  direccion: cliente.direccion || "",
  celular: cliente.celular || "",
  email: cliente.email || "",
  fechaNacimiento: cliente.fechaNacimiento || "",
  ciudad: cliente.ciudad || "",
});

function EdicionCard({
  ed, selected, clientes, headers, headersAuth, onRefresh,
}: {
  ed: EdicionItem; selected: Magazine; clientes: ClienteItem[];
  headers: Record<string, string>; headersAuth: Record<string, string>; onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [subiendoId, setSubiendoId] = useState<number | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [nuevoClienteId, setNuevoClienteId] = useState("");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [tituloDirector, setTituloDirector] = useState("");
  const [addingDirector, setAddingDirector] = useState(false);

  const NOMBRES = ["PRIMERA", "SEGUNDA", "TERCERA"];
  const numeroTexto = NOMBRES[ed.numero - 1] || `N° ${ed.numero}`;
  const articles = ed.articles ?? [];
const articuloDirector = articles.find(a => a.authors.some(au => au.id === selected.director.id));
  const articlesSinDirector = articles.filter(a => a.id !== articuloDirector?.id);
  const agregarArticuloDirector = async () => {
    if (!tituloDirector.trim()) return;
    setAddingDirector(true);
    await fetch(`${API_URL}/articles`, {
      method: "POST", headers,
      body: JSON.stringify({
        title: tituloDirector,
        authorIds: [selected.director.id],
        magazineId: selected.id,
        clienteId: selected.cliente?.id || null,
        edicionId: ed.id,
      }),
    });
    setTituloDirector("");
    setAddingDirector(false);
    onRefresh();
  };

  const subirArchivo = async (file: File) => {
    setSubiendoId(ed.id);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      await fetch(`${API_URL}/ediciones/${ed.id}/archivo`, { method: "POST", headers: headersAuth, body: formData });
      onRefresh();
    } finally { setSubiendoId(null); }
  };

  const agregarAutor = async () => {
    if (!nuevoClienteId || !nuevoTitulo) return;
    setAdding(true);
    const cliente = clientes.find(c => c.id === Number(nuevoClienteId));
    await fetch(`${API_URL}/articles`, {
      method: "POST", headers,
      body: JSON.stringify({ title: nuevoTitulo, authorName: cliente?.nombreCompleto || "", magazineId: selected.id, clienteId: Number(nuevoClienteId), edicionId: ed.id }),
    });
    setNuevoClienteId(""); setNuevoTitulo(""); setAdding(false);
    onRefresh();
  };

  const eliminarAutor = async (articleId: number) => {
    setDeletingArticleId(articleId);
    await fetch(`${API_URL}/articles/${articleId}`, { method: "DELETE", headers });
    setDeletingArticleId(null);
    onRefresh();
  };

  return (
    <div style={{
      borderRadius: 12, marginBottom: 10,
      border: open ? "1px solid #6366f1" : "1px solid #1e1b4b",
      overflow: "hidden", transition: "border-color 0.2s",
      background: open ? "#0a0a14" : "#0d0d1a",
    }}>
      {/* Cabecera clicable */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", background: "transparent", border: "none",
          padding: "12px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", cursor: "pointer", color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Número de edición */}
          <span style={{
            background: open ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,.15)",
            color: open ? "white" : "#a5b4fc",
            borderRadius: 6, padding: "3px 10px", fontSize: 11,
            fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5,
            transition: "all 0.2s",
          }}>
            {numeroTexto} EDICIÓN
          </span>

          {/* Contador de artículos */}
          <span style={{
            background: "#0d0d1a", color: "#94a3b8",
            borderRadius: 99, padding: "2px 10px", fontSize: 12,
          }}>
            {articles.length} artículo{articles.length !== 1 ? "s" : ""}
          </span>

          {/* Badge archivo */}
          {ed.archivoUrl
            ? <span style={{ background: "rgba(16,185,129,.15)", color: "#34d399", borderRadius: 99, padding: "2px 8px", fontSize: 11 }}>✓ PDF</span>
            : <span style={{ background: "#0d0d1a", color: "#64748b", borderRadius: 99, padding: "2px 8px", fontSize: 11 }}>Sin PDF</span>
          }
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Descargar participantes */}
          <button
            onClick={e => { e.stopPropagation(); generarDocumentoParticipantesEdicion(selected, ed, numeroTexto); }}
            title="Descargar lista de participantes (Word)"
            style={{ background: "rgba(99,102,241,.15)", border: "none", padding: "4px 10px", borderRadius: 6, color: "#a5b4fc", cursor: "pointer", fontWeight: "bold", fontSize: 13 }}
          >
            📄
          </button>

          {/* Botones archivo */}
          {ed.archivoUrl ? (
            <>
              <a
                href={ed.archivoUrl.replace("/upload/", "/upload/fl_attachment/")}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                title="Descargar PDF"
                style={{ background: "rgba(16,185,129,.15)", padding: "4px 10px", borderRadius: 6, color: "#34d399", fontWeight: "bold", fontSize: 13, textDecoration: "none" }}
              >
                📥
              </a>
              <label onClick={e => e.stopPropagation()} title="Reemplazar archivo"
                style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", padding: "4px 10px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>
                🔄
                <input type="file" accept=".pdf,.pub,.docx" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f); }} />
              </label>
            </>
          ) : (
            <label onClick={e => e.stopPropagation()} title="Subir archivo"
              style={{ background: "rgba(99,102,241,.15)", padding: "4px 10px", borderRadius: 6, color: "#a5b4fc", cursor: "pointer", fontWeight: "bold", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
              {subiendoId === ed.id ? <Spinner /> : "📤"}
              <input type="file" accept=".pdf,.pub,.docx" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f); }} />
            </label>
          )}

          <span style={{
            fontSize: 18, color: open ? "#a5b4fc" : "#475569",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s", display: "inline-block", lineHeight: 1,
          }}>▾</span>
        </div>
      </button>

      {/* Contenido desplegable */}
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e1b4b" }}>

          {/* Director */}
          <div style={{
            background: "#0d0d1a", border: "1px solid #1e1b4b", padding: "10px 14px", borderRadius: 8,
            marginTop: 12, marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "#475569", fontSize: 10, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: 1 }}>Director</p>
                {selected.cliente ? (
                  <p style={{ color: "white", fontWeight: "bold", margin: 0, fontSize: 13 }}>
                    {selected.cliente.nombreCompleto}
                    <span style={{ color: "#64748b", fontWeight: "normal" }}> · CI {selected.cliente.ci} · {selected.cliente.extension}</span>
                  </p>
                ) : (
                  <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>Sin director vinculado</p>
                )}
              </div>
              {selected.cliente && (
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(buildSenapiJSON(selected.cliente!), null, 2)); alert("📋 Datos del director copiados"); }}
                  title="Copiar JSON SENAPI del director"
                  style={{ background: "rgba(99,102,241,.15)", border: "none", padding: "5px 10px", borderRadius: 6, color: "#a5b4fc", cursor: "pointer", fontSize: 13 }}
                >📋</button>
              )}
            </div>

            {/* Título del artículo del director en esta edición */}
            {articuloDirector ? (
              <p style={{ color: "#94a3b8", fontSize: 12, margin: "10px 0 0" }}>
                📌 Artículo: <strong style={{ color: "white" }}>{articuloDirector.title}</strong>
              </p>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input
                  placeholder="Título del artículo del director"
                  value={tituloDirector}
                  onChange={e => setTituloDirector(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                />
                <button
                  onClick={agregarArticuloDirector}
                  disabled={addingDirector || !tituloDirector.trim()}
                  style={{ ...btnBlue, opacity: !tituloDirector.trim() ? 0.4 : 1, cursor: !tituloDirector.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {addingDirector ? <Spinner /> : "➕ Agregar"}
                </button>
              </div>
            )}
          </div>

          {/* Lista autores */}
          {articlesSinDirector.length === 0 ? (
            <p style={{ color: "#475569", fontSize: 13, margin: "12px 0", textAlign: "center", padding: "16px 0", borderTop: "1px solid #1e1b4b" }}>
              Sin autores asignados
            </p>
          ) : (
            <div>
              {articlesSinDirector.map((article, idx) => (
                <div key={article.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0",
                  borderBottom: idx < articlesSinDirector.length - 1 ? "1px solid #1e1b4b" : "none",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
                      {article.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>
                        ✍️ {article.authors.map(a => a.name).join(", ")}
                      </span>
                      {article.cliente?.ci && (
                        <span style={{ background: "rgba(99,102,241,.15)", color: "#a5b4fc", fontSize: 11, padding: "1px 7px", borderRadius: 99 }}>
                          CI {article.cliente.ci}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 12 }}>
                    {article.cliente && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(JSON.stringify(buildSenapiJSON(article.cliente!), null, 2)); alert("📋 Datos del autor copiados"); }}
                        title="Copiar JSON SENAPI"
                        style={{ background: "rgba(99,102,241,.15)", border: "none", padding: "4px 8px", borderRadius: 6, color: "#a5b4fc", cursor: "pointer", fontSize: 12 }}
                      >📋</button>
                    )}
                    <button
                      onClick={() => eliminarAutor(article.id)}
                      disabled={deletingArticleId === article.id}
                      style={{ background: "rgba(239,68,68,.15)", border: "none", padding: "4px 8px", borderRadius: 6, color: "#f87171", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {deletingArticleId === article.id ? <Spinner /> : "🗑"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulario agregar autor */}
          <div style={{
            marginTop: 14, background: "#0d0d1a", border: "1px solid #1e1b4b", borderRadius: 8,
            padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
          }}>
            <select
              value={nuevoClienteId} onChange={e => setNuevoClienteId(e.target.value)}
              style={{ ...inputStyle, flex: "1 1 160px", marginBottom: 0 }}
            >
              <option value="">— Seleccionar autor —</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombreCompleto || "Sin nombre"}{c.ci ? ` · ${c.ci}` : ""}
                </option>
              ))}
            </select>
            <input
              placeholder="Título del artículo"
              value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)}
              style={{ ...inputStyle, flex: "2 1 180px", marginBottom: 0 }}
            />
            <button
              onClick={agregarAutor}
              disabled={adding || !nuevoClienteId || !nuevoTitulo}
              style={{
                ...btnBlue, opacity: (!nuevoClienteId || !nuevoTitulo) ? 0.4 : 1,
                cursor: (!nuevoClienteId || !nuevoTitulo) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {adding ? <Spinner /> : "➕ Agregar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Magazines() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mesLabel, anio, anterior, siguiente, esActual, filtrarPorMes } = useMesActual();

  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Magazine | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingMags, setLoadingMags] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [title, setTitle] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [notas, setNotas] = useState("");
  const [clienteId, setClienteId] = useState("");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const headersAuth = { Authorization: `Bearer ${token}` };

  const showConfirm = (message: string, action: () => void) => {
    setConfirmMessage(message); setConfirmAction(() => action); setConfirmOpen(true);
  };

  const load = async () => {
    setLoadingMags(true);
    const [mRes, cRes] = await Promise.all([
      fetch(`${API_URL}/magazines`, { headers }),
      fetch(`${API_URL}/clients`, { headers }),
    ]);
    if (mRes.ok) setMagazines(await mRes.json());
    if (cRes.ok) setClientes(await cRes.json());
    setLoadingMags(false);
  };

  useEffect(() => { load(); }, []);

  const selectMagazine = async (m: Magazine) => {
    const res = await fetch(`${API_URL}/magazines/${m.id}`, { headers });
    if (res.ok) setSelected(await res.json());
    else setSelected(m);
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const res = await fetch(`${API_URL}/magazines/${selected.id}`, { headers });
    if (res.ok) setSelected(await res.json());
  };

  const magazinesMes = filtrarPorMes(magazines);

  const openCreate = () => {
    setEditId(null); setTitle(""); setDirectorName(""); setNotas(""); setClienteId("");
    setOpen(true);
  };

  const openEdit = (m: Magazine) => {
    setEditId(m.id); setTitle(m.title);
    setDirectorName(m.director?.name || "");
    setNotas(m.notas || "");
    setClienteId(m.cliente?.id?.toString() || "");
    setOpen(true);
  };

  const save = async () => {
    if (!title || !directorName) return;
    setSaving(true);
    try {
      if (editId) {
        await fetch(`${API_URL}/magazines/${editId}`, {
          method: "PUT", headers,
          body: JSON.stringify({ title, directorName, notas, clienteId: clienteId ? Number(clienteId) : null }),
        });
      } else {
        const d = await fetch(`${API_URL}/persons`, {
          method: "POST", headers, body: JSON.stringify({ name: directorName }),
        }).then(r => r.json());
        await fetch(`${API_URL}/magazines`, {
          method: "POST", headers,
          body: JSON.stringify({ title, directorId: d.id, notas, clienteId: clienteId ? Number(clienteId) : null }),
        });
      }
      setOpen(false); await load();
    } finally { setSaving(false); }
  };

  const remove = (m: Magazine) => {
    showConfirm(`¿Eliminar "${m.title}" y todos sus artículos?`, async () => {
      setConfirmOpen(false); setDeletingId(m.id);
      try { await fetch(`${API_URL}/magazines/${m.id}`, { method: "DELETE", headers }); await load(); }
      finally { setDeletingId(null); }
    });
  };

  // Total artículos de una revista sumando todas sus ediciones
  const totalArticulos = (m: Magazine) =>
    m.ediciones?.reduce((sum, ed) => sum + (ed.articles?.length ?? 0), 0) ?? m.articles.length;

  return (
    <div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .mag-card {
          background: linear-gradient(160deg, #0d0d1a, #0a0a14);
          border-radius: 14px;
          border: 1px solid #1e1b4b;
          cursor: pointer;
          transition: border-color 0.18s, transform 0.15s, box-shadow 0.18s;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .mag-card:hover {
          border-color: #6366f1;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99,102,241,0.15);
        }
        .mag-card:active { transform: translateY(0); }
      `}</style>

      {confirmOpen && <ConfirmModal message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />}

      <h1 style={{ marginBottom: 6, fontSize: isMobile ? 22 : 28 }}>📘 Revistas</h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Gestiona las revistas editoriales.
      </p>

      {/* ── Vista detalle ── */}
      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} style={{ ...btnGray, marginBottom: 20 }}>← Volver</button>

          <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", padding: isMobile ? 16 : 28, borderRadius: 16, border: "1px solid #1e1b4b" }}>
            {/* Encabezado revista */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: isMobile ? 20 : 26 }}>{selected.title}</h2>
                <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>Director: <span style={{ color: "#94a3b8" }}>{selected.director?.name}</span></p>
              </div>
              {selected.cliente && (
                <span style={{ background: "rgba(99,102,241,.15)", color: "#a5b4fc", padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: "bold", whiteSpace: "nowrap" }}>
                  👤 {selected.cliente.nombreCompleto}
                </span>
              )}
            </div>

            {selected.notas && (
              <div style={{ background: "#0a0a14", padding: "12px 16px", borderRadius: 10, marginBottom: 20, borderLeft: "3px solid #f59e0b" }}>
                <p style={{ color: "#64748b", fontSize: 10, marginBottom: 3, textTransform: "uppercase", letterSpacing: 1 }}>Notas</p>
                <p style={{ color: "#fcd34d", fontSize: 14, margin: 0 }}>{selected.notas}</p>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
                Ediciones
              </p>
              <span style={{ color: "#475569", fontSize: 12 }}>
                {selected.ediciones?.reduce((s, e) => s + (e.articles?.length ?? 0), 0) ?? 0} autores en total
              </span>
            </div>

            {!selected.ediciones?.length && (
              <p style={{ color: "#475569", fontSize: 13 }}>Sin ediciones registradas.</p>
            )}

            {selected.ediciones?.map(ed => (
              <EdicionCard
                key={ed.id} ed={ed} selected={selected} clientes={clientes}
                headers={headers} headersAuth={headersAuth} onRefresh={refreshSelected}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <button onClick={openCreate} style={{ ...btnBlue, marginBottom: 24 }}>➕ Crear revista</button>

          <NavegadorMes mesLabel={mesLabel} anio={anio} onAnterior={anterior} onSiguiente={siguiente} esActual={esActual()} />

          {loadingMags ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}><Spinner /></div>
          ) : magazinesMes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#64748b", fontSize: 16 }}>No hay revistas en {mesLabel} {anio}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {magazinesMes.map(m => (
                <div key={m.id} className="mag-card" onClick={() => selectMagazine(m)}>
                  {/* Franja superior de color */}
                  <div style={{ height: 4, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />

                  <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Título */}
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "white", lineHeight: 1.3 }}>{m.title}</h3>
                      <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>✍️ {m.director?.name}</p>
                    </div>

                    {/* Cliente/director vinculado */}
                    {m.cliente && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,.15)", color: "#a5b4fc", padding: "3px 10px", borderRadius: 99, fontSize: 12, width: "fit-content" }}>
                        👤 {m.cliente.nombreCompleto}
                      </span>
                    )}

                    {/* Notas */}
                    {m.notas && (
                      <p style={{ color: "#f59e0b", fontSize: 12, background: "rgba(245,158,11,.12)", padding: "6px 10px", borderRadius: 6, margin: 0 }}>
                        📝 {m.notas.length > 60 ? m.notas.substring(0, 60) + "…" : m.notas}
                      </p>
                    )}

                    {/* Ediciones con sus artículos */}
                    {m.ediciones && m.ediciones.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                        {m.ediciones.map(ed => {
                          const NOMBRES = ["Primera", "Segunda", "Tercera"];
                          const nTexto = NOMBRES[ed.numero - 1] || `N° ${ed.numero}`;
                          const count = ed.articles?.length ?? 0;
                          return (
                            <div key={ed.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a0a14", borderRadius: 6, padding: "5px 10px" }}>
                              <span style={{ color: "#a5b4fc", fontSize: 12, fontWeight: 500 }}>{nTexto} edición</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {ed.archivoUrl
                                  ? <span style={{ color: "#34d399", fontSize: 11 }}>✓ PDF</span>
                                  : <span style={{ color: "#475569", fontSize: 11 }}>Sin PDF</span>
                                }
                                <span style={{ background: "rgba(99,102,241,.15)", color: "#a5b4fc", borderRadius: 99, padding: "1px 8px", fontSize: 11 }}>
                                  {count} art.
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Sin ediciones */}
                    {(!m.ediciones || m.ediciones.length === 0) && (
                      <p style={{ color: "#334155", fontSize: 12, margin: 0 }}>Sin ediciones</p>
                    )}
                  </div>

                  {/* Footer acciones */}
                  <div
                    style={{ padding: "10px 20px", borderTop: "1px solid #1e1b4b", display: "flex", justifyContent: "flex-end", gap: 8 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button onClick={() => openEdit(m)} style={{ ...btnYellow, fontSize: 12, padding: "5px 12px" }}>✏️ Editar</button>
                    <button
                      onClick={() => remove(m)}
                      disabled={deletingId === m.id}
                      style={{ ...btnRed, fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 4, opacity: deletingId === m.id ? 0.6 : 1 }}
                    >
                      {deletingId === m.id ? <Spinner /> : "🗑"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modal crear/editar ── */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999, padding: "20px" }}>
          <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", padding: isMobile ? 20 : 28, borderRadius: 16, width: "100%", maxWidth: 500, color: "white", maxHeight: "85vh", overflowY: "auto", border: "1px solid #1e1b4b", boxSizing: "border-box" }}>
            <h3 style={{ marginBottom: 20 }}>{editId ? "✏️ Editar revista" : "➕ Nueva revista"}</h3>

            <label style={labelStyle}>Título</label>
            <input placeholder="Título de la revista" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Director (seleccionar cliente)</label>
            <select
              value={clienteId}
              onChange={e => {
                const val = e.target.value;
                setClienteId(val);
                if (val) { const c = clientes.find(c => c.id.toString() === val); setDirectorName(c?.nombreCompleto || ""); }
                else setDirectorName("");
              }}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">-- Sin vincular --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombreCompleto || "Sin nombre"} {c.ci ? `· CI ${c.ci}` : ""}</option>
              ))}
            </select>

            {!clienteId && (
              <>
                <label style={labelStyle}>Nombre del director (manual)</label>
                <input placeholder="Nombre del director" value={directorName} onChange={e => setDirectorName(e.target.value)} style={inputStyle} />
              </>
            )}

            {clienteId && (
              <div style={{ background: "#0a0a14", border: "1px solid #1e1b4b", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>Director: <strong style={{ color: "white" }}>{directorName}</strong></span>
              </div>
            )}

            <label style={labelStyle}>Notas (opcional)</label>
            <textarea placeholder="Notas sobre esta revista..." value={notas} onChange={e => setNotas(e.target.value)} rows={3} style={{ ...inputStyle, resize: "none" }} />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={save} disabled={saving}
                style={{ ...btnBlue, display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1, minWidth: 110, justifyContent: "center", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? <Spinner /> : "💾 Guardar"}
              </button>
              <button onClick={() => setOpen(false)} style={btnGray}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", padding: 11, marginBottom: 10, borderRadius: 8, border: "1px solid #1e1b4b", background: "#0a0a14", color: "white", fontSize: 16, boxSizing: "border-box" };
const btnBlue: React.CSSProperties = { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 14px rgba(99,102,241,.3)" };
const btnRed: React.CSSProperties = { background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 14px rgba(239,68,68,.3)" };
const btnYellow: React.CSSProperties = { background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 14px rgba(245,158,11,.3)" };
const btnGray: React.CSSProperties = { background: "#0a0a14", border: "1px solid #1e1b4b", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };

export default Magazines;
