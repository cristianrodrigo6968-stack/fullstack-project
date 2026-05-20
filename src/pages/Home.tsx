import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWindowSize } from "../hooks/useWindowSize";

function Home() {
  const { isMobile } = useWindowSize();
  const navigate = useNavigate();
  const [typedText, setTypedText] = useState("");
  const [showSub, setShowSub] = useState(false);
  const lightRef = useRef<HTMLDivElement>(null);
  const fullText = "Publica tu libro y revista";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowSub(true), 300);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (lightRef.current) {
        lightRef.current.style.left = e.clientX + "px";
        lightRef.current.style.top = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div style={{ background: "#000", color: "white", overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`
        @keyframes blink { 50% { border-color: transparent; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .social-link:hover { transform: scale(1.2) !important; background: #3b82f6 !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
      `}</style>

      {/* LUZ DEL MOUSE */}
      <div ref={lightRef} style={{
        position: "fixed", width: 300, height: 300,
        background: "radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)",
        pointerEvents: "none", borderRadius: "50%", zIndex: 0,
        transform: "translate(-50%,-50%)", transition: "left 0.05s, top 0.05s",
      }} />

      {/* FONDO */}
      <div style={{
        position: "fixed", width: "100%", height: "100%", zIndex: -1,
        background: "radial-gradient(circle at 30% 30%, rgba(59,130,246,0.08), transparent 60%)",
      }} />

      {/* HERO */}
      <section style={{
        height: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", textAlign: "center",
        padding: "20px", position: "relative", zIndex: 1, paddingTop: 80,
      }}>
        <div style={{ animation: "fadeIn 1s ease" }}>
          {/* LOGO */}
          <div style={{
            width: isMobile ? 100 : 140, height: isMobile ? 100 : 140,
            borderRadius: "50%", background: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 0 60px rgba(59,130,246,0.4)",
            overflow: "hidden",
          }}>
            <div style={{ fontSize: isMobile ? 50 : 70 }}>📖</div>
          </div>

          <p style={{
            color: "#3b82f6", fontSize: isMobile ? 11 : 13,
            letterSpacing: 4, textTransform: "uppercase", marginBottom: 8,
          }}>
            ASOCIACIÓN DE ESCRITORES
          </p>
          <h2 style={{
            color: "white", fontSize: isMobile ? 20 : 28,
            fontWeight: 700, letterSpacing: 2, marginBottom: 28,
          }}>
            VANGUARDISTAS 3.0
          </h2>

          {/* TYPEWRITER */}
          <h1 style={{
            fontSize: isMobile ? 28 : 52, fontWeight: 700,
            marginBottom: 20, lineHeight: 1.2,
          }}>
            <span>{typedText}</span>
            <span style={{
              borderRight: "3px solid #3b82f6",
              animation: "blink 0.8s infinite", marginLeft: 2,
            }} />
          </h1>

          <p style={{
            color: "#aaa", fontSize: isMobile ? 14 : 18,
            maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.8,
            opacity: showSub ? 1 : 0,
            transform: showSub ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease",
          }}>
            Publicamos libros y revistas con respaldo legal en Bolivia.
            Somos la Asociación de Escritores Vanguardistas 3.0 — El Alto, Bolivia.
          </p>
        </div>
      </section>

      {/* ─── CATÁLOGO DE PRODUCTOS ─────────────────────────────────── */}
      <section style={{
        padding: isMobile ? "40px 20px" : "60px 40px",
        maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1,
      }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ color: "#3b82f6", letterSpacing: 4, fontSize: 12, textTransform: "uppercase", marginBottom: 12 }}>
            Catálogo de Servicios
          </p>
          <h2 style={{ fontSize: isMobile ? 24 : 36, fontWeight: 700, marginBottom: 16 }}>
            Nuestros Productos Editoriales
          </h2>
          <div style={{ width: 60, height: 3, background: "#3b82f6", margin: "0 auto 20px", borderRadius: 99 }} />
        </div>

        <div id="catalogo" style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: 24,
        }}>
          <CatalogoProductos />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        textAlign: "center", padding: "30px 20px",
        color: "#555", borderTop: "1px solid #222",
        fontSize: 13, position: "relative", zIndex: 1, marginTop: 40,
      }}>
        <p style={{ color: "#3b82f6", fontWeight: 700, marginBottom: 8 }}>
          ASOCIACIÓN DE ESCRITORES VANGUARDISTAS 3.0
        </p>
        <p>© {new Date().getFullYear()} — El Alto, Bolivia. Todos los derechos reservados.</p>
      </footer>

      {/* REDES SOCIALES */}
      <div style={{
        position: "fixed", right: 20, bottom: 20,
        display: "flex", flexDirection: "column", gap: 12, zIndex: 999,
      }}>
        {[
          { img: "https://cdn-icons-png.flaticon.com/512/733/733585.png", href: "https://wa.me/59167027053" },
          { img: "https://cdn-icons-png.flaticon.com/512/733/733547.png", href: "https://www.facebook.com/RevistaMiAulaLapizEduTec" },
          { img: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png", href: "https://www.tiktok.com/@escritoresvanguardistas" },
        ].map((s, i) => (
          <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
            className="social-link"
            style={{
              background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)",
              padding: 10, borderRadius: "50%", transition: "all 0.3s",
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 46, height: 46, border: "1px solid #333", textDecoration: "none",
            }}>
            <img src={s.img} alt="red social" style={{ width: 22, height: 22 }} />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Componente de Catálogo de Productos ────────────────────────────────────
function CatalogoProductos() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [carrito, setCarrito] = useState<any[]>(() => {
    const saved = localStorage.getItem("carrito");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/productos`)
      .then(r => r.json())
      .then(data => { setProductos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (producto: any) => {
    const nombre = producto.nombre.toLowerCase();
  let tipo = "autor";
  if (nombre.includes("categoría a")) tipo = "libroA";
  else if (nombre.includes("categoría b")) tipo = "libroB";
  else if (nombre.includes("categoría c")) tipo = "libroC";
  else if (nombre.includes("director")) tipo = "director";
  else if (nombre.includes("fundador")) tipo = "fundador";

    setCarrito(prev => [...prev, producto]);
  };

  if (loading) return <p style={{ color: "#94a3b8", textAlign: "center", gridColumn: "1/-1" }}>Cargando productos...</p>;
  if (productos.length === 0) return <p style={{ color: "#64748b", textAlign: "center", gridColumn: "1/-1" }}>Próximamente nuevos servicios.</p>;

  return (
    <>
      {productos.map((p: any) => {
        const precioFinal = p.descuento > 0 ? p.precio - (p.precio * p.descuento / 100) : p.precio;
        return (
          <div key={p.id} style={{
            background: "#111", borderRadius: 14,
            border: "1px solid #222", transition: "all 0.3s ease",
            overflow: "hidden", cursor: "pointer",
            display: "flex", flexDirection: "column",
          }}>
            {/* Imagen con proporción 2:3 */}
            <div onClick={() => setSelected(p)} style={{ position: "relative", width: "100%", paddingTop: "150%", overflow: "hidden" }}>
              {p.imagenUrl ? (
                <img src={p.imagenUrl} alt={p.nombre} style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%", objectFit: "cover",
                }} />
              ) : (
                <div style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  background: "#1e293b", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 64,
                }}>📦</div>
              )}
            </div>
            {/* Contenido textual */}
            <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ color: "#3b82f6", fontSize: 18, fontWeight: 700, margin: 0 }}>{p.nombre}</h3>
              {/* Descripción limitada a 3 líneas */}
              <p style={{
                color: "#888", fontSize: 14, lineHeight: 1.5, flex: 1,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                textOverflow: "ellipsis",
              }}>
                {p.descripcion}
              </p>
              {/* Enlace "Ver más" */}
              <p
                onClick={(e) => { e.stopPropagation(); setSelected(p); }}
                style={{ color: "#60a5fa", fontSize: 12, cursor: "pointer", textDecoration: "underline", margin: 0 }}
              >
                Ver más
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {p.descuento > 0 && (
                  <span style={{ color: "#ef4444", fontSize: 16, textDecoration: "line-through" }}>
                    Bs {p.precio.toFixed(2)}
                  </span>
                )}
                <span style={{ color: "#22c55e", fontSize: 22, fontWeight: "bold" }}>
                  Bs {precioFinal.toFixed(2)}
                </span>
                {p.descuento > 0 && (
                  <span style={{ background: "#ef4444", color: "white", padding: "2px 10px", borderRadius: 99, fontSize: 13, fontWeight: "bold" }}>
                    -{p.descuento}%
                  </span>
                )}
              </div>
              {/* Botón Comprar */}
              <button onClick={(e) => {
                e.stopPropagation();
                agregarAlCarrito(p);
              }} style={{
                marginTop: 8, width: "100%", padding: 10,
                background: "#22c55e", border: "none", borderRadius: 8,
                color: "white", fontWeight: "bold", fontSize: 14, cursor: "pointer",
              }}>
                🛒 Comprar
              </button>
            </div>
          </div>
        );
      })}

      {/* Modal de detalle */}
      {selected && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 9999, padding: "20px",
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: "#1e293b", borderRadius: 16, maxWidth: 500, width: "100%",
            padding: 28, color: "white", position: "relative",
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} style={{
              position: "absolute", top: 12, right: 12,
              background: "none", border: "none", color: "#94a3b8",
              cursor: "pointer", fontSize: 20,
            }}>✕</button>
            {selected.imagenUrl && (
              <img src={selected.imagenUrl} alt={selected.nombre} style={{ width: "100%", maxHeight: 250, objectFit: "cover", borderRadius: 12, marginBottom: 16 }} />
            )}
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>{selected.nombre}</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{selected.descripcion}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              {selected.descuento > 0 && (
                <span style={{ color: "#ef4444", fontSize: 16, textDecoration: "line-through" }}>
                  Bs {selected.precio.toFixed(2)}
                </span>
              )}
              <span style={{ color: "#22c55e", fontSize: 24, fontWeight: "bold" }}>
                Bs {(selected.descuento > 0 ? selected.precio - (selected.precio * selected.descuento / 100) : selected.precio).toFixed(2)}
              </span>
            </div>
            <button onClick={() => {
              agregarAlCarrito(selected);
              setSelected(null);
            }} style={{
              width: "100%", padding: 14,
              background: "#22c55e", border: "none", borderRadius: 10,
              color: "white", fontWeight: "bold", fontSize: 16, cursor: "pointer",
            }}>
              🛒 Agregar al carrito
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;