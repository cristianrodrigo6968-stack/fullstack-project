import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

type TipoBusqueda = "todos" | "revistas" | "libros" | "autores";

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        display: "inline-block", width: 16, height: 16,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTop: "2px solid white", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </>
  );
}

function GlobalSearch() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState<TipoBusqueda>("todos");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const search = useCallback(async (q: string, t: TipoBusqueda) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}&tipo=${t}`, { headers });
      setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const delay = setTimeout(() => search(query, tipo), 300);
    return () => clearTimeout(delay);
  }, [query, tipo, search]);

  const total = results
    ? (results.magazines?.length || 0) + (results.books?.length || 0) + (results.clients?.length || 0)
    : 0;

  const tipos: { key: TipoBusqueda; label: string; icon: string }[] = [
    { key: "todos", label: "Todos", icon: "🔍" },
    { key: "revistas", label: "Revistas", icon: "📘" },
    { key: "libros", label: "Libros", icon: "📚" },
    { key: "autores", label: "Autores", icon: "👤" },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>🔍 Buscador</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Encuentra revistas, libros y autores por nombre, título o CI.
      </p>

      {/* INPUT */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <input
          placeholder="Ingresa nombre, título o CI..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: isMobile ? "12px 44px 12px 16px" : "14px 48px 14px 16px",
            borderRadius: 10, border: "none",
            background: "#1e293b", color: "white",
            fontSize: isMobile ? 15 : 16, boxSizing: "border-box",
          }}
        />
        <div style={{
          position: "absolute", right: 16, top: "50%",
          transform: "translateY(-50%)",
        }}>
          {loading ? <Spinner /> : (
            <span style={{ color: "#64748b", fontSize: 18 }}>🔍</span>
          )}
        </div>
      </div>

      {/* PESTAÑAS DE FILTRO */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {tipos.map((t) => (
          <button
            key={t.key}
            onClick={() => setTipo(t.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 99,
              border: tipo === t.key ? "2px solid #3b82f6" : "2px solid #334155",
              background: tipo === t.key ? "#1e3a5f" : "transparent",
              color: tipo === t.key ? "#60a5fa" : "#94a3b8",
              fontWeight: tipo === t.key ? "bold" : "normal",
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* SIN RESULTADOS */}
      {results && total === 0 && (
        <p style={{ color: "#64748b", textAlign: "center", fontSize: 15 }}>
          No se encontraron resultados para "{query}" en {tipo === "todos" ? "ninguna categoría" : tipo}.
        </p>
      )}

      {results && total > 0 && (
        <div>
          <p style={{ color: "#64748b", marginBottom: 24, fontSize: 13 }}>
            {total} resultado(s) para "{query}" {tipo !== "todos" ? `en ${tipo}` : ""}
          </p>

          {/* REVISTAS */}
          {results.magazines?.length > 0 && (tipo === "todos" || tipo === "revistas") && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ marginBottom: 12, color: "#60a5fa", fontSize: isMobile ? 15 : 17 }}>
                📘 Revistas ({results.magazines.length})
              </h3>
              {results.magazines.map((m: any) => (
                <div key={m.id} style={{
                  background: "#1e293b", padding: isMobile ? 16 : 20,
                  borderRadius: 12, marginBottom: 12,
                  borderLeft: "4px solid #3b82f6",
                }}>
                  <h4 style={{ marginBottom: 6, fontSize: isMobile ? 14 : 16 }}>{m.title}</h4>
                  <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
                    Director: {m.director?.name}
                  </p>
                  {m.articles.length > 0 && (
                    <div>
                      <p style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>Artículos:</p>
                      {m.articles.map((a: any) => (
                        <p key={a.id} style={{
                          color: "#64748b", fontSize: 13,
                          background: "#0f172a", padding: "6px 12px",
                          borderRadius: 8, marginBottom: 4,
                        }}>
                          • "{a.title}" — {a.authors.map((x: any) => x.name).join(", ")}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* LIBROS */}
          {results.books?.length > 0 && (tipo === "todos" || tipo === "libros") && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ marginBottom: 12, color: "#22c55e", fontSize: isMobile ? 15 : 17 }}>
                📚 Libros ({results.books.length})
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 12,
              }}>
                {results.books.map((b: any) => (
                  <div key={b.id} style={{
                    background: "#1e293b", padding: 16,
                    borderRadius: 10, borderLeft: "4px solid #22c55e",
                  }}>
                    <h4 style={{ marginBottom: 6, fontSize: isMobile ? 14 : 15 }}>
                      📘 {b.title}
                    </h4>
                    <p style={{ color: "#94a3b8", fontSize: 13 }}>✍ {b.author?.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUTORES (CLIENTES) */}
          {results.clients?.length > 0 && (tipo === "todos" || tipo === "autores") && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ marginBottom: 12, color: "#a78bfa", fontSize: isMobile ? 15 : 17 }}>
                👤 Autores ({results.clients.length})
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 12,
              }}>
                {results.clients.map((c: any) => (
                  <div key={c.id} style={{
                    background: "#1e293b", padding: 16,
                    borderRadius: 10, borderLeft: "4px solid #a78bfa",
                  }}>
                    <h4 style={{ marginBottom: 4, fontSize: isMobile ? 14 : 15, color: "white" }}>
                      {c.nombreCompleto || "Sin nombre"}
                    </h4>
                    <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>
                      CI: {c.ci || "—"} · {c.extension || "—"}
                    </p>
                    <p style={{ color: "#64748b", fontSize: 12 }}>
                      {c.email || "Sin email"} · {c.celular || "Sin celular"}
                    </p>
                    {c.status && (
                      <span style={{
                        display: "inline-block",
                        marginTop: 6,
                        background: c.status === "procesado" ? "#14532d" : c.status === "pendiente" ? "#422006" : "#1e3a5f",
                        color: c.status === "procesado" ? "#4ade80" : c.status === "pendiente" ? "#f59e0b" : "#60a5fa",
                        padding: "2px 8px",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: "bold",
                      }}>
                        {c.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;