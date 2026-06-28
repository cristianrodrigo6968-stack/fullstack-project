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

interface ClienteDatos {
  nombreCompleto: string | null;
  ci: string | null;
  celular: string | null;
}

const soloLetrasMayusculas = (value: string): string =>
  value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").toUpperCase();

const redondearAdelanto = (valor: number): number => {
  if (valor < 100) return Math.ceil(valor / 10) * 10;
  else if (valor < 1000) return Math.ceil(valor / 50) * 50;
  else return Math.ceil(valor / 100) * 100;
};

const getPrecioFinal = (precio: number, descuento: number) =>
  descuento > 0 ? precio - (precio * descuento) / 100 : precio;

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          display: "inline-block",
          width: 18,
          height: 18,
          border: "2px solid rgba(255,255,255,0.3)",
          borderTop: "2px solid white",
          borderRadius: "50%",
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

  // Datos del cliente autenticado
  const [clienteDatos, setClienteDatos] = useState<ClienteDatos>({
    nombreCompleto: "",
    ci: "",
    celular: "",
  });
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  // Pago
  const [modo, setModo] = useState<"subir" | "declarar" | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [montoDeclarado, setMontoDeclarado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Cargar productos y perfil del cliente
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
        setClienteDatos({
          nombreCompleto: perfil.nombreCompleto || "",
          ci: perfil.ci || "",
          celular: perfil.celular || "",
        });
      }
      setLoading(false);
      setLoadingPerfil(false);
    };
    cargar();
  }, []);

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
  };

  const quitarDelCarrito = (id: number) => {
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

  const vaciarCarrito = () => setCarrito({});

  const totalItems = Object.values(carrito).reduce((sum, e) => sum + e.cantidad, 0);
  const totalPrecio = Object.values(carrito).reduce(
    (sum, e) => sum + getPrecioFinal(e.producto.precio, e.producto.descuento) * e.cantidad,
    0
  );
  const adelantoBruto = totalPrecio * 0.3;
  const adelanto = redondearAdelanto(adelantoBruto);

  const getProductosPayload = () => {
    const payload: any[] = [];
    Object.values(carrito).forEach(({ producto, cantidad }) => {
      for (let i = 0; i < cantidad; i++) {
        payload.push({
          id: producto.id,
          nombre: producto.nombre,
          tipo: "producto",
          precioUnitario: getPrecioFinal(producto.precio, producto.descuento),
        });
      }
    });
    return payload;
  };

  const handleSubirComprobante = async () => {
    if (!comprobante || !montoDeclarado) {
      alert("Completá todos los campos antes de enviar.");
      return;
    }
    setEnviando(true);
    const formData = new FormData();
    formData.append("comprobante", comprobante);
    formData.append("tipo", "imagen");
    formData.append("nombreDeclarado", clienteDatos.nombreCompleto || "");
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
    setEnviando(true);
    const formData = new FormData();
    formData.append("nombreDeclarado", clienteDatos.nombreCompleto || "");
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

  // ── Pantalla de confirmación ──
  if (paso === "confirmacion") {
    return (
      <div
        style={{
          background: "#000",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "#0d0d1a",
            border: "1px solid #14532d",
            padding: "52px 40px",
            borderRadius: 24,
            textAlign: "center",
            maxWidth: 460,
            width: "100%",
            boxShadow: "0 0 60px rgba(5,150,105,.12)",
            animation: "fadeIn .4s ease",
          }}
        >
          <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
          <h2 style={{ color: "#34d399", fontSize: 24, fontWeight: 800, margin: "0 0 14px" }}>
            ¡Pago registrado!
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.8, maxWidth: 440, margin: "0 auto 24px" }}>
            {mensaje}
          </p>
          <div
            style={{
              background: "#0a0a14",
              border: "1px solid #1e1b4b",
              borderRadius: 12,
              padding: "16px 22px",
              display: "inline-block",
              marginBottom: 28,
              textAlign: "left",
            }}
          >
            <p style={{ margin: "0 0 5px", color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
              Datos de contacto
            </p>
            <p style={{ margin: "0 0 3px", color: "white", fontSize: 14 }}>
              📱 {clienteDatos.celular || "—"}
            </p>
            <p style={{ margin: 0, color: "white", fontSize: 14 }}>
              🪪 CI: {clienteDatos.ci || "—"}
            </p>
          </div>
          <br />
          <button
            onClick={() => {
              setPaso("catalogo");
              setModo(null);
              setComprobante(null);
              setMontoDeclarado("");
              setDescripcion("");
            }}
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              border: "none",
              padding: "13px 30px",
              borderRadius: 12,
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
              boxShadow: "0 4px 16px rgba(99,102,241,.4)",
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
        @keyframes fadeIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }

        .prod-card {
          background: linear-gradient(160deg,#0d0d1a,#0a0a14);
          border: 1px solid #1e1b4b; border-radius: 18px; overflow: hidden;
          display: flex; flex-direction: column;
          transition: border-color .2s, transform .2s, box-shadow .2s;
        }
        .prod-card:hover {
          border-color: #312e81; transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(99,102,241,.12);
        }

        .agregar-btn {
          background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.25);
          border-radius: 10px; color: #818cf8; font-weight: 700;
          font-size: 13px; cursor: pointer; font-family: inherit;
          padding: 8px 16px; display: flex; align-items: center; gap: 6;
          transition: background .2s, border-color .2s, color .2s;
        }
        .agregar-btn:hover { background: rgba(99,102,241,.2); border-color: #6366f1; color: #a5b4fc; }

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

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, margin: "0 0 6px", color: "#f1f5f9" }}>
          🛒 Hacer Pedido
        </h1>
        <p style={{ color: "#334155", fontSize: 13, margin: "0 0 32px" }}>
          {paso === "catalogo"
            ? "Agregá los servicios que necesitás y procedé al pago."
            : "Realizá el pago del adelanto para confirmar tu pedido."}
        </p>

        {loading || loadingPerfil ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <Spinner />
          </div>
        ) : paso === "catalogo" ? (
          /* ─── CATÁLOGO + CARRITO ─── */
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 28, alignItems: "start" }}>
            {/* Productos */}
            <div>
              {productos.length === 0 ? (
                <p style={{ color: "#475569", textAlign: "center", padding: 60 }}>No hay productos disponibles.</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                    gap: 18,
                  }}
                >
                  {productos.map((p) => {
                    const precioFinal = getPrecioFinal(p.precio, p.descuento);
                    const enCarrito = carrito[p.id]?.cantidad || 0;
                    return (
                      <div key={p.id} className="prod-card">
                        {p.imagenUrl ? (
                          <div style={{ width: "100%", height: 140, overflow: "hidden", position: "relative" }}>
                            <img src={p.imagenUrl} alt={p.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0d0d1a 0%, transparent 60%)" }} />
                          </div>
                        ) : (
                          <div style={{ width: "100%", height: 80, background: "linear-gradient(135deg, #6366f122, #6366f108)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, borderBottom: "1px solid #1e1b4b" }}>
                            📦
                          </div>
                        )}
                        <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                          <div>
                            <p style={{ color: "white", fontWeight: 700, fontSize: 15, margin: "0 0 4px" }}>{p.nombre}</p>
                            {p.descripcion && (
                              <p style={{ color: "#475569", fontSize: 12, margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
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
                              <span style={{ color: "#34d399", fontSize: 20, fontWeight: 800 }}>Bs {precioFinal.toFixed(2)}</span>
                            </div>
                            <button className="agregar-btn" onClick={() => agregarAlCarrito(p)}>
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
            <div
              style={{
                background: "#0d0d1a",
                border: "1px solid #1e1b4b",
                borderRadius: 18,
                padding: 20,
                position: "sticky",
                top: 100,
                maxHeight: "calc(100vh - 140px)",
                overflowY: "auto",
              }}
            >
              <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>🛒 Tu pedido</h3>
              {totalItems === 0 ? (
                <p style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "30px 0" }}>No has agregado servicios aún.</p>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    {Object.values(carrito).map((entry) => {
                      const precio = getPrecioFinal(entry.producto.precio, entry.producto.descuento);
                      return (
                        <div key={entry.producto.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1e1b4b" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 500, margin: "0 0 2px" }}>{entry.producto.nombre}</p>
                            <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Bs {precio.toFixed(2)} c/u</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 14 }}>×{entry.cantidad}</span>
                            <button onClick={() => quitarDelCarrito(entry.producto.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: "2px 4px" }}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ borderTop: "1px solid #1e1b4b", paddingTop: 14, display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                    <span style={{ color: "#64748b", fontSize: 14 }}>Total</span>
                    <span style={{ color: "#34d399", fontWeight: 800, fontSize: 20 }}>Bs {totalPrecio.toFixed(2)}</span>
                  </div>
                  <button
                    className="step-btn"
                    onClick={() => { setPaso("pago"); setModo(null); }}
                    style={{
                      width: "100%", padding: 14,
                      background: "linear-gradient(135deg,#10b981,#059669)",
                      border: "none", borderRadius: 14, color: "white",
                      fontWeight: 700, fontSize: 17, cursor: "pointer",
                      boxShadow: "0 4px 20px rgba(16,185,129,.3)",
                    }}
                  >
                    💳 Proceder al pago
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