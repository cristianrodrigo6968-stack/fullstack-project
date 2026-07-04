import { useNavigate } from "react-router-dom";
import { useWindowSize } from "../../hooks/useWindowSize";

function Servicios() {
  const { isMobile } = useWindowSize();
  const navigate = useNavigate();

  const servicios = [
    {
      icon: "📚",
      title: "Elaboración y Publicación de Libros",
      desc: "Te ayudamos a transformar tu manuscrito en un libro publicado con respaldo legal en Bolivia. Incluye ISBN, registro de autoría y distribución.",
      detalle: ["Edición y corrección de texto", "Diseño de portada profesional", "ISBN y registro legal", "Distribución digital y física"],
    },
    {
      icon: "📘",
      title: "Dirección de Revistas",
      desc: "Gestionamos revistas editoriales completas con artículos académicos, autores y ediciones periódicas de alta calidad.",
      detalle: ["Hasta 3 ediciones por contrato", "1 artículo por edición", "Diseño editorial profesional", "Distribución y publicación"],
    },
    {
      icon: "🖨️",
      title: "Impresión Profesional",
      desc: "Impresión de libros, revistas y documentos con acabado profesional y materiales de alta calidad.",
      detalle: ["Impresión a color y blanco/negro", "Encuadernado profesional", "Diferentes formatos disponibles", ],
    },
    {
      icon: "✍️",
      title: "Publicación y Redacción de Artículos",
      desc: "Redactamos y publicamos artículos académicos y de investigación en nuestras revistas con respaldo científico.",
      detalle: ["Redacción académica profesional", "Revisión y corrección", "Publicación en revista indexada", "Certificado de publicación"],
    },
    {
      icon: "📜",
      title: "Repositorio - SENAPI",
      desc: "Tramitamos el registro legal de tu obra ante el SENAPI y otras autoridades competentes de Bolivia.",
      detalle: ["Registro ante SENAPI", "Certificado de derechos de autor", "Deposito Legal", ],
    },
    {
      icon: "🏆",
      title: "Ser Fundador de una Revista",
      desc: "Conviértete en fundador de una revista editorial con tu nombre como director y beneficios exclusivos de por vida.",
      detalle: ["Tu nombre como director fundador", "Participación en todas las ediciones", "Certificado de fundador", ],
    },
  ];

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh", paddingTop: 80, overflowX: "hidden" }}>
      <style>{`
        .serv-card:hover { transform: translateY(-8px) !important; border-color: #6366f1 !important; box-shadow: 0 24px 48px rgba(99,102,241,.15) !important; }
        .detalle-item::before { content: "✓ "; color: #34d399; font-weight: bold; }
      `}</style>

      {/* HEADER */}
      <div style={{
        textAlign: "center", padding: isMobile ? "40px 20px 20px" : "60px 40px 20px",
        position: "relative", zIndex: 1,
      }}>
        <p style={{
          color: "#818cf8", letterSpacing: 4,
          fontSize: 12, textTransform: "uppercase", marginBottom: 12,
        }}>
          LO QUE HACEMOS
        </p>
        <h1 style={{ fontSize: isMobile ? 26 : 44, fontWeight: 700, marginBottom: 16, wordBreak: "break-word" }}>
          Nuestros Servicios
        </h1>
        <div style={{
          width: 60, height: 3, background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
          margin: "0 auto 20px", borderRadius: 99,
        }} />
        <p style={{ color: "#94a3b8", fontSize: isMobile ? 13 : 17, maxWidth: 600, margin: "0 auto", wordBreak: "break-word" }}>
          Ofrecemos servicios editoriales completos para escritores, investigadores y profesionales de Bolivia.
        </p>
      </div>

      {/* GRID DE SERVICIOS */}
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: isMobile ? "30px 20px 60px" : "50px 40px 80px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: 24,
      }}>
        {servicios.map((s) => (
          <div key={s.title} className="serv-card" style={{
            background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", padding: isMobile ? 22 : 28, borderRadius: 16,
            border: "1px solid #1e1b4b", transition: "all 0.4s ease",
          }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>{s.icon}</div>
            <h3 style={{
              marginBottom: 12, fontSize: isMobile ? 16 : 18,
              color: "#a5b4fc", fontWeight: 700, wordBreak: "break-word",
            }}>
              {s.title}
            </h3>
            <p style={{ color: "#94a3b8", lineHeight: 1.8, fontSize: isMobile ? 13 : 14, marginBottom: 20, wordBreak: "break-word" }}>
              {s.desc}
            </p>
            <div style={{
              borderTop: "1px solid #1e1b4b", paddingTop: 16,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {s.detalle.map((d) => (
                <p key={d} className="detalle-item" style={{ color: "#cbd5e1", fontSize: 13, wordBreak: "break-word" }}>{d}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        textAlign: "center", padding: isMobile ? "20px 20px 60px" : "20px 40px 80px",
      }}>
        <p style={{ color: "#94a3b8", marginBottom: 20, fontSize: isMobile ? 14 : 16 }}>
          ¿Listo para publicar tu obra?
        </p>
       
      </div>

      {/* FOOTER */}
      <footer style={{
        textAlign: "center", padding: "24px 20px",
        color: "#334155", borderTop: "1px solid #1e1b4b", fontSize: 13,
      }}>
        <p style={{
          background: "linear-gradient(90deg,#818cf8,#c4b5fd)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          fontWeight: 700, marginBottom: 8,
        }}>
          ASOCIACIÓN DE ESCRITORES VANGUARDISTAS 3.0
        </p>
        <p>© {new Date().getFullYear()} — El Alto, Bolivia.</p>
      </footer>
    </div>
  );
}

export default Servicios;
