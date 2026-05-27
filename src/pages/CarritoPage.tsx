import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWindowSize } from "../hooks/useWindowSize";

function CarritoPage() {
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();
  const [carrito, setCarrito] = useState<any[]>([]);

  const [step, setStep] = useState<"carrito" | "celular" | "pago" | "confirmacion">("carrito");
  const [celular, setCelular] = useState("");
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

  const adelanto = total * 0.30;

  const handleContinuarPago = () => {
    if (!celular.trim() || celular.trim().length < 7) {
      alert("Ingresa un número de celular válido");
      return;
    }
    setStep("pago");
  };

  // ✅ Versión mejorada con FormData y logs
  const handleSubirComprobante = async () => {
    if (!comprobante || !nombreDeclarado || !monto || !celular) return;
    setEnviando(true);

    console.log("📤 Enviando comprobante...");
    const formData = new FormData();
    formData.append("comprobante", comprobante);
    formData.append("tipo", "imagen");
    formData.append("nombreDeclarado", nombreDeclarado);
    formData.append("monto", monto);
    formData.append("celular", celular);
    formData.append(
      "productos",
      JSON.stringify(carrito.map((p) => ({ id: p.id, nombre: p.nombre })))
    );

    console.log("📦 FormData campos:", {
      nombreDeclarado,
      monto,
      celular,
      archivo: comprobante.name,
      productos: carrito.map((p) => p.nombre),
    });

    const res = await fetch(`${import.meta.env.VITE_API_URL}/pagos`, {
      method: "POST",
      body: formData,
    });

    console.log("📡 Respuesta status:", res.status);
    const data = await res.json();
    console.log("📡 Respuesta body:", data);

    if (res.ok) {
      setMensaje("✅ Pago registrado correctamente. La asociación se comunicará contigo al número proporcionado.");
      localStorage.removeItem("carrito");
      setCarrito([]);
      setStep("confirmacion");
    } else {
      alert(`❌ Error: ${data.error || "Intenta de nuevo."}`);
    }
    setEnviando(false);
  };

  // ✅ Versión mejorada: también usa FormData
  const handleDeclararPago = async () => {
    if (!nombreDeclarado || !monto || !celular) return;
    setEnviando(true);

    console.log("📤 Declarando pago...");

    const formData = new FormData();
    formData.append("nombreDeclarado", nombreDeclarado);
    formData.append("monto", monto);
    formData.append("tipo", "declarado");
    formData.append("celular", celular);
    if (descripcion) formData.append("descripcion", descripcion);
    formData.append(
      "productos",
      JSON.stringify(carrito.map((p) => ({ id: p.id, nombre: p.nombre })))
    );

    console.log("📦 FormData campos:", {
      nombreDeclarado,
      monto,
      celular,
      descripcion,
      productos: carrito.map((p) => p.nombre),
    });

    const res = await fetch(`${import.meta.env.VITE_API_URL}/pagos`, {
      method: "POST",
      body: formData,
    });

    console.log("📡 Respuesta status:", res.status);
    const data = await res.json();
    console.log("📡 Respuesta body:", data);

    if (res.ok) {
      setMensaje("✅ Pago registrado correctamente. La asociación se comunicará contigo al número proporcionado.");
      localStorage.removeItem("carrito");
      setCarrito([]);
      setStep("confirmacion");
    } else {
      alert(`❌ Error: ${data.error || "Intenta de nuevo."}`);
    }
    setEnviando(false);
  };

  return (
    <div style={{ background: "#000", color: "white", minHeight: "100vh", padding: "80px 20px 40px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, marginBottom: 8 }}>🛒 Mi Carrito</h1>
        <p
          onClick={() => navigate("/")}
          style={{ color: "#60a5fa", fontSize: 13, cursor: "pointer", textDecoration: "underline", marginBottom: 24 }}
        >
          ← Seguir comprando
        </p>

        {carrito.length === 0 && step !== "confirmacion" && (
          <div style={{ textAlign: "center", padding: 40, background: "#1e293b", borderRadius: 14 }}>
            <p style={{ color: "#64748b", fontSize: 16 }}>Tu carrito está vacío.</p>
            <button onClick={() => navigate("/")} style={{ marginTop: 16, background: "#3b82f6", border: "none", padding: "10px 20px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 14 }}>
              Ir al catálogo
            </button>
          </div>
        )}

        {step === "confirmacion" && (
          <div style={{ background: "#1e293b", padding: 32, borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <p style={{ color: "white", fontSize: 17, marginBottom: 8 }}>{mensaje}</p>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>
              Tu número de contacto es <strong style={{ color: "white" }}>{celular}</strong>. Te escribiremos pronto.
            </p>
            <button onClick={() => navigate("/")} style={{ marginTop: 24, background: "#3b82f6", border: "none", padding: "12px 24px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 14 }}>
              Volver al inicio
            </button>
          </div>
        )}

        {carrito.length > 0 && (step === "carrito" || step === "celular" || step === "pago") && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {carrito.map((item, i) => {
                const precio = item.descuento > 0 ? item.precio - (item.precio * item.descuento / 100) : item.precio;
                return (
                  <div key={i} style={{ background: "#1e293b", padding: 16, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ color: "white", fontWeight: "bold" }}>{item.nombre}</p>
                      <p style={{ color: "#22c55e", fontWeight: "bold" }}>Bs {precio.toFixed(2)}</p>
                    </div>
                    {(step === "carrito" || step === "celular") && (
                      <button onClick={() => quitarDelCarrito(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#1e293b", padding: 20, borderRadius: 14, marginBottom: 24 }}>
              <p style={{ fontSize: 18, marginBottom: 8 }}>
                Total: <strong style={{ color: "#22c55e" }}>Bs {total.toFixed(2)}</strong>
              </p>
              <p style={{ color: "#60a5fa", fontSize: 14 }}>
                Adelanto sugerido (30%): <strong>Bs {adelanto.toFixed(2)}</strong>
              </p>
            </div>

            {step === "carrito" && (
              <div style={{ background: "#1e293b", padding: 24, borderRadius: 14 }}>
                <button
                  onClick={() => setStep("celular")}
                  style={{ width: "100%", padding: 14, background: "#22c55e", border: "none", borderRadius: 10, color: "white", fontWeight: "bold", fontSize: 16, cursor: "pointer" }}
                >
                  💳 Proceder al pago
                </button>
              </div>
            )}

            {step === "celular" && (
              <div style={{ background: "#1e293b", padding: 24, borderRadius: 14 }}>
                <h3 style={{ marginBottom: 16, fontSize: 18 }}>📱 Ingresa tu número de celular</h3>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>La asociación te contactará a este número después de tu pago.</p>
                <input
                  placeholder="Ej: 70012345"
                  value={celular}
                  onChange={e => setCelular(e.target.value.replace(/\D/g, ""))}
                  style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: "#334155", color: "white", fontSize: 15, boxSizing: "border-box", marginBottom: 16 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleContinuarPago} style={{ flex: 1, padding: 12, background: "#22c55e", border: "none", borderRadius: 8, color: "white", fontWeight: "bold", fontSize: 14, cursor: "pointer" }}>
                    Continuar
                  </button>
                  <button onClick={() => setStep("carrito")} style={{ padding: "12px 20px", background: "#334155", border: "none", borderRadius: 8, color: "white", fontWeight: "bold", fontSize: 14, cursor: "pointer" }}>
                    ← Volver
                  </button>
                </div>
              </div>
            )}

            {step === "pago" && (
              <div id="pago" style={{ background: "#1e293b", padding: 24, borderRadius: 14 }}>
                <h3 style={{ marginBottom: 16, fontSize: 18 }}>💳 Realiza tu pago</h3>

                <div style={{ background: "#0f172a", padding: 20, borderRadius: 10, textAlign: "center", marginBottom: 20 }}>
                  <img
                    src="/qr-pago.jpeg"
                    alt="QR de pago"
                    style={{
                      width: "100%",
                      maxWidth: isMobile ? 220 : 300,
                      margin: "0 auto",
                      borderRadius: 10,
                      display: "block",
                      objectFit: "contain",
                    }}
                  />
                  <a
                    href="/qr-pago.jpeg"
                    download="QR_Pago_Vanguardistas.jpg"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      color: "#60a5fa",
                      fontSize: 13,
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    📥 Descargar QR para pagar desde el celular
                  </a>
                  <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 12 }}>Banco: Banco Unión</p>
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>Cuenta: 123456789</p>
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>Titular: Asociación Vanguardistas 3.0</p>
                </div>

                <div style={{ background: "#1e3a5f", padding: 14, borderRadius: 8, marginBottom: 20, textAlign: "center" }}>
                  <p style={{ color: "#93c5fd", fontSize: 15, margin: 0 }}>
                    Paga <strong style={{ color: "white" }}>Bs {adelanto.toFixed(2)}</strong> (adelanto del 30%) y la asociación se comunicará contigo después de realizado el pago.
                  </p>
                  <p style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
                    📞 Te contactaremos al <strong style={{ color: "white" }}>{celular}</strong>
                  </p>
                </div>

                {!modo ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button onClick={() => setModo("subir")} style={btnStyle}>
                      📤 Subir comprobante
                    </button>
                    <button onClick={() => setModo("declarar")} style={btnStyle}>
                      📝 Declarar pago
                    </button>
                  </div>
                ) : (
                  <>
                    {modo === "subir" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <input placeholder="Nombre completo" value={nombreDeclarado} onChange={e => setNombreDeclarado(e.target.value)} style={inputStyle} />
                        <input placeholder="Monto depositado (Bs)" type="number" value={monto} onChange={e => setMonto(e.target.value)} style={inputStyle} />
                        <label style={{ color: "#94a3b8", fontSize: 12 }}>Sube la foto del comprobante</label>
                        <input type="file" accept="image/*" onChange={e => setComprobante(e.target.files?.[0] || null)} style={{ color: "white" }} />
                        <button onClick={handleSubirComprobante} disabled={enviando} style={{ ...btnStyle, background: "#22c55e" }}>
                          {enviando ? "Enviando..." : "Enviar comprobante"}
                        </button>
                      </div>
                    )}

                    {modo === "declarar" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <input placeholder="Nombre completo" value={nombreDeclarado} onChange={e => setNombreDeclarado(e.target.value)} style={inputStyle} />
                        <input placeholder="Monto depositado (Bs)" type="number" value={monto} onChange={e => setMonto(e.target.value)} style={inputStyle} />
                        <input placeholder="Descripción (opcional)" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={inputStyle} />
                        <button onClick={handleDeclararPago} disabled={enviando} style={{ ...btnStyle, background: "#22c55e" }}>
                          {enviando ? "Enviando..." : "Declarar pago"}
                        </button>
                      </div>
                    )}

                    <button onClick={() => setModo(null)} style={{ ...btnStyle, background: "#334155", marginTop: 8 }}>
                      ← Volver
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#3b82f6", border: "none", padding: "12px 20px",
  borderRadius: 8, color: "white", fontWeight: "bold",
  cursor: "pointer", fontSize: 14, width: "100%",
};

const inputStyle: React.CSSProperties = {
  padding: 10, borderRadius: 8, border: "none",
  background: "#334155", color: "white", fontSize: 14,
  width: "100%", boxSizing: "border-box",
};

export default CarritoPage;