import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";


const API_URL = "${import.meta.env.VITE_API_URL}";
interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  descuento: number;
}

interface ItemCarrito {
  tipo: string; // "libroA", "libroB", "libroC", "director", "fundador", "autor"
  titulo: string;
  conSenapi: boolean;
  conIsbn: boolean;
  periodicidad: string;
  tipoAutor: string; // "soloTitulo" o "conContenido"
  asociacionEncargaTitulo: boolean;
  notas: string;
  archivoWord: File | null;
  archivoPdf: File | null;
}

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
    // Subir archivos primero si los hay
    const itemsParaEnviar = [];
    for (const item of carrito) {
      let archivoWordUrl: string | null = null;
      let archivoPdfUrl: string | null = null;

      // Subir Word si existe
      if (item.archivoWord) {
        const formData = new FormData();
        formData.append("archivo", item.archivoWord);
        const res = await fetch(`${API_URL}/cliente/archivos/libro/0`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          archivoWordUrl = data.archivoUrl;
        }
      }
      // Subir PDF si existe
      if (item.archivoPdf) {
        const formData = new FormData();
        formData.append("archivo", item.archivoPdf);
        const res = await fetch(`${API_URL}/cliente/archivos/libro/0`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          archivoPdfUrl = data.archivoUrl;
        }
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

  const getTipoLabel = (tipo: string) => {
    const map: Record<string, string> = {
      libroA: "📚 Libro Categoría A",
      libroB: "📚 Libro Categoría B",
      libroC: "📚 Libro Categoría C",
      director: "📘 Director de Revista",
      fundador: "🏆 Fundador de Revista",
      autor: "📝 Autor de Artículo",
    };
    return map[tipo] || tipo;
  };

  const esTipoLibro = (tipo: string) => tipo.startsWith("libro");
  const esDirector = (tipo: string) => tipo === "director";
  const esFundador = (tipo: string) => tipo === "fundador";
  const esAutor = (tipo: string) => tipo === "autor";

  if (pedidoCreado) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ marginBottom: 8 }}>¡Pedido creado!</h2>
        <p style={{ color: "#94a3b8", marginBottom: 24 }}>
          Tu pedido ha sido registrado. El equipo editorial lo revisará y te contactará pronto.
        </p>
        <button onClick={() => { setPedidoCreado(false); setPaso(1); }} style={btnBlue}>
          Hacer otro pedido
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>🛒 Hacer Pedido</h1>

      {/* Indicador de pasos */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            flex: 1, textAlign: "center", padding: "8px 0",
            borderRadius: 8, fontWeight: "bold", fontSize: 13,
            background: paso === n ? "#3b82f6" : paso > n ? "#22c55e" : "#1e293b",
            color: "white",
          }}>
            {n === 1 && "① Catálogo"}
            {n === 2 && "② Configurar"}
            {n === 3 && "③ Confirmar"}
          </div>
        ))}
      </div>

      {/* ── PASO 1: CATÁLOGO ─────────────────────────────────── */}
      {paso === 1 && (
        <div>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>
            Selecciona los servicios que deseas contratar. Puedes agregar varios ítems del mismo tipo.
          </p>

          {loadingCat ? (
            <p style={{ color: "#94a3b8" }}>Cargando catálogo...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
              {productos.map(p => {
                const tipo = p.nombre.toLowerCase().includes("categoría a") ? "libroA"
                  : p.nombre.toLowerCase().includes("categoría b") ? "libroB"
                  : p.nombre.toLowerCase().includes("categoría c") ? "libroC"
                  : p.nombre.toLowerCase().includes("director") ? "director"
                  : p.nombre.toLowerCase().includes("fundador") ? "fundador"
                  : "autor";
                const precioFinal = p.descuento > 0 ? p.precio - (p.precio * p.descuento / 100) : p.precio;
                return (
                  <div key={p.id} style={{ background: "#1e293b", padding: 16, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ color: "white", fontWeight: "bold" }}>{p.nombre}</p>
                      <p style={{ color: "#22c55e", fontSize: 18, fontWeight: "bold" }}>Bs {precioFinal.toFixed(2)}</p>
                    </div>
                    <button onClick={() => agregarAlCarrito(tipo)} style={btnBlue}>
                      ➕ Agregar
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {carrito.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12 }}>🛒 Tu carrito ({carrito.length} ítems)</h3>
              {carrito.map((item, i) => (
                <div key={i} style={{ background: "#0f172a", padding: "8px 12px", borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "white", fontSize: 14 }}>{getTipoLabel(item.tipo)}</span>
                  <button onClick={() => quitarDelCarrito(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setPaso(2)} disabled={carrito.length === 0} style={{ ...btnBlue, opacity: carrito.length === 0 ? 0.5 : 1 }}>
            Siguiente: Configurar →
          </button>
        </div>
      )}

      {/* ── PASO 2: CONFIGURAR ────────────────────────────────── */}
      {paso === 2 && (
        <div>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>
            Configura cada ítem de tu pedido.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {carrito.map((item, i) => (
              <div key={i} style={{ background: "#1e293b", padding: 20, borderRadius: 12, borderLeft: "4px solid #3b82f6" }}>
                <h3 style={{ marginBottom: 16, color: "#60a5fa" }}>{getTipoLabel(item.tipo)}</h3>

                {/* Título */}
                <label style={labelStyle}>Título {esTipoLibro(item.tipo) || esAutor(item.tipo) ? "(obligatorio)" : "(opcional)"}</label>
                <input
                  value={item.titulo}
                  onChange={e => actualizarItem(i, "titulo", e.target.value)}
                  style={inputStyle}
                  placeholder="Escribe el título..."
                />

                {/* Opciones para libros */}
                {esTipoLibro(item.tipo) && (
                  <>
                    <label style={labelStyle}>Archivo Word {item.tipo !== "libroC" ? "(obligatorio)" : "(opcional)"}</label>
                    <input type="file" accept=".doc,.docx" onChange={e => actualizarItem(i, "archivoWord", e.target.files?.[0] || null)} style={{ color: "white", marginBottom: 8 }} />

                    <label style={labelStyle}>Archivo PDF {item.tipo !== "libroC" ? "(obligatorio)" : "(opcional)"}</label>
                    <input type="file" accept=".pdf" onChange={e => actualizarItem(i, "archivoPdf", e.target.files?.[0] || null)} style={{ color: "white", marginBottom: 12 }} />

                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, color: "white", fontSize: 13 }}>
                        <input type="checkbox" checked={item.conSenapi} onChange={e => actualizarItem(i, "conSenapi", e.target.checked)} />
                        SENAPI
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, color: "white", fontSize: 13 }}>
                        <input type="checkbox" checked={item.conIsbn} onChange={e => actualizarItem(i, "conIsbn", e.target.checked)} />
                        ISBN
                      </label>
                    </div>
                  </>
                )}

                {/* Opciones para director */}
                {esDirector(item.tipo) && (
                  <>
                    <label style={labelStyle}>Periodicidad</label>
                    <select value={item.periodicidad} onChange={e => actualizarItem(i, "periodicidad", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="3 ediciones en 3 meses">3 ediciones en 3 meses</option>
                      <option value="3 ediciones en 1 mes">3 ediciones en 1 mes</option>
                      <option value="3 ediciones en 6 meses">3 ediciones en 6 meses</option>
                    </select>
                  </>
                )}

                {/* Opciones para fundador */}
                {esFundador(item.tipo) && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, color: "white", fontSize: 13 }}>
                      <input type="checkbox" checked={item.asociacionEncargaTitulo} onChange={e => actualizarItem(i, "asociacionEncargaTitulo", e.target.checked)} />
                      La asociación se encarga del título
                    </label>
                  </div>
                )}

                {/* Opciones para autor */}
                {esAutor(item.tipo) && (
                  <>
                    <label style={labelStyle}>Tipo de artículo</label>
                    <select value={item.tipoAutor} onChange={e => actualizarItem(i, "tipoAutor", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="soloTitulo">Solo título (la asociación redacta)</option>
                      <option value="conContenido">Título + contenido</option>
                    </select>
                    {item.tipoAutor === "conContenido" && (
                      <>
                        <label style={labelStyle}>Archivo con contenido (opcional)</label>
                        <input type="file" onChange={e => actualizarItem(i, "archivoWord", e.target.files?.[0] || null)} style={{ color: "white", marginBottom: 8 }} />
                      </>
                    )}
                  </>
                )}

                {/* Notas */}
                <label style={labelStyle}>Notas adicionales (opcional)</label>
                <textarea
                  value={item.notas}
                  onChange={e => actualizarItem(i, "notas", e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: "none" }}
                  placeholder="Observaciones..."
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <button onClick={() => setPaso(1)} style={btnGray}>← Volver al catálogo</button>
            <button onClick={() => setPaso(3)} style={btnBlue}>Siguiente: Resumen →</button>
          </div>
        </div>
      )}

      {/* ── PASO 3: RESUMEN ───────────────────────────────────── */}
      {paso === 3 && (
        <div>
          <h3 style={{ marginBottom: 20 }}>📋 Resumen de tu pedido</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {carrito.map((item, i) => (
              <div key={i} style={{ background: "#1e293b", padding: 16, borderRadius: 10 }}>
                <p style={{ color: "#60a5fa", fontWeight: "bold", marginBottom: 4 }}>{getTipoLabel(item.tipo)}</p>
                {item.titulo && <p style={{ color: "white", fontSize: 14 }}>📌 {item.titulo}</p>}
                {item.periodicidad && <p style={{ color: "#94a3b8", fontSize: 13 }}>⏱ {item.periodicidad}</p>}
                {item.archivoWord && <p style={{ color: "#94a3b8", fontSize: 12 }}>📄 Word: {item.archivoWord.name}</p>}
                {item.archivoPdf && <p style={{ color: "#94a3b8", fontSize: 12 }}>📕 PDF: {item.archivoPdf.name}</p>}
                {item.conSenapi && <span style={badgeStyle}>SENAPI</span>}
                {item.conIsbn && <span style={badgeStyle}>ISBN</span>}
                {item.notas && <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>📝 {item.notas}</p>}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPaso(2)} style={btnGray}>← Volver a configurar</button>
            <button onClick={confirmarPedido} disabled={enviando} style={btnGreen}>
              {enviando ? "Enviando..." : "✅ Confirmar pedido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "none", background: "#334155", color: "white", fontSize: 14, boxSizing: "border-box" };
const btnBlue: React.CSSProperties = { background: "#3b82f6", border: "none", padding: "10px 18px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnGreen: React.CSSProperties = { background: "#22c55e", border: "none", padding: "10px 18px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "10px 18px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const badgeStyle: React.CSSProperties = { background: "#1e3a5f", color: "#60a5fa", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: "bold", display: "inline-block", marginRight: 6, marginTop: 6 };

export default ClienteHacerPedido;
