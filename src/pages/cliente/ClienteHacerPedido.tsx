import { useEffect, useState, useRef } from "react";
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
  componentes?: any[];
}

interface ClienteDatos {
  nombreCompleto: string | null;
  ci: string | null;
  celular: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
}

const redondearAdelanto = (valor: number): number => {
  if (valor < 100) return Math.ceil(valor / 10) * 10;
  if (valor < 1000) return Math.ceil(valor / 50) * 50;
  return Math.ceil(valor / 100) * 100;
};

const getPrecioFinal = (precio: number, descuento: number) =>
  descuento > 0 ? precio - (precio * descuento) / 100 : precio;
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
function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          display: "inline-block", width: 18, height: 18,
          border: "2px solid rgba(255,255,255,0.3)",
          borderTop: "2px solid white", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </>
  );
}

function ClienteHacerPedido() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState<Record<number, { producto: Producto; cantidad: number }>>({});
  const [paso, setPaso] = useState<"catalogo" | "pago" | "confirmacion">("catalogo");

  const [clienteDatos, setClienteDatos] = useState<ClienteDatos>({
    nombreCompleto: "",
    ci: "",
    celular: "",
    nombres: "",
    apellidoPaterno: "",
  });
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  const [modo, setModo] = useState<"subir" | "declarar" | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [montoDeclarado, setMontoDeclarado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nombreIngresado, setNombreIngresado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Feedbacks visuales (toasts y bounce)
  const toastIdRef = useRef(0);
  const [toasts, setToasts] = useState<{ id: number; productoId: number }[]>([]);
  const [bounceId, setBounceId] = useState<number | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const [prodRes, perfilRes] = await Promise.all([
        fetch(`${API_URL}/productos`),
        fetch(`${API_URL}/cliente/me`, { headers }),
      ]);
      if (prodRes.ok) setProductos(await prodRes.json());
      if (perfilRes.ok) {
        const perfil = await perfilRes.json();
        const nombreCompleto = perfil.nombreCompleto
          ? perfil.nombreCompleto
          : [perfil.nombres, perfil.apellidoPaterno, perfil.apellidoMaterno]
              .filter(Boolean)
              .join(" ");
        setClienteDatos({
          nombreCompleto: nombreCompleto || "",
          ci: perfil.ci || "",
          celular: perfil.celular || "",
          nombres: perfil.nombres || "",
          apellidoPaterno: perfil.apellidoPaterno || "",
        });
      }
      setLoading(false);
      setLoadingPerfil(false);
    };
    cargar();
  }, []);

  // ─── Carrito ──────────────────────────────────────────
  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const actual = prev[producto.id];
      return {
        ...prev,
        [producto.id]: {
          producto,
          cantidad: actual ? actual.cantidad + 1 : 1,
        },
      };
    });

    setBounceId(producto.id);
    const newToastId = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id: newToastId, productoId: producto.id }]);
    setTimeout(() => setBounceId(null), 300);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToastId));
    }, 1800);
  };

  const disminuirCantidad = (id: number) => {
    setCarrito((prev) => {
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

  const eliminarProducto = (id: number) => {
    setCarrito((prev) => {
      const nuevo = { ...prev };
      delete nuevo[id];
      return nuevo;
    });
  };

  const vaciarCarrito = () => setCarrito({});

  const totalItems = Object.values(carrito).reduce((sum, e) => sum + e.cantidad, 0);
  const totalPrecio = Object.values(carrito).reduce(
    (sum, e) => sum + getPrecioFinal(e.producto.precio, e.producto.descuento) * e.cantidad,
    0
  );
  const adelantoBruto = totalPrecio * 0.3;
  const adelanto = redondearAdelanto(adelantoBruto);

  const nombreParaPago = clienteDatos.nombreCompleto || nombreIngresado || "";

 const getProductosPayload = () => {
    const payload: any[] = [];
    Object.values(carrito).forEach(({ producto, cantidad }) => {
      for (let i = 0; i < cantidad; i++) {
        if (producto.componentes && Array.isArray(producto.componentes) && producto.componentes.length > 0) {
          const totalComponentes = producto.componentes.length;
          producto.componentes.forEach((comp: any) => {
  const nombreComp = getComponenteLabel(comp);
  const precioUnitario = comp.precio || (producto.precio / totalComponentes);
  const precioConDescuento = producto.descuento > 0
    ? precioUnitario - (precioUnitario * producto.descuento / 100)
    : precioUnitario;
  payload.push({
    nombre: nombreComp,
    tipo: comp.tipo,
    precioUnitario: precioConDescuento,
    conIsbn: comp.conIsbn || false,
    conSenapi: comp.conSenapi || false,
  });
});
        } else {
          payload.push({
            id: producto.id,
            nombre: producto.nombre,
            tipo: "producto",
            precioUnitario: getPrecioFinal(producto.precio, producto.descuento),
          });
        }
      }
    });
    return payload;
  };

  const handleSubirComprobante = async () => {
    if (!comprobante || !montoDeclarado) {
      alert("Completá todos los campos antes de enviar.");
      return;
    }
    if (!nombreParaPago) {
      alert("Tu nombre completo es necesario. Ingresalo o actualizá tu perfil.");
      return;
    }
    setEnviando(true);
    const formData = new FormData();
    formData.append("comprobante", comprobante);
    formData.append("tipo", "imagen");
    formData.append("nombreDeclarado", nombreParaPago);
    formData.append("monto", montoDeclarado);
    formData.append("celular", clienteDatos.celular || "");
    formData.append("ci", clienteDatos.ci || "");
    formData.append("productos", JSON.stringify(getProductosPayload()));
    try {
      const res = await fetch(`${API_URL}/pagos`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setMensaje("✅ Pago registrado correctamente. La asociación se comunicará contigo.");
        vaciarCarrito();
        setPaso("confirmacion");
      } else {
        alert(`❌ Error: ${data.error || "Intenta de nuevo."}`);
      }
    } catch {
      alert("❌ Error de conexión.");
    }
    setEnviando(false);
  };

  const handleDeclararPago = async () => {
    if (!montoDeclarado) {
      alert("Ingresá el monto depositado.");
      return;
    }
    if (!nombreParaPago) {
      alert("Tu nombre completo es necesario. Ingresalo o actualizá tu perfil.");
      return;
    }
    setEnviando(true);
    const formData = new FormData();
    formData.append("nombreDeclarado", nombreParaPago);
    formData.append("monto", montoDeclarado);
    formData.append("tipo", "declarado");
    formData.append("celular", clienteDatos.celular || "");
    formData.append("ci", clienteDatos.ci || "");
    if (descripcion) formData.append("descripcion", descripcion);
    formData.append("productos", JSON.stringify(getProductosPayload()));
    try {
      const res = await fetch(`${API_URL}/pagos`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setMensaje("✅ Pago registrado correctamente. La asociación se comunicará contigo.");
        vaciarCarrito();
        setPaso("confirmacion");
      } else {
        alert(`❌ Error: ${data.error || "Intenta de nuevo."}`);
      }
    } catch {
      alert("❌ Error de conexión.");
    }
    setEnviando(false);
  };

  // ── Confirmación ──────────────────────────────────────
  if (paso === "confirmacion") {
    return (
      <div
        style={{
          background: "#000", minHeight: "100vh", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 24,
        }}
      >
        <div style={{
          background: "#0d0d1a", border: "1px solid #14532d",
          padding: "52px 40px", borderRadius: 24, textAlign: "center",
          maxWidth: 460, width: "100%", boxShadow: "0 0 60px rgba(5,150,105,.12)",
        }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
          <h2 style={{ color: "#34d399", fontSize: 24, fontWeight: 800, margin: "0 0 14px" }}>
            ¡Pago registrado!
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.8, maxWidth: 440, margin: "0 auto 24px" }}>
            {mensaje}
          </p>
          <div style={{
            background: "#0a0a14", border: "1px solid #1e1b4b",
            borderRadius: 12, padding: "16px 22px", marginBottom: 28, textAlign: "left",
          }}>
            <p style={{ margin: "0 0 5px", color: "#475569", fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>
              Datos de contacto
            </p>
            <p style={{ margin: 0, color: "white", fontSize: 14 }}>📱 {clienteDatos.celular || "—"}</p>
            <p style={{ margin: 0, color: "white", fontSize: 14 }}>🪪 CI: {clienteDatos.ci || "—"}</p>
          </div>
          <button
            onClick={() => { setPaso("catalogo"); setModo(null); setComprobante(null); setMontoDeclarado(""); setDescripcion(""); setNombreIngresado(""); }}
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              border: "none", padding: "13px 30px", borderRadius: 12,
              color: "white", fontWeight: 700, cursor: "pointer",
              fontSize: 14, boxShadow: "0 4px 16px rgba(99,102,241,.4)",
            }}
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes toastUp {
          0% {opacity:0; transform:translateX(-50%) translateY(0) scale(.8);}
          15% {opacity:1; transform:translateX(-50%) translateY(-10px) scale(1);}
          70% {opacity:1; transform:translateX(-50%) translateY(-28px) scale(1);}
          100% {opacity:0; transform:translateX(-50%) translateY(-44px) scale(.9);}
        }
        @keyframes btnBounce {
          0%{transform:scale(1)} 40%{transform:scale(.94)} 70%{transform:scale(1.04)} 100%{transform:scale(1)}
        }
        @keyframes badgePop {
          0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:1}
        }

        .card-catalogo {
          background: linear-gradient(160deg, #0d0d1a, #0a0a14);
          border-radius: 18px;
          border: 1px solid #1e1b4b;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
        }
        .card-catalogo:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 48px rgba(99,102,241,.18);
          border-color: #6366f1 !important;
        }

        .btn-comprar {
          width: 100%;
          padding: 12px 0;
          border: none;
          color: white;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: filter .2s ease, transform .1s ease;
        }
        .btn-comprar:hover { filter: brightness(1.12); }
        .btn-comprar:active { transform: scale(0.97); }

        .cart-input { padding:13px 16px; border-radius:12px; border:1px solid #1e1b4b; background:#0a0a14; color:white; font-size:14px; width:100%; box-sizing:border-box; outline:none; transition:border-color .2s, box-shadow .2s; font-family:inherit; }
        .cart-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.15); }
        .cart-input::placeholder { color:#334155; }
        .file-upload-label { display:flex; align-items:center; gap:10px; padding:13px 16px; background:#0a0a14; border:1px dashed #312e81; border-radius:12px; color:#475569; font-size:13px; cursor:pointer; transition:border-color .2s, color .2s, background .2s; }
        .file-upload-label:hover { border-color:#6366f1; color:#a5b4fc; background:rgba(99,102,241,.05); }
        .step-btn { transition:opacity .15s, transform .15s, filter .15s; font-family:inherit; }
        .step-btn:hover:not(:disabled) { opacity:.9; transform:translateY(-1px); }
        .step-btn:active:not(:disabled) { transform:translateY(0); }
        .modo-card { transition:border-color .2s, background .2s, transform .15s, box-shadow .2s; cursor:pointer; }
        .modo-card:hover { border-color:#6366f1 !important; background:rgba(99,102,241,.07) !important; transform:translateY(-3px); box-shadow:0 12px 28px rgba(99,102,241,.12); }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "90px 20px 30px" }}>
        <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, margin: "0 0 6px", color: "#f1f5f9" }}>
          🛒 Hacer Pedido
        </h1>
        <p style={{ color: "#334155", fontSize: 13, margin: "0 0 24px" }}>
          {paso === "catalogo"
            ? "Seleccioná los servicios editoriales y procedé al pago."
            : "Realizá el pago del adelanto para confirmar tu pedido."}
        </p>

        {loading || loadingPerfil ? (
          <div style={{ textAlign: "center", padding: 80 }}><Spinner /></div>
        ) : paso === "catalogo" ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 28,
              }}
            >
              {productos.map((p) => {
                const precioFinal = getPrecioFinal(p.precio, p.descuento);
                const enCarrito = carrito[p.id]?.cantidad || 0;
                const bounce = bounceId === p.id;

                return (
                  <div key={p.id} className="card-catalogo">
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        paddingTop: "140%",
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "#0d0d1a",
                      }}
                    >
                      {p.descuento > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            zIndex: 2,
                            background: "linear-gradient(135deg,#ef4444,#dc2626)",
                            color: "white",
                            padding: "4px 12px",
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 700,
                            boxShadow: "0 2px 10px rgba(239,68,68,.4)",
                          }}
                        >
                          -{p.descuento}%
                        </div>
                      )}
                      {p.imagenUrl ? (
                        <img
                          src={p.imagenUrl}
                          alt={p.nombre}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform .4s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.07)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        />
                      ) : (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background: "linear-gradient(135deg,#1e1b4b,#0f0e1a)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 64,
                          }}
                        >
                          📦
                        </div>
                      )}
                    </div>

                    <div style={{ padding: 22, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                      <h3
                        style={{
                          color: "white",
                          fontSize: 17,
                          fontWeight: 700,
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {p.nombre}
                      </h3>

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

                      <div style={{ position: "relative", marginTop: 4 }}>
                        {toasts
                          .filter((t) => t.productoId === p.id)
                          .map((toast) => (
                            <div
                              key={toast.id}
                              style={{
                                position: "absolute",
                                bottom: "100%",
                                left: "50%",
                                marginBottom: 6,
                                background: "#059669",
                                color: "white",
                                padding: "5px 16px",
                                borderRadius: 99,
                                fontSize: 13,
                                fontWeight: "bold",
                                whiteSpace: "nowrap",
                                pointerEvents: "none",
                                animation: "toastUp 1.8s ease forwards",
                                zIndex: 10,
                                boxShadow: "0 4px 14px rgba(5,150,105,.45)",
                              }}
                            >
                              ✅ ¡Agregado!
                            </div>
                          ))}

                        <button
                          className="btn-comprar"
                          onClick={() => agregarAlCarrito(p)}
                          style={{
                            background:
                              enCarrito > 0
                                ? "linear-gradient(135deg,#059669,#047857)"
                                : "linear-gradient(135deg,#10b981,#059669)",
                            animation: bounce ? "btnBounce .3s ease" : "none",
                          }}
                        >
                          <span>🛒 Comprar</span>
                          {enCarrito > 0 && (
                            <span
                              style={{
                                background: "rgba(0,0,0,.2)",
                                borderRadius: 99,
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "2px 8px",
                                animation: "badgePop .3s ease",
                              }}
                            >
                              ×{enCarrito}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalItems > 0 && (
              <div
                style={{
                  position: "fixed",
                  bottom: 20,
                  right: 20,
                  zIndex: 1000,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(13,13,26,0.95)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid #312e81",
                  borderRadius: 20,
                  padding: "12px 20px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>🛒</span>
                  <div>
                    <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>
                      {totalItems} producto{totalItems !== 1 ? "s" : ""}
                    </p>
                    <p style={{ color: "#34d399", fontWeight: 800, fontSize: 18, margin: 0 }}>
                      Bs {totalPrecio.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPaso("pago")}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg,#10b981,#059669)",
                    border: "none",
                    borderRadius: 12,
                    color: "white",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(16,185,129,.3)",
                  }}
                >
                  💳 Pagar
                </button>
                <button
                  onClick={vaciarCarrito}
                  style={{
                    background: "transparent",
                    border: "1px solid #1e1b4b",
                    borderRadius: 8,
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "6px 10px",
                    fontFamily: "inherit",
                  }}
                >
                  🗑
                </button>
              </div>
            )}
          </>
        ) : (
          /* ─── PANTALLA DE PAGO ─── */
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", padding: 26, borderRadius: 18 }}>
              <h3 style={{ margin: "0 0 22px", fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>💳 Realizá tu pago</h3>
              <div style={{ background: "#070710", border: "1px solid #1e1b4b", padding: 22, borderRadius: 16, textAlign: "center", marginBottom: 18 }}>
                <img src="/qr-pago.jpeg" alt="QR de pago" style={{ width: "100%", maxWidth: isMobile ? 200 : 260, margin: "0 auto", borderRadius: 12, display: "block", objectFit: "contain", border: "1px solid #1e1b4b" }} />
                <a href="/qr-pago.jpeg" download="QR_Pago_Vanguardistas.jpg" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, color: "#818cf8", fontSize: 13, textDecoration: "none" }}>📥 Descargar QR</a>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Banco Unión · Cuenta: 123456789</p>
                  <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Titular: Asociación Vanguardistas 3.0</p>
                </div>
              </div>
              <div style={{ background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.2)", padding: 16, borderRadius: 12, marginBottom: 22, textAlign: "center" }}>
                <p style={{ color: "#a5b4fc", fontSize: 15, margin: "0 0 6px" }}>
                  Pagá <strong style={{ color: "white", fontSize: 18 }}>Bs {adelanto}</strong> como adelanto (30%)
                </p>
                <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
                  Te contactamos al <strong style={{ color: "#94a3b8" }}>{clienteDatos.celular || "—"}</strong> · CI <strong style={{ color: "#94a3b8" }}>{clienteDatos.ci || "—"}</strong>
                </p>
              </div>
              {!modo ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { key: "subir", icon: "📤", title: "Subir comprobante", sub: "Foto del depósito" },
                    { key: "declarar", icon: "📝", title: "Declarar pago", sub: "Sin comprobante" },
                  ].map((m) => (
                    <div
                      key={m.key}
                      className="modo-card"
                      onClick={() => setModo(m.key as any)}
                      style={{ background: "#070710", border: "1px solid #1e1b4b", borderRadius: 14, padding: "22px 16px", textAlign: "center" }}
                    >
                      <div style={{ fontSize: 34, marginBottom: 10 }}>{m.icon}</div>
                      <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14, margin: "0 0 5px" }}>{m.title}</p>
                      <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>{m.sub}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {!clienteDatos.nombreCompleto && (
                    <>
                      <label style={labelStyle}>Nombre completo</label>
                      <input
                        className="cart-input"
                        placeholder="Tu nombre completo (solo letras)"
                        value={nombreIngresado}
                        onChange={(e) => setNombreIngresado(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").toUpperCase())}
                      />
                    </>
                  )}
                  <label style={labelStyle}>Monto depositado (Bs)</label>
                  <input className="cart-input" placeholder={`Ej: ${adelanto}`} type="number" value={montoDeclarado} onChange={(e) => setMontoDeclarado(e.target.value)} />
                  {modo === "subir" && (
                    <>
                      <label style={labelStyle}>Foto del comprobante</label>
                      <label className="file-upload-label">
                        <span style={{ fontSize: 22 }}>🖼️</span>
                        <span>{comprobante ? comprobante.name : "Seleccionar imagen..."}</span>
                        <input type="file" accept="image/*" onChange={(e) => setComprobante(e.target.files?.[0] || null)} style={{ display: "none" }} />
                      </label>
                    </>
                  )}
                  {modo === "declarar" && (
                    <>
                      <label style={labelStyle}>Descripción (opcional)</label>
                      <input className="cart-input" placeholder="Cualquier detalle adicional" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                    </>
                  )}
                  <button
                    className="step-btn"
                    onClick={modo === "subir" ? handleSubirComprobante : handleDeclararPago}
                    disabled={enviando}
                    style={{
                      padding: 14, marginTop: 4,
                      background: enviando ? "#0d0d1a" : "linear-gradient(135deg,#10b981,#059669)",
                      border: enviando ? "1px solid #1e1b4b" : "none",
                      borderRadius: 12, color: enviando ? "#334155" : "white",
                      fontWeight: 700, fontSize: 15, cursor: enviando ? "not-allowed" : "pointer",
                      boxShadow: enviando ? "none" : "0 4px 16px rgba(16,185,129,.25)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    }}
                  >
                    {enviando ? (
                      <>
                        <div style={{ width: 18, height: 18, border: "2px solid #334155", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                        Enviando...
                      </>
                    ) : modo === "subir" ? "Enviar comprobante" : "Declarar pago"}
                  </button>
                  <button
                    onClick={() => setModo(null)}
                    style={{
                      background: "#0d0d1a", border: "1px solid #1e1b4b", borderRadius: 12,
                      color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer",
                      padding: "12px 18px", fontFamily: "inherit",
                    }}
                  >
                    ← Cambiar método
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setPaso("catalogo")}
              style={{
                background: "transparent", border: "1px solid #1e1b4b",
                borderRadius: 12, color: "#64748b", fontSize: 14,
                fontWeight: 600, cursor: "pointer", padding: "12px 20px",
                marginTop: 16, fontFamily: "inherit",
              }}
            >
              ← Volver al catálogo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 6,
};

export default ClienteHacerPedido;