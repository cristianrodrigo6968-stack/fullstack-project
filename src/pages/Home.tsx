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

      {/* CATÁLOGO */}
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
          <CatalogoProductos isMobile={isMobile} />
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

// ─── Componente de Catálogo ──────────────────────────────────────────────────
function CatalogoProductos({ isMobile }: { isMobile: boolean }) {
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
    setCarrito(prev => [...prev, { ...producto, tipo }]);
  };

  const getCategoria = (nombre: string): string => {
    const n = nombre.toLowerCase();
    if (n.includes("categoría a") || n.includes("categoria a")) return "libroA";
    if (n.includes("categoría b") || n.includes("categoria b")) return "libroB";
    if (n.includes("categoría c") || n.includes("categoria c")) return "libroC";
    if (n.includes("director")) return "director";
    if (n.includes("fundador")) return "fundador";
    if (n.includes("artículo") || n.includes("articulo") || n.includes("autor")) return "autor";
    return "otro";
  };

  const getSimilares = (producto: any) => {
    const cat = getCategoria(producto.nombre);
    return productos.filter(p => p.id !== producto.id && getCategoria(p.nombre) === cat).slice(0, 4);
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
            <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ color: "#3b82f6", fontSize: 18, fontWeight: 700, margin: 0 }}>{p.nombre}</h3>
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

      {/* MODAL tipo Amazon */}
      {selected && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", justifyContent: "center", alignItems: "flex-start",
          zIndex: 9999, padding: "20px", overflowY: "auto",
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: "#1e293b", borderRadius: 20, maxWidth: 1000, width: "100%",
            padding: 28, color: "white", position: "relative",
            margin: "20px 0",
          }} onClick={e => e.stopPropagation()}>

            <button onClick={() => setSelected(null)} style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(0,0,0,0.5)", border: "none", color: "white",
              cursor: "pointer", fontSize: 22, width: 36, height: 36,
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 30 }}>
              <div style={{
                background: "#0f172a", borderRadius: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 20, minHeight: 300,
              }}>
                {selected.imagenUrl ? (
                  <img src={selected.imagenUrl} alt={selected.nombre} style={{
                    width: "100%", height: "auto", maxHeight: "70vh",
                    objectFit: "contain", borderRadius: 12,
                  }} />
                ) : (
                  <div style={{ fontSize: 80, opacity: 0.5 }}>📦</div>
                )}
              </div>

              <div>
                <h2 style={{ fontSize: 24, marginBottom: 12, color: "#f1f5f9" }}>{selected.nombre}</h2>

                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
                  {selected.descuento > 0 && (
                    <span style={{ color: "#ef4444", fontSize: 18, textDecoration: "line-through" }}>
                      Bs {selected.precio.toFixed(2)}
                    </span>
                  )}
                  <span style={{ color: "#22c55e", fontSize: 28, fontWeight: "bold" }}>
                    Bs {(selected.descuento > 0 ? selected.precio - (selected.precio * selected.descuento / 100) : selected.precio).toFixed(2)}
                  </span>
                  {selected.descuento > 0 && (
                    <span style={{ background: "#ef4444", color: "white", padding: "3px 14px", borderRadius: 99, fontSize: 14, fontWeight: "bold" }}>
                      -{selected.descuento}%
                    </span>
                  )}
                </div>

                <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                  {selected.descripcion}
                </p>

                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ color: "#cbd5e1", marginBottom: 10, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
                    📋 Características
                  </h4>
                  <ul style={{ color: "#94a3b8", fontSize: 14, lineHeight: 2, paddingLeft: 20 }}>
                    {selected.descripcion?.split(".").filter((s: string) => s.trim()).slice(0, 4).map((item: string, idx: number) => (
                      <li key={idx}>{item.trim()}</li>
                    ))}
                  </ul>
                </div>

                <button onClick={() => {
                  agregarAlCarrito(selected);
                  setSelected(null);
                }} style={{
                  width: "100%", padding: 16,
                  background: "#22c55e", border: "none", borderRadius: 12,
                  color: "white", fontWeight: "bold", fontSize: 18, cursor: "pointer",
                  marginBottom: 12,
                }}>
                  🛒 Comprar ahora — Bs {(selected.descuento > 0 ? selected.precio - (selected.precio * selected.descuento / 100) : selected.precio).toFixed(2)}
                </button>

                <button onClick={() => {
                  navigate("/carrito");
                  setSelected(null);
                }} style={{
                  width: "100%", padding: 14,
                  background: "transparent", border: "2px solid #3b82f6", borderRadius: 12,
                  color: "#3b82f6", fontWeight: "bold", fontSize: 16, cursor: "pointer",
                }}>
                  Ir al carrito ({carrito.length})
                </button>
              </div>
            </div>

            {/* Productos similares */}
            {(() => {
              const similares = getSimilares(selected);
              if (similares.length === 0) return null;
              return (
                <div style={{ marginTop: 40, borderTop: "1px solid #334155", paddingTop: 28 }}>
                  <h3 style={{ marginBottom: 20, fontSize: 18, color: "#cbd5f1" }}>✨ Productos similares</h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                    gap: 16,
                  }}>
                    {similares.map((sim: any) => {
                      const precioSim = sim.descuento > 0 ? sim.precio - (sim.precio * sim.descuento / 100) : sim.precio;
                      return (
                        <div key={sim.id} style={{
                          background: "#0f172a", borderRadius: 12, padding: 14,
                          textAlign: "center", cursor: "pointer",
                          border: "1px solid #334155", transition: "all 0.2s",
                        }} onClick={() => setSelected(sim)}>
                          {sim.imagenUrl ? (
                            <img src={sim.imagenUrl} alt={sim.nombre} style={{
                              width: "100%", height: 120, objectFit: "cover",
                              borderRadius: 8, marginBottom: 10,
                            }} />
                          ) : (
                            <div style={{
                              width: "100%", height: 120, background: "#1e293b",
                              borderRadius: 8, display: "flex", alignItems: "center",
                              justifyContent: "center", fontSize: 40, marginBottom: 10,
                            }}>📦</div>
                          )}
                          <h4 style={{ color: "white", fontSize: 13, marginBottom: 6 }}>{sim.nombre}</h4>
                          <p style={{ color: "#22c55e", fontWeight: "bold", fontSize: 14 }}>
                            Bs {precioSim.toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

export default Home;