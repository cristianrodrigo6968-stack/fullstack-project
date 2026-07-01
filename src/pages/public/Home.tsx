import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWindowSize } from "../../hooks/useWindowSize";

const TOTAL_IMAGENES = 20;
const imagenes = Array.from({ length: TOTAL_IMAGENES }, (_, i) => ({
  id: i + 1,
  src: `/portadas/${i + 1}.jpg`,
  alt: `Publicación ${i + 1}`,
}));
const todasLasImagenes = [...imagenes, ...imagenes, ...imagenes];

const getPrecioFinal = (precio: number, descuento: number) =>
  descuento > 0 ? precio - (precio * descuento) / 100 : precio;

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
const getComponenteLabel = (comp: any): string => {
  if (comp.tipo === "libro") return `📖 Libro Categoría ${comp.categoria}`;
  if (comp.tipo === "revista") {
    const subtipoLabel = comp.subtipo === "director" ? "Director de revista" :
                         comp.subtipo === "fundador" ? "Fundador" :
                         comp.subtipo === "articulo_rp" ? "Artículo (redacción y publicación)" :
                         "Artículo (solo publicación)";
    return `📰 ${subtipoLabel}${comp.meses ? ` (${comp.meses} mes${comp.meses > 1 ? "es" : ""})` : ""}`;
  }
  return "📦 Otro servicio";
};
interface Toast { id: number; }
interface FeedbackState { count: number; toasts: Toast[]; bounce: boolean; }

function Home() {
  const { isMobile } = useWindowSize();
  const navigate = useNavigate();

  const [typedText, setTypedText] = useState("");
  const [showSub, setShowSub] = useState(false);
  const fullText = "Publica tu libro y revista";

  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const animRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const lightRef = useRef<HTMLDivElement>(null);

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
    const move = (e: MouseEvent) => {
      if (lightRef.current) {
        lightRef.current.style.left = e.clientX + "px";
        lightRef.current.style.top = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = isMobile ? 180 : 260;
    const gap = 20;
    const totalWidth = imagenes.length * (cardWidth + gap);

    const animate = () => {
      if (!isPausedRef.current) {
        offsetRef.current += 0.5;
        if (offsetRef.current >= totalWidth) offsetRef.current = 0;
        track.style.transform = `translateX(-${offsetRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isMobile]);

  return (
    <div style={{ background: "#000", color: "white", overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeIn       { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeInUp     { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastUp      { 0%{opacity:0;transform:translateX(-50%) translateY(0) scale(.8)} 15%{opacity:1;transform:translateX(-50%) translateY(-10px) scale(1)} 70%{opacity:1;transform:translateX(-50%) translateY(-28px) scale(1)} 100%{opacity:0;transform:translateX(-50%) translateY(-44px) scale(.9)} }
        @keyframes btnBounce    { 0%{transform:scale(1)} 40%{transform:scale(.94)} 70%{transform:scale(1.04)} 100%{transform:scale(1)} }
        @keyframes badgePop     { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeInModal  { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
        @keyframes pulse        { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.5)} 50%{box-shadow:0 0 0 14px rgba(99,102,241,0)} }
        @keyframes gradShift    { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes spin         { to { transform: rotate(360deg); } }

        .pub-img { transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease !important; }
        .pub-img:hover { transform:scale(1.06) !important; box-shadow:0 0 36px rgba(99,102,241,.6) !important; border-color:#6366f1 !important; cursor:pointer; }

        .card-catalogo { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
        .card-catalogo:hover { transform:translateY(-8px); box-shadow:0 24px 48px rgba(99,102,241,.18); border-color:#6366f1 !important; }

        .social-link { transition: transform .25s ease, background .25s ease !important; }
        .social-link:hover { transform:scale(1.22) !important; background:#6366f1 !important; }

        .btn-hero-primary {
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border: none; border-radius: 14px;
          color: white; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 24px rgba(99,102,241,.45);
          transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
        }
        .btn-hero-primary:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(99,102,241,.6); filter:brightness(1.08); }
        .btn-hero-primary:active { transform:translateY(0); }

        .btn-hero-secondary {
          background: transparent;
          border: 2px solid rgba(99,102,241,.45); border-radius: 14px;
          color: #a5b4fc; font-weight: 700; cursor: pointer;
          transition: border-color .2s ease, background .2s ease, color .2s ease;
        }
        .btn-hero-secondary:hover { border-color:#6366f1; background:rgba(99,102,241,.1); color:white; }

        .btn-comprar {
          transition: filter .2s ease, transform .1s ease;
          border-radius: 12px;
        }
        .btn-comprar:hover { filter: brightness(1.12); }
        .btn-comprar:active { transform: scale(0.97); }

        .btn-detalle {
          background: none; border: none; color: #818cf8;
          font-size: 12px; cursor: pointer; padding: 0;
          text-align: center; font-weight: 600;
          transition: color .2s;
        }
        .btn-detalle:hover { color: #a5b4fc; }

        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#0a0a0f; }
        ::-webkit-scrollbar-thumb { background:#6366f1; border-radius:10px; }
      `}</style>

      {/* Luz del mouse */}
      <div ref={lightRef} style={{
        position: "fixed", width: 400, height: 400,
        background: "radial-gradient(circle, rgba(99,102,241,.1), transparent 70%)",
        pointerEvents: "none", borderRadius: "50%", zIndex: 0,
        transform: "translate(-50%,-50%)", transition: "left .06s, top .06s",
      }} />

      {/* Fondo sutil */}
      <div style={{
        position: "fixed", inset: 0, zIndex: -1,
        background: "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,.06), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,.05), transparent 55%)",
      }} />

      {/* Modal imagen ampliada */}
      {selectedImg && (
        <div onClick={() => setSelectedImg(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.94)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 20,
        }}>
          <img src={selectedImg} alt="portada" style={{
            maxWidth: "88vw", maxHeight: "88vh", borderRadius: 18,
            objectFit: "contain", animation: "fadeInModal .3s ease",
            boxShadow: "0 0 80px rgba(99,102,241,.35)",
          }} />
          <button onClick={() => setSelectedImg(null)} style={{
            position: "fixed", top: 20, right: 20,
            background: "#ef4444", border: "none", borderRadius: "50%",
            width: 44, height: 44, color: "white", fontSize: 18,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(239,68,68,.4)",
          }}>✕</button>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", textAlign: "center",
        padding: isMobile ? "100px 24px 60px" : "120px 40px 80px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ animation: "fadeIn 1s ease", maxWidth: 720, width: "100%" }}>

          {/* Logo */}
          <div style={{
            width: isMobile ? 100 : 130,
            height: isMobile ? 100 : 130,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1e1b4b, #0f0e1a)",
            border: "2px solid #6366f1",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 28px",
            boxShadow: "0 0 60px rgba(99,102,241,.3)",
            animation: "pulse 3s ease infinite",
          }}>
            <span style={{ fontSize: isMobile ? 48 : 62 }}>📖</span>
          </div>

          {/* Badge */}
          <div style={{
            display: "inline-block",
            background: "rgba(99,102,241,.12)",
            border: "1px solid rgba(99,102,241,.3)",
            borderRadius: 99, padding: "5px 20px",
            color: "#a5b4fc", fontSize: isMobile ? 10 : 12,
            letterSpacing: 4, textTransform: "uppercase", marginBottom: 10,
          }}>
            Asociación de Escritores
          </div>

          <h2 style={{
            color: "white", fontSize: isMobile ? 18 : 24,
            fontWeight: 700, letterSpacing: 3, marginBottom: 32,
            background: "linear-gradient(90deg,#818cf8,#c4b5fd,#818cf8)",
            backgroundSize: "200%",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "gradShift 4s ease infinite",
          }}>
            VANGUARDISTAS 3.0
          </h2>

          {/* Título mecanografiado */}
          <h1 style={{
            fontSize: isMobile ? 30 : 58, fontWeight: 800,
            marginBottom: 24, lineHeight: 1.12,
            minHeight: isMobile ? 80 : 140,
            color: "white",
          }}>
            {typedText}
            <span style={{
              display: "inline-block", width: 3, height: isMobile ? 32 : 54,
              background: "#6366f1", marginLeft: 5, verticalAlign: "middle",
              animation: "pulse 1s ease infinite",
            }} />
          </h1>

          {/* Subtítulo */}
          <p style={{
            color: "#94a3b8", fontSize: isMobile ? 14 : 17,
            maxWidth: 580, margin: "0 auto 48px", lineHeight: 1.9,
            opacity: showSub ? 1 : 0,
            transform: showSub ? "translateY(0)" : "translateY(20px)",
            transition: "all .8s ease",
          }}>
            Publicamos libros y revistas con respaldo legal en Bolivia.
            Somos la Asociación de Escritores Vanguardistas 3.0 —{" "}
            <span style={{ color: "#a5b4fc", fontWeight: 600 }}>El Alto, Bolivia.</span>
          </p>

          {/* CTAs */}
          <div style={{
            display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap",
            opacity: showSub ? 1 : 0, transition: "opacity .8s ease .3s",
          }}>
            <button
              className="btn-hero-primary"
              onClick={() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" })}
              style={{ padding: isMobile ? "13px 30px" : "15px 38px", fontSize: isMobile ? 14 : 16 }}
            >
              Ver servicios →
            </button>
            <button
              className="btn-hero-secondary"
              onClick={() => navigate("/contacto")}
              style={{ padding: isMobile ? "13px 30px" : "15px 38px", fontSize: isMobile ? 14 : 16 }}
            >
              Contactarnos
            </button>
          </div>
        </div>
      </section>

      {/* ── CARRUSEL ── */}
      <div style={{ marginBottom: 70 }}>
        <div style={{ paddingLeft: isMobile ? 20 : 40, marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 18, background: "#6366f1", borderRadius: 99 }} />
          <p style={{ color: "#818cf8", fontSize: 12, textTransform: "uppercase", letterSpacing: 3, margin: 0 }}>
            Publicaciones destacadas
          </p>
        </div>

        <div
          style={{ overflow: "hidden", width: "100%", position: "relative" }}
          onMouseEnter={() => { isPausedRef.current = true; }}
          onMouseLeave={() => { isPausedRef.current = false; }}
        >
          {["left", "right"].map(side => (
            <div key={side} style={{
              position: "absolute", [side]: 0, top: 0, bottom: 0, width: 120,
              background: `linear-gradient(to ${side === "left" ? "right" : "left"}, #000, transparent)`,
              zIndex: 2, pointerEvents: "none",
            }} />
          ))}

          <div ref={trackRef} style={{ display: "flex", gap: 20, padding: "10px 0 24px", willChange: "transform" }}>
            {todasLasImagenes.map((img, idx) => (
              <div
                key={idx}
                className="pub-img"
                onClick={() => setSelectedImg(img.src)}
                style={{
                  flexShrink: 0,
                  width: isMobile ? 180 : 260,
                  height: isMobile ? 250 : 360,
                  borderRadius: 16, overflow: "hidden",
                  border: "1px solid #1e1b4b", background: "#0d0d1a",
                }}
              >
                <img
                  src={img.src} alt={img.alt}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = "none";
                    const p = t.parentElement;
                    if (p) {
                      p.style.background = "linear-gradient(135deg,#1e1b4b,#0f0e1a)";
                      p.style.display = "flex";
                      p.style.alignItems = "center";
                      p.style.justifyContent = "center";
                      p.innerHTML = `<span style="font-size:60px">📚</span>`;
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CATÁLOGO ── */}
      <section style={{
        padding: isMobile ? "40px 20px" : "60px 40px",
        maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1,
      }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,transparent,#312e81)", maxWidth: 100 }} />
            <p style={{ color: "#818cf8", letterSpacing: 4, fontSize: 12, textTransform: "uppercase", margin: 0 }}>
              Catálogo de Servicios
            </p>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to left,transparent,#312e81)", maxWidth: 100 }} />
          </div>
          <h2 style={{ fontSize: isMobile ? 26 : 40, fontWeight: 800, marginBottom: 14, color: "white" }}>
            Nuestros Productos Editoriales
          </h2>
          <p style={{ color: "#475569", fontSize: isMobile ? 13 : 15, maxWidth: 500, margin: "0 auto" }}>
            Elegí el servicio que mejor se adapte a tu proyecto literario.
          </p>
          <div style={{ width: 56, height: 3, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", margin: "22px auto 0", borderRadius: 99 }} />
        </div>

        <div id="catalogo" style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
          gap: 28,
        }}>
          <CatalogoProductos isMobile={isMobile} />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        textAlign: "center", padding: "48px 20px",
        borderTop: "1px solid #1e1b4b",
        fontSize: 13, position: "relative", zIndex: 1, marginTop: 48,
        background: "rgba(99,102,241,.03)",
      }}>
        <span style={{ fontSize: 30 }}>📖</span>
        <p style={{
          background: "linear-gradient(90deg,#818cf8,#c4b5fd)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          fontWeight: 800, fontSize: 15, marginBottom: 8, marginTop: 10,
        }}>
          ASOCIACIÓN DE ESCRITORES VANGUARDISTAS 3.0
        </p>
        <p style={{ color: "#334155" }}>
          © {new Date().getFullYear()} — El Alto, Bolivia. Todos los derechos reservados.
        </p>
      </footer>

      {/* ── REDES SOCIALES FLOTANTES (corregidas) ── */}
      <div style={{
        position: "fixed", right: 20, bottom: 20,
        display: "flex", flexDirection: "column", gap: 10, zIndex: 999,
      }}>
        {[
          { img: "https://cdn-icons-png.flaticon.com/512/733/733585.png", href: "https://wa.me/59167027053", label: "WhatsApp" },
          { img: "https://cdn-icons-png.flaticon.com/512/733/733547.png", href: "https://www.facebook.com/RevistaMiAulaLapizEduTec", label: "Facebook" },
          { img: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png", href: "https://www.tiktok.com/@escritoresvanguardistas", label: "TikTok" },
        ].map((s, i) => (
          <div key={i} style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <span
              className={`tooltip-${i}`}
              style={{
                position: "absolute", right: 56, background: "#1e1b4b",
                color: "white", fontSize: 12, padding: "5px 12px", borderRadius: 8,
                whiteSpace: "nowrap", border: "1px solid #312e81",
                pointerEvents: "none", opacity: 0, transition: "opacity .2s",
              }}
            >
              {s.label}
            </span>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              onMouseEnter={e => {
                const tip = e.currentTarget.parentElement?.querySelector(`.tooltip-${i}`) as HTMLElement;
                if (tip) tip.style.opacity = "1";
              }}
              onMouseLeave={e => {
                const tip = e.currentTarget.parentElement?.querySelector(`.tooltip-${i}`) as HTMLElement;
                if (tip) tip.style.opacity = "0";
              }}
              style={{
                background: "rgba(255,255,255,.06)", backdropFilter: "blur(12px)",
                padding: 10, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 46, height: 46, border: "1px solid #312e81", textDecoration: "none",
              }}
            >
              <img src={s.img} alt={s.label} style={{ width: 22, height: 22 }} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CATÁLOGO DE PRODUCTOS ──
function CatalogoProductos({ isMobile }: { isMobile: boolean }) {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Record<number, FeedbackState>>({});
  const [carrito, setCarrito] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("carrito") || "[]"); }
    catch { return []; }
  });
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

    if (producto.componentes && Array.isArray(producto.componentes) && producto.componentes.length > 0) {
      const totalComponentes = producto.componentes.length;
      const nuevosItems = producto.componentes.map((comp: any, idx: number) => {
        const nombreComp = getComponenteLabel(comp);
        const precioUnitario = comp.precio || (producto.precio / totalComponentes);
        const precioConDescuento = producto.descuento > 0
          ? precioUnitario - (precioUnitario * producto.descuento / 100)
          : precioUnitario;
        return {
          id: `${producto.id}_comp_${idx}`,
          nombre: nombreComp,
          descripcion: `Componente de ${producto.nombre}`,
          precio: precioConDescuento,
          descuento: 0,
          imagenUrl: producto.imagenUrl,
          tipo: comp.tipo,
          componente: true,
          productoPadreId: producto.id,
          nombrePadre: producto.nombre,
        };
      });
      setCarrito(prev => [...prev, ...nuevosItems]);
    } else {
      const tipo = getCategoria(producto.nombre);
      setCarrito(prev => [...prev, { ...producto, tipo }]);
    }

    const pid = producto.id;
    const newToast = ++toastIdRef.current;
    setFeedbacks(prev => ({
      ...prev,
      [pid]: {
        count: (prev[pid]?.count ?? 0) + 1,
        toasts: [...(prev[pid]?.toasts ?? []), { id: newToast }],
        bounce: true,
      },
    }));
    setTimeout(() => setFeedbacks(prev => ({ ...prev, [pid]: { ...prev[pid], bounce: false } })), 300);
    setTimeout(() => setFeedbacks(prev => ({
      ...prev,
      [pid]: { ...prev[pid], toasts: (prev[pid]?.toasts ?? []).filter(t => t.id !== newToast) },
    })), 1800);
  };

  if (loading) return (
    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 80 }}>
      <div style={{
        width: 40, height: 40, border: "3px solid #1e1b4b",
        borderTop: "3px solid #6366f1", borderRadius: "50%",
        margin: "0 auto 20px", animation: "spin .8s linear infinite",
      }} />
      <p style={{ color: "#475569", fontSize: 14 }}>Cargando productos...</p>
    </div>
  );

  if (productos.length === 0) return (
    <p style={{ color: "#475569", textAlign: "center", gridColumn: "1/-1", padding: 60, fontSize: 15 }}>
      Próximamente nuevos servicios.
    </p>
  );

  return (
    <>
      {productos.map((p: any) => {
        const precioFinal = getPrecioFinal(p.precio, p.descuento);
        const fb = feedbacks[p.id];
        const count = fb?.count ?? 0;
        const toasts = fb?.toasts ?? [];
        const bounce = fb?.bounce ?? false;

        return (
          <div
            key={p.id}
            className="card-catalogo"
            style={{
              background: "linear-gradient(160deg, #0d0d1a, #0a0a14)",
              borderRadius: 18,
              border: "1px solid #1e1b4b",
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Imagen */}
            <div
              onClick={() => navigate(`/producto/${p.id}`)}
              style={{
                position: "relative", width: "100%", paddingTop: "140%",
                overflow: "hidden", cursor: "pointer", background: "#0d0d1a",
              }}
            >
              {p.descuento > 0 && (
                <div style={{
                  position: "absolute", top: 12, left: 12, zIndex: 2,
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "white", padding: "4px 12px", borderRadius: 99,
                  fontSize: 12, fontWeight: 700,
                  boxShadow: "0 2px 10px rgba(239,68,68,.4)",
                }}>
                  -{p.descuento}%
                </div>
              )}
              {p.imagenUrl ? (
                <img
                  src={p.imagenUrl} alt={p.nombre}
                  style={{
                    position: "absolute", top: 0, left: 0,
                    width: "100%", height: "100%", objectFit: "cover",
                    transition: "transform .4s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.07)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                />
              ) : (
                <div style={{
                  position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                  background: "linear-gradient(135deg,#1e1b4b,#0f0e1a)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64,
                }}>📦</div>
              )}
            </div>

            {/* Info */}
            <div style={{ padding: 22, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <h3
                onClick={() => navigate(`/producto/${p.id}`)}
                style={{
                  color: "white", fontSize: 17, fontWeight: 700, margin: 0,
                  cursor: "pointer", lineHeight: 1.3,
                  transition: "color .2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#a5b4fc")}
                onMouseLeave={e => (e.currentTarget.style.color = "white")}
              >
                {p.nombre}
              </h3>

              <p style={{
                color: "#64748b", fontSize: 13, lineHeight: 1.7, flex: 1, margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {p.descripcion}
              </p>

              {/* Precio */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                {p.descuento > 0 && (
                  <span style={{ color: "#475569", fontSize: 14, textDecoration: "line-through" }}>
                    Bs {p.precio.toFixed(2)}
                  </span>
                )}
                <span style={{ color: "#34d399", fontSize: 26, fontWeight: 800 }}>
                  Bs {precioFinal.toFixed(2)}
                </span>
              </div>

              {/* Botón */}
              <div style={{ position: "relative", marginTop: 4 }}>
                {toasts.map(toast => (
                  <div key={toast.id} style={{
                    position: "absolute", bottom: "100%", left: "50%",
                    marginBottom: 6, background: "#059669", color: "white",
                    padding: "5px 16px", borderRadius: 99, fontSize: 13,
                    fontWeight: "bold", whiteSpace: "nowrap",
                    pointerEvents: "none",
                    animation: "toastUp 1.8s ease forwards",
                    zIndex: 10, boxShadow: "0 4px 14px rgba(5,150,105,.45)",
                  }}>
                    ✅ ¡Agregado!
                  </div>
                ))}

                <button
                  className="btn-comprar"
                  onClick={e => agregarAlCarrito(p, e)}
                  style={{
                    width: "100%", padding: "12px 0",
                    background: count > 0
                      ? "linear-gradient(135deg,#059669,#047857)"
                      : "linear-gradient(135deg,#10b981,#059669)",
                    border: "none", color: "white", fontWeight: 700, fontSize: 14,
                    cursor: "pointer",
                    animation: bounce ? "btnBounce .3s ease" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <span>🛒 Comprar</span>
                  {count > 0 && (
                    <span style={{
                      background: "rgba(0,0,0,.2)", borderRadius: 99,
                      fontSize: 12, fontWeight: 700, padding: "2px 8px",
                      animation: "badgePop .3s ease",
                    }}>
                      ×{count}
                    </span>
                  )}
                </button>
              </div>

              <button
                className="btn-detalle"
                onClick={() => navigate(`/producto/${p.id}`)}
              >
                Ver detalles →
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default Home;
