import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

interface Person {
  id: number;
  name: string;
}

interface Magazine {
  id: number;
  title: string;
}

interface Article {
  id: number;
  title: string;
  authors: Person[];
  magazine: Magazine;
}

const API_URL = import.meta.env.VITE_API_URL;

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </>
  );
}

function Articles() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();

  const [articles, setArticles] = useState<Article[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [selectedAuthors, setSelectedAuthors] = useState<number[]>([]);
  const [magazineId, setMagazineId] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    setLoading(true);
    try {
      const [a, p, m] = await Promise.all([
        fetch(`${API_URL}/articles`, { headers }),
        fetch(`${API_URL}/persons`, { headers }),
        fetch(`${API_URL}/magazines`, { headers }),
      ]);
      if (a.ok) setArticles(await a.json());
      if (p.ok) setPersons(await p.json());
      if (m.ok) setMagazines(await m.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleAuthor = (id: number) => {
    setSelectedAuthors(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const create = async () => {
    if (!title || !magazineId || selectedAuthors.length === 0) return;
    setCreating(true);
    try {
      await fetch(`${API_URL}/articles`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title, authorIds: selectedAuthors, magazineId }),
      });
      setTitle("");
      setSelectedAuthors([]);
      setMagazineId("");
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: isMobile ? 22 : 28, marginBottom: 8, color: "white" }}>📝 Artículos</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Crea artículos y vinculalos con autores y revistas.
      </p>

      {/* Formulario de creación */}
      <div style={{
        background: "linear-gradient(160deg, #0d0d1a, #0a0a14)",
        border: "1px solid #1e1b4b",
        borderRadius: 14,
        padding: isMobile ? 18 : 24,
        marginBottom: 24,
      }}>
        <label style={labelStyle}>Título del artículo</label>
        <input
          placeholder="Ej: El futuro de la literatura boliviana"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Autores</label>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
          gap: 8,
          marginBottom: 14,
          maxHeight: 180,
          overflowY: "auto",
          background: "#0a0a14",
          border: "1px solid #1e1b4b",
          borderRadius: 10,
          padding: 10,
        }}>
          {persons.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No hay personas registradas.</p>
          ) : (
            persons.map(p => {
              const checked = selectedAuthors.includes(p.id);
              return (
                <label
                  key={p.id}
                  onClick={() => toggleAuthor(p.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                    background: checked ? "rgba(99,102,241,.15)" : "transparent",
                    border: checked ? "1px solid #6366f1" : "1px solid transparent",
                    color: checked ? "#a5b4fc" : "#94a3b8",
                    fontSize: 13, transition: "all .15s",
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${checked ? "#6366f1" : "#334155"}`,
                    background: checked ? "#6366f1" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "white",
                  }}>
                    {checked ? "✓" : ""}
                  </div>
                  {p.name}
                </label>
              );
            })
          )}
        </div>

        <label style={labelStyle}>Revista</label>
        <select
          value={magazineId}
          onChange={e => setMagazineId(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="">-- Seleccionar revista --</option>
          {magazines.map(m => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>

        <button
          onClick={create}
          disabled={creating || !title || !magazineId || selectedAuthors.length === 0}
          style={{
            ...btnPrimary,
            width: isMobile ? "100%" : "auto",
            opacity: (!title || !magazineId || selectedAuthors.length === 0) ? 0.5 : 1,
            cursor: (!title || !magazineId || selectedAuthors.length === 0) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {creating ? <Spinner /> : "➕ Crear artículo"}
        </button>
      </div>

      {/* Lista de artículos */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
      ) : articles.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center", padding: 30 }}>
          No hay artículos creados aún.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {articles.map(a => (
            <div
              key={a.id}
              style={{
                background: "linear-gradient(160deg, #0d0d1a, #0a0a14)",
                border: "1px solid #1e1b4b",
                borderRadius: 12,
                padding: "14px 18px",
                borderLeft: "3px solid #6366f1",
              }}
            >
              <p style={{ color: "white", fontWeight: "bold", fontSize: 14, margin: "0 0 6px", wordBreak: "break-word" }}>
                {a.title}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "#a5b4fc", fontSize: 12 }}>
                  ✍️ {a.authors.map(x => x.name).join(", ") || "Sin autores"}
                </span>
                {a.magazine?.title && (
                  <span style={{ background: "rgba(99,102,241,.12)", color: "#a5b4fc", fontSize: 11, padding: "2px 10px", borderRadius: 99 }}>
                    📘 {a.magazine.title}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6,
  fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: 11, marginBottom: 14, borderRadius: 8,
  border: "1px solid #1e1b4b", background: "#0a0a14", color: "white",
  fontSize: 16, boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 22px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
  border: "none", borderRadius: 10, color: "white", fontWeight: "bold",
  fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,.3)",
};

export default Articles;