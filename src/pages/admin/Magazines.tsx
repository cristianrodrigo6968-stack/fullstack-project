import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useMesActual } from "../../hooks/useMesActual";
import NavegadorMes from "../../components/NavegadorMes";

const API_URL = import.meta.env.VITE_API_URL;

interface Person { id: number; name: string; }
interface Article { id: number; title: string; authors: Person[]; cliente?: { id: number; nombreCompleto: string | null; ci: string | null; extension: string | null } | null; }
interface ClienteItem { id: number; nombreCompleto: string | null; ci: string | null; extension: string | null; }
interface Edicion {
  id: number; numero: number;
  items: { id: number; titulo: string | null; pedido: { cliente: { nombreCompleto: string | null; nombres: string | null; apellidoPaterno: string | null } } }[];
}
interface Magazine {
  id: number; title: string; director: Person;
  articles: Article[]; notas: string | null;
  cliente: ClienteItem | null; createdAt: string;
  archivoUrl: string | null;
  ediciones: Edicion[];
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
      <div style={{ background: "#1e293b", padding: 32, borderRadius: 16, width: "100%", maxWidth: 360, color: "white", textAlign: "center", border: "1px solid #334155" }}>
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
  const [addingArticle, setAddingArticle] = useState(false);
  const [loadingMags, setLoadingMags] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [title, setTitle] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [notas, setNotas] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [editArticles, setEditArticles] = useState<{ id?: number; author: string; title: string; isNew?: boolean; isDeleted?: boolean; clienteId?: number | null }[]>([{ author: "", title: "", isNew: true, clienteId: null }]);
  const [newAuthor, setNewAuthor] = useState("");
  const [newArticle, setNewArticle] = useState("");
  const [subiendoId, setSubiendoId] = useState<number | null>(null);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const headersAuth = { Authorization: `Bearer ${token}` };

  const showConfirm = (message: string, action: () => void) => { setConfirmMessage(message); setConfirmAction(() => action); setConfirmOpen(true); };

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

  const magazinesMes = filtrarPorMes(magazines);

  const openCreate = () => { setEditId(null); setTitle(""); setDirectorName(""); setNotas(""); setClienteId(""); setEditArticles([{ author: "", title: "", isNew: true, clienteId: null }]); setOpen(true); };

  const openEdit = (m: Magazine) => { setEditId(m.id); setTitle(m.title); setDirectorName(m.director?.name || ""); setNotas(m.notas || ""); setClienteId(m.cliente?.id?.toString() || ""); setEditArticles(m.articles.map(a => ({ id: a.id, author: a.authors[0]?.name || "", title: a.title, isNew: false, isDeleted: false, clienteId: a.cliente?.id ?? null }))); setOpen(true); };

  const addArticleRow = () => setEditArticles([...editArticles, { author: "", title: "", isNew: true, clienteId: null }]);

  const removeArticleRow = (i: number) => { const copy = [...editArticles]; if (copy[i].isNew) copy.splice(i, 1); else copy[i].isDeleted = true; setEditArticles(copy); };

  const restoreArticleRow = (i: number) => { const copy = [...editArticles]; copy[i].isDeleted = false; setEditArticles(copy); };

  const save = async () => {
    if (!title || !directorName) return;
    setSaving(true);
    try {
      if (editId) {
        await fetch(`${API_URL}/magazines/${editId}`, { method: "PUT", headers, body: JSON.stringify({ title, directorName, notas, clienteId: clienteId ? Number(clienteId) : null }) });
        for (const a of editArticles) {
          if (a.isNew && !a.isDeleted && a.title && a.author) await fetch(`${API_URL}/articles`, { method: "POST", headers, body: JSON.stringify({ title: a.title, authorName: a.author, magazineId: editId, clienteId: a.clienteId || null }) });
          else if (!a.isNew && a.isDeleted && a.id) await fetch(`${API_URL}/articles/${a.id}`, { method: "DELETE", headers });
          else if (!a.isNew && !a.isDeleted && a.id) await fetch(`${API_URL}/articles/${a.id}`, { method: "PUT", headers, body: JSON.stringify({ title: a.title, authorName: a.author, clienteId: a.clienteId !== undefined ? (a.clienteId || null) : undefined }) });
        }
      } else {
        const d = await fetch(`${API_URL}/persons`, { method: "POST", headers, body: JSON.stringify({ name: directorName }) }).then(r => r.json());
        const m = await fetch(`${API_URL}/magazines`, { method: "POST", headers, body: JSON.stringify({ title, directorId: d.id, notas, clienteId: clienteId ? Number(clienteId) : null }) }).then(r => r.json());
        for (const a of editArticles) {
          if (!a.title || !a.author) continue;
          await fetch(`${API_URL}/articles`, { method: "POST", headers, body: JSON.stringify({ title: a.title, authorName: a.author, magazineId: m.id, clienteId: a.clienteId || null }) });
        }
      }
      setOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const remove = (m: Magazine) => {
    showConfirm(`¿Eliminar "${m.title}" y todos sus artículos?`, async () => {
      setConfirmOpen(false); setDeletingId(m.id);
      try { await fetch(`${API_URL}/magazines/${m.id}`, { method: "DELETE", headers }); await load(); }
      finally { setDeletingId(null); }
    });
  };

  const addArticleToMag = async () => {
    if (!newAuthor || !newArticle || !selected) return;
    setAddingArticle(true);
    try {
      await fetch(`${API_URL}/articles`, { method: "POST", headers, body: JSON.stringify({ title: newArticle, authorName: newAuthor, magazineId: selected.id }) });
      setNewAuthor(""); setNewArticle("");
      const res = await fetch(`${API_URL}/magazines`, { headers });
      const data = await res.json();
      setMagazines(data);
      setSelected(data.find((m: Magazine) => m.id === selected.id) || null);
    } finally { setAddingArticle(false); }
  };

  const deleteArticle = (aid: number) => {
    showConfirm("¿Eliminar este artículo?", async () => {
      setConfirmOpen(false); setDeletingArticleId(aid);
      try {
        await fetch(`${API_URL}/articles/${aid}`, { method: "DELETE", headers });
        const res = await fetch(`${API_URL}/magazines`, { headers });
        const data = await res.json();
        setMagazines(data);
        setSelected(data.find((m: Magazine) => m.id === selected?.id) || null);
      } finally { setDeletingArticleId(null); }
    });
  };

  const subirArchivo = async (magId: number, file: File) => {
    setSubiendoId(magId);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      await fetch(`${API_URL}/magazines/${magId}/archivo`, { method: "POST", headers: headersAuth, body: formData });
      const res = await fetch(`${API_URL}/magazines`, { headers });
      const data = await res.json();
      setMagazines(data);
      const magActualizada = data.find((m: Magazine) => m.id === magId);
      if (magActualizada) setSelected(magActualizada);
    } finally { setSubiendoId(null); }
  };

  // Participantes (para vista detalle y copiar SENAPI)
  const participantes = selected ? [
    ...(selected.cliente ? [{
      nombre: selected.cliente.nombreCompleto || "",
      ci: selected.cliente.ci || "",
      extension: selected.cliente.extension || "",
    }] : []),
    ...selected.articles
      .filter(a => a.cliente)
      .map(a => ({
        nombre: a.cliente!.nombreCompleto || "",
        ci: a.cliente!.ci || "",
        extension: a.cliente!.extension || "",
      }))
  ] : [];

  const copiarSenapi = () => {
    const texto = participantes.map(p => `${p.nombre} ${p.ci} ${p.extension}`).join("\n");
    navigator.clipboard.writeText(texto);
    alert("📋 Datos copiados para SENAPI");
  };

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {confirmOpen && <ConfirmModal message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />}

      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>📘 Revistas</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>Gestiona las revistas editoriales.</p>

      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} style={btnGray}>← Volver</button>

          <div style={{ background: "#1e293b", padding: isMobile ? 16 : 24, borderRadius: 14, marginTop: 20 }}>
            <h2 style={{ marginBottom: 6, fontSize: isMobile ? 18 : 24 }}>{selected.title}</h2>
            <p style={{ color: "#94a3b8", marginBottom: 4 }}>Director: {selected.director?.name}</p>
            {selected.cliente && <div style={{ display: "inline-block", background: "#312e81", color: "#a78bfa", padding: "3px 12px", borderRadius: 99, fontSize: 12, marginBottom: 12 }}>👤 {selected.cliente.nombreCompleto}</div>}
            {selected.notas && <div style={{ background: "#0f172a", padding: 14, borderRadius: 10, marginBottom: 16, borderLeft: "4px solid #f59e0b" }}><p style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>Notas</p><p style={{ color: "white", fontSize: 14 }}>{selected.notas}</p></div>}

            {/* Participantes y SENAPI */}
            {participantes.length > 0 && (
              <div style={{ background: "#0f172a", padding: 16, borderRadius: 10, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>👥 Participantes</h3>
                  <button onClick={copiarSenapi} style={{ background: "#3b82f6", border: "none", padding: "6px 14px", borderRadius: 8, color: "white", fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>📋 Copiar para SENAPI</button>
                </div>
                {participantes.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 24, marginBottom: 6, color: "#cbd5e1", fontSize: 14 }}>
                    <span style={{ width: 200 }}>{p.nombre}</span>
                    <span style={{ width: 100 }}>CI: {p.ci}</span>
                    <span>Ext: {p.extension}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ediciones */}
            <h3 style={{ marginTop: 20, marginBottom: 12 }}>Ediciones ({selected.ediciones?.length || 0})</h3>
            {selected.ediciones?.length === 0 && <p style={{ color: "#64748b", marginBottom: 16 }}>No hay ediciones generadas.</p>}
            {selected.ediciones?.map(ed => (
              <div key={ed.id} style={{ background: "#0f172a", padding: 14, borderRadius: 10, marginBottom: 10 }}>
                <p style={{ color: "white", fontWeight: "bold" }}>Edición {ed.numero}</p>
                {ed.items.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: 12 }}>Sin artículos asignados.</p>
                ) : (
                  ed.items.map(item => (
                    <div key={item.id} style={{ padding: "4px 0", borderBottom: "1px solid #1e293b", color: "#94a3b8", fontSize: 12 }}>
                      📝 {item.titulo || "Sin título"} — {item.pedido.cliente?.nombreCompleto || [item.pedido.cliente?.nombres, item.pedido.cliente?.apellidoPaterno].filter(Boolean).join(" ") || "Autor desconocido"}
                    </div>
                  ))
                )}
              </div>
            ))}

            {/* Archivo */}
            <div style={{ background: "#0f172a", padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <p style={{ color: "#64748b", fontSize: 12, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>📎 Archivo de la Revista</p>
              {selected.archivoUrl ? (
                <div>
                  <p style={{ color: "#22c55e", fontSize: 13, marginBottom: 8 }}>✅ Archivo subido</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={selected.archivoUrl} target="_blank" rel="noreferrer" style={{ background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 13, textDecoration: "none" }}>📥 Descargar</a>
                    <label style={{ background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>
                      🔄 Reemplazar
                      <input type="file" accept=".pdf,.pub,.docx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(selected.id, f); }} />
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>Sin archivo final todavía.</p>
                  <label style={{ background: "#3b82f6", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {subiendoId === selected.id ? <><Spinner /> Subiendo...</> : "📤 Subir archivo"}
                    <input type="file" accept=".pdf,.pub,.docx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(selected.id, f); }} />
                  </label>
                </div>
              )}
            </div>

            <h3 style={{ marginTop: 20, marginBottom: 12 }}>Artículos</h3>
            {selected.articles.length === 0 && <p style={{ color: "#64748b", marginBottom: 16 }}>No hay artículos aún.</p>}
            {selected.articles.map(a => (
              <div key={a.id} style={{ background: "#0f172a", padding: 14, borderRadius: 10, marginBottom: 10, display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 10 : 0 }}>
                <div>
                  <p style={{ color: "white", fontWeight: "bold" }}>{a.title}</p>
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>{a.authors.map(x => x.name).join(", ")}</p>
                  {a.cliente && <p style={{ color: "#60a5fa", fontSize: 12 }}>👤 {a.cliente.nombreCompleto} · CI {a.cliente.ci}</p>}
                </div>
                <button onClick={() => deleteArticle(a.id)} disabled={deletingArticleId === a.id} style={{ ...btnRed, display: "flex", alignItems: "center", gap: 6, minWidth: 100, justifyContent: "center", opacity: deletingArticleId === a.id ? 0.7 : 1 }}>
                  {deletingArticleId === a.id ? <Spinner /> : "🗑 Eliminar"}
                </button>
              </div>
            ))}

            <h4 style={{ marginTop: 24, marginBottom: 10 }}>Agregar artículo</h4>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, alignItems: isMobile ? "stretch" : "center" }}>
              <input placeholder="Autor" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} style={inputStyle} />
              <input placeholder="Título del artículo" value={newArticle} onChange={e => setNewArticle(e.target.value)} style={inputStyle} />
              <button onClick={addArticleToMag} disabled={addingArticle} style={{ ...btnBlue, display: "flex", alignItems: "center", gap: 8, opacity: addingArticle ? 0.7 : 1, minWidth: 110, justifyContent: "center" }}>
                {addingArticle ? <Spinner /> : "➕ Agregar"}
              </button>
            </div>
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
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
              {magazinesMes.map(m => (
                <div key={m.id} style={{ background: "#1e293b", padding: 20, borderRadius: 12, borderLeft: "4px solid #3b82f6" }}>
                  <h3 style={{ marginBottom: 6, fontSize: isMobile ? 15 : 17 }}>{m.title}</h3>
                  <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>Director: {m.director?.name}</p>
                  {m.cliente && <p style={{ color: "#a78bfa", fontSize: 12, marginBottom: 4 }}>👤 {m.cliente.nombreCompleto}</p>}
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>{m.articles.length} artículo(s)</p>
                  {m.notas && <p style={{ color: "#f59e0b", fontSize: 12, marginBottom: 8, background: "#422006", padding: "4px 10px", borderRadius: 6 }}>📝 {m.notas.length > 50 ? m.notas.substring(0, 50) + "..." : m.notas}</p>}

                  {/* Archivo en tarjeta */}
                  <div style={{ background: "#0f172a", padding: 10, borderRadius: 8, marginBottom: 10 }}>
                    {m.archivoUrl ? (
                      <div>
                        <p style={{ color: "#22c55e", fontSize: 12, marginBottom: 8 }}>✅ Archivo subido</p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <a href={m.archivoUrl?.replace("/upload/", "/upload/fl_attachment/")} target="_blank" rel="noreferrer" style={{ background: "#22c55e", border: "none", padding: "5px 10px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 11, textDecoration: "none" }}>📥 Descargar</a>
                          <label style={{ background: "#334155", border: "none", padding: "5px 10px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 11 }}>
                            🔄 Reemplazar
                            <input type="file" accept=".pdf,.pub,.docx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(m.id, f); }} />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label style={{ background: "#3b82f6", border: "none", padding: "5px 10px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {subiendoId === m.id ? <><Spinner /> Subiendo...</> : "📤 Subir archivo"}
                        <input type="file" accept=".pdf,.pub,.docx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(m.id, f); }} />
                      </label>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setSelected(m)} style={btnBlue}>Ver</button>
                    <button onClick={() => openEdit(m)} style={btnYellow}>Editar</button>
                    <button onClick={() => remove(m)} disabled={deletingId === m.id} style={{ ...btnRed, display: "flex", alignItems: "center", gap: 6, minWidth: 50, justifyContent: "center", opacity: deletingId === m.id ? 0.7 : 1 }}>
                      {deletingId === m.id ? <Spinner /> : "🗑"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999, padding: "20px" }}>
          <div style={{ background: "#1e293b", padding: isMobile ? 20 : 28, borderRadius: 14, width: "100%", maxWidth: 700, color: "white", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: 16 }}>{editId ? "Editar revista" : "Crear revista"}</h3>

            <label style={labelStyle}>Título</label>
            <input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Director (seleccionar cliente)</label>
            <select
              value={clienteId}
              onChange={e => {
                const val = e.target.value;
                setClienteId(val);
                if (val) {
                  const c = clientes.find(c => c.id.toString() === val);
                  setDirectorName(c?.nombreCompleto || "");
                } else {
                  setDirectorName("");
                }
              }}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">-- Sin vincular --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombreCompleto || "Sin nombre"} {c.ci ? `· CI ${c.ci}` : ""}
                </option>
              ))}
            </select>

            {!clienteId && (
              <>
                <label style={labelStyle}>Nombre del director (manual)</label>
                <input
                  placeholder="Nombre del director"
                  value={directorName}
                  onChange={e => setDirectorName(e.target.value)}
                  style={inputStyle}
                />
              </>
            )}
            {clienteId && (
              <div style={{ background: "#0f172a", padding: "10px 12px", borderRadius: 8, marginBottom: 10 }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>
                  Director vinculado: <strong style={{ color: "white" }}>{directorName}</strong>
                </span>
              </div>
            )}

            <label style={labelStyle}>Notas (opcional)</label>
            <textarea placeholder="Notas sobre esta revista..." value={notas} onChange={e => setNotas(e.target.value)} rows={3} style={{ ...inputStyle, resize: "none" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 10px" }}>
              <label style={labelStyle}>Artículos</label>
              <button onClick={addArticleRow} style={btnGray}>➕ Añadir</button>
            </div>

            {editArticles.map((a, i) => (
              !a.isDeleted ? (
                <div key={i} style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 8, marginBottom: 8, alignItems: isMobile ? "stretch" : "center" }}>
                  {/* Selector de cliente (autor) */}
                  <select
                    value={a.clienteId ?? ""}
                    onChange={e => {
                      const val = e.target.value;
                      const copy = [...editArticles];
                      if (val === "") {
                        copy[i].clienteId = null;
                        copy[i].author = "";
                      } else {
                        const cliente = clientes.find(c => c.id === Number(val));
                        copy[i].clienteId = Number(val);
                        copy[i].author = cliente?.nombreCompleto || "";
                      }
                      setEditArticles(copy);
                    }}
                    style={{ ...inputStyle, marginBottom: 0, flex: 1, cursor: "pointer" }}
                  >
                    <option value="">-- Cliente (autor) --</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombreCompleto || "Sin nombre"} {c.ci ? `· CI ${c.ci}` : ""}
                      </option>
                    ))}
                  </select>

                  {/* Si no hay cliente, mostrar campo para autor manual */}
                  {!a.clienteId && (
                    <input
                      placeholder="Autor"
                      value={a.author}
                      onChange={e => { const copy = [...editArticles]; copy[i].author = e.target.value; setEditArticles(copy); }}
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                  )}
                  {/* Si hay cliente, mostrar nombre en modo solo lectura */}
                  {a.clienteId && (
                    <div style={{ ...inputStyle, marginBottom: 0, flex: 1, background: "#1e293b", display: "flex", alignItems: "center", padding: "0 10px" }}>
                      <span style={{ color: "#cbd5e1", fontSize: 14 }}>{a.author}</span>
                    </div>
                  )}

                  <input
                    placeholder="Título artículo"
                    value={a.title}
                    onChange={e => { const copy = [...editArticles]; copy[i].title = e.target.value; setEditArticles(copy); }}
                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                  />
                  <button onClick={() => removeArticleRow(i)} style={{ background: "#ef4444", border: "none", borderRadius: 8, color: "white", cursor: "pointer", padding: "8px 12px", fontWeight: "bold", flexShrink: 0 }}>✕</button>
                </div>
              ) : (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8, border: "1px dashed #ef4444" }}>
                  <p style={{ flex: 1, color: "#64748b", fontSize: 13, textDecoration: "line-through" }}>{a.title} — {a.author}</p>
                  <button onClick={() => restoreArticleRow(i)} style={{ background: "#334155", border: "none", borderRadius: 8, color: "white", cursor: "pointer", padding: "6px 12px", fontSize: 12 }}>Restaurar</button>
                </div>
              )
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={save} disabled={saving} style={{ ...btnBlue, display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1, minWidth: 110, justifyContent: "center", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? <Spinner /> : "💾 Guardar"}
              </button>
              <button onClick={() => setOpen(false)} style={btnRed}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: "none", background: "#334155", color: "white", fontSize: 14, boxSizing: "border-box" };
const btnBlue: React.CSSProperties = { background: "#3b82f6", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnRed: React.CSSProperties = { background: "#ef4444", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnYellow: React.CSSProperties = { background: "#f59e0b", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };

export default Magazines;