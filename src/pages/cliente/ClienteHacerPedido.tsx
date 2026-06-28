import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  descuento: number;
  imagenUrl?: string;
}

type TipoServicio = "libroA" | "libroB" | "libroC" | "director" | "fundador" | "autor";

const TIPO_INFO: Record<TipoServicio, { emoji: string; label: string; color: string }> = {
  libroA:   { emoji: "📚", label: "Libro Categoría A", color: "#6366f1" },
  libroB:   { emoji: "📚", label: "Libro Categoría B", color: "#8b5cf6" },
  libroC:   { emoji: "📚", label: "Libro Categoría C", color: "#a78bfa" },
  director: { emoji: "📘", label: "Director de Revista", color: "#3b82f6" },
  fundador: { emoji: "🏆", label: "Fundador de Revista", color: "#f59e0b" },
  autor:    { emoji: "📝", label: "Autor de Artículo", color: "#10b981" },
};

const getCategoria = (nombre: string): TipoServicio => {
  const n = nombre.toLowerCase();
  if (n.includes("categoría a") || n.includes("categoria a")) return "libroA";
  if (n.includes("categoría b") || n.includes("categoria b")) return "libroB";
  if (n.includes("categoría c") || n.includes("categoria c")) return "libroC";
  if (n.includes("director")) return "director";
  if (n.includes("fundador")) return "fundador";
  return "autor";
};

const getPrecioFinal = (precio: number, descuento: number) =>
  descuento > 0 ? precio - (precio * descuento) / 100 : precio;

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        display: "inline-block", width: 18, height: 18,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTop: "2px solid white", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </>
  );
}

function ClienteHacerPedido() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState<Record<number, { producto: Producto; cantidad: number }>>({});
  const [enviando, setEnviando] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState(false);
  const [error, setError] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    fetch(`${API_URL}/productos`)
      .then(r => r.json())
      .then(data => { setProductos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(prev => {
      const actual = prev[producto.id];
      return {
        ...prev,
        [producto.id]: {
          producto,
          cantidad: actual ? actual.cantidad + 1 : 1,
        },
      };
    });
  };

  const quitarDelCarrito = (id: number) => {
    setCarrito(prev => {
      const actual = prev[id];
      if (!actual) return prev;
      if (actual.cantidad <= 1) {
        const nuevo = { ...prev };
        delete nuevo[id];
        return nuevo;
      }
      return { ...prev, [id]: { ...actual, cantidad: actual.cantidad - 1 } };
    });
  };

  const vaciarCarrito = () => setCarrito({});

  const totalItems = Object.values(carrito).reduce((sum, entry) => sum + entry.cantidad, 0);
  const totalPrecio = Object.values(carrito).reduce(
    (sum, entry) => sum + getPrecioFinal(entry.producto.precio, entry.producto.descuento) * entry.cantidad,
    0
  );

  const confirmarPedido = async () => {
    if (totalItems === 0) return;
    setEnviando(true);
    setError("");

    const itemsParaEnviar = Object.values(carrito).flatMap(entry => {
      const tipo = getCategoria(entry.producto.nombre);
      return Array(entry.cantidad).fill({
        tipo,
        titulo: entry.producto.nombre,   // solo para referencia
        conSenapi: false,
        conIsbn: false,
        periodicidad: null,
        tipoAutor: null,
        asociacionEncargaTitulo: false,
        notas: null,
        archivoWord: null,
        archivoPdf: null,
      });
    });

    try {
      const res = await fetch(`${API_URL}/cliente/pedidos`, {
        method: "POST",
        headers,
        body: JSON.stringify({ items: itemsParaEnviar }),
      });

      if (res.ok) {
        setPedidoCreado(true);
        vaciarCarrito();
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear el pedido.");
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    }
    setEnviando(false);
  };

  // ── Pantalla de éxito ────────────────────────────────────────
  if (pedidoCreado) {
    return (
      <div style={{
        background: "#000", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
        <div style={{
          background: "#0d0d1a", border: "1px solid #14532d",
          padding: "52px 40px", borderRadius: 24, textAlign: "center",
          maxWidth: 460, width: "100%",
          boxShadow: "0 0 60px rgba(5,150,105,.12)",
          animation: "fadeIn .4s ease",
        }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
          <h2 style={{ color: "#34d399", fontSize: 24, fontWeight: 800, margin: "0 0 14px" }}>
            ¡Pedido registrado!
          </h2>
          <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.8, margin: "0 0 32px" }}>
            El equipo editorial revisará tu solicitud y se contactará contigo a la brevedad.
          </p>
          <button
            onClick={() => setPedidoCreado(false)}
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              border: "none", padding: "13px 32px", borderRadius: 12,
              color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(99,102,241,.4)",
            }}
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh", padding: "90px 20px 70px" }}>
      <style>{`
        @keyframes fadeIn    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes badgePop  { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:1} }

        .prod-card {
          background: linear-gradient(160deg,#0d0d1a,#0a0a14);
          border: 1px solid #1e1b4b; border-radius: 18px; overflow: hidden;
          display: flex; flex-direction: column;
          transition: border-color .2s, transform .2s, box-shadow .2s;
        }
        .prod-card:hover {
          border-color: #312e81;
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(99,102,241,.12);
        }
        .ped-btn-primary {
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border: none; border-radius: 12px; color: white;
          font-weight: 700; cursor: pointer; font-family: inherit;
          transition: opacity .15s, transform .15s, filter .15s;
          box-shadow: 0 4px 20px rgba(99,102,241,.35);
        }
        .ped-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .ped-btn-primary:active { transform: translateY(0); }
        .ped-btn-primary:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .ped-btn-green {
          background: linear-gradient(135deg,#10b981,#059669);
          border: none; border-radius: 12px; color: white;
          font-weight: 700; cursor: pointer; font-family: inherit;
          transition: filter .15s, transform .15s;
          box-shadow: 0 4px 16px rgba(16,185,129,.3);
        }
        .ped-btn-green:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .ped-btn-green:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .agregar-btn {
          background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.25);
          border-radius: 10px; color: #818cf8; font-weight: 700;
          font-size: 13px; cursor: pointer; font-family: inherit;
          padding: 8px 16px; transition: background .2s, border-color .2s, color .2s;
          display: flex; align-items: center; gap: 6;
        }
        .agregar-btn:hover { background: rgba(99,102,241,.2); border-color: #6366f1; color: #a5b4fc; }

        .carrito-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid #1e1b4b;
        }
        .carrito-item:last-child { border-bottom: none; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, margin: "0 0 6px", color: "#f1f5f9" }}>
          🛒 Hacer Pedido
        </h1>
        <p style={{ color: "#334155", fontSize: 13, margin: "0 0 32px" }}>
          Agregá los servicios que necesitás y confirmá tu pedido.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 28, alignItems: "start" }}>
          {/* Catálogo */}
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 80 }}>
                <div style={{
                  width: 36, height: 36, border: "3px solid #1e1b4b",
                  borderTop: "3px solid #6366f1", borderRadius: "50%",
                  margin: "0 auto 16px", animation: "spin .8s linear infinite",
                }} />
                <p style={{ color: "#475569", fontSize: 13 }}>Cargando catálogo...</p>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: 18,
              }}>
                {productos.map(p => {
                  const tipo = getCategoria(p.nombre);
                  const info = TIPO_INFO[tipo] || { emoji: "📦", label: p.nombre, color: "#6366f1" };
                  const precioFinal = getPrecioFinal(p.precio, p.descuento);
                  const enCarrito = carrito[p.id]?.cantidad || 0;

                  return (
                    <div key={p.id} className="prod-card">
                      {p.imagenUrl ? (
                        <div style={{ width: "100%", height: 140, overflow: "hidden", position: "relative" }}>
                          <img
                            src={p.imagenUrl} alt={p.nombre}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(to top, #0d0d1a 0%, transparent 60%)",
                          }} />
                        </div>
                      ) : (
                        <div style={{
                          width: "100%", height: 80,
                          background: `linear-gradient(135deg, ${info.color}22, ${info.color}08)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 36, borderBottom: "1px solid #1e1b4b",
                        }}>
                          {info.emoji}
                        </div>
                      )}

                      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <p style={{ color: "white", fontWeight: 700, fontSize: 15, margin: "0 0 4px" }}>{p.nombre}</p>
                          {p.descripcion && (
                            <p style={{
                              color: "#475569", fontSize: 12, margin: 0, lineHeight: 1.6,
                              display: "-webkit-box", WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical", overflow: "hidden",
                            }}>
                              {p.descripcion}
                            </p>
                          )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                          <div>
                            {p.descuento > 0 && (
                              <span style={{ color: "#475569", fontSize: 12, textDecoration: "line-through", marginRight: 6 }}>
                                Bs {p.precio.toFixed(2)}
                              </span>
                            )}
                            <span style={{ color: "#34d399", fontSize: 20, fontWeight: 800 }}>
                              Bs {precioFinal.toFixed(2)}
                            </span>
                          </div>

                          <button
                            className="agregar-btn"
                            onClick={() => agregarAlCarrito(p)}
                          >
                            ➕ {enCarrito > 0 ? `Agregar (${enCarrito})` : "Agregar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Carrito lateral */}
          <div style={{
            background: "#0d0d1a",
            border: "1px solid #1e1b4b",
            borderRadius: 18,
            padding: 20,
            position: "sticky",
            top: 100,
            maxHeight: "calc(100vh - 140px)",
            overflowY: "auto",
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>
              🛒 Tu pedido
            </h3>

            {totalItems === 0 ? (
              <p style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
                No has agregado servicios aún.
              </p>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  {Object.values(carrito).map(entry => {
                    const precio = getPrecioFinal(entry.producto.precio, entry.producto.descuento);
                    return (
                      <div key={entry.producto.id} className="carrito-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 500, margin: "0 0 2px" }}>
                            {entry.producto.nombre}
                          </p>
                          <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
                            Bs {precio.toFixed(2)} c/u
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 14 }}>
                            ×{entry.cantidad}
                          </span>
                          <button
                            onClick={() => quitarDelCarrito(entry.producto.id)}
                            style={{
                              background: "none", border: "none", color: "#475569",
                              cursor: "pointer", fontSize: 18, padding: "2px 4px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  borderTop: "1px solid #1e1b4b",
                  paddingTop: 14,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 20,
                }}>
                  <span style={{ color: "#64748b", fontSize: 14 }}>Total</span>
                  <span style={{ color: "#34d399", fontWeight: 800, fontSize: 20 }}>
                    Bs {totalPrecio.toFixed(2)}
                  </span>
                </div>

                {error && (
                  <div style={{
                    background: "#450a0a", border: "1px solid #ef4444",
                    padding: 10, borderRadius: 8, marginBottom: 12,
                    color: "#fca5a5", fontSize: 13,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  className="ped-btn-green"
                  onClick={confirmarPedido}
                  disabled={enviando}
                  style={{
                    width: "100%", padding: "14px 0", fontSize: 15,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}
                >
                  {enviando ? (
                    <>
                      <div style={{
                        width: 18, height: 18, border: "2px solid rgba(255,255,255,.2)",
                        borderTop: "2px solid white", borderRadius: "50%",
                        animation: "spin .7s linear infinite",
                      }} />
                      Creando pedido...
                    </>
                  ) : (
                    "✅ Confirmar pedido"
                  )}
                </button>

                <button
                  onClick={vaciarCarrito}
                  style={{
                    background: "transparent", border: "1px solid #1e1b4b",
                    borderRadius: 10, color: "#64748b", fontSize: 12,
                    fontWeight: 600, cursor: "pointer", width: "100%",
                    padding: "8px 0", marginTop: 8, fontFamily: "inherit",
                  }}
                >
                  Vaciar carrito
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClienteHacerPedido;