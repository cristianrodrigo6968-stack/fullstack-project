import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWindowSize } from "../hooks/useWindowSize";

const redondearAdelanto = (valor: number): number => {
  if (valor < 100) return Math.ceil(valor / 10) * 10;
  else if (valor < 1000) return Math.ceil(valor / 50) * 50;
  else return Math.ceil(valor / 100) * 100;
};

function CarritoPage() {
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();
  const [carrito, setCarrito] = useState<any[]>([]);

  const [step, setStep] = useState<"carrito" | "datos" | "pago" | "confirmacion">("carrito");
  const [celular, setCelular] = useState("");
  const [ci, setCi] = useState("");
  const [modo, setModo] = useState<"subir" | "declarar" | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [nombreDeclarado, setNombreDeclarado] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("carrito");
    setCarrito(saved ? JSON.parse(saved) : []);
  }, []);

  const quitarDelCarrito = (index: number) => {
    const nuevo = carrito.filter((_, i) => i !== index);
    setCarrito(nuevo);
    localStorage.setItem("carrito", JSON.stringify(nuevo));
    if (nuevo.length === 0) setStep("carrito");
  };

  const total = carrito.reduce((sum, p) => {
    const precio = p.descuento > 0 ? p.precio - (p.precio * p.descuento / 100) : p.precio;
    return sum + precio;
  }, 0);

  const adelantoBruto = total * 0.3;
  const adelanto = redondearAdelanto(adelantoBruto);

  const handleContinuarDatos = () => {
    if (!celular.trim() || celular.trim().length < 7) { alert("Ingresa un número de celular válido"); return; }
    if (!ci.trim() || ci.trim().length < 5) { alert("Ingresa tu número de CI (cédula de identidad)"); return; }
    setStep("pago");
  };

  const getProductosPayload = () => carrito.map((p) => ({ id: p.id, nombre: p.nombre }));

  const handleSubirComprobante = async () => {
    if (!comprobante || !nombreDeclarado || !monto || !celular || !ci) return;
    setEnviando(true);
    const formData = new FormData();
    formData.append("comprobante", comprobante);
    formData.append("tipo", "imagen");
    formData.append("nombreDeclarado", nombreDeclarado);
    formData.append("monto", monto);
    formData.append("celular", celular);
    formData.append("ci", ci);
    formData.append("productos", JSON.stringify(getProductosPayload()));
    const res = await fetch(`${import.meta.env.VITE_API_URL}/pagos`, { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
      setMensaje("✅ Pago registrado correctamente. La asociación se comunicará contigo al número proporcionado.");
      localStorage.removeItem("carrito");
      setCarrito([]);
      setStep("confirmacion");
    } else { alert(`❌ Error: ${data.error || "Intenta de nuevo."}`); }
    setEnviando(false);
  };

  const handleDeclararPago = async () => {
    if (!nombreDeclarado || !monto || !celular || !ci) return;
    setEnviando(true);
    const formData = new FormData();
    formData.append("nombreDeclarado", nombreDeclarado);
    formData.append("monto", monto);
    formData.append("tipo", "declarado");
    formData.append("celular", celular);
    formData.append("ci", ci);
    if (descripcion) formData.append("descripcion", descripcion);
    formData.append("productos", JSON.stringify(getProductosPayload()));
    const res = await fetch(`${import.meta.env.VITE_API_URL}/pagos`, { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
      setMensaje("✅ Pago registrado correctamente. La asociación se comunicará contigo al número proporcionado.");
      localStorage.removeItem("carrito");
      setCarrito([]);
      setStep("confirmacion");
    } else { alert(`❌ Error: ${data.error || "Intenta de nuevo."}`); }
    setEnviando(false);
  };

  // Steps visuales
  const steps = ["carrito", "datos", "pago"];
  const stepIndex = steps.indexOf(step);

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh", padding: "80px 20px 60px" }}>
      <style>{`
        .cart-input {
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #1e293b;
          background: #0f172a;
          color: white;
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .cart-input:focus { border-color: #3b82f6; }
        .cart-input::placeholder { color: #334155; }
        .cart-item { transition: background 0.2s; }
        .cart-item:hover { background: #1a2744 !important; }
        .remove-btn:hover { color: #ff6b6b !important; transform: scale(1.15); }
        .file-upload-label {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; background: #0f172a;
          border: 1px dashed #334155; border-radius: 10px;
          color: #475569; font-size: 13px; cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .file-upload-label:hover { border-color: #3b82f6; color: #94a3b8; }
        .step-btn { transition: opacity 0.15s, transform 0.15s; }
        .step-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .step-btn:active:not(:disabled) { transform: translateY(0); }
        .modo-card { transition: border-color 0.2s, background 0.2s, transform 0.15s; }
        .modo-card:hover { border-color: #3b82f6 !important; background: #0f2044 !important; transform: translateY(-2px); }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: "0 0 6px", color: "#f1f5f9" }}>
            🛒 Mi Carrito
          </h1>
          <span
            onClick={() => navigate("/")}
            style={{ color: "#3b82f6", fontSize: 13, cursor: "pointer" }}
          >
            ← Seguir comprando
          </span>
        </div>

        {/* STEPPER — solo cuando hay productos y no es confirmación */}
        {carrito.length > 0 && step !== "confirmacion" && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 0 }}>
            {["Carrito", "Datos", "Pago"].map((label, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: done ? "#22c55e" : active ? "#3b82f6" : "#1e293b",
                      border: `2px solid ${done ? "#22c55e" : active ? "#3b82f6" : "#334155"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      color: done || active ? "white" : "#475569",
                      transition: "all 0.3s",
                    }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 11, color: active ? "#f1f5f9" : done ? "#22c55e" : "#475569", fontWeight: active ? 600 : 400 }}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div style={{
                      flex: 1, height: 2, margin: "0 8px",
                      background: done ? "#22c55e" : "#1e293b",
                      marginBottom: 18, transition: "background 0.3s",
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CARRITO VACÍO */}
        {carrito.length === 0 && step !== "confirmacion" && (
          <div style={{ textAlign: "center", padding: "60px 40px", background: "#0f172a", borderRadius: 16, border: "1px solid #1e293b" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
            <p style={{ color: "#475569", fontSize: 16, margin: "0 0 20px" }}>Tu carrito está vacío.</p>
            <button onClick={() => navigate("/")} className="step-btn" style={{ background: "#3b82f6", border: "none", padding: "11px 24px", borderRadius: 10, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
              Ir al catálogo
            </button>
          </div>
        )}

        {/* CONFIRMACIÓN */}
        {step === "confirmacion" && (
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "40px 32px", borderRadius: 20, textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "#22c55e", fontSize: 20, margin: "0 0 12px" }}>¡Pago registrado!</h2>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, maxWidth: 440, margin: "0 auto 20px" }}>{mensaje}</p>
            <div style={{ background: "#1e293b", borderRadius: 10, padding: "14px 20px", display: "inline-block", marginBottom: 24, textAlign: "left" }}>
              <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: 12 }}>DATOS DE CONTACTO</p>
              <p style={{ margin: "0 0 2px", color: "white", fontSize: 14 }}>📱 {celular}</p>
              <p style={{ margin: 0, color: "white", fontSize: 14 }}>🪪 CI: {ci}</p>
            </div>
            <br />
            <button onClick={() => navigate("/")} className="step-btn" style={{ background: "#3b82f6", border: "none", padding: "12px 28px", borderRadius: 10, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
              Volver al inicio
            </button>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {carrito.length > 0 && step !== "confirmacion" && (
          <>
            {/* LISTA DE ITEMS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {carrito.map((item, i) => {
                const precio = item.descuento > 0 ? item.precio - (item.precio * item.descuento / 100) : item.precio;
                return (
                  <div key={i} className="cart-item" style={{
                    background: "#0f172a", padding: "14px 16px", borderRadius: 12,
                    border: "1px solid #1e293b",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {item.imagenUrl && (
                        <img src={item.imagenUrl} alt={item.nombre} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                      )}
                      <div>
                        <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14, margin: "0 0 3px" }}>{item.nombre}</p>
                        <p style={{ color: "#22c55e", fontWeight: 700, fontSize: 15, margin: 0 }}>Bs {precio.toFixed(2)}</p>
                      </div>
                    </div>
                    {(step === "carrito" || step === "datos") && (
                      <button
                        className="remove-btn"
                        onClick={() => quitarDelCarrito(i)}
                        style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, transition: "all 0.15s", padding: 4 }}
                      >✕</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* RESUMEN DE PRECIO */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "16px 20px", borderRadius: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "#64748b", fontSize: 14 }}>Total</span>
                <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 20 }}>Bs {Math.round(total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontSize: 13 }}>Adelanto sugerido (30%)</span>
                <span style={{ color: "#3b82f6", fontWeight: 600, fontSize: 15 }}>Bs {adelanto}</span>
              </div>
            </div>

            {/* STEP: CARRITO */}
            {step === "carrito" && (
              <button
                onClick={() => setStep("datos")}
                className="step-btn"
                style={{ width: "100%", padding: 14, background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(34,197,94,0.3)" }}
              >
                💳 Proceder al pago
              </button>
            )}

            {/* STEP: DATOS */}
            {step === "datos" && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", padding: 24, borderRadius: 16 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>📋 Tus datos de contacto</h3>
                <p style={{ color: "#475569", fontSize: 13, margin: "0 0 20px" }}>La asociación te contactará a estos datos para gestionar tu pedido.</p>

                <label style={labelStyle}>Celular</label>
                <input
                  className="cart-input"
                  placeholder="Ej: 70012345"
                  value={celular}
                  onChange={e => setCelular(e.target.value.replace(/\D/g, ""))}
                  style={{ marginBottom: 12 }}
                />
                <label style={labelStyle}>Cédula de identidad (CI)</label>
                <input
                  className="cart-input"
                  placeholder="Ej: 1234567"
                  value={ci}
                  onChange={e => setCi(e.target.value.replace(/\D/g, ""))}
                  style={{ marginBottom: 20 }}
                />

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleContinuarDatos} className="step-btn" style={{ flex: 1, padding: 12, background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: 10, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                    Continuar →
                  </button>
                  <button onClick={() => setStep("carrito")} className="step-btn" style={{ padding: "12px 18px", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#94a3b8", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                    ← Volver
                  </button>
                </div>
              </div>
            )}

            {/* STEP: PAGO */}
            {step === "pago" && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", padding: 24, borderRadius: 16 }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>💳 Realiza tu pago</h3>

                {/* QR */}
                <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", padding: 20, borderRadius: 14, textAlign: "center", marginBottom: 16 }}>
                  <img
                    src="/qr-pago.jpeg"
                    alt="QR de pago"
                    style={{ width: "100%", maxWidth: isMobile ? 200 : 260, margin: "0 auto", borderRadius: 10, display: "block", objectFit: "contain" }}
                  />
                  <a href="/qr-pago.jpeg" download="QR_Pago_Vanguardistas.jpg" style={{ display: "inline-block", marginTop: 10, color: "#3b82f6", fontSize: 13, textDecoration: "none" }}>
                    📥 Descargar QR
                  </a>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 3 }}>
                    <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Banco Unión · Cuenta: 123456789</p>
                    <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Titular: Asociación Vanguardistas 3.0</p>
                  </div>
                </div>

                {/* Info de pago */}
                <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", padding: 14, borderRadius: 10, marginBottom: 20, textAlign: "center" }}>
                  <p style={{ color: "#93c5fd", fontSize: 15, margin: "0 0 6px" }}>
                    Paga <strong style={{ color: "white", fontSize: 17 }}>Bs {adelanto}</strong> como adelanto (30%)
                  </p>
                  <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
                    Te contactaremos al <strong style={{ color: "#94a3b8" }}>{celular}</strong> · CI <strong style={{ color: "#94a3b8" }}>{ci}</strong>
                  </p>
                </div>

                {!modo ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="modo-card" onClick={() => setModo("subir")} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 16px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
                      <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>Subir comprobante</p>
                      <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Foto del depósito</p>
                    </div>
                    <div className="modo-card" onClick={() => setModo("declarar")} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 16px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                      <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>Declarar pago</p>
                      <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Sin comprobante</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {modo === "subir" && (
                      <>
                        <label style={labelStyle}>Nombre completo</label>
                        <input className="cart-input" placeholder="Tu nombre" value={nombreDeclarado} onChange={e => setNombreDeclarado(e.target.value)} />
                        <label style={labelStyle}>Monto depositado (Bs)</label>
                        <input className="cart-input" placeholder="Ej: 150" type="number" value={monto} onChange={e => setMonto(e.target.value)} />
                        <label style={labelStyle}>Foto del comprobante</label>
                        <label className="file-upload-label">
                          <span style={{ fontSize: 20 }}>🖼️</span>
                          <span>{comprobante ? comprobante.name : "Seleccionar imagen..."}</span>
                          <input type="file" accept="image/*" onChange={e => setComprobante(e.target.files?.[0] || null)} style={{ display: "none" }} />
                        </label>
                        <button onClick={handleSubirComprobante} disabled={enviando} className="step-btn" style={{ padding: 13, background: enviando ? "#1e293b" : "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: 10, color: enviando ? "#475569" : "white", fontWeight: 700, fontSize: 14, cursor: enviando ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: 4 }}>
                          {enviando ? "Enviando..." : "Enviar comprobante"}
                        </button>
                      </>
                    )}
                    {modo === "declarar" && (
                      <>
                        <label style={labelStyle}>Nombre completo</label>
                        <input className="cart-input" placeholder="Tu nombre" value={nombreDeclarado} onChange={e => setNombreDeclarado(e.target.value)} />
                        <label style={labelStyle}>Monto depositado (Bs)</label>
                        <input className="cart-input" placeholder="Ej: 150" type="number" value={monto} onChange={e => setMonto(e.target.value)} />
                        <label style={labelStyle}>Descripción (opcional)</label>
                        <input className="cart-input" placeholder="Cualquier detalle adicional" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                        <button onClick={handleDeclararPago} disabled={enviando} className="step-btn" style={{ padding: 13, background: enviando ? "#1e293b" : "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: 10, color: enviando ? "#475569" : "white", fontWeight: 700, fontSize: 14, cursor: enviando ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: 4 }}>
                          {enviando ? "Enviando..." : "Declarar pago"}
                        </button>
                      </>
                    )}
                    <button onClick={() => setModo(null)} className="step-btn" style={{ padding: 11, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                      ← Volver
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#475569",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 5,
};

export default CarritoPage;
