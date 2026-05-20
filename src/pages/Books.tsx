import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";
import { useMesActual } from "../hooks/useMesActual";
import NavegadorMes from "../components/NavegadorMes";

const API_URL = import.meta.env.VITE_API_URL;

interface Person { id: number; name: string; }
interface Cliente { id: number; nombreCompleto: string | null; }
interface Book {
  id: number; title: string; author: Person;
  notas: string | null; cliente: Cliente | null;
  createdAt: string; archivoUrl: string | null;
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

function Books() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const { mesLabel, anio, anterior, siguiente, esActual, filtrarPorMes } = useMesActual();
  const [books, setBooks] = useState<Book[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [notas, setNotas] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [subiendoId, setSubiendoId] = useState<number | null>(null);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const headersAuth = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    const [bRes, cRes] = await Promise.all([
      fetch(`${API_URL}/books`, { headers }),
      fetch(`${API_URL}/clients`, { headers }),
    ]);
    setBooks(await bRes.json());
    setClientes(await cRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const booksMes = filtrarPorMes(books);

  const showConfirm = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const openCreate = () => { setEditId(null); setTitle(""); setAuthorName(""); setNotas(""); setClienteId(""); setOpen(true); };

  const openEdit = (b: Book) => { setEditId(b.id); setTitle(b.title); setAuthorName(b.author?.name || ""); setNotas(b.notas || ""); setClienteId(b.cliente?.id?.toString() || ""); setOpen(true); };

  const save = async () => {
    if (!title || !authorName) return;
    setSaving(true);
    try {
      if (editId) {
        await fetch(`${API_URL}/books/${editId}`, { method: "PUT", headers, body: JSON.stringify({ title, authorName, notas, clienteId: clienteId ? Number(clienteId) : null }) });
      } else {
        await fetch(`${API_URL}/books`, { method: "POST", headers, body: JSON.stringify({ title, authorName, notas, clienteId: clienteId ? Number(clienteId) : null }) });
      }
      setOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const remove = (b: Book) => {
    showConfirm(`¿Eliminar el libro "${b.title}"?`, async () => {
      setConfirmOpen(false); setDeletingId(b.id);
      try { await fetch(`${API_URL}/books/${b.id}`, { method: "DELETE", headers }); await load(); }
      finally { setDeletingId(null); }
    });
  };

  const subirArchivo = async (bookId: number, file: File) => {
    setSubiendoId(bookId);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      await fetch(`${API_URL}/books/${bookId}/archivo`, {
        method: "POST",
        headers: headersAuth,
        body: formData,
      });
      await load();
    } finally {
      setSubiendoId(null);
    }
  };

  const clientesLibros = clientes.filter((c: any) => c.pideLibros);

  return (
    <div>
      {confirmOpen && <ConfirmModal message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />}

      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>📚 Libros</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>Gestiona los libros editoriales.</p>

      <button onClick={openCreate} style={{ ...btnBlue, marginBottom: 24 }}>➕ Crear libro</button>

      <NavegadorMes mesLabel={mesLabel} anio={anio} onAnterior={anterior} onSiguiente={siguiente} esActual={esActual()} />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}><Spinner /></div>
      ) : booksMes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#64748b", fontSize: 16 }}>No hay libros en {mesLabel} {anio}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {booksMes.map(b => (
            <div key={b.id} style={{ background: "#1e293b", padding: 20, borderRadius: 12, borderLeft: "4px solid #22c55e" }}>
              <h3 style={{ marginBottom: 6, fontSize: isMobile ? 15 : 17 }}>📘 {b.title}</h3>
              <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>✍ {b.author?.name}</p>
              {b.cliente && <p style={{ color: "#a78bfa", fontSize: 12, marginBottom: 4 }}>👤 {b.cliente.nombreCompleto}</p>}
              {b.notas && (
                <p style={{ color: "#f59e0b", fontSize: 12, marginBottom: 12, background: "#422006", padding: "4px 10px", borderRadius: 6, marginTop: 4 }}>
                  📝 {b.notas.length > 50 ? b.notas.substring(0, 50) + "..." : b.notas}
                </p>
              )}

             {/* ARCHIVO */}
<div style={{ marginTop: 12, padding: 12, background: "#0f172a", borderRadius: 8 }}>
  {b.archivoUrl ? (
    <div>
      <p style={{ color: "#22c55e", fontSize: 12, marginBottom: 8 }}>✅ Archivo subido</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a 
          href={b.archivoUrl?.replace("/upload/", "/upload/fl_attachment/")} 
          target="_blank" 
          rel="noreferrer"
          style={{ background: "#22c55e", border: "none", padding: "6px 12px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 12, textDecoration: "none" }}
        >
          📥 Descargar
        </a>

        <label style={{ background: "#334155", border: "none", padding: "6px 12px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 12 }}>
          🔄 Reemplazar
          <input 
            type="file" 
            accept=".pdf,.pub,.docx" 
            style={{ display: "none" }}
            onChange={(e) => { 
              const f = e.target.files?.[0]; 
              if (f) subirArchivo(b.id, f); 
            }} 
          />
        </label>
      </div>
    </div>
  ) : (
    <div>
      <p style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>📎 Sin archivo final</p>
      <label style={{ background: "#3b82f6", border: "none", padding: "6px 12px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
        {subiendoId === b.id ? <><Spinner /> Subiendo...</> : "📤 Subir archivo"}
        <input 
          type="file" 
          accept=".pdf,.pub,.docx" 
          style={{ display: "none" }}
          onChange={(e) => { 
            const f = e.target.files?.[0]; 
            if (f) subirArchivo(b.id, f); 
          }} 
        />
      </label>
    </div>
  )}
</div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => openEdit(b)} style={btnYellow}>✏ Editar</button>
                <button onClick={() => remove(b)} disabled={deletingId === b.id} style={{ ...btnRed, display: "flex", alignItems: "center", gap: 6, minWidth: 50, justifyContent: "center", opacity: deletingId === b.id ? 0.7 : 1 }}>
                  {deletingId === b.id ? <Spinner /> : "🗑"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999, padding: "20px" }}>
          <div style={{ background: "#1e293b", padding: isMobile ? 20 : 28, borderRadius: 14, width: "100%", maxWidth: 460, color: "white", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: 16 }}>{editId ? "Editar libro" : "Crear libro"}</h3>

            <label style={labelStyle}>Título</label>
            <input placeholder="Título del libro" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Autor</label>
            <input placeholder="Nombre del autor" value={authorName} onChange={e => setAuthorName(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Vincular con cliente (opcional)</label>
            <select value={clienteId} onChange={e => { setClienteId(e.target.value); const c = clientesLibros.find(c => c.id.toString() === e.target.value); if (c) setAuthorName((c as any).nombreCompleto || ""); }} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">-- Sin vincular --</option>
              {clientesLibros.map(c => <option key={c.id} value={c.id}>{c.nombreCompleto || "Sin nombre"}</option>)}
            </select>

            <label style={labelStyle}>Notas (opcional)</label>
            <textarea placeholder="Notas sobre este libro..." value={notas} onChange={e => setNotas(e.target.value)} rows={3} style={{ ...inputStyle, resize: "none" }} />

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={save} disabled={saving} style={{ ...btnBlue, display: "flex", alignItems: "center", gap: 8, minWidth: 110, justifyContent: "center", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
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

export default Books;
