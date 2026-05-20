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

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  const links = [
    { label: "Inicio", path: "/" },
    { label: "Servicios", path: "/servicios" },
    { label: "Acerca de", path: "/acerca" },
    { label: "Publicaciones", path: "/publicaciones" },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const update = () => {
      try {
        const c = JSON.parse(localStorage.getItem("carrito") || "[]");
        setCarritoCount(c.length);
      } catch {
        setCarritoCount(0);
      }
    };
    update();
    window.addEventListener("storage", update);
    const interval = setInterval(update, 1000);
    return () => {
      window.removeEventListener("storage", update);
      clearInterval(interval);
    };
  }, []);

  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/formulario") ||
    location.pathname.startsWith("/cliente")
  ) {
    return null;
  }

  return (
    <nav
      style={{
        position: "fixed",
        width: "100%",
        top: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(59,130,246,0.2)",
      }}
    >
      <style>{`
        .nav-link { transition: color 0.3s; }
        .nav-link:hover { color: #3b82f6 !important; }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "16px 20px" : "18px 40px",
        }}
      >
        {/* LOGO */}
        <div
          onClick={() => {
            navigate("/");
            setMenuOpen(false);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: "bold",
              color: "white",
            }}
          >
            V
          </div>
          <div>
            <p
              style={{
                color: "#3b82f6",
                fontSize: 9,
                letterSpacing: 2,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              ASOCIACIÓN DE ESCRITORES
            </p>
            <p
              style={{
                color: "white",
                fontSize: isMobile ? 13 : 15,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              VANGUARDISTAS 3.0
            </p>
          </div>
        </div>

        {/* DESKTOP */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Ícono del carrito */}
            <button
              onClick={() => navigate("/carrito")}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: 20,
                position: "relative",
                padding: "4px",
              }}
            >
              🛒
              {carritoCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -8,
                    background: "#ef4444",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    color: "white",
                  }}
                >
                  {carritoCount}
                </span>
              )}
            </button>

            {/* Botón PAGAR (visible solo si hay productos) */}
            {carritoCount > 0 && (
              <button
                onClick={() => navigate("/carrito#pago")}
                style={{
                  background: "#22c55e",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: 8,
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                💳 Pagar
              </button>
            )}

            {!isAuthenticated ? (
              <>
                {links.map((l) => (
                  <button
                    key={l.label}
                    onClick={() => navigate(l.path)}
                    className="nav-link"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: isActive(l.path) ? "#3b82f6" : "#ccc",
                      fontSize: 14,
                      fontWeight: isActive(l.path) ? 700 : 500,
                      borderBottom: isActive(l.path)
                        ? "2px solid #3b82f6"
                        : "2px solid transparent",
                      paddingBottom: 2,
                    }}
                  >
                    {l.label}
                  </button>
                ))}
                <button
                  onClick={() => navigate("/login")}
                  style={{
                    background: "#3b82f6",
                    border: "none",
                    padding: "8px 20px",
                    borderRadius: 8,
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Iniciar sesión
                </button>
              </>
            ) : (
              <>
                <span style={{ color: "#3b82f6", fontSize: 14 }}>
                  👤 {username}
                </span>
                <button
                  onClick={() => navigate("/admin")}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    padding: "8px 18px",
                    borderRadius: 8,
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Panel
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    background: "#ef4444",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: 8,
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        )}

        {/* MOBILE */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Ícono del carrito (móvil) */}
            <button
              onClick={() => navigate("/carrito")}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: 20,
                position: "relative",
                padding: "4px",
              }}
            >
              🛒
              {carritoCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -8,
                    background: "#ef4444",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    color: "white",
                  }}
                >
                  {carritoCount}
                </span>
              )}
            </button>

            {/* Botón PAGAR móvil */}
            {carritoCount > 0 && (
              <button
                onClick={() => navigate("/carrito#pago")}
                style={{
                  background: "#22c55e",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 8,
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                💳 Pagar
              </button>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: 24,
              }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        )}
      </div>

      {/* MOBILE MENU */}
      {isMobile && menuOpen && (
        <div
          style={{
            background: "rgba(0,0,0,0.95)",
            padding: "12px 20px 20px",
            borderTop: "1px solid rgba(59,130,246,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {!isAuthenticated ? (
            <>
              {links.map((l) => (
                <button
                  key={l.label}
                  onClick={() => {
                    navigate(l.path);
                    setMenuOpen(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: isActive(l.path) ? "#3b82f6" : "#ccc",
                    padding: "12px 0",
                    fontSize: 15,
                    textAlign: "left",
                    borderBottom: "1px solid #111",
                    fontWeight: isActive(l.path) ? 700 : 400,
                  }}
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => {
                  navigate("/login");
                  setMenuOpen(false);
                }}
                style={{
                  marginTop: 12,
                  background: "#3b82f6",
                  border: "none",
                  padding: 14,
                  borderRadius: 8,
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 15,
                  width: "100%",
                }}
              >
                Iniciar sesión
              </button>
            </>
          ) : (
            <>
              <p style={{ color: "#3b82f6", fontSize: 13, margin: "8px 0" }}>
                👤 {username}
              </p>
              <button
                onClick={() => {
                  navigate("/admin");
                  setMenuOpen(false);
                }}
                style={{
                  background: "#1e293b",
                  border: "none",
                  padding: 12,
                  borderRadius: 8,
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 15,
                  width: "100%",
                  marginBottom: 8,
                }}
              >
                Panel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  background: "#ef4444",
                  border: "none",
                  padding: 12,
                  borderRadius: 8,
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 15,
                  width: "100%",
                }}
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