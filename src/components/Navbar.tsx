import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, username } = useAuth();
  const { isMobile } = useWindowSize();
  const [menuOpen, setMenuOpen] = useState(false);
  const [carritoCount, setCarritoCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  const links = [
    { label: "Inicio", path: "/" },
    { label: "Servicios", path: "/servicios" },
    { label: "Acerca de", path: "/acerca" },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Carrito update
  useEffect(() => {
    const update = () => {
      try {
        const c = JSON.parse(localStorage.getItem("carrito") || "[]");
        setCarritoCount(c.length);
      } catch { setCarritoCount(0); }
    };
    update();
    window.addEventListener("storage", update);
    const interval = setInterval(update, 1000);
    return () => {
      window.removeEventListener("storage", update);
      clearInterval(interval);
    };
  }, []);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/formulario") ||
    location.pathname.startsWith("/cliente")
  ) return null;

  return (
    <nav style={{
      position: "fixed", width: "100%", top: 0, zIndex: 1000,
      background: scrolled ? "rgba(0,0,0,.92)" : "rgba(0,0,0,.7)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? "rgba(99,102,241,.3)" : "rgba(99,102,241,.15)"}`,
      transition: "background .3s, border-color .3s, box-shadow .3s",
      boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,.4)" : "none",
    }}>
      <style>{`
        .nav-link {
          background: none; border: none; cursor: pointer;
          font-size: 14px; font-weight: 500; padding-bottom: 2px;
          transition: color .2s, border-color .2s;
          font-family: inherit;
        }
        .nav-link:hover { color: #a5b4fc !important; }

        .btn-login {
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border: none; padding: 9px 22px; border-radius: 10px;
          color: white; cursor: pointer; font-weight: 700; font-size: 14px;
          font-family: inherit;
          box-shadow: 0 2px 14px rgba(99,102,241,.35);
          transition: filter .2s, transform .15s, box-shadow .2s;
        }
        .btn-login:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(99,102,241,.5); }
        .btn-login:active { transform: translateY(0); }

        .btn-panel {
          background: #0f0e1a; border: 1px solid #312e81;
          padding: 8px 18px; border-radius: 10px;
          color: #a5b4fc; cursor: pointer; font-weight: 600; font-size: 14px;
          font-family: inherit; transition: background .2s, border-color .2s;
        }
        .btn-panel:hover { background: #1e1b4b; border-color: #6366f1; }

        .btn-logout {
          background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.3);
          padding: 8px 18px; border-radius: 10px;
          color: #f87171; cursor: pointer; font-weight: 600; font-size: 14px;
          font-family: inherit; transition: background .2s, border-color .2s;
        }
        .btn-logout:hover { background: rgba(239,68,68,.22); border-color: #ef4444; }

        .btn-pagar {
          background: linear-gradient(135deg,#10b981,#059669);
          border: none; border-radius: 10px;
          color: white; cursor: pointer; font-weight: 700; font-size: 14px;
          font-family: inherit; display: flex; align-items: center; gap: 6px;
          box-shadow: 0 2px 12px rgba(16,185,129,.3);
          transition: filter .2s, transform .15s;
        }
        .btn-pagar:hover { filter: brightness(1.1); transform: translateY(-1px); }

        .mobile-link {
          background: none; border: none; cursor: pointer;
          color: #ccc; padding: 13px 0; font-size: 15px;
          text-align: left; border-bottom: 1px solid #0d0d1a;
          font-family: inherit; transition: color .2s;
          width: 100%;
        }
        .mobile-link:hover { color: #a5b4fc; }
      `}</style>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: isMobile ? "14px 20px" : "16px 40px",
      }}>
        {/* LOGO */}
        <div
          onClick={() => { navigate("/"); setMenuOpen(false); }}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: "bold", color: "white",
            boxShadow: "0 2px 12px rgba(99,102,241,.4)",
          }}>
            V
          </div>
          <div>
            <p style={{ color: "#818cf8", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", lineHeight: 1, margin: 0 }}>
              ASOCIACIÓN DE ESCRITORES
            </p>
            <p style={{ color: "white", fontSize: isMobile ? 13 : 15, fontWeight: 700, letterSpacing: 1, margin: 0 }}>
              VANGUARDISTAS 3.0
            </p>
          </div>
        </div>

        {/* DESKTOP */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Carrito */}
            <button
              onClick={() => navigate("/carrito")}
              style={{
                background: "none", border: "none", color: "white",
                cursor: "pointer", fontSize: 20, position: "relative", padding: 4,
              }}
            >
              🛒
              {carritoCount > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -8,
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  borderRadius: "50%", width: 20, height: 20,
                  fontSize: 11, display: "flex", alignItems: "center",
                  justifyContent: "center", fontWeight: "bold", color: "white",
                  boxShadow: "0 2px 8px rgba(239,68,68,.5)",
                }}>
                  {carritoCount}
                </span>
              )}
            </button>

            {carritoCount > 0 && (
              <button
                className="btn-pagar"
                onClick={() => navigate("/carrito#pago")}
                style={{ padding: "8px 18px" }}
              >
                💳 Pagar
              </button>
            )}

            {!isAuthenticated ? (
              <>
                {links.map(l => (
                  <button
                    key={l.label}
                    onClick={() => navigate(l.path)}
                    className="nav-link"
                    style={{
                      color: isActive(l.path) ? "#a5b4fc" : "#94a3b8",
                      borderBottom: isActive(l.path) ? "2px solid #6366f1" : "2px solid transparent",
                    }}
                  >
                    {l.label}
                  </button>
                ))}
                <button className="btn-login" onClick={() => navigate("/login")}>
                  Iniciar sesión
                </button>
              </>
            ) : (
              <>
                <span style={{ color: "#818cf8", fontSize: 14 }}>👤 {username}</span>
                <button className="btn-panel" onClick={() => navigate("/admin")}>Panel</button>
                <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
              </>
            )}
          </div>
        )}

        {/* MOBILE TOP */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => navigate("/carrito")}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20, position: "relative", padding: 4 }}
            >
              🛒
              {carritoCount > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -8,
                  background: "#ef4444", borderRadius: "50%",
                  width: 20, height: 20, fontSize: 11,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: "bold", color: "white",
                }}>
                  {carritoCount}
                </span>
              )}
            </button>

            {carritoCount > 0 && (
              <button
                className="btn-pagar"
                onClick={() => navigate("/carrito#pago")}
                style={{ padding: "6px 14px", fontSize: 13 }}
              >
                💳 Pagar
              </button>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: menuOpen ? "rgba(99,102,241,.15)" : "none",
                border: menuOpen ? "1px solid rgba(99,102,241,.3)" : "1px solid transparent",
                color: "white", cursor: "pointer", fontSize: 22,
                borderRadius: 8, width: 38, height: 38,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background .2s, border-color .2s",
              }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        )}
      </div>

      {/* MOBILE MENU */}
      {isMobile && menuOpen && (
        <div style={{
          background: "rgba(5,5,15,.97)",
          padding: "8px 20px 24px",
          borderTop: "1px solid rgba(99,102,241,.2)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {!isAuthenticated ? (
            <>
              {links.map(l => (
                <button
                  key={l.label}
                  className="mobile-link"
                  onClick={() => { navigate(l.path); setMenuOpen(false); }}
                  style={{ color: isActive(l.path) ? "#a5b4fc" : "#94a3b8", fontWeight: isActive(l.path) ? 700 : 400 }}
                >
                  {l.label}
                </button>
              ))}
              <button
                className="btn-login"
                onClick={() => { navigate("/login"); setMenuOpen(false); }}
                style={{ marginTop: 14, padding: 14, fontSize: 15, width: "100%" }}
              >
                Iniciar sesión
              </button>
            </>
          ) : (
            <>
              <p style={{ color: "#818cf8", fontSize: 13, margin: "10px 0 4px" }}>👤 {username}</p>
              <button
                className="btn-panel"
                onClick={() => { navigate("/admin"); setMenuOpen(false); }}
                style={{ padding: 12, fontSize: 15, width: "100%", marginBottom: 8, borderRadius: 10 }}
              >
                Panel
              </button>
              <button
                className="btn-logout"
                onClick={handleLogout}
                style={{ padding: 12, fontSize: 15, width: "100%", borderRadius: 10 }}
              >
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
