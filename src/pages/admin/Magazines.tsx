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

// Función auxiliar para construir el objeto JSON de SENAPI
const buildSenapiJSON = (cliente: ClienteItem): object => {
  return {
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
  };
};

function EdicionCard({
  ed,
  selected,
  clientes,
  headers,
  headersAuth,
  onRefresh,
}: {
  ed: EdicionItem;
  selected: Magazine;
  clientes: ClienteItem[];
  headers: Record<string, string>;
  headersAuth: Record<string, string>;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [subiendoId, setSubiendoId] = useState<number | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [nuevoClienteId, setNuevoClienteId] = useState("");
  const [nuevoTitulo, setNuevoTitulo] = useState("");

  const NOMBRES = ["PRIMERA", "SEGUNDA", "TERCERA"];
  const numeroTexto = NOMBRES[ed.numero - 1] || `N° ${ed.numero}`;
  const articles = ed.articles ?? [];

  const subirArchivo = async (file: File) => {
    setSubiendoId(ed.id);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      await fetch(`${API_URL}/ediciones/${ed.id}/archivo`, {
        method: "POST",
        headers: headersAuth,
        body: formData,
      });
      onRefresh();
    } finally {
      setSubiendoId(null);
    }
  };

  const agregarAutor = async () => {
    if (!nuevoClienteId || !nuevoTitulo) return;
    setAdding(true);
    const cliente = clientes.find(c => c.id === Number(nuevoClienteId));
    await fetch(`${API_URL}/articles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: nuevoTitulo,
        authorName: cliente?.nombreCompleto || "",
        magazineId: selected.id,
        clienteId: Number(nuevoClienteId),
        edicionId: ed.id,
      }),
    });
    setNuevoClienteId("");
    setNuevoTitulo("");
    setAdding(false);
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
      background: "#0f172a",
      borderRadius: 12,
      marginBottom: 14,
      border: open ? "1px solid #3b82f6" : "1px solid #1e293b",
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", background: "transparent", border: "none",
          padding: "14px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", cursor: "pointer", color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            background: open ? "#3b82f6" : "#334155", color: "white",
            borderRadius: 6, padding: "2px 10px", fontSize: 11,
            fontWeight: "bold", textTransform: "uppercase", transition: "background 0.2s",
          }}>
            {numeroTexto} EDICIÓN
          </span>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>
            {articles.length} autor{articles.length !== 1 ? "es" : ""}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ed.archivoUrl ? (
            <>
              <a
                href={ed.archivoUrl.replace("/upload/", "/upload/fl_attachment/")}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  background: "#22c55e", padding: "4px 10px", borderRadius: 6,
                  color: "white", fontWeight: "bold", fontSize: 11, textDecoration: "none",
                }}
              >
                📥
              </a>
              <label
                onClick={e => e.stopPropagation()}
                style={{ background: "#334155", padding: "4px 10px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 11 }}
              >
                🔄
                <input type="file" accept=".pdf,.pub,.docx" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f); }} />
              </label>
            </>
          ) : (
            <label
              onClick={e => e.stopPropagation()}
              style={{ background: "#3b82f6", padding: "4px 10px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              {subiendoId === ed.id ? <Spinner /> : "📤 Subir"}
              <input type="file" accept=".pdf,.pub,.docx" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f); }} />
            </label>
          )}
          <span style={{
            fontSize: 16, color: "#94a3b8",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s", display: "inline-block",
          }}>
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e293b" }}>
          {/* Director con botón copiar JSON */}
          <div style={{
            background: "#1e293b", padding: 12, borderRadius: 8,
            marginTop: 12, marginBottom: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <p style={{ color: "#64748b", fontSize: 11, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Director
              </p>
              {selected.cliente ? (
                <p style={{ color: "white", fontWeight: "bold", margin: 0 }}>
                  {selected.cliente.nombreCompleto} · CI {selected.cliente.ci} · {selected.cliente.extension}
                </p>
              ) : (
                <p style={{ color: "#64748b", margin: 0 }}>Sin director vinculado</p>
              )}
            </div>
            {selected.cliente && (
              <button
                onClick={() => {
                  const obj = buildSenapiJSON(selected.cliente!);
                  navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
                  alert("📋 Datos del director copiados en formato JSON");
                }}
                title="Copiar datos del director"
                style={{
                  background: "#6366f1", border: "none", padding: "6px 10px",
                  borderRadius: 6, color: "white", cursor: "pointer",
                  fontSize: 13, fontWeight: "bold",
                }}
              >
                📋
              </button>
            )}
          </div>

          {articles.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 14 }}>Sin autores asignados.</p>
          ) : (
            <div style={{ marginTop: 12 }}>
              {articles.map((article, idx) => (
                <div
                  key={article.id}
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "10px 0",
                    borderBottom: idx < articles.length - 1 ? "1px solid #1e293b" : "none",
                  }}
                >
                  <div>
                    <span style={{ color: "#e2e8f0", fontSize: 14 }}>
                      📝 {article.title}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 8 }}>
                      — {article.authors.map(a => a.name).join(", ")}
                    </span>
                    {article.cliente?.ci && (
                      <span style={{ color: "#60a5fa", fontSize: 11, marginLeft: 8 }}>
                        · CI {article.cliente.ci}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {article.cliente && (
                      <button
                        onClick={() => {
                          const obj = buildSenapiJSON(article.cliente!);
                          navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
                          alert("📋 Datos del autor copiados en formato JSON");
                        }}
                        title="Copiar datos para SENAPI"
                        style={{
                          background: "#6366f1", border: "none",
                          padding: "3px 8px", borderRadius: 6,
                          color: "white", cursor: "pointer", fontSize: 12,
                        }}
                      >
                        📋
                      </button>
                    )}
                    <button
                      onClick={() => eliminarAutor(article.id)}
                      disabled={deletingArticleId === article.id}
                      style={{ ...btnRed, fontSize: 11, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {deletingArticleId === article.id ? <Spinner /> : "🗑"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: 14, background: "#1e293b", borderRadius: 8,
            padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
          }}>
            <select
              value={nuevoClienteId}
              onChange={e => setNuevoClienteId(e.target.value)}
              style={{ ...inputStyle, flex: "1 1 160px", marginBottom: 0 }}
            >
              <option value="">— Cliente (autor) —</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombreCompleto || "Sin nombre"}{c.ci ? ` · ${c.ci}` : ""}
                </option>
              ))}
            </select>
            <input
              placeholder="Título del artículo"
              value={nuevoTitulo}
              onChange={e => setNuevoTitulo(e.target.value)}
              style={{ ...inputStyle, flex: "2 1 180px", marginBottom: 0 }}
            />
            <button
              onClick={agregarAutor}
              disabled={adding || !nuevoClienteId || !nuevoTitulo}
              style={{
                ...btnBlue,
                opacity: (!nuevoClienteId || !nuevoTitulo) ? 0.5 : 1,
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
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
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
          method: "PUT",
          headers,
          body: JSON.stringify({ title, directorName, notas, clienteId: clienteId ? Number(clienteId) : null }),
        });
      } else {
        const d = await fetch(`${API_URL}/persons`, {
          method: "POST", headers,
          body: JSON.stringify({ name: directorName }),
        }).then(r => r.json());
        await fetch(`${API_URL}/magazines`, {
          method: "POST", headers,
          body: JSON.stringify({ title, directorId: d.id, notas, clienteId: clienteId ? Number(clienteId) : null }),
        });
      }
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = (m: Magazine) => {
    showConfirm(`¿Eliminar "${m.title}" y todos sus artículos?`, async () => {
      setConfirmOpen(false);
      setDeletingId(m.id);
      try { await fetch(`${API_URL}/magazines/${m.id}`, { method: "DELETE", headers }); await load(); }
      finally { setDeletingId(null); }
    });
  };

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {confirmOpen && (
        <ConfirmModal message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />
      )}

      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>📘 Revistas</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Gestiona las revistas editoriales.
      </p>

      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} style={btnGray}>← Volver</button>

          <div style={{ background: "#1e293b", padding: isMobile ? 16 : 24, borderRadius: 14, marginTop: 20 }}>
            <h2 style={{ marginBottom: 6, fontSize: isMobile ? 18 : 24 }}>{selected.title}</h2>
            <p style={{ color: "#94a3b8", marginBottom: 4 }}>Director: {selected.director?.name}</p>

            {selected.cliente && (
              <div style={{ display: "inline-block", background: "#312e81", color: "#a78bfa", padding: "3px 12px", borderRadius: 99, fontSize: 12, marginBottom: 12 }}>
                👤 {selected.cliente.nombreCompleto}
              </div>
            )}

            {selected.notas && (
              <div style={{ background: "#0f172a", padding: 14, borderRadius: 10, marginBottom: 20, borderLeft: "4px solid #f59e0b" }}>
                <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>Notas</p>
                <p style={{ color: "white", fontSize: 14, margin: 0 }}>{selected.notas}</p>
              </div>
            )}

            <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Ediciones — clic para ver autores
            </p>

            {selected.ediciones?.length === 0 && (
              <p style={{ color: "#64748b", fontSize: 13 }}>Sin ediciones registradas.</p>
            )}

            {selected.ediciones?.map(ed => (
              <EdicionCard
                key={ed.id}
                ed={ed}
                selected={selected}
                clientes={clientes}
                headers={headers}
                headersAuth={headersAuth}
                onRefresh={refreshSelected}
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
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
              {magazinesMes.map(m => (
                <div key={m.id} style={{ background: "#1e293b", padding: 20, borderRadius: 12, borderLeft: "4px solid #3b82f6" }}>
                  <h3 style={{ marginBottom: 6, fontSize: isMobile ? 15 : 17 }}>{m.title}</h3>
                  <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>Director: {m.director?.name}</p>
                  {m.cliente && <p style={{ color: "#a78bfa", fontSize: 12, marginBottom: 4 }}>👤 {m.cliente.nombreCompleto}</p>}
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>{m.articles.length} artículo(s) total</p>
                  {m.notas && (
                    <p style={{ color: "#f59e0b", fontSize: 12, marginBottom: 8, background: "#422006", padding: "4px 10px", borderRadius: 6 }}>
                      📝 {m.notas.length > 50 ? m.notas.substring(0, 50) + "..." : m.notas}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => selectMagazine(m)} style={btnBlue}>Ver</button>
                    <button onClick={() => openEdit(m)} style={btnYellow}>Editar</button>
                    <button
                      onClick={() => remove(m)}
                      disabled={deletingId === m.id}
                      style={{ ...btnRed, display: "flex", alignItems: "center", gap: 6, minWidth: 50, justifyContent: "center", opacity: deletingId === m.id ? 0.7 : 1 }}
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

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999, padding: "20px" }}>
          <div style={{ background: "#1e293b", padding: isMobile ? 20 : 28, borderRadius: 14, width: "100%", maxWidth: 500, color: "white", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: 16 }}>{editId ? "Editar revista" : "Crear revista"}</h3>

            <label style={labelStyle}>Título</label>
            <input placeholder="Título de la revista" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />

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
                <input placeholder="Nombre del director" value={directorName} onChange={e => setDirectorName(e.target.value)} style={inputStyle} />
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

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={save} disabled={saving}
                style={{ ...btnBlue, display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1, minWidth: 110, justifyContent: "center", cursor: saving ? "not-allowed" : "pointer" }}
              >
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