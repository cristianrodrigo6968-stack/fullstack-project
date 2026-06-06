import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWindowSize } from "../hooks/useWindowSize";

interface Toast {
  id: number;
  y: number;
}

function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();
  const [producto, setProducto] = useState<any | null>(null);
  const [todosLosProductos, setTodosLosProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);

  // Contador de veces agregado en esta sesión
  const [vecesAgregado, setVecesAgregado] = useState(0);
  // Toasts flotantes: cada click genera uno nuevo
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  // Animación del botón (rebote)
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
    const nombre = p.nombre.toLowerCase();
    let tipo = "autor";
    if (nombre.includes("categoría a")) tipo = "libroA";
    else if (nombre.includes("categoría b")) tipo = "libroB";
    else if (nombre.includes("categoría c")) tipo = "libroC";
    else if (nombre.includes("director")) tipo = "director";
    else if (nombre.includes("fundador")) tipo = "fundador";

    setCarrito(prev => [...prev, { ...p, tipo }]);
    setVecesAgregado(prev => prev + 1);

    // Animación de rebote en el botón
    setBtnBounce(true);
    setTimeout(() => setBtnBounce(false), 300);

    // Toast flotante nuevo por cada click
    const newId = ++toastIdRef.current;
    // Offset vertical aleatorio pequeño para que no se apilen exactamente
    const randomY = Math.floor(Math.random() * 20);
    setToasts(prev => [...prev, { id: newId, y: randomY }]);
    // Remover el toast después de la animación
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newId));
    }, 1800);
  };

  if (loading) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#94a3b8" }}>Cargando producto...</p>
    </div>
  );

  if (!producto) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "#94a3b8", fontSize: 18 }}>Producto no encontrado.</p>
      <button onClick={() => navigate("/")} style={{ background: "#3b82f6", border: "none", padding: "10px 20px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer" }}>
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
      return "Descripción no disponible. Por favor, contacta al administrador.";
    }
    return desc;
  };

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh", paddingTop: 80 }}>
      <style>{`
        @keyframes toastUp {
          0%   { opacity: 0; transform: translateY(0px) scale(0.8); }
          15%  { opacity: 1; transform: translateY(-10px) scale(1); }
          70%  { opacity: 1; transform: translateY(-28px) scale(1); }
          100% { opacity: 0; transform: translateY(-44px) scale(0.9); }
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
      `}</style>

      {/* MODAL imagen */}
      {showImageModal && (
        <div
          onClick={() => setShowImageModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, cursor: "zoom-out",
            padding: "60px 24px 24px", boxSizing: "border-box",
          }}
        >
          <img
            src={producto.imagenUrl}
            alt={producto.nombre}
            style={{
              maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
              borderRadius: 12, display: "block",
              boxShadow: "0 0 60px rgba(0,0,0,0.8)",
            }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setShowImageModal(false); }}
            style={{
              position: "fixed", top: 16, right: 16,
              background: "rgba(255,255,255,0.15)", border: "none", color: "white",
              fontSize: 22, cursor: "pointer", borderRadius: "50%",
              width: 40, height: 40, display: "flex",
              alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)", zIndex: 1001,
            }}
          >✕</button>
        </div>
      )}

      {/* BREADCRUMB */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px 20px" : "16px 40px" }}>
        <span onClick={() => navigate("/")} style={{ color: "#3b82f6", cursor: "pointer", fontSize: 14 }}>
          ← Volver al catálogo
        </span>
      </div>

      {/* TÍTULO Y PRECIO */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "0 20px 24px" : "0 40px 24px" }}>
        <h1 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 700, color: "#f1f5f9", margin: "0 0 12px 0" }}>
          {producto.nombre}
        </h1>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          {producto.descuento > 0 && (
            <span style={{ color: "#ef4444", fontSize: 18, textDecoration: "line-through" }}>
              Bs {producto.precio.toFixed(2)}
            </span>
          )}
          <span style={{ color: "#22c55e", fontSize: 36, fontWeight: "bold" }}>
            Bs {precioFinal.toFixed(2)}
          </span>
          {producto.descuento > 0 && (
            <span style={{ background: "#ef4444", color: "white", padding: "3px 14px", borderRadius: 99, fontSize: 14, fontWeight: "bold" }}>
              -{producto.descuento}%
            </span>
          )}
        </div>
      </div>

      {/* IMAGEN + DESCRIPCIÓN */}
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: isMobile ? "0 20px" : "0 40px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 40,
        alignItems: "start",
      }}>

        {/* IMAGEN */}
        <div
          onClick={() => producto.imagenUrl && setShowImageModal(true)}
          style={{
            borderRadius: 20, cursor: producto.imagenUrl ? "zoom-in" : "default",
            width: "100%", boxSizing: "border-box", overflow: "hidden",
            background: producto.imagenUrl ? "transparent" : "#0f172a",
          }}
        >
          {producto.imagenUrl ? (
            <img
              src={producto.imagenUrl}
              alt={producto.nombre}
              style={{ width: "100%", height: "auto", display: "block", borderRadius: 20 }}
            />
          ) : (
            <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px", opacity: 0.4 }}>
              📦
            </div>
          )}
        </div>

        {/* DESCRIPCIÓN Y BOTONES */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>
            {descripcionLimpia(producto.descripcion)}
          </p>

          {/* BOTÓN COMPRAR con feedback */}
          <div style={{ position: "relative" }}>

            {/* Toasts flotantes — uno por cada click */}
            {toasts.map(toast => (
              <div
                key={toast.id}
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginBottom: 8 + toast.y,
                  background: "#16a34a",
                  color: "white",
                  padding: "7px 16px",
                  borderRadius: 99,
                  fontSize: 14,
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  animation: "toastUp 1.8s ease forwards",
                  zIndex: 10,
                  boxShadow: "0 4px 16px rgba(22,163,74,0.4)",
                }}
              >
                ✅ ¡Agregado al carrito!
              </div>
            ))}

            <button
              onClick={() => agregarAlCarrito(producto)}
              style={{
                width: "100%",
                padding: 16,
                background: vecesAgregado > 0 ? "#16a34a" : "#22c55e",
                border: "none",
                borderRadius: 12,
                color: "white",
                fontWeight: "bold",
                fontSize: 18,
                cursor: "pointer",
                animation: btnBounce ? "btnBounce 0.3s ease" : "none",
                transition: "background 0.3s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <span>🛒 Comprar — Bs {precioFinal.toFixed(2)}</span>

              {/* Badge con contador — aparece desde el 2do click */}
              {vecesAgregado > 0 && (
                <span style={{
                  background: "rgba(0,0,0,0.25)",
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "2px 10px",
                  minWidth: 24,
                  textAlign: "center",
                  animation: "badgePop 0.3s ease",
                }}>
                  ×{vecesAgregado}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => navigate("/carrito")}
            style={{
              width: "100%", padding: 14,
              background: "transparent", border: "2px solid #3b82f6", borderRadius: 12,
              color: "#3b82f6", fontWeight: "bold", fontSize: 16, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            Ir al carrito ({carrito.length})
          </button>
        </div>
      </div>

      {/* TODOS LOS PRODUCTOS */}
      {todosLosProductos.length > 0 && (
        <div style={{ maxWidth: 1100, margin: "40px auto 0", padding: isMobile ? "0 20px 60px" : "0 40px 60px" }}>
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 40 }}>
            <h3 style={{ fontSize: 20, marginBottom: 24, color: "#cbd5e1" }}>📦 Todos los productos</h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
              gap: 20,
            }}>
              {todosLosProductos.map((p: any) => {
                const precio = p.descuento > 0 ? p.precio - (p.precio * p.descuento / 100) : p.precio;
                return (
                  <div key={p.id} onClick={() => navigate(`/producto/${p.id}`)} style={{
                    background: "#0f172a", borderRadius: 14, overflow: "hidden",
                    cursor: "pointer", border: "1px solid #1e293b", transition: "border-color 0.2s",
                  }}>
                    {p.imagenUrl ? (
                      <img src={p.imagenUrl} alt={p.nombre} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: 160, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📦</div>
                    )}
                    <div style={{ padding: 14 }}>
                      <h4 style={{ color: "white", fontSize: 13, marginBottom: 6 }}>{p.nombre}</h4>
                      {p.descuento > 0 && (
                        <span style={{ color: "#ef4444", fontSize: 12, textDecoration: "line-through", marginRight: 6 }}>
                          Bs {p.precio.toFixed(2)}
                        </span>
                      )}
                      <p style={{ color: "#22c55e", fontWeight: "bold", fontSize: 15, margin: 0 }}>Bs {precio.toFixed(2)}</p>
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
