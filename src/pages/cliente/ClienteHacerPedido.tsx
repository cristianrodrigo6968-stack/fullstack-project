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

interface ItemCarrito {
  tipo: string;
  titulo: string;
  conSenapi: boolean;
  conIsbn: boolean;
  periodicidad: string;
  tipoAutor: string;
  asociacionEncargaTitulo: boolean;
  notas: string;
  archivoWord: File | null;
  archivoPdf: File | null;
}

const TIPO_INFO: Record<string, { emoji: string; label: string; color: string }> = {
  libroA: { emoji: "📚", label: "Libro Categoría A", color: "#6366f1" },
  libroB: { emoji: "📚", label: "Libro Categoría B", color: "#8b5cf6" },
  libroC: { emoji: "📚", label: "Libro Categoría C", color: "#a78bfa" },
  director: { emoji: "📘", label: "Director de Revista", color: "#3b82f6" },
  fundador: { emoji: "🏆", label: "Fundador de Revista", color: "#f59e0b" },
  autor: { emoji: "📝", label: "Autor de Artículo", color: "#10b981" },
};

const getCategoria = (nombre: string): string => {
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

function ClienteHacerPedido() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();

  const [paso, setPaso] = useState(1);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    fetch(`${API_URL}/productos`)
      .then(r => r.json())
      .then(data => { setProductos(data); setLoadingCat(false); })
      .catch(() => setLoadingCat(false));
  }, []);

  const agregarAlCarrito = (tipo: string) => {
    setCarrito(prev => [...prev, {
      tipo,
      titulo: "",
      conSenapi: false,
      conIsbn: false,
      periodicidad: "3 ediciones en 3 meses",
      tipoAutor: "soloTitulo",
      asociacionEncargaTitulo: false,
      notas: "",
      archivoWord: null,
      archivoPdf: null,
    }]);
  };

  const quitarDelCarrito = (index: number) => {
    setCarrito(prev => prev.filter((_, i) => i !== index));
  };

  const actualizarItem = (index: number, campo: keyof ItemCarrito, valor: any) => {
    setCarrito(prev => prev.map((item, i) => i === index ? { ...item, [campo]: valor } : item));
  };

  const confirmarPedido = async () => {
    setEnviando(true);
    const itemsParaEnviar = [];

    for (const item of carrito) {
      let archivoWordUrl: string | null = null;
      let archivoPdfUrl: string | null = null;

      if (item.archivoWord) {
        const formData = new FormData();
        formData.append("archivo", item.archivoWord);
        const res = await fetch(`${API_URL}/cliente/archivos/libro/0`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) archivoWordUrl = (await res.json()).archivoUrl;
      }

      if (item.archivoPdf) {
        const formData = new FormData();
        formData.append("archivo", item.archivoPdf);
        const res = await fetch(`${API_URL}/cliente/archivos/libro/0`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) archivoPdfUrl = (await res.json()).archivoUrl;
      }

      itemsParaEnviar.push({
        tipo: item.tipo,
        titulo: item.titulo || null,
        conSenapi: item.conSenapi,
        conIsbn: item.conIsbn,
        periodicidad: item.periodicidad || null,
        tipoAutor: item.tipoAutor || null,
        asociacionEncargaTitulo: item.asociacionEncargaTitulo,
        notas: item.notas || null,
        archivoWord: archivoWordUrl,
        archivoPdf: archivoPdfUrl,
      });
    }

    const res = await fetch(`${API_URL}/cliente/pedidos`, {
      method: "POST",
      headers,
      body: JSON.stringify({ items: itemsParaEnviar }),
    });

    if (res.ok) {
      setPedidoCreado(true);
      setCarrito([]);
    } else {
      alert("Error al crear el pedido. Intenta de nuevo.");
    }
    setEnviando(false);
  };

  const esTipoLibro = (tipo: string) => tipo.startsWith("libro");
  const esDirector = (tipo: string) => tipo === "director";
  const esFundador = (tipo: string) => tipo === "fundador";
  const esAutor = (tipo: string) => tipo === "autor";

  const PASOS = ["Catálogo", "Configurar", "Confirmar"];

  // ── PANTALLA DE ÉXITO ────────────────────────────────────────
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
            onClick={() => { setPedidoCreado(false); setPaso(1); }}
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

        .ped-input {
          padding: 13px 16px; border-radius: 12px;
          border: 1px solid #1e1b4b; background: #0a0a14;
          color: white; font-size: 14px; width: 100%; box-sizing: border-box;
          outline: none; transition: border-color .2s, box-shadow .2s; font-family: inherit;
        }
        .ped-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
        .ped-input::placeholder { color: #334155; }

        .ped-select {
          padding: 13px 16px; border-radius: 12px;
          border: 1px solid #1e1b4b; background: #0a0a14;
          color: white; font-size: 14px; width: 100%; box-sizing: border-box;
          outline: none; cursor: pointer; font-family: inherit;
          transition: border-color .2s;
        }
        .ped-select:focus { border-color: #6366f1; }

        .ped-card {
          background: linear-gradient(160deg,#0d0d1a,#0a0a14);
          border: 1px solid #1e1b4b; border-radius: 18px; overflow: hidden;
          display: flex; flex-direction: column;
          transition: border-color .2s, transform .2s, box-shadow .2s;
        }
        .ped-card:hover {
          border-color: #312e81;
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(99,102,241,.12);
        }

        .ped-item-carrito {
          background: #0d0d1a; border: 1px solid #1e1b4b; border-radius: 14px;
          padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;
          transition: background .2s, border-color .2s;
        }
        .ped-item-carrito:hover { background: #0f0e1a; border-color: #312e81; }

        .ped-remove-btn {
          background: none; border: none; color: #475569;
          cursor: pointer; font-size: 16px; padding: 6px 8px;
          border-radius: 8px; transition: color .2s, background .2s;
        }
        .ped-remove-btn:hover { color: #ef4444; background: rgba(239,68,68,.1); }

        .ped-config-card {
          background: #0d0d1a; border-radius: 18px;
          border-left: 3px solid #6366f1; border-top: 1px solid #1e1b4b;
          border-right: 1px solid #1e1b4b; border-bottom: 1px solid #1e1b4b;
          padding: 24px; animation: fadeIn .3s ease;
        }

        .ped-checkbox-label {
          display: flex; align-items: center; gap: 10px;
          color: #94a3b8; font-size: 14px; cursor: pointer;
          padding: 10px 14px; border-radius: 10px;
          border: 1px solid #1e1b4b; background: #0a0a14;
          transition: border-color .2s, background .2s;
          user-select: none;
        }
        .ped-checkbox-label:hover { border-color: #312e81; background: rgba(99,102,241,.05); }
        .ped-checkbox-label input { accent-color: #6366f1; width: 16px; height: 16px; }

        .ped-file-label {
          display: flex; align-items: center; gap: 10px;
          padding: 13px 16px; background: #0a0a14;
          border: 1px dashed #312e81; border-radius: 12px;
          color: #475569; font-size: 13px; cursor: pointer;
          transition: border-color .2s, color .2s, background .2s;
          width: 100%; box-sizing: border-box;
        }
        .ped-file-label:hover { border-color: #6366f1; color: #a5b4fc; background: rgba(99,102,241,.05); }

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

        .ped-btn-ghost {
          background: #0d0d1a; border: 1px solid #1e1b4b; border-radius: 12px;
          color: #64748b; font-weight: 600; cursor: pointer; font-family: inherit;
          transition: border-color .2s, color .2s;
        }
        .ped-btn-ghost:hover { border-color: #312e81; color: #94a3b8; }

        .ped-agregar-btn {
          background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.25);
          border-radius: 10px; color: #818cf8; font-weight: 700;
          font-size: 13px; cursor: pointer; font-family: inherit;
          padding: 8px 16px;
          transition: background .2s, border-color .2s, color .2s;
        }
        .ped-agregar-btn:hover { background: rgba(99,102,241,.2); border-color: #6366f1; color: #a5b4fc; }
      `}</style>

      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, margin: "0 0 6px", color: "#f1f5f9" }}>
            🛒 Hacer Pedido
          </h1>
          <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>
            Seleccioná los servicios editoriales que necesitás.
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
          {PASOS.map((label, i) => {
            const n = i + 1;
            const active = paso === n;
            const done = paso > n;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", flex: i < PASOS.length - 1 ? 1 : "none" }}>
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
                    {done ? "✓" : n}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: active ? 700 : 400,
                    color: active ? "#a5b4fc" : done ? "#34d399" : "#334155",
                    whiteSpace: "nowrap",
                  }}>
                    {label}
                  </span>
                </div>
                {i < PASOS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: "0 8px",
                    background: done ? "#059669" : "#1e1b4b",
                    marginBottom: 22, borderRadius: 99,
                    transition: "background .3s",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── PASO 1: CATÁLOGO ─────────────────────────────────── */}
        {paso === 1 && (
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
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: 18, marginBottom: 32,
              }}>
                {productos.map(p => {
                  const tipo = getCategoria(p.nombre);
                  const info = TIPO_INFO[tipo] || { emoji: "📦", label: p.nombre, color: "#6366f1" };
                  const precioFinal = getPrecioFinal(p.precio, p.descuento);
                  const enCarrito = carrito.filter(c => c.tipo === tipo).length;

                  return (
                    <div key={p.id} className="ped-card">
                      {/* Imagen o banner de color */}
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

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {enCarrito > 0 && (
                              <span style={{
                                background: "rgba(99,102,241,.15)", color: "#a5b4fc",
                                borderRadius: 99, fontSize: 11, fontWeight: 700,
                                padding: "3px 10px", animation: "badgePop .3s ease",
                              }}>
                                ×{enCarrito}
                              </span>
                            )}
                            <button
                              className="ped-agregar-btn"
                              onClick={() => agregarAlCarrito(tipo)}
                            >
                              ➕ Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mini-carrito */}
            {carrito.length > 0 && (
              <div style={{
                background: "#0d0d1a", border: "1px solid #1e1b4b",
                borderRadius: 16, padding: "18px 20px", marginBottom: 24,
              }}>
                <p style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>
                  Seleccionados — {carrito.length} ítem{carrito.length !== 1 ? "s" : ""}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {carrito.map((item, i) => {
                    const info = TIPO_INFO[item.tipo] || { emoji: "📦", label: item.tipo, color: "#6366f1" };
                    return (
                      <div key={i} className="ped-item-carrito">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{
                            background: `${info.color}20`,
                            border: `1px solid ${info.color}40`,
                            borderRadius: 8, padding: "4px 8px", fontSize: 16,
                          }}>
                            {info.emoji}
                          </span>
                          <span style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 500 }}>{info.label}</span>
                        </div>
                        <button className="ped-remove-btn" onClick={() => quitarDelCarrito(i)}>✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              className="ped-btn-primary"
              onClick={() => setPaso(2)}
              disabled={carrito.length === 0}
              style={{ padding: "13px 28px", fontSize: 15 }}
            >
              Siguiente: Configurar →
            </button>
          </div>
        )}

        {/* ── PASO 2: CONFIGURAR ────────────────────────────────── */}
        {paso === 2 && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <p style={{ color: "#475569", fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
              Completá los detalles de cada servicio.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {carrito.map((item, i) => {
                const info = TIPO_INFO[item.tipo] || { emoji: "📦", label: item.tipo, color: "#6366f1" };
                return (
                  <div key={i} className="ped-config-card" style={{ borderLeftColor: info.color }}>

                    {/* Header del ítem */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <span style={{
                        background: `${info.color}20`, border: `1px solid ${info.color}40`,
                        borderRadius: 10, padding: "6px 10px", fontSize: 20,
                      }}>
                        {info.emoji}
                      </span>
                      <div>
                        <p style={{ color: "white", fontWeight: 700, fontSize: 15, margin: 0 }}>{info.label}</p>
                        <p style={{ color: "#334155", fontSize: 11, margin: 0 }}>Ítem #{i + 1}</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                      {/* Título */}
                      <div>
                        <label style={labelSt}>
                          Título {esTipoLibro(item.tipo) || esAutor(item.tipo) ? "(obligatorio)" : "(opcional)"}
                        </label>
                        <input
                          className="ped-input"
                          value={item.titulo}
                          onChange={e => actualizarItem(i, "titulo", e.target.value)}
                          placeholder="Escribe el título..."
                        />
                      </div>

                      {/* Libros */}
                      {esTipoLibro(item.tipo) && (
                        <>
                          <div>
                            <label style={labelSt}>
                              Archivo Word {item.tipo !== "libroC" ? "(obligatorio)" : "(opcional)"}
                            </label>
                            <label className="ped-file-label">
                              <span style={{ fontSize: 20 }}>📄</span>
                              <span>{item.archivoWord ? item.archivoWord.name : "Seleccionar archivo .doc / .docx"}</span>
                              <input type="file" accept=".doc,.docx" style={{ display: "none" }}
                                onChange={e => actualizarItem(i, "archivoWord", e.target.files?.[0] || null)} />
                            </label>
                          </div>

                          <div>
                            <label style={labelSt}>
                              Archivo PDF {item.tipo !== "libroC" ? "(obligatorio)" : "(opcional)"}
                            </label>
                            <label className="ped-file-label">
                              <span style={{ fontSize: 20 }}>📕</span>
                              <span>{item.archivoPdf ? item.archivoPdf.name : "Seleccionar archivo .pdf"}</span>
                              <input type="file" accept=".pdf" style={{ display: "none" }}
                                onChange={e => actualizarItem(i, "archivoPdf", e.target.files?.[0] || null)} />
                            </label>
                          </div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <label className="ped-checkbox-label">
                              <input type="checkbox" checked={item.conSenapi}
                                onChange={e => actualizarItem(i, "conSenapi", e.target.checked)} />
                              SENAPI
                            </label>
                            <label className="ped-checkbox-label">
                              <input type="checkbox" checked={item.conIsbn}
                                onChange={e => actualizarItem(i, "conIsbn", e.target.checked)} />
                              ISBN
                            </label>
                          </div>
                        </>
                      )}

                      {/* Director */}
                      {esDirector(item.tipo) && (
                        <div>
                          <label style={labelSt}>Periodicidad</label>
                          <select className="ped-select" value={item.periodicidad}
                            onChange={e => actualizarItem(i, "periodicidad", e.target.value)}>
                            <option value="3 ediciones en 3 meses">3 ediciones en 3 meses</option>
                            <option value="3 ediciones en 1 mes">3 ediciones en 1 mes</option>
                            <option value="3 ediciones en 6 meses">3 ediciones en 6 meses</option>
                          </select>
                        </div>
                      )}

                      {/* Fundador */}
                      {esFundador(item.tipo) && (
                        <label className="ped-checkbox-label" style={{ width: "fit-content" }}>
                          <input type="checkbox" checked={item.asociacionEncargaTitulo}
                            onChange={e => actualizarItem(i, "asociacionEncargaTitulo", e.target.checked)} />
                          La asociación se encarga del título
                        </label>
                      )}

                      {/* Autor */}
                      {esAutor(item.tipo) && (
                        <>
                          <div>
                            <label style={labelSt}>Tipo de artículo</label>
                            <select className="ped-select" value={item.tipoAutor}
                              onChange={e => actualizarItem(i, "tipoAutor", e.target.value)}>
                              <option value="soloTitulo">Solo título (la asociación redacta)</option>
                              <option value="conContenido">Título + contenido propio</option>
                            </select>
                          </div>
                          {item.tipoAutor === "conContenido" && (
                            <div>
                              <label style={labelSt}>Archivo con contenido (opcional)</label>
                              <label className="ped-file-label">
                                <span style={{ fontSize: 20 }}>📄</span>
                                <span>{item.archivoWord ? item.archivoWord.name : "Seleccionar archivo..."}</span>
                                <input type="file" style={{ display: "none" }}
                                  onChange={e => actualizarItem(i, "archivoWord", e.target.files?.[0] || null)} />
                              </label>
                            </div>
                          )}
                        </>
                      )}

                      {/* Notas */}
                      <div>
                        <label style={labelSt}>Notas adicionales (opcional)</label>
                        <textarea
                          className="ped-input"
                          value={item.notas}
                          onChange={e => actualizarItem(i, "notas", e.target.value)}
                          rows={2}
                          placeholder="Cualquier detalle extra..."
                          style={{ resize: "none" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
              <button className="ped-btn-ghost" onClick={() => setPaso(1)} style={{ padding: "12px 20px", fontSize: 14 }}>
                ← Volver
              </button>
              <button className="ped-btn-primary" onClick={() => setPaso(3)} style={{ padding: "12px 24px", fontSize: 14 }}>
                Ver resumen →
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: CONFIRMAR ─────────────────────────────────── */}
        {paso === 3 && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <p style={{ color: "#475569", fontSize: 14, marginBottom: 24 }}>
              Revisá tu pedido antes de enviarlo.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
              {carrito.map((item, i) => {
                const info = TIPO_INFO[item.tipo] || { emoji: "📦", label: item.tipo, color: "#6366f1" };
                return (
                  <div key={i} style={{
                    background: "#0d0d1a",
                    border: `1px solid ${info.color}30`,
                    borderLeft: `3px solid ${info.color}`,
                    borderRadius: 14, padding: "18px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <span style={{
                        background: `${info.color}18`, border: `1px solid ${info.color}35`,
                        borderRadius: 8, padding: "4px 8px", fontSize: 18,
                      }}>
                        {info.emoji}
                      </span>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{info.label}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {item.titulo && (
                        <p style={{ color: "#cbd5e1", fontSize: 13, margin: 0 }}>
                          <span style={{ color: "#475569" }}>Título:</span> {item.titulo}
                        </p>
                      )}
                      {item.periodicidad && esDirector(item.tipo) && (
                        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                          <span style={{ color: "#475569" }}>Periodicidad:</span> {item.periodicidad}
                        </p>
                      )}
                      {item.tipoAutor && esAutor(item.tipo) && (
                        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                          <span style={{ color: "#475569" }}>Tipo:</span> {item.tipoAutor === "soloTitulo" ? "Solo título" : "Título + contenido"}
                        </p>
                      )}
                      {item.archivoWord && (
                        <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>📄 {item.archivoWord.name}</p>
                      )}
                      {item.archivoPdf && (
                        <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>📕 {item.archivoPdf.name}</p>
                      )}
                      {(item.conSenapi || item.conIsbn) && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          {item.conSenapi && (
                            <span style={{
                              background: "#1e3a5f", color: "#60a5fa",
                              padding: "2px 12px", borderRadius: 99,
                              fontSize: 11, fontWeight: 700,
                            }}>SENAPI</span>
                          )}
                          {item.conIsbn && (
                            <span style={{
                              background: "#1a3a2a", color: "#34d399",
                              padding: "2px 12px", borderRadius: 99,
                              fontSize: 11, fontWeight: 700,
                            }}>ISBN</span>
                          )}
                        </div>
                      )}
                      {item.notas && (
                        <p style={{ color: "#475569", fontSize: 12, margin: "6px 0 0", fontStyle: "italic" }}>
                          "{item.notas}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumen cantidad */}
            <div style={{
              background: "#0d0d1a", border: "1px solid #1e1b4b",
              borderRadius: 14, padding: "16px 20px", marginBottom: 24,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ color: "#64748b", fontSize: 14 }}>Total de servicios</span>
              <span style={{ color: "#a5b4fc", fontWeight: 800, fontSize: 18 }}>
                {carrito.length} ítem{carrito.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="ped-btn-ghost" onClick={() => setPaso(2)} style={{ padding: "12px 20px", fontSize: 14 }}>
                ← Volver
              </button>
              <button
                className="ped-btn-green"
                onClick={confirmarPedido}
                disabled={enviando}
                style={{
                  flex: 1, padding: "14px 0", fontSize: 15,
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
                ) : "✅ Confirmar pedido"}
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