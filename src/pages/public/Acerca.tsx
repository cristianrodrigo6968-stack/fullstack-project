import { useWindowSize } from "../../hooks/useWindowSize";

function Acerca() {
  const { isMobile } = useWindowSize();

  const valores = [
    { icon: "🎯", title: "Misión", desc: "Apoyar a escritores, investigadores y profesionales de Bolivia en la publicación y difusión de sus obras con respaldo legal, calidad editorial y alcance nacional." },
    { icon: "🔭", title: "Visión", desc: "Ser la asociación editorial líder de Bolivia, reconocida por la calidad de sus publicaciones y el respaldo que brinda a sus autores a nivel nacional e internacional." },
    { icon: "💎", title: "Valores", desc: "Trabajamos con compromiso, transparencia y dedicación. Cada obra que publicamos lleva el sello de calidad y profesionalismo de nuestra asociación." },
  ];

  const equipo = [
    { nombre: "Equipo Editorial", rol: "Redacción y corrección", icon: "✍️" },
    { nombre: "Equipo de Diseño", rol: "Diseño y diagramación", icon: "🎨" },
    { nombre: "Equipo Legal", rol: "Registro y derechos de autor", icon: "📜" },
    { nombre: "Equipo de Impresión", rol: "Producción y acabado", icon: "🖨️" },
  ];

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh", paddingTop: 80 }}>
      <style>{`
        .valor-card:hover { transform: translateY(-8px) !important; border-color: #3b82f6 !important; }
        .equipo-card:hover { transform: translateY(-6px) !important; }
      `}</style>

      {/* HEADER */}
      <div style={{
        textAlign: "center",
        padding: isMobile ? "40px 20px 20px" : "60px 40px 20px",
      }}>
        <p style={{
          color: "#3b82f6", letterSpacing: 4,
          fontSize: 12, textTransform: "uppercase", marginBottom: 12,
        }}>
          QUIÉNES SOMOS
        </p>
        <h1 style={{ fontSize: isMobile ? 28 : 44, fontWeight: 700, marginBottom: 16 }}>
          Acerca de Nosotros
        </h1>
        <div style={{
          width: 60, height: 3, background: "#3b82f6",
          margin: "0 auto 20px", borderRadius: 99,
        }} />
      </div>

      {/* HISTORIA */}
      <div style={{
        maxWidth: 800, margin: "0 auto",
        padding: isMobile ? "20px 20px 40px" : "20px 40px 60px",
        textAlign: "center",
      }}>
        <div style={{
          background: "#111", padding: isMobile ? 24 : 40,
          borderRadius: 20, border: "1px solid #222",
          borderLeft: "4px solid #3b82f6",
        }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📖</p>
          <h2 style={{ color: "#3b82f6", marginBottom: 16, fontSize: isMobile ? 20 : 24 }}>
            Nuestra Historia
          </h2>
          <p style={{
            color: "#aaa", fontSize: isMobile ? 15 : 17,
            lineHeight: 2, marginBottom: 16,
          }}>
            Fundada en <span style={{ color: "#3b82f6", fontWeight: 700 }}>abril de 2023</span>,
            la <span style={{ color: "white", fontWeight: 700 }}>Asociación de Escritores Vanguardistas 3.0</span> nació
            con el objetivo de apoyar a escritores y profesionales de El Alto y Bolivia en la
            publicación de sus obras literarias y académicas.
          </p>
          <p style={{
            color: "#aaa", fontSize: isMobile ? 15 : 17,
            lineHeight: 2,
          }}>
            En estos <span style={{ color: "#3b82f6", fontWeight: 700 }}>3 años</span> hemos
            publicado más de 50 libros, editado más de 30 revistas y apoyado a más de 100 autores
            a hacer realidad su sueño de publicar. Somos una organización comprometida con la
            cultura y el conocimiento boliviano.
          </p>
        </div>
      </div>

      {/* MISIÓN VISIÓN VALORES */}
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: isMobile ? "0 20px 40px" : "0 40px 60px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: 24,
      }}>
        {valores.map((v) => (
          <div key={v.title} className="valor-card" style={{
            background: "#111", padding: 28, borderRadius: 16,
            border: "1px solid #222", transition: "all 0.4s ease",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{v.icon}</div>
            <h3 style={{ color: "#3b82f6", marginBottom: 12, fontSize: 20 }}>{v.title}</h3>
            <p style={{ color: "#888", lineHeight: 1.8, fontSize: 14 }}>{v.desc}</p>
          </div>
        ))}
      </div>

      {/* EQUIPO */}
      <div style={{
        background: "#0a0a0a",
        padding: isMobile ? "40px 20px" : "60px 40px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{
            color: "#3b82f6", textAlign: "center", letterSpacing: 4,
            fontSize: 12, textTransform: "uppercase", marginBottom: 12,
          }}>
            NUESTRO EQUIPO
          </p>
          <h2 style={{
            fontSize: isMobile ? 24 : 36, textAlign: "center",
            marginBottom: 40, fontWeight: 700,
          }}>
            Quiénes nos conforman
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 20,
          }}>
            {equipo.map((e) => (
              <div key={e.nombre} className="equipo-card" style={{
                background: "#111", padding: 24, borderRadius: 16,
                border: "1px solid #222", textAlign: "center",
                transition: "all 0.4s ease",
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{e.icon}</div>
                <h4 style={{ color: "white", marginBottom: 6, fontSize: 14 }}>{e.nombre}</h4>
                <p style={{ color: "#3b82f6", fontSize: 12 }}>{e.rol}</p>
              </div>
            ))}
          </div>
        </div>
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

export default Acerca;
