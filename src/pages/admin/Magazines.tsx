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
  cliente?: { id: number; nombreCompleto: string | null; ci: string | null; extension: string | null } | null;
  edicion?: { id: number; numero: number } | null;
}
interface ClienteItem { id: number; nombreCompleto: string | null; ci: string | null; extension: string | null; }
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
  const [subiendoId, setSubiendoId] = useState<number | null>(null);

  // Modal para editar edición
  const [edicionModalOpen, setEdicionModalOpen] = useState(false);
  const [edicionModalId, setEdicionModalId] = useState<number | null>(null);
  const [edicionModalNumero, setEdicionModalNumero] = useState(1);
  const [edicionModalClienteId, setEdicionModalClienteId] = useState("");
  const [edicionModalTitulo, setEdicionModalTitulo] = useState("");
  const [edicionModalAdding, setEdicionModalAdding] = useState(false);
  const [edicionModalDeletingId, setEdicionModalDeletingId] = useState<number | null>(null);

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

  const openCreate = () => {
    setEditId(null);
    setTitle("");
    setDirectorName("");
    setNotas("");
    setClienteId("");
    setOpen(true);
  };

  const openEdit = (m: Magazine) => {
    setEditId(m.id);
    setTitle(m.title);
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
          method: "POST",
          headers,
          body: JSON.stringify({ name: directorName }),
        }).then(r => r.json());
        await fetch(`${API_URL}/magazines`, {
          method: "POST",
          headers,
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

  const subirArchivoEdicion = async (edicionId: number, file: File) => {
    setSubiendoId(edicionId);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      await fetch(`${API_URL}/ediciones/${edicionId}/archivo`, {
        method: "POST",
        headers: headersAuth,
        body: formData,
      });
      if (selected) {
        const res = await fetch(`${API_URL}/magazines/${selected.id}`, { headers });
        if (res.ok) setSelected(await res.json());
      }
    } finally {
      setSubiendoId(null);
    }
  };

  const abrirEdicionModal = (edicionId: number, numero: number) => {
    setEdicionModalId(edicionId);
    setEdicionModalNumero(numero);
    setEdicionModalOpen(true);
  };

  const cerrarEdicionModal = () => {
    setEdicionModalOpen(false);
    setEdicionModalId(null);
    setEdicionModalClienteId("");
    setEdicionModalTitulo("");
  };

  const agregarAutorAEdicion = async () => {
    if (!edicionModalClienteId || !edicionModalTitulo || !edicionModalId || !selected) return;
    setEdicionModalAdding(true);
    const cliente = clientes.find(c => c.id === Number(edicionModalClienteId));
    await fetch(`${API_URL}/articles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: edicionModalTitulo,
        authorName: cliente?.nombreCompleto || "",
        magazineId: selected.id,
        clienteId: Number(edicionModalClienteId),
        edicionId: edicionModalId,
      }),
    });
    setEdicionModalClienteId("");
    setEdicionModalTitulo("");
    setEdicionModalAdding(false);
    const res = await fetch(`${API_URL}/magazines/${selected.id}`, { headers });
    if (res.ok) setSelected(await res.json());
  };

  const eliminarAutorDeEdicion = async (articleId: number) => {
    setEdicionModalDeletingId(articleId);
    await fetch(`${API_URL}/articles/${articleId}`, { method: "DELETE", headers });
    setEdicionModalDeletingId(null);
    if (selected) {
      const res = await fetch(`${API_URL}/magazines/${selected.id}`, { headers });
      if (res.ok) setSelected(await res.json());
    }
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
            {selected.cliente && (
              <div style={{ display: "inline-block", background: "#312e81", color: "#a78bfa", padding: "3px 12px", borderRadius: 99, fontSize: 12, marginBottom: 12 }}>
                👤 {selected.cliente.nombreCompleto}
              </div>
            )}
            {selected.notas && (
              <div style={{ background: "#0f172a", padding: 14, borderRadius: 10, marginBottom: 16, borderLeft: "4px solid #f59e0b" }}>
                <p style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>Notas</p>
                <p style={{ color: "white", fontSize: 14 }}>{selected.notas}</p>
              </div>
            )}

            {/* Ediciones */}
            {selected.ediciones?.map(ed => {
              const numeroTexto = ["PRIMERA", "SEGUNDA", "TERCERA"][ed.numero - 1] || `N° ${ed.numero}`;

              return (
                <div key={ed.id} style={{ background: "#0f172a", padding: 16, borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, color: "white", fontSize: 16, textTransform: "uppercase" }}>
                      {numeroTexto} EDICIÓN
                    </h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      {ed.archivoUrl ? (
                        <>
                          <a
                            href={ed.archivoUrl?.replace("/upload/", "/upload/fl_attachment/")}
                            target="_blank" rel="noreferrer"
                            style={{
                              background: "#22c55e", border: "none", padding: "4px 10px", borderRadius: 6,
                              color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 11,
                              textDecoration: "none",
                            }}
                          >
                            📥 Descargar
                          </a>
                          <label style={{
                            background: "#334155", border: "none", padding: "4px 10px", borderRadius: 6,
                            color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 11,
                          }}>
                            🔄
                            <input
                              type="file" accept=".pdf,.pub,.docx"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) subirArchivoEdicion(ed.id, f);
                              }}
                            />
                          </label>
                        </>
                      ) : (
                        <label style={{
                          background: "#3b82f6", border: "none", padding: "4px 10px", borderRadius: 6,
                          color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 11,
                          display: "inline-flex", alignItems: "center", gap: 4,
                        }}>
                          {subiendoId === ed.id ? <Spinner /> : "📤 Subir"}
                          <input
                            type="file" accept=".pdf,.pub,.docx"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) subirArchivoEdicion(ed.id, f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => abrirEdicionModal(ed.id, ed.numero)}
                    style={{ ...btnGray, marginTop: 12, fontSize: 12, padding: "6px 12px" }}
                  >
                    ✏️ Editar
                  </button>
                </div>
              );
            })}
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
                  {m.notas && <p style={{ color: "#f59e0b", fontSize: 12, marginBottom: 8, background: "#422006", padding: "4px 10px", borderRadius: 6 }}>📝 {m.notas.length > 50 ? m.notas.substring(0, 50) + "..." : m.notas}</p>}

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

      {/* Modal crear/editar revista */}
      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 999, padding: "20px",
        }}>
          <div style={{
            background: "#1e293b", padding: isMobile ? 20 : 28,
            borderRadius: 14, width: "100%", maxWidth: 500,
            color: "white", maxHeight: "85vh", overflowY: "auto",
          }}>
            <h3 style={{ marginBottom: 16 }}>
              {editId ? "Editar revista" : "Crear revista"}
            </h3>

            <label style={labelStyle}>Título</label>
            <input
              placeholder="Título de la revista"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={inputStyle}
            />

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
              <div style={{
                background: "#0f172a", padding: "10px 12px",
                borderRadius: 8, marginBottom: 10,
              }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>
                  Director vinculado: <strong style={{ color: "white" }}>{directorName}</strong>
                </span>
              </div>
            )}

            <label style={labelStyle}>Notas (opcional)</label>
            <textarea
              placeholder="Notas sobre esta revista..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  ...btnBlue, display: "flex", alignItems: "center", gap: 8,
                  opacity: saving ? 0.7 : 1, minWidth: 110, justifyContent: "center",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? <Spinner /> : "💾 Guardar"}
              </button>
              <button onClick={() => setOpen(false)} style={btnRed}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar edición */}
      {edicionModalOpen && selected && edicionModalId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 9999, padding: "20px",
        }}>
          <div style={{
            background: "#1e293b", padding: 28, borderRadius: 16,
            width: "100%", maxWidth: 700, maxHeight: "85vh",
            overflowY: "auto", color: "white",
          }}>
            <h2 style={{ marginBottom: 6 }}>
              {selected.title} — {["PRIMERA", "SEGUNDA", "TERCERA"][edicionModalNumero - 1]} EDICIÓN
            </h2>

            <div style={{ background: "#0f172a", padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <p style={{ color: "#64748b", fontSize: 11, marginBottom: 6, textTransform: "uppercase" }}>Director</p>
              {selected.cliente ? (
                <p style={{ color: "white", fontWeight: "bold" }}>
                  {selected.cliente.nombreCompleto} · CI {selected.cliente.ci} · {selected.cliente.extension}
                </p>
              ) : (
                <p style={{ color: "#64748b" }}>Sin director vinculado</p>
              )}
            </div>

            <div style={{ background: "#0f172a", padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <h3 style={{ color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Autores</h3>

              {selected.ediciones?.find(e => e.id === edicionModalId)?.articles?.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 13 }}>Sin autores asignados.</p>
              ) : (
                selected.ediciones?.find(e => e.id === edicionModalId)?.articles?.map(article => (
                  <div key={article.id} style={{
                    padding: "8px 0", borderBottom: "1px solid #1e293b",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <span style={{ color: "#cbd5e1", fontSize: 13 }}>📝 {article.title}</span>
                      <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 8 }}>
                        — {article.authors.map(a => a.name).join(", ")}
                      </span>
                      {article.cliente && (
                        <span style={{ color: "#60a5fa", fontSize: 11, marginLeft: 8 }}>
                          · CI {article.cliente.ci}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => eliminarAutorDeEdicion(article.id)}
                      disabled={edicionModalDeletingId === article.id}
                      style={{
                        ...btnRed, fontSize: 11, padding: "3px 8px",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      {edicionModalDeletingId === article.id ? <Spinner /> : "🗑"}
                    </button>
                  </div>
                ))
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <select
                  value={edicionModalClienteId}
                  onChange={e => setEdicionModalClienteId(e.target.value)}
                  style={{ ...inputStyle, flex: 1, marginBottom: 0, cursor: "pointer" }}
                >
                  <option value="">-- Cliente (autor) --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombreCompleto || "Sin nombre"} {c.ci ? `· CI ${c.ci}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Título del artículo"
                  value={edicionModalTitulo}
                  onChange={e => setEdicionModalTitulo(e.target.value)}
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                />
                <button
                  onClick={agregarAutorAEdicion}
                  disabled={edicionModalAdding || !edicionModalClienteId || !edicionModalTitulo}
                  style={{
                    ...btnBlue,
                    opacity: (!edicionModalClienteId || !edicionModalTitulo) ? 0.5 : 1,
                    cursor: (!edicionModalClienteId || !edicionModalTitulo) ? "not-allowed" : "pointer",
                  }}
                >
                  {edicionModalAdding ? <Spinner /> : "➕"}
                </button>
              </div>
            </div>

            <button onClick={cerrarEdicionModal} style={btnGray}>Cerrar</button>
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