import { useEffect, useRef, useState } from "react";
import { useWindowSize } from "../hooks/useWindowSize";

const TOTAL_IMAGENES = 20;

const imagenes = Array.from({ length: TOTAL_IMAGENES }, (_, i) => ({
  id: i + 1,
  src: `/portadas/${i + 1}.jpg`,
  alt: `Publicación ${i + 1}`,
}));

function Publicaciones() {
  const { isMobile } = useWindowSize();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const offsetRef = useRef(0);
 {/* const animRef = useRef<number>();//     ......*/}
  const animRef = useRef<number>(0);  // ✅ Correcto
  const speedRef = useRef(0.5);

  // Duplicamos las imágenes para el loop infinito
  const todasLasImagenes = [...imagenes, ...imagenes, ...imagenes];

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

  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh", paddingTop: 80, overflow: "hidden" }}>
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .pub-img:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 0 30px rgba(59,130,246,0.5) !important;
          border-color: #3b82f6 !important;
          cursor: pointer;
        }
      `}</style>

      {/* MODAL */}
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

      {/* HEADER */}
      <div style={{
        textAlign: "center",
        padding: isMobile ? "40px 20px 30px" : "60px 40px 40px",
      }}>
        <p style={{
          color: "#3b82f6", letterSpacing: 4,
          fontSize: 12, textTransform: "uppercase", marginBottom: 12,
        }}>
          NUESTRO TRABAJO
        </p>
        <h1 style={{ fontSize: isMobile ? 28 : 44, fontWeight: 700, marginBottom: 16 }}>
          Publicaciones
        </h1>
        <div style={{
          width: 60, height: 3, background: "#3b82f6",
          margin: "0 auto 20px", borderRadius: 99,
        }} />
        <p style={{
          color: "#888", fontSize: isMobile ? 14 : 17,
          maxWidth: 600, margin: "0 auto",
        }}>
          Libros y revistas publicados por la Asociación de Escritores Vanguardistas 3.0.
          Haz click en cualquier portada para verla en detalle.
        </p>
      </div>

      {/* CARRUSEL FILA 1 — izquierda a derecha */}
      <div style={{ marginBottom: 30 }}>
        <p style={{
          color: "#3b82f6", fontSize: 12, textTransform: "uppercase",
          letterSpacing: 3, marginBottom: 16, paddingLeft: isMobile ? 40 : 40,
        }}>
          📚 Libros y Revistas
        </p>
        <div
          style={{ overflow: "hidden", width: "100%", position: "relative" }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* GRADIENTES LATERALES */}
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

      {/* CONTADOR */}
      <div style={{
        display: "flex", justifyContent: "center", gap: isMobile ? 20 : 40,
        padding: isMobile ? "20px 20px 40px" : "30px 40px 60px",
        flexWrap: "wrap",
      }}>
        {[
          { icon: "📚", number: "20+", label: "Publicaciones" },
          { icon: "✍️", number: "100+", label: "Autores" },
          { icon: "📘", number: "30+", label: "Revistas" },
          { icon: "🏅", number: "3+", label: "Años" },
        ].map((s) => (
          <div key={s.label} style={{
            textAlign: "center",
            background: "#111", padding: isMobile ? "16px 24px" : "20px 36px",
            borderRadius: 12, border: "1px solid #222",
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
            <div style={{
              fontSize: isMobile ? 24 : 32, fontWeight: 700,
              color: "#3b82f6", marginBottom: 4,
            }}>
              {s.number}
            </div>
            <div style={{ color: "#888", fontSize: 13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <footer style={{
        textAlign: "center", padding: "24px 20px",
        color: "#555", borderTop: "1px solid #222", fontSize: 13,
      }}>
        <p style={{ color: "#3b82f6", fontWeight: 700, marginBottom: 8 }}>
          ASOCIACIÓN DE ESCRITORES VANGUARDISTAS 3.0
        </p>
        <p>© {new Date().getFullYear()} — El Alto, Bolivia.</p>
      </footer>
    </div>
  );
}

export default Publicaciones;