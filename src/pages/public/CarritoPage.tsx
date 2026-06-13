import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWindowSize } from "../../hooks/useWindowSize";

const soloLetrasMayusculas = (value: string): string => {
  return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").toUpperCase();
};

const redondearAdelanto = (valor: number): number => {
  if (valor < 100) return Math.ceil(valor / 10) * 10;
  else if (valor < 1000) return Math.ceil(valor / 50) * 50;
  else return Math.ceil(valor / 100) * 100;
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 6,
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

  // Eliminar un paquete completo (por productoPadreId)
  const eliminarPaquete = (productoPadreId: number) => {
    const nuevoCarrito = carrito.filter(item => item.productoPadreId !== productoPadreId);
    setCarrito(nuevoCarrito);
    localStorage.setItem("carrito", JSON.stringify(nuevoCarrito));
    if (nuevoCarrito.length === 0) setStep("carrito");
  };

  // Agrupar ítems del carrito: los que tienen productoPadreId (componentes) se agrupan; los normales se quedan sueltos
  const agruparCarrito = () => {
    const grupos: Record<number, any[]> = {};
    const normales: any[] = [];

    carrito.forEach(item => {
      if (item.productoPadreId) {
        if (!grupos[item.productoPadreId]) grupos[item.productoPadreId] = [];
        grupos[item.productoPadreId].push(item);
      } else {
        normales.push(item);
      }
    });

    // Convertir grupos a array de objetos con id, items, nombre del paquete y total
    const gruposArray = Object.entries(grupos).map(([id, items]) => ({
      id: Number(id),
      items,
      nombrePaquete: items[0]?.nombrePadre || "Paquete combinado",
      total: items.reduce((sum, i) => sum + (i.descuento > 0 ? i.precio - (i.precio * i.descuento / 100) : i.precio), 0)
    }));

    return { grupos: gruposArray, normales };
  };

  const { grupos, normales } = agruparCarrito();

  const total = (() => {
    const totalGrupos = grupos.reduce((sum, g) => sum + g.total, 0);
    const totalNormales = normales.reduce((sum, i) => sum + (i.descuento > 0 ? i.precio - (i.precio * i.descuento / 100) : i.precio), 0);
    return totalGrupos + totalNormales;
  })();

  const adelantoBruto = total * 0.3;
  const adelanto = redondearAdelanto(adelantoBruto);

  const handleContinuarDatos = () => {
    if (!celular.trim() || celular.trim().length < 7) { alert("Ingresá un número de celular válido"); return; }
    if (!ci.trim() || ci.trim().length < 5) { alert("Ingresá tu número de CI"); return; }
    setStep("pago");
  };

  const getProductosPayload = () => carrito.map(p => ({
    id: p.id,
    nombre: p.nombre,
    precioUnitario: p.descuento > 0 ? p.precio - (p.precio * p.descuento / 100) : p.precio,
  }));

  const handleSubirComprobante = async () => {
    if (!comprobante || !nombreDeclarado || !monto || !celular || !ci) {
      alert("Completá todos los campos antes de enviar.");
      return;
    }
    setEnviando(true);
    const formData = new FormData();
    formData.append("comprobante", comprobante);
    formData.append("tipo", "imagen");
    formData.append("nombreDeclarado", nombreDeclarado);
    formData.append("monto", monto);
    formData.append("celular", celular);
    formData.append("ci", ci);
    formData.append("productos", JSON.stringify(getProductosPayload()));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pagos`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setMensaje("✅ Pago registrado correctamente. La asociación se comunicará contigo al número proporcionado.");
        localStorage.removeItem("carrito");
        setCarrito([]);
        setStep("confirmacion");
      } else {
        alert(`❌ Error: ${data.error || "Intenta de nuevo."}`);
      }
    } catch {
      alert("❌ Error de conexión. Verificá tu internet e intentá de nuevo.");
    }
    setEnviando(false);
  };

  const handleDeclararPago = async () => {
    if (!nombreDeclarado || !monto || !celular || !ci) {
      alert("Completá todos los campos antes de enviar.");
      return;
    }
    setEnviando(true);
    const formData = new FormData();
    formData.append("nombreDeclarado", nombreDeclarado);
    formData.append("monto", monto);
    formData.append("tipo", "declarado");
    formData.append("celular", celular);
    formData.append("ci", ci);
    if (descripcion) formData.append("descripcion", descripcion);
    formData.append("productos", JSON.stringify(getProductosPayload()));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pagos`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setMensaje("✅ Pago registrado correctamente. La asociación se comunicará contigo al número proporcionado.");
        localStorage.removeItem("carrito");
        setCarrito([]);
        setStep("confirmacion");
      } else {
        alert(`❌ Error: ${data.error || "Intenta de nuevo."}`);
      }
    } catch {
      alert("❌ Error de conexión. Verificá tu internet e intentá de nuevo.");
    }
    setEnviando(false);
  };

  const steps = ["carrito", "datos", "pago"];
  const stepIndex = steps.indexOf(step);

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh", padding: "90px 20px 70px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .cart-input { padding:13px 16px; border-radius:12px; border:1px solid #1e1b4b; background:#0a0a14; color:white; font-size:14px; width:100%; box-sizing:border-box; outline:none; transition:border-color .2s, box-shadow .2s; font-family:inherit; }
        .cart-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.15); }
        .cart-input::placeholder { color:#334155; }
        .cart-item { transition:background .2s, border-color .2s, transform .15s; }
        .cart-item:hover { background:#0f0e1a !important; border-color:#312e81 !important; }
        .remove-btn { background:none; border:none; color:#475569; cursor:pointer; font-size:16px; padding:6px 8px; border-radius:8px; transition:color .2s, background .2s; }
        .remove-btn:hover { color:#ef4444 !important; background:rgba(239,68,68,.1); }
        .file-upload-label { display:flex; align-items:center; gap:10px; padding:13px 16px; background:#0a0a14; border:1px dashed #312e81; border-radius:12px; color:#475569; font-size:13px; cursor:pointer; transition:border-color .2s, color .2s, background .2s; }
        .file-upload-label:hover { border-color:#6366f1; color:#a5b4fc; background:rgba(99,102,241,.05); }
        .step-btn { transition:opacity .15s, transform .15s, filter .15s; font-family:inherit; }
        .step-btn:hover:not(:disabled) { opacity:.9; transform:translateY(-1px); }
        .step-btn:active:not(:disabled) { transform:translateY(0); }
        .modo-card { transition:border-color .2s, background .2s, transform .15s, box-shadow .2s; cursor:pointer; }
        .modo-card:hover { border-color:#6366f1 !important; background:rgba(99,102,241,.07) !important; transform:translateY(-3px); box-shadow:0 12px 28px rgba(99,102,241,.12); }
        .btn-volver-paso { padding:12px 18px; background:#0d0d1a; border:1px solid #1e1b4b; border-radius:12px; color:#64748b; font-weight:600; font-size:14px; cursor:pointer; font-family:inherit; transition:border-color .2s, color .2s; }
        .btn-volver-paso:hover { border-color:#312e81; color:#94a3b8; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, margin: "0 0 8px", color: "#f1f5f9" }}>🛒 Mi Carrito</h1>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#818cf8", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>← Seguir comprando</button>
        </div>

        {carrito.length > 0 && step !== "confirmacion" && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
            {["Carrito", "Datos", "Pago"].map((label, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: done ? "#059669" : active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#0d0d1a",
                      border: `2px solid ${done ? "#059669" : active ? "#6366f1" : "#1e1b4b"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      color: done || active ? "white" : "#334155",
                      boxShadow: active ? "0 2px 12px rgba(99,102,241,.4)" : "none",
                    }}>{done ? "✓" : i + 1}</div>
                    <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? "#a5b4fc" : done ? "#34d399" : "#334155" }}>{label}</span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 2, margin: "0 6px", background: done ? "#059669" : "#1e1b4b", marginBottom: 20, borderRadius: 99 }} />}
                </div>
              );
            })}
          </div>
        )}

        {carrito.length === 0 && step !== "confirmacion" && (
          <div style={{ textAlign: "center", padding: "70px 40px", background: "#0d0d1a", borderRadius: 20, border: "1px solid #1e1b4b", animation: "fadeIn .4s ease" }}>
            <div style={{ fontSize: 64, marginBottom: 18 }}>🛒</div>
            <p style={{ color: "#475569", fontSize: 17, margin: "0 0 24px" }}>Tu carrito está vacío.</p>
            <button className="step-btn" onClick={() => navigate("/")} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", padding: "12px 28px", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14, boxShadow: "0 4px 16px rgba(99,102,241,.4)" }}>Ir al catálogo</button>
          </div>
        )}

        {step === "confirmacion" && (
          <div style={{ background: "#0d0d1a", border: "1px solid #14532d", padding: "44px 32px", borderRadius: 22, textAlign: "center", animation: "fadeIn .4s ease", boxShadow: "0 0 40px rgba(5,150,105,.1)" }}>
            <div style={{ fontSize: 68, marginBottom: 18 }}>✅</div>
            <h2 style={{ color: "#34d399", fontSize: 22, margin: "0 0 14px", fontWeight: 800 }}>¡Pago registrado!</h2>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.8, maxWidth: 440, margin: "0 auto 24px" }}>{mensaje}</p>
            <div style={{ background: "#0a0a14", border: "1px solid #1e1b4b", borderRadius: 12, padding: "16px 22px", display: "inline-block", marginBottom: 28, textAlign: "left" }}>
              <p style={{ margin: "0 0 5px", color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Datos de contacto</p>
              <p style={{ margin: "0 0 3px", color: "white", fontSize: 14 }}>📱 {celular}</p>
              <p style={{ margin: 0, color: "white", fontSize: 14 }}>🪪 CI: {ci}</p>
            </div>
            <br />
            <button className="step-btn" onClick={() => navigate("/")} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", padding: "13px 30px", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14, boxShadow: "0 4px 16px rgba(99,102,241,.4)" }}>Volver al inicio</button>
          </div>
        )}

        {carrito.length > 0 && step !== "confirmacion" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {/* Paquetes (productos con componentes) */}
              {grupos.map(grupo => (
                <div key={grupo.id} className="cart-item" style={{ background: "#0d0d1a", borderRadius: 14, border: "1px solid #1e1b4b", marginBottom: 10 }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e1b4b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "bold", color: "#f1f5f9" }}>🎁 Paquete: {grupo.nombrePaquete}</span>
                    <button className="remove-btn" onClick={() => eliminarPaquete(grupo.id)}>✕ Eliminar paquete</button>
                  </div>
                  {grupo.items.map((item, idx) => (
                    <div key={idx} style={{ padding: "8px 18px", display: "flex", justifyContent: "space-between", borderTop: "1px solid #1e293b" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {item.imagenUrl && <img src={item.imagenUrl} alt="" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 6 }} />}
                        <span style={{ color: "#cbd5e1", fontSize: 13 }}>{item.nombre}</span>
                      </div>
                      <span style={{ color: "#34d399", fontWeight: "bold" }}>Bs {(item.descuento > 0 ? item.precio - (item.precio * item.descuento / 100) : item.precio).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ padding: "10px 18px", textAlign: "right", borderTop: "1px solid #1e293b", background: "#0a0a14" }}>
                    <span style={{ color: "#f1f5f9", fontSize: 14 }}>Total paquete: </span>
                    <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: 16 }}>Bs {grupo.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}

              {/* Productos normales (sin componentes) */}
              {normales.map((item, i) => {
                const precio = item.descuento > 0 ? item.precio - (item.precio * item.descuento / 100) : item.precio;
                return (
                  <div key={i} className="cart-item" style={{ background: "#0d0d1a", padding: "14px 18px", borderRadius: 14, border: "1px solid #1e1b4b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {item.imagenUrl && <img src={item.imagenUrl} alt={item.nombre} style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 10, flexShrink: 0, border: "1px solid #1e1b4b" }} />}
                      <div>
                        <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>{item.nombre}</p>
                        <p style={{ color: "#34d399", fontWeight: 700, fontSize: 15, margin: 0 }}>Bs {precio.toFixed(2)}</p>
                      </div>
                    </div>
                    {(step === "carrito" || step === "datos") && (
                      <button className="remove-btn" onClick={() => {
                        const nuevo = carrito.filter((_, idx) => idx !== i);
                        setCarrito(nuevo);
                        localStorage.setItem("carrito", JSON.stringify(nuevo));
                        if (nuevo.length === 0) setStep("carrito");
                      }}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", padding: "18px 22px", borderRadius: 14, marginBottom: 22 }}>
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

            {step === "carrito" && (
              <button className="step-btn" onClick={() => setStep("datos")} style={{ width: "100%", padding: 16, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 14, color: "white", fontWeight: 700, fontSize: 17, cursor: "pointer", boxShadow: "0 4px 20px rgba(16,185,129,.3)" }}>💳 Proceder al pago</button>
            )}

            {step === "datos" && (
              <div style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", padding: 26, borderRadius: 18 }}>
                <h3 style={{ margin: "0 0 5px", fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>📋 Tus datos de contacto</h3>
                <p style={{ color: "#475569", fontSize: 13, margin: "0 0 22px", lineHeight: 1.6 }}>La asociación te contactará a estos datos para gestionar tu pedido.</p>
                <label style={labelStyle}>Celular</label>
                <input className="cart-input" placeholder="Ej: 70012345" value={celular} onChange={e => setCelular(e.target.value.replace(/\D/g, ""))} style={{ marginBottom: 14 }} />
                <label style={labelStyle}>Cédula de identidad (CI)</label>
                <input className="cart-input" placeholder="Ej: 1234567" value={ci} onChange={e => setCi(e.target.value.replace(/\D/g, ""))} style={{ marginBottom: 24 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="step-btn" onClick={handleContinuarDatos} style={{ flex: 1, padding: 13, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 12px rgba(16,185,129,.25)" }}>Continuar →</button>
                  <button className="btn-volver-paso" onClick={() => setStep("carrito")}>← Volver</button>
                </div>
              </div>
            )}

            {step === "pago" && (
              <div style={{ background: "#0d0d1a", border: "1px solid #1e1b4b", padding: 26, borderRadius: 18 }}>
                <h3 style={{ margin: "0 0 22px", fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>💳 Realizá tu pago</h3>
                <div style={{ background: "#070710", border: "1px solid #1e1b4b", padding: 22, borderRadius: 16, textAlign: "center", marginBottom: 18 }}>
                  <img src="/qr-pago.jpeg" alt="QR de pago" style={{ width: "100%", maxWidth: isMobile ? 200 : 260, margin: "0 auto", borderRadius: 12, display: "block", objectFit: "contain", border: "1px solid #1e1b4b" }} />
                  <a href="/qr-pago.jpeg" download="QR_Pago_Vanguardistas.jpg" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, color: "#818cf8", fontSize: 13, textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.color = "#a5b4fc")} onMouseLeave={e => (e.currentTarget.style.color = "#818cf8")}>📥 Descargar QR</a>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Banco Unión · Cuenta: 123456789</p>
                    <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Titular: Asociación Vanguardistas 3.0</p>
                  </div>
                </div>
                <div style={{ background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.2)", padding: 16, borderRadius: 12, marginBottom: 22, textAlign: "center" }}>
                  <p style={{ color: "#a5b4fc", fontSize: 15, margin: "0 0 6px" }}>Pagá <strong style={{ color: "white", fontSize: 18 }}>Bs {adelanto}</strong> como adelanto (30%)</p>
                  <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Te contactamos al <strong style={{ color: "#94a3b8" }}>{celular}</strong> · CI <strong style={{ color: "#94a3b8" }}>{ci}</strong></p>
                </div>
                {!modo ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {[{ key: "subir", icon: "📤", title: "Subir comprobante", sub: "Foto del depósito" }, { key: "declarar", icon: "📝", title: "Declarar pago", sub: "Sin comprobante" }].map(m => (
                      <div key={m.key} className="modo-card" onClick={() => setModo(m.key as any)} style={{ background: "#070710", border: "1px solid #1e1b4b", borderRadius: 14, padding: "22px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 34, marginBottom: 10 }}>{m.icon}</div>
                        <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14, margin: "0 0 5px" }}>{m.title}</p>
                        <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>{m.sub}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={labelStyle}>Nombre completo</label>
                    <input className="cart-input" placeholder="Tu nombre completo (solo letras)" value={nombreDeclarado} onChange={e => setNombreDeclarado(soloLetrasMayusculas(e.target.value))} />
                    <label style={labelStyle}>Monto depositado (Bs)</label>
                    <input className="cart-input" placeholder={`Ej: ${adelanto}`} type="number" value={monto} onChange={e => setMonto(e.target.value)} />
                    {modo === "subir" && (
                      <>
                        <label style={labelStyle}>Foto del comprobante</label>
                        <label className="file-upload-label"><span style={{ fontSize: 22 }}>🖼️</span><span>{comprobante ? comprobante.name : "Seleccionar imagen..."}</span><input type="file" accept="image/*" onChange={e => setComprobante(e.target.files?.[0] || null)} style={{ display: "none" }} /></label>
                      </>
                    )}
                    {modo === "declarar" && (
                      <><label style={labelStyle}>Descripción (opcional)</label><input className="cart-input" placeholder="Cualquier detalle adicional" value={descripcion} onChange={e => setDescripcion(e.target.value)} /></>
                    )}
                    <button className="step-btn" onClick={modo === "subir" ? handleSubirComprobante : handleDeclararPago} disabled={enviando} style={{ padding: 14, marginTop: 4, background: enviando ? "#0d0d1a" : "linear-gradient(135deg,#10b981,#059669)", border: enviando ? "1px solid #1e1b4b" : "none", borderRadius: 12, color: enviando ? "#334155" : "white", fontWeight: 700, fontSize: 15, cursor: enviando ? "not-allowed" : "pointer", boxShadow: enviando ? "none" : "0 4px 16px rgba(16,185,129,.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      {enviando ? (<> <div style={{ width: 18, height: 18, border: "2px solid #334155", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Enviando...</>) : (modo === "subir" ? "Enviar comprobante" : "Declarar pago")}
                    </button>
                    <button className="btn-volver-paso" onClick={() => setModo(null)}>← Cambiar método</button>
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

export default CarritoPage;