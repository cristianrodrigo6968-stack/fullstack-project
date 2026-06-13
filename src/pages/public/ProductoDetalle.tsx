import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWindowSize } from "../../hooks/useWindowSize";

interface Toast { id: number; y: number; }

function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();
  const [producto, setProducto] = useState<any | null>(null);
  const [todosLosProductos, setTodosLosProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [vecesAgregado, setVecesAgregado] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [btnBounce, setBtnBounce] = useState(false);

  const [carrito, setCarrito] = useState<any[]>(() => {
    const saved = localStorage.getItem("carrito");
    return saved ? JSON.parse(saved) : [];
  });

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

  useEffect(() => {
    setLoading(true);
   fetch(`${import.meta.env.VITE_API_URL}/productos`)
      .then(r => r.json())
      .then((data: any[]) => {
        const encontrado = data.find(p => String(p.id) === String(id));
        setProducto(encontrado || null);
        setTodosLosProductos(data.filter(p => String(p.id) !== String(id)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (p: any) => {
    const tipo = getCategoria(p.nombre);
    setCarrito(prev => [...prev, { ...p, tipo }]);
    setVecesAgregado(prev => prev + 1);
    setBtnBounce(true);
    setTimeout(() => setBtnBounce(false), 300);
    const newId = ++toastIdRef.current;
    const randomY = Math.floor(Math.random() * 20);
    setToasts(prev => [...prev, { id: newId, y: randomY }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newId)), 1800);
  };

  if (loading) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, border: "3px solid #1e1b4b",
          borderTop: "3px solid #6366f1", borderRadius: "50%",
          margin: "0 auto 16px", animation: "spin .8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#475569", fontSize: 14 }}>Cargando producto...</p>
      </div>
    </div>
  );

  if (!producto) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <div style={{ fontSize: 64 }}>📭</div>
      <p style={{ color: "#94a3b8", fontSize: 18 }}>Producto no encontrado.</p>
      <button
        onClick={() => navigate("/")}
        style={{
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          border: "none", padding: "11px 24px", borderRadius: 10,
          color: "white", fontWeight: "bold", cursor: "pointer",
          fontSize: 14, boxShadow: "0 4px 16px rgba(99,102,241,.4)",
        }}
      >
        ← Volver al catálogo
      </button>
    </div>
  );

  const precioFinal = producto.descuento > 0
    ? producto.precio - (producto.precio * producto.descuento / 100)
    : producto.precio;

  const descripcionLimpia = (desc: string) => {
    if (!desc) return "";
    if (desc.includes("const options") || desc.includes("format:")) {
      return "Descripción no disponible. Por favor, contactá al administrador.";
    }
    return desc;
  };

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh", paddingTop: 80 }}>
      <style>{`
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes toastUp    { 0%{opacity:0;transform:translateY(0px) scale(.8)} 15%{opacity:1;transform:translateY(-10px) scale(1)} 70%{opacity:1;transform:translateY(-28px) scale(1)} 100%{opacity:0;transform:translateY(-44px) scale(.9)} }
        @keyframes btnBounce  { 0%{transform:scale(1)} 40%{transform:scale(.94)} 70%{transform:scale(1.04)} 100%{transform:scale(1)} }
        @keyframes badgePop   { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeModal  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }

        .prod-card-mini {
          background: #0d0d1a; border-radius: 14px; overflow: hidden;
          cursor: pointer; border: 1px solid #1e1b4b;
          transition: border-color .2s, transform .2s, box-shadow .2s;
        }
        .prod-card-mini:hover { border-color:#6366f1; transform:translateY(-4px); box-shadow:0 12px 28px rgba(99,102,241,.15); }

        .btn-comprar-detalle {
          width: 100%; padding: 16px; border: none; border-radius: 14px;
          color: white; font-weight: bold; font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: filter .2s, transform .1s;
        }
        .btn-comprar-detalle:hover { filter: brightness(1.1); }
        .btn-comprar-detalle:active { transform: scale(0.98); }

        .btn-ir-carrito {
          width: 100%; padding: 14px;
          background: transparent; border: 2px solid #4f46e5; border-radius: 14px;
          color: #818cf8; font-weight: bold; font-size: 16px; cursor: pointer;
          transition: background .2s, border-color .2s, color .2s;
        }
        .btn-ir-carrito:hover { background:rgba(99,102,241,.1); border-color:#6366f1; color:white; }

        .btn-volver {
          background: none; border: none;
          color: #818cf8; cursor: pointer; font-size: 14px;
          padding: 0; display: inline-flex; align-items: center; gap: 6px;
          transition: color .2s;
        }
        .btn-volver:hover { color: #a5b4fc; }
      `}</style>

      {/* Modal imagen */}
      {showImageModal && (
        <div
          onClick={() => setShowImageModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.95)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, cursor: "zoom-out",
            padding: "60px 24px 24px", boxSizing: "border-box",
          }}
        >
          <img
            src={producto.imagenUrl} alt={producto.nombre}
            style={{
              maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
              borderRadius: 16, display: "block",
              boxShadow: "0 0 80px rgba(99,102,241,.3)",
              animation: "fadeModal .3s ease",
            }}
          />
          <button
            onClick={e => { e.stopPropagation(); setShowImageModal(false); }}
            style={{
              position: "fixed", top: 16, right: 16,
              background: "rgba(99,102,241,.2)", border: "1px solid rgba(99,102,241,.4)",
              color: "white", fontSize: 20, cursor: "pointer", borderRadius: "50%",
              width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)", zIndex: 1001,
            }}
          >✕</button>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px 20px" : "20px 40px" }}>
        <button className="btn-volver" onClick={() => navigate("/")}>
          ← Volver al catálogo
        </button>
      </div>

      {/* Título y precio */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "0 20px 28px" : "0 40px 28px" }}>
        <h1 style={{ fontSize: isMobile ? 22 : 34, fontWeight: 700, color: "#f1f5f9", margin: "0 0 16px 0", lineHeight: 1.2 }}>
          {producto.nombre}
        </h1>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          {producto.descuento > 0 && (
            <span style={{ color: "#ef4444", fontSize: 18, textDecoration: "line-through" }}>
              Bs {producto.precio.toFixed(2)}
            </span>
          )}
          <span style={{ color: "#34d399", fontSize: 38, fontWeight: "bold" }}>
            Bs {precioFinal.toFixed(2)}
          </span>
          {producto.descuento > 0 && (
            <span style={{
              background: "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "white", padding: "4px 14px", borderRadius: 99,
              fontSize: 14, fontWeight: "bold",
              boxShadow: "0 2px 10px rgba(239,68,68,.35)",
            }}>
              -{producto.descuento}%
            </span>
          )}
        </div>
      </div>

      {/* Imagen + descripción */}
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: isMobile ? "0 20px" : "0 40px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 48,
        alignItems: "start",
      }}>
        {/* Imagen */}
        <div
          onClick={() => producto.imagenUrl && setShowImageModal(true)}
          style={{
            borderRadius: 20, cursor: producto.imagenUrl ? "zoom-in" : "default",
            overflow: "hidden",
            background: producto.imagenUrl ? "transparent" : "#0d0d1a",
            border: "1px solid #1e1b4b",
            transition: "box-shadow .3s",
            boxShadow: "0 8px 32px rgba(0,0,0,.4)",
          }}
          onMouseEnter={e => { if (producto.imagenUrl) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 48px rgba(99,102,241,.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,.4)"; }}
        >
          {producto.imagenUrl ? (
            <img
              src={producto.imagenUrl} alt={producto.nombre}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          ) : (
            <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px", opacity: 0.3 }}>
              📦
            </div>
          )}
        </div>

        {/* Descripción y botones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Descripción en card */}
          <div style={{
            background: "#0d0d1a", border: "1px solid #1e1b4b", borderRadius: 14, padding: "20px 22px",
          }}>
            <p style={{ color: "#8b929e", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontWeight: 600 }}>
              Descripción
            </p>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.85, whiteSpace: "pre-wrap", margin: 0 }}>
              {descripcionLimpia(producto.descripcion)}
            </p>
          </div>

          {/* Botón comprar */}
          <div style={{ position: "relative" }}>
            {toasts.map(toast => (
              <div
                key={toast.id}
                style={{
                  position: "absolute", bottom: "100%", left: "50%",
                  transform: "translateX(-50%)",
                  marginBottom: 8 + toast.y,
                  background: "#059669", color: "white",
                  padding: "7px 18px", borderRadius: 99,
                  fontSize: 14, fontWeight: "bold", whiteSpace: "nowrap",
                  pointerEvents: "none",
                  animation: "toastUp 1.8s ease forwards",
                  zIndex: 10, boxShadow: "0 4px 16px rgba(5,150,105,.45)",
                }}
              >
                ✅ ¡Agregado al carrito!
              </div>
            ))}

            <button
              className="btn-comprar-detalle"
              onClick={() => agregarAlCarrito(producto)}
              style={{
                background: vecesAgregado > 0
                  ? "linear-gradient(135deg,#059669,#047857)"
                  : "linear-gradient(135deg,#10b981,#059669)",
                animation: btnBounce ? "btnBounce 0.3s ease" : "none",
                boxShadow: "0 4px 20px rgba(16,185,129,.3)",
              }}
            >
              <span>🛒 Comprar — Bs {precioFinal.toFixed(2)}</span>
              {vecesAgregado > 0 && (
                <span style={{
                  background: "rgba(0,0,0,.2)", borderRadius: 99,
                  fontSize: 13, fontWeight: 700, padding: "2px 10px",
                  animation: "badgePop 0.3s ease",
                }}>
                  ×{vecesAgregado}
                </span>
              )}
            </button>
          </div>

          <button className="btn-ir-carrito" onClick={() => navigate("/carrito")}>
            Ir al carrito ({carrito.length})
          </button>

      
  
        </div>
      </div>

      {/* Otros productos */}
      {todosLosProductos.length > 0 && (
        <div style={{ maxWidth: 1100, margin: "50px auto 0", padding: isMobile ? "0 20px 70px" : "0 40px 70px" }}>
          <div style={{ borderTop: "1px solid #1e1b4b", paddingTop: 44 }}>
            <h3 style={{ fontSize: 20, marginBottom: 26, color: "#cbd5e1", fontWeight: 700 }}>
              📦 Más productos
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
              gap: 20,
            }}>
              {todosLosProductos.map((p: any) => {
                const precio = p.descuento > 0 ? p.precio - (p.precio * p.descuento / 100) : p.precio;
                return (
                  <div
                    key={p.id}
                    className="prod-card-mini"
                    onClick={() => navigate(`/producto/${p.id}`)}
                  >
                    {p.imagenUrl ? (
                      <img src={p.imagenUrl} alt={p.nombre} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: 160, background: "#1e1b4b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>📦</div>
                    )}
                    <div style={{ padding: 14 }}>
                      <h4 style={{ color: "white", fontSize: 13, marginBottom: 7, marginTop: 0, lineHeight: 1.3 }}>{p.nombre}</h4>
                      {p.descuento > 0 && (
                        <span style={{ color: "#64748b", fontSize: 12, textDecoration: "line-through", marginRight: 6 }}>
                          Bs {p.precio.toFixed(2)}
                        </span>
                      )}
                      <p style={{ color: "#34d399", fontWeight: "bold", fontSize: 15, margin: 0 }}>Bs {precio.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductoDetalle;
