import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";

const API_URL = "${import.meta.env.VITE_API_URL}";

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
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, { headers });
      setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const delay = setTimeout(() => search(query), 300);
    return () => clearTimeout(delay);
  }, [query, search]);

  const total = results
    ? results.magazines.length + results.books.length
    : 0;

  return (
    <div>
      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>🔍 Buscador</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Busca por nombre de persona para encontrar sus revistas y libros.
      </p>

      {/* INPUT */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <input
          placeholder="Ingresa un nombre..."
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

      {/* SIN RESULTADOS */}
      {results && total === 0 && (
        <p style={{ color: "#64748b", textAlign: "center", fontSize: 15 }}>
          No se encontraron revistas ni libros para "{query}"
        </p>
      )}

      {results && total > 0 && (
        <div>
          <p style={{ color: "#64748b", marginBottom: 24, fontSize: 13 }}>
            {total} resultado(s) para "{query}"
          </p>

          {/* REVISTAS */}
          {results.magazines.length > 0 && (
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
          {results.books.length > 0 && (
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
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
