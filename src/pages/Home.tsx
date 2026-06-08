import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWindowSize } from "../hooks/useWindowSize";

// --- Configuración del carrusel ---
const TOTAL_IMAGENES = 20;
const imagenes = Array.from({ length: TOTAL_IMAGENES }, (_, i) => ({
  id: i + 1,
  src: `/portadas/${i + 1}.jpg`,
  alt: `Publicación ${i + 1}`,
}));

function Home() {
  const { isMobile } = useWindowSize();
  const navigate = useNavigate();
  const [typedText, setTypedText] = useState("");
  const [showSub, setShowSub] = useState(false);
  const lightRef = useRef<HTMLDivElement>(null);
  const fullText = "Publica tu libro y revista";

  // --- Estado del carrusel ---
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const offsetRef = useRef(0);
  const animRef = useRef<number>(0);
  const speedRef = useRef(0.5);
  const todasLasImagenes = [...imagenes, ...imagenes, ...imagenes];
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  // --- Hero: texto mecanografiado sin cursor ---
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

  // --- Luz del mouse ---
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

  // --- Animación del carrusel ---
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const cardWidth = isMobile ? 180 : 260;
    const gap = 20;
    const totalWidth = imagenes.length * (cardWidth + gap);

    const animate = () => {
      if (!isPaused) {
        offsetRef.current += speedRef.current;
        if (offsetRef.current >= totalWidth) {
          offsetRef.current = 0;
        }
        if (track) {
          track.style.transform = `translateX(-${offsetRef.current}px)`;
        }
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPaused, isMobile]);

  return (
    <div style={{ background: "#000", color: "white", overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes toastUp {
          0%   { opacity: 0; transform: translateX(-50%) translateY(0px) scale(0.8); }
          15%  { opacity: 1; transform: translateX(-50%) translateY(-10px) scale(1); }
          70%  { opacity: 1; transform: translateX(-50%) translateY(-28px) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-44px) scale(0.9); }
        }
        @keyframes btnBounce {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.94); }
          70%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .social-link:hover { transform: scale(1.2) !important; background: #3b82f6 !important; }
        .pub-img:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 0 30px rgba(59,130,246,0.5) !important;
          border-color: #3b82f6 !important;
          cursor: pointer;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
      `}</style>

      {/* Modal para ver imagen en grande */}
      {selectedImg && (
        <div
          onClick={() => setSelectedImg(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 20,
          }}
        >
          <img
            src={selectedImg}
            alt="portada"
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              borderRadius: 16, objectFit: "contain",
              animation: "fadeInModal 0.3s ease",
              boxShadow: "0 0 60px rgba(59,130,246,0.4)",
            }}
          />
          <button
            onClick={() => setSelectedImg(null)}
            style={{
              position: "fixed", top: 20, right: 20,
              background: "#ef4444", border: "none",
              borderRadius: "50%", width: 40, height: 40,
              color: "white", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      )}

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
            {typedText}
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

      {/* CARRUSEL DE PUBLICACIONES (local) */}
      <div style={{ marginTop: -40, marginBottom: 40 }}>
        <p style={{
          color: "#3b82f6", fontSize: 12, textTransform: "uppercase",
          letterSpacing: 3, marginBottom: 16, paddingLeft: isMobile ? 20 : 40,
        }}>
          📚 Publicaciones destacadas
        </p>
        <div
          style={{ overflow: "hidden", width: "100%", position: "relative" }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Gradientes laterales */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 80,
            background: "linear-gradient(to right, #000, transparent)",
            zIndex: 2, pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
            background: "linear-gradient(to left, #000, transparent)",
            zIndex: 2, pointerEvents: "none",
          }} />

          <div
            ref={trackRef}
            style={{
              display: "flex", gap: 20,
              padding: "10px 0 20px",
              willChange: "transform",
            }}
          >
            {todasLasImagenes.map((img, idx) => (
              <div
                key={idx}
                className="pub-img"
                onClick={() => setSelectedImg(img.src)}
                style={{
                  flexShrink: 0,
                  width: isMobile ? 180 : 260,
                  height: isMobile ? 250 : 360,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #222",
                  transition: "all 0.3s ease",
                  background: "#111",
                }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.style.background = "linear-gradient(135deg, #1e3a5f, #0f172a)";
                      parent.style.display = "flex";
                      parent.style.alignItems = "center";
                      parent.style.justifyContent = "center";
                      parent.innerHTML = `<span style="font-size: 60px">📚</span>`;
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CATÁLOGO DE PRODUCTOS (servicios) */}
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

// ─── COMPONENTE CATÁLOGO DE PRODUCTOS (sin cambios, es el mismo que tenías) ──
interface Toast {
  id: number;
}

function CatalogoProductos({ isMobile }: { isMobile: boolean }) {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [carrito, setCarrito] = useState<any[]>(() => {
    const saved = localStorage.getItem("carrito");
    return saved ? JSON.parse(saved) : [];
  });
  const [feedbacks, setFeedbacks] = useState<Record<number, { count: number; toasts: Toast[]; bounce: boolean }>>({});
  const toastIdRef = useRef(0);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/productos`)
      .then(r => r.json())
      .then(data => { setProductos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (producto: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nombre = producto.nombre.toLowerCase();
    let tipo = "autor";
    if (nombre.includes("categoría a")) tipo = "libroA";
    else if (nombre.includes("categoría b")) tipo = "libroB";
    else if (nombre.includes("categoría c")) tipo = "libroC";
    else if (nombre.includes("director")) tipo = "director";
    else if (nombre.includes("fundador")) tipo = "fundador";
    setCarrito(prev => [...prev, { ...producto, tipo }]);

    const pid = producto.id;
    const newToastId = ++toastIdRef.current;
    setFeedbacks(prev => ({
      ...prev,
      [pid]: {
        count: (prev[pid]?.count ?? 0) + 1,
        toasts: [...(prev[pid]?.toasts ?? []), { id: newToastId }],
        bounce: true,
      },
    }));
    setTimeout(() => {
      setFeedbacks(prev => ({ ...prev, [pid]: { ...prev[pid], bounce: false } }));
    }, 300);
    setTimeout(() => {
      setFeedbacks(prev => ({
        ...prev,
        [pid]: { ...prev[pid], toasts: (prev[pid]?.toasts ?? []).filter(t => t.id !== newToastId) },
      }));
    }, 1800);
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
        const fb = feedbacks[p.id];
        const count = fb?.count ?? 0;
        const toasts = fb?.toasts ?? [];
        const bounce = fb?.bounce ?? false;

        return (
          <div key={p.id} style={{
            background: "#111", borderRadius: 14,
            border: "1px solid #222", transition: "all 0.3s ease",
            overflow: "hidden", cursor: "pointer",
            display: "flex", flexDirection: "column",
          }}>
            <div onClick={() => navigate(`/producto/${p.id}`)} style={{ position: "relative", width: "100%", paddingTop: "150%", overflow: "hidden" }}>
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

              <div style={{ position: "relative", marginTop: 8 }}>
                {toasts.map(toast => (
                  <div
                    key={toast.id}
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      marginBottom: 6,
                      background: "#16a34a",
                      color: "white",
                      padding: "6px 14px",
                      borderRadius: 99,
                      fontSize: 13,
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      animation: "toastUp 1.8s ease forwards",
                      zIndex: 10,
                      boxShadow: "0 4px 14px rgba(22,163,74,0.45)",
                    }}
                  >
                    ✅ ¡Agregado!
                  </div>
                ))}

                <button
                  onClick={(e) => agregarAlCarrito(p, e)}
                  style={{
                    width: "100%",
                    padding: 10,
                    background: count > 0 ? "#16a34a" : "#22c55e",
                    border: "none",
                    borderRadius: 8,
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 14,
                    cursor: "pointer",
                    animation: bounce ? "btnBounce 0.3s ease" : "none",
                    transition: "background 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span>🛒 Comprar</span>
                  {count > 0 && (
                    <span style={{
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "1px 8px",
                      animation: "badgePop 0.3s ease",
                    }}>
                      ×{count}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}

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