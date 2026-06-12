import { useEffect, useRef, useState } from "react";
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

interface Toast { id: number; }

const getPrecioFinal = (precio: number, descuento: number) =>
  descuento > 0 ? precio - (precio * descuento) / 100 : precio;

const soloLetrasMayusculas = (value: string): string =>
  value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").toUpperCase();

const redondearAdelanto = (valor: number): number => {
  if (valor < 100) return Math.ceil(valor / 10) * 10;
  else if (valor < 1000) return Math.ceil(valor / 50) * 50;
  else return Math.ceil(valor / 100) * 100;
};

function ClienteHacerPedido() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();

  const [paso, setPaso] = useState<"catalogo" | "pago" | "confirmacion">("catalogo");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<Producto[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);

  // feedback visual por producto
  const [feedbacks, setFeedbacks] = useState<Record<number, { count: number; toasts: Toast[]; bounce: boolean }>>({});
  const toastIdRef = useRef(0);

  // pago
  const [modo, setModo] = useState<"subir" | "declarar" | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [nombreDeclarado, setNombreDeclarado] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const total = carrito.reduce((sum, p) => sum + getPrecioFinal(p.precio, p.descuento), 0);
  const adelanto = redondearAdelanto(total * 0.3);

  useEffect(() => {
    fetch(`${API_URL}/productos`)
      .then(r => r.json())
      .then(data => { setProductos(data); setLoadingCat(false); })
      .catch(() => setLoadingCat(false));
  }, []);

  const agregarAlCarrito = (producto: Producto, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarrito(prev => [...prev, producto]);

    const pid = producto.id;
    const newToast = ++toastIdRef.current;
    setFeedbacks(prev => ({
      ...prev,
      [pid]: {
        count: (prev[pid]?.count ?? 0) + 1,
        toasts: [...(prev[pid]?.toasts ?? []), { id: newToast }],
        bounce: true,
      },
    }));
    setTimeout(() => setFeedbacks(prev => ({ ...prev, [pid]: { ...prev[pid], bounce: false } })), 300);
    setTimeout(() => setFeedbacks(prev => ({
      ...prev,
      [pid]: { ...prev[pid], toasts: (prev[pid]?.toasts ?? []).filter(t => t.id !== newToast) },
    })), 1800);
  };

  const quitarDelCarrito = (index: number) => {
    const nuevo = carrito.filter((_, i) => i !== index);
    setCarrito(nuevo);
    if (nuevo.length === 0) setPaso("catalogo");
  };

  const getProductosPayload = () => carrito.map(p => ({
    id: p.id,
    nombre: p.nombre,
    precioUnitario: getPrecioFinal(p.precio, p.descuento),
  }));

  const handleSubirComprobante = async () => {
    if (!comprobante || !nombreDeclarado || !monto) {
      alert("Completá todos los campos antes de enviar.");
      return;
    }
    setEnviando(true);
    const formData = new FormData();
    formData.append("comprobante", comprobante);
    formData.append("tipo", "imagen");
    formData.append("nombreDeclarado", nombreDeclarado);
    formData.append("monto", monto);
    formData.append("productos", JSON.stringify(getProductosPayload()));
    try {
      const res = await fetch(`${API_URL}/pagos`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setMensaje("Tu pago fue registrado. El equipo lo verificará y te contactará pronto.");
        setCarrito([]);
        setPaso("confirmacion");
      } else {
        alert(`❌ Error: ${data.error || "Intenta de nuevo."}`);
      }
    } catch {
      alert("❌ Error de conexión. Verificá tu internet e intentá de nuevo.");
    }
    setEnviando(false);
  };

  const handleDeclararPago = async () => {
    if (!nombreDeclarado || !monto) {
      alert("Completá todos los campos antes de enviar.");
      return;
    }
    setEnviando(true);
    const formData = new FormData();
    formData.append("nombreDeclarado", nombreDeclarado);
    formData.append("monto", monto);
    formData.append("tipo", "declarado");
    if (descripcion) formData.append("descripcion", descripcion);
    formData.append("productos", JSON.stringify(getProductosPayload()));
    try {
      const res = await fetch(`${API_URL}/pagos`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setMensaje("Tu pago fue registrado. El equipo lo verificará y te contactará pronto.");
        setCarrito([]);
        setPaso("confirmacion");
      } else {
        alert(`❌ Error: ${data.error || "Intenta de nuevo."}`);
      }
    } catch {
      alert("❌ Error de conexión. Verificá tu internet e intentá de nuevo.");
    }
    setEnviando(false);
  };

  const PASOS = ["catalogo", "pago"];
  const stepIndex = PASOS.indexOf(paso);

  // ── CONFIRMACIÓN ────────────────────────────────────────────
  if (paso === "confirmacion") {
    return (
      <div style={{
        background: "#000", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
        <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }`}</style>
        <div style={{
          background: "#0d0d1a", border: "1px solid #14532d",
          padding: "52px 40px", borderRadius: 24, textAlign: "center",
          maxWidth: 480, width: "100%",
          boxShadow: "0 0 60px rgba(5,150,105,.1)",
          animation: "fadeIn .4s ease",
        }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
          <h2 style={{ color: "#34d399", fontSize: 24, fontWeight: 800, margin: "0 0 14px" }}>
            ¡Pago registrado!
          </h2>
          <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.8, margin: "0 0 32px" }}>
            {mensaje}
          </p>
          <button
            onClick={() => { setPaso("catalogo"); setModo(null); setNombreDeclarado(""); setMonto(""); setComprobante(null); }}
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
        @keyframes toastUp   { 0%{opacity:0;transform:translateX(-50%) translateY(0) scale(.8)} 15%{opacity:1;transform:translateX(-50%) translateY(-10px) scale(1)} 70%{opacity:1;transform:translateX(-50%) translateY(-28px) scale(1)} 100%{opacity:0;transform:translateX(-50%) translateY(-44px) scale(.9)} }
        @keyframes btnBounce { 0%{transform:scale(1)} 40%{transform:scale(.94)} 70%{transform:scale(1.04)} 100%{transform:scale(1)} }
        @keyframes badgePop  { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:1} }

        .ped-card {
          background: linear-gradient(160deg,#0d0d1a,#0a0a14);
          border: 1px solid #1e1b4b; border-radius: 18px; overflow: hidden;
          display: flex; flex-direction: column;
          transition: border-color .25s, transform .25s, box-shadow .25s;
        }
        .ped-card:hover { border-color:#312e81; transform:translateY(-6px); box-shadow:0 20px 40px rgba(99,102,241,.13); }

        .ped-cart-item {
          background: #0d0d1a; border: 1px solid #1e1b4b; border-radius: 14px;
          padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;
          transition: background .2s, border-color .2s;
        }
        .ped-cart-item:hover { background: #0f0e1a; border-color: #312e81; }

        .ped-remove-btn {
          background: none; border: none; color: #475569;
          cursor: pointer; font-size: 16px; padding: 6px 8px;
          border-radius: 8px; transition: color .2s, background .2s;
        }
        .ped-remove-btn:hover { color: #ef4444; background: rgba(239,68,68,.1); }

        .ped-input {
          padding: 13px 16px; border-radius: 12px;
          border: 1px solid #1e1b4b; background: #0a0a14;
          color: white; font-size: 14px; width: 100%; box-sizing: border-box;
          outline: none; transition: border-color .2s, box-shadow .2s; font-family: inherit;
        }
        .ped-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
        .ped-input::placeholder { color: #334155; }

        .ped-file-label {
          display: flex; align-items: center; gap: 10px;
          padding: 13px 16px; background: #0a0a14;
          border: 1px dashed #312e81; border-radius: 12px;
          color: #475569; font-size: 13px; cursor: pointer; width: 100%; box-sizing: border-box;
          transition: border-color .2s, color .2s, background .2s;
        }
        .ped-file-label:hover { border-color: #6366f1; color: #a5b4fc; background: rgba(99,102,241,.05); }

        .ped-modo-card {
          background: #070710; border: 1px solid #1e1b4b; border-radius: 14px;
          padding: 22px 16px; text-align: center; cursor: pointer;
          transition: border-color .2s, background .2s, transform .15s, box-shadow .2s;
        }
        .ped-modo-card:hover { border-color:#6366f1; background:rgba(99,102,241,.07); transform:translateY(-3px); box-shadow:0 12px 28px rgba(99,102,241,.12); }

        .ped-btn-primary {
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border: none; border-radius: 12px; color: white;
          font-weight: 700; cursor: pointer; font-family: inherit;
          transition: filter .15s, transform .15s;
          box-shadow: 0 4px 20px rgba(99,102,241,.35);
        }
        .ped-btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .ped-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .ped-btn-green {
          background: linear-gradient(135deg,#10b981,#059669);
          border: none; border-radius: 12px; color: white;
          font-weight: 700; cursor: pointer; font-family: inherit;
          transition: filter .15s, transform .15s;
          box-shadow: 0 4px 16px rgba(16,185,129,.3);
        }
        .ped-btn-green:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .ped-btn-green:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .ped-btn-ghost {
          background: #0d0d1a; border: 1px solid #1e1b4b; border-radius: 12px;
          color: #64748b; font-weight: 600; cursor: pointer; font-family: inherit;
          transition: border-color .2s, color .2s;
        }
        .ped-btn-ghost:hover { border-color: #312e81; color: #94a3b8; }

        .ped-comprar-btn {
          width: 100%; padding: 12px 0; border: none; border-radius: 0 0 18px 18px;
          color: white; font-weight: 700; font-size: 14px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: inherit;
          transition: filter .2s;
        }
        .ped-comprar-btn:hover { filter: brightness(1.12); }
        .ped-comprar-btn:active { transform: scale(0.98); }
      `}</style>

      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, margin: "0 0 6px", color: "#f1f5f9" }}>
            🛒 Hacer Pedido
          </h1>
          <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>
            Elegí los servicios editoriales que necesitás.
          </p>
        </div>

        {/* Stepper */}
        {paso !== "confirmacion" && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
            {["Catálogo", "Pago"].map((label, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 1 ? 1 : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: done ? "#059669" : active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#0d0d1a",
                      border: `2px solid ${done ? "#059669" : active ? "#6366f1" : "#1e1b4b"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      color: done || active ? "white" : "#334155",
                      boxShadow: active ? "0 2px 14px rgba(99,102,241,.45)" : "none",
                      transition: "all .3s",
                    }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: active ? 700 : 400,
                      color: active ? "#a5b4fc" : done ? "#34d399" : "#334155",
                    }}>
                      {label}
                    </span>
                  </div>
                  {i < 1 && (
                    <div style={{
                      flex: 1, height: 2, margin: "0 8px", marginBottom: 22,
                      background: done ? "#059669" : "#1e1b4b",
                      borderRadius: 99, transition: "background .3s",
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── PASO 1: CATÁLOGO ─────────────────────────────────── */}
        {paso === "catalogo" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <p style={{ color: "#475569", fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
              Agregá los servicios que querés contratar. Podés agregar varios del mismo tipo.
            </p>

            {loadingCat ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{
                  width: 36, height: 36, border: "3px solid #1e1b4b",
                  borderTop: "3px solid #6366f1", borderRadius: "50%",
                  margin: "0 auto 16px", animation: "spin .8s linear infinite",
                }} />
                <p style={{ color: "#475569", fontSize: 13 }}>Cargando catálogo...</p>
              </div>
            ) : productos.length === 0 ? (
              <p style={{ color: "#475569", textAlign: "center", padding: 60, fontSize: 15 }}>
                Próximamente nuevos servicios.
              </p>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 24, marginBottom: 32,
              }}>
                {productos.map(p => {
                  const precioFinal = getPrecioFinal(p.precio, p.descuento);
                  const fb = feedbacks[p.id];
                  const count = fb?.count ?? 0;
                  const toasts = fb?.toasts ?? [];
                  const bounce = fb?.bounce ?? false;

                  return (
                    <div key={p.id} className="ped-card">
                      {/* Imagen */}
                      <div style={{ position: "relative", width: "100%", paddingTop: "140%", overflow: "hidden", background: "#0d0d1a" }}>
                        {p.descuento > 0 && (
                          <div style={{
                            position: "absolute", top: 12, left: 12, zIndex: 2,
                            background: "linear-gradient(135deg,#ef4444,#dc2626)",
                            color: "white", padding: "4px 12px", borderRadius: 99,
                            fontSize: 12, fontWeight: 700,
                            boxShadow: "0 2px 10px rgba(239,68,68,.4)",
                          }}>
                            -{p.descuento}%
                          </div>
                        )}
                        {p.imagenUrl ? (
                          <img
                            src={p.imagenUrl} alt={p.nombre}
                            style={{
                              position: "absolute", top: 0, left: 0,
                              width: "100%", height: "100%", objectFit: "cover",
                              transition: "transform .4s ease",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                          />
                        ) : (
                          <div style={{
                            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                            background: "linear-gradient(135deg,#1e1b4b,#0f0e1a)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64,
                          }}>📦</div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: "18px 18px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        <h3 style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                          {p.nombre}
                        </h3>
                        <p style={{
                          color: "#64748b", fontSize: 12, lineHeight: 1.6, flex: 1, margin: 0,
                          display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical", overflow: "hidden",
                        }}>
                          {p.descripcion}
                        </p>

                        {/* Precio */}
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          {p.descuento > 0 && (
                            <span style={{ color: "#475569", fontSize: 13, textDecoration: "line-through" }}>
                              Bs {p.precio.toFixed(2)}
                            </span>
                          )}
                          <span style={{ color: "#34d399", fontSize: 22, fontWeight: 800 }}>
                            Bs {precioFinal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Botón comprar con toasts */}
                      <div style={{ position: "relative" }}>
                        {toasts.map(toast => (
                          <div key={toast.id} style={{
                            position: "absolute", bottom: "100%", left: "50%",
                            marginBottom: 6,
                            background: "#059669", color: "white",
                            padding: "5px 16px", borderRadius: 99, fontSize: 13,
                            fontWeight: "bold", whiteSpace: "nowrap",
                            pointerEvents: "none",
                            animation: "toastUp 1.8s ease forwards",
                            zIndex: 10, boxShadow: "0 4px 14px rgba(5,150,105,.45)",
                          }}>
                            ✅ ¡Agregado!
                          </div>
                        ))}

                        <button
                          className="ped-comprar-btn"
                          onClick={e => agregarAlCarrito(p, e)}
                          style={{
                            background: count > 0
                              ? "linear-gradient(135deg,#059669,#047857)"
                              : "linear-gradient(135deg,#10b981,#059669)",
                            animation: bounce ? "btnBounce .3s ease" : "none",
                          }}
                        >
                          <span>🛒 Comprar</span>
                          {count > 0 && (
                            <span style={{
                              background: "rgba(0,0,0,.2)", borderRadius: 99,
                              fontSize: 12, fontWeight: 700, padding: "2px 8px",
                              animation: "badgePop .3s ease",
                            }}>
                              ×{count}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mini carrito */}
            {carrito.length > 0 && (
              <div style={{
                background: "#0d0d1a", border: "1px solid #1e1b4b",
                borderRadius: 16, padding: "18px 20px", marginBottom: 24,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
                    Seleccionados — {carrito.length} ítem{carrito.length !== 1 ? "s" : ""}
                  </p>
                  <span style={{ color: "#34d399", fontWeight: 800, fontSize: 18 }}>
                    Bs {Math.round(total)}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {carrito.map((item, i) => {
                    const precio = getPrecioFinal(item.precio, item.descuento);
                    return (
                      <div key={i} className="ped-cart-item">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {item.imagenUrl && (
                            <img src={item.imagenUrl} alt={item.nombre} style={{
                              width: 38, height: 38, objectFit: "cover",
                              borderRadius: 8, border: "1px solid #1e1b4b", flexShrink: 0,
                            }} />
                          )}
                          <div>
                            <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13, margin: "0 0 2px" }}>{item.nombre}</p>
                            <p style={{ color: "#34d399", fontWeight: 700, fontSize: 13, margin: 0 }}>Bs {precio.toFixed(2)}</p>
                          </div>
                        </div>
                        <button className="ped-remove-btn" onClick={() => quitarDelCarrito(i)}>✕</button>
                      </div>
                    );
                  })}
                </div>

                {/* Adelanto sugerido */}
                <div style={{ height: 1, background: "#1e1b4b", margin: "14px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Adelanto sugerido (30%)</span>
                  <span style={{ color: "#818cf8", fontWeight: 700, fontSize: 16 }}>Bs {adelanto}</span>
                </div>
              </div>
            )}

            <button
              className="ped-btn-primary"
              onClick={() => setPaso("pago")}
              disabled={carrito.length === 0}
              style={{ padding: "13px 28px", fontSize: 15 }}
            >
              💳 Proceder al pago →
            </button>
          </div>
        )}

        {/* ── PASO 2: PAGO ─────────────────────────────────────── */}
        {paso === "pago" && (
          <div style={{ animation: "fadeIn .3s ease" }}>

            {/* Lista compacta */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {carrito.map((item, i) => {
                const precio = getPrecioFinal(item.precio, item.descuento);
                return (
                  <div key={i} className="ped-cart-item">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {item.imagenUrl && (
                        <img src={item.imagenUrl} alt={item.nombre} style={{
                          width: 42, height: 42, objectFit: "cover",
                          borderRadius: 9, border: "1px solid #1e1b4b", flexShrink: 0,
                        }} />
                      )}
                      <div>
                        <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14, margin: "0 0 3px" }}>{item.nombre}</p>
                        <p style={{ color: "#34d399", fontWeight: 700, fontSize: 14, margin: 0 }}>Bs {precio.toFixed(2)}</p>
                      </div>
                    </div>
                    <button className="ped-remove-btn" onClick={() => quitarDelCarrito(i)}>✕</button>
                  </div>
                );
              })}
            </div>

            {/* Resumen precio */}
            <div style={{
              background: "#0d0d1a", border: "1px solid #1e1b4b",
              padding: "16px 20px", borderRadius: 14, marginBottom: 22,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ color: "#64748b", fontSize: 14 }}>Total</span>
                <span style={{ color: "#34d399", fontWeight: 800, fontSize: 22 }}>Bs {Math.round(total)}</span>
              </div>
              <div style={{ height: 1, background: "#1e1b4b", marginBottom: 10 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontSize: 13 }}>Adelanto sugerido (30%)</span>
                <span style={{ color: "#818cf8", fontWeight: 700, fontSize: 16 }}>Bs {adelanto}</span>
              </div>
            </div>

            <div style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", padding: 26, borderRadius: 18 }}>
              <h3 style={{ margin: "0 0 22px", fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>💳 Realizá tu pago</h3>

              {/* QR */}
              <div style={{
                background: "#070710", border: "1px solid #1e1b4b",
                padding: 22, borderRadius: 16, textAlign: "center", marginBottom: 18,
              }}>
                <img
                  src="/qr-pago.jpeg" alt="QR de pago"
                  style={{
                    width: "100%", maxWidth: isMobile ? 200 : 260,
                    margin: "0 auto", borderRadius: 12, display: "block",
                    objectFit: "contain", border: "1px solid #1e1b4b",
                  }}
                />
                
                  href="/qr-pago.jpeg" download="QR_Pago_Vanguardistas.jpg"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    marginTop: 12, color: "#818cf8", fontSize: 13, textDecoration: "none",
                    transition: "color .2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#a5b4fc")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#818cf8")}
                >
                  📥 Descargar QR
                </a>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Banco Unión · Cuenta: 123456789</p>
                  <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Titular: Asociación Vanguardistas 3.0</p>
                </div>
              </div>

              {/* Info adelanto */}
              <div style={{
                background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.2)",
                padding: 16, borderRadius: 12, marginBottom: 22, textAlign: "center",
              }}>
                <p style={{ color: "#a5b4fc", fontSize: 15, margin: 0 }}>
                  Pagá <strong style={{ color: "white", fontSize: 18 }}>Bs {adelanto}</strong> como adelanto (30%)
                </p>
              </div>

              {/* Selector de modo */}
              {!modo ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { key: "subir", icon: "📤", title: "Subir comprobante", sub: "Foto del depósito" },
                    { key: "declarar", icon: "📝", title: "Declarar pago", sub: "Sin comprobante" },
                  ].map(m => (
                    <div
                      key={m.key}
                      className="ped-modo-card"
                      onClick={() => setModo(m.key as any)}
                    >
                      <div style={{ fontSize: 34, marginBottom: 10 }}>{m.icon}</div>
                      <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14, margin: "0 0 5px" }}>{m.title}</p>
                      <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>{m.sub}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelSt}>Nombre completo</label>
                    <input
                      className="ped-input"
                      placeholder="Tu nombre completo (solo letras)"
                      value={nombreDeclarado}
                      onChange={e => setNombreDeclarado(soloLetrasMayusculas(e.target.value))}
                    />
                  </div>

                  <div>
                    <label style={labelSt}>Monto depositado (Bs)</label>
                    <input
                      className="ped-input"
                      placeholder={`Ej: ${adelanto}`}
                      type="number"
                      value={monto}
                      onChange={e => setMonto(e.target.value)}
                    />
                  </div>

                  {modo === "subir" && (
                    <div>
                      <label style={labelSt}>Foto del comprobante</label>
                      <label className="ped-file-label">
                        <span style={{ fontSize: 22 }}>🖼️</span>
                        <span>{comprobante ? comprobante.name : "Seleccionar imagen..."}</span>
                        <input type="file" accept="image/*" style={{ display: "none" }}
                          onChange={e => setComprobante(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  )}

                  {modo === "declarar" && (
                    <div>
                      <label style={labelSt}>Descripción (opcional)</label>
                      <input
                        className="ped-input"
                        placeholder="Cualquier detalle adicional"
                        value={descripcion}
                        onChange={e => setDescripcion(e.target.value)}
                      />
                    </div>
                  )}

                  <button
                    className="ped-btn-green"
                    onClick={modo === "subir" ? handleSubirComprobante : handleDeclararPago}
                    disabled={enviando}
                    style={{
                      padding: 14, marginTop: 4, fontSize: 15,
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
                        Enviando...
                      </>
                    ) : modo === "subir" ? "Enviar comprobante" : "Declarar pago"}
                  </button>

                  <button className="ped-btn-ghost" onClick={() => setModo(null)} style={{ padding: "11px 0", fontSize: 14 }}>
                    ← Cambiar método
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <button className="ped-btn-ghost" onClick={() => setPaso("catalogo")} style={{ padding: "11px 20px", fontSize: 14 }}>
                ← Volver al catálogo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 8,
};

export default ClienteHacerPedido;