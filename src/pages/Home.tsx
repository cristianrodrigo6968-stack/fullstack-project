function CatalogoProductos() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [carrito, setCarrito] = useState<any[]>(() => {
    const saved = localStorage.getItem("carrito");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/productos`)
      .then(r => r.json())
      .then(data => { setProductos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (producto: any) => {
    const nombre = producto.nombre.toLowerCase();
    let tipo = "autor";
    if (nombre.includes("categoría a")) tipo = "libroA";
    else if (nombre.includes("categoría b")) tipo = "libroB";
    else if (nombre.includes("categoría c")) tipo = "libroC";
    else if (nombre.includes("director")) tipo = "director";
    else if (nombre.includes("fundador")) tipo = "fundador";

    setCarrito(prev => [...prev, { ...producto, tipo }]);
  };

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

  const getSimilares = (producto: any) => {
    const cat = getCategoria(producto.nombre);
    return productos.filter(p => p.id !== producto.id && getCategoria(p.nombre) === cat).slice(0, 4);
  };

  if (loading) return <p style={{ color: "#94a3b8", textAlign: "center", gridColumn: "1/-1" }}>Cargando productos...</p>;
  if (productos.length === 0) return <p style={{ color: "#64748b", textAlign: "center", gridColumn: "1/-1" }}>Próximamente nuevos servicios.</p>;

  return (
    <>
      {productos.map((p: any) => {
        const precioFinal = p.descuento > 0 ? p.precio - (p.precio * p.descuento / 100) : p.precio;
        return (
          <div key={p.id} style={{
            background: "#111", borderRadius: 14,
            border: "1px solid #222", transition: "all 0.3s ease",
            overflow: "hidden", cursor: "pointer",
            display: "flex", flexDirection: "column",
          }}>
            {/* Imagen con proporción 2:3 (sin cambios) */}
            <div onClick={() => setSelected(p)} style={{ position: "relative", width: "100%", paddingTop: "150%", overflow: "hidden" }}>
              {p.imagenUrl ? (
                <img src={p.imagenUrl} alt={p.nombre} style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%", objectFit: "cover",
                }} />
              ) : (
                <div style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  background: "#1e293b", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 64,
                }}>📦</div>
              )}
            </div>
            {/* Contenido textual (sin "Ver más") */}
            <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ color: "#3b82f6", fontSize: 18, fontWeight: 700, margin: 0 }}>{p.nombre}</h3>
              <p style={{
                color: "#888", fontSize: 14, lineHeight: 1.5, flex: 1,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                textOverflow: "ellipsis",
              }}>
                {p.descripcion}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {p.descuento > 0 && (
                  <span style={{ color: "#ef4444", fontSize: 16, textDecoration: "line-through" }}>
                    Bs {p.precio.toFixed(2)}
                  </span>
                )}
                <span style={{ color: "#22c55e", fontSize: 22, fontWeight: "bold" }}>
                  Bs {precioFinal.toFixed(2)}
                </span>
                {p.descuento > 0 && (
                  <span style={{ background: "#ef4444", color: "white", padding: "2px 10px", borderRadius: 99, fontSize: 13, fontWeight: "bold" }}>
                    -{p.descuento}%
                  </span>
                )}
              </div>
              <button onClick={(e) => {
                e.stopPropagation();
                agregarAlCarrito(p);
              }} style={{
                marginTop: 8, width: "100%", padding: 10,
                background: "#22c55e", border: "none", borderRadius: 8,
                color: "white", fontWeight: "bold", fontSize: 14, cursor: "pointer",
              }}>
                🛒 Comprar
              </button>
            </div>
          </div>
        );
      })}

      {/* Modal de detalle MEJORADO (tipo Amazon) */}
      {selected && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", justifyContent: "center", alignItems: "flex-start",
          zIndex: 9999, padding: "20px", overflowY: "auto",
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: "#1e293b", borderRadius: 20, maxWidth: 1000, width: "100%",
            padding: 28, color: "white", position: "relative",
            margin: "20px 0",
          }} onClick={e => e.stopPropagation()}>
            {/* Botón cerrar */}
            <button onClick={() => setSelected(null)} style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(0,0,0,0.5)", border: "none", color: "white",
              cursor: "pointer", fontSize: 22, width: 36, height: 36,
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 30 }}>
              {/* Imagen a la izquierda (completa, sin recortar) */}
              <div style={{
                background: "#0f172a", borderRadius: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 20, minHeight: 300,
              }}>
                {selected.imagenUrl ? (
                  <img src={selected.imagenUrl} alt={selected.nombre} style={{
                    width: "100%", height: "auto", maxHeight: "70vh",
                    objectFit: "contain", borderRadius: 12,
                  }} />
                ) : (
                  <div style={{ fontSize: 80, opacity: 0.5 }}>📦</div>
                )}
              </div>

              {/* Detalles a la derecha */}
              <div>
                <h2 style={{ fontSize: 24, marginBottom: 12, color: "#f1f5f9" }}>{selected.nombre}</h2>

                {/* Precio */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
                  {selected.descuento > 0 && (
                    <span style={{ color: "#ef4444", fontSize: 18, textDecoration: "line-through" }}>
                      Bs {selected.precio.toFixed(2)}
                    </span>
                  )}
                  <span style={{ color: "#22c55e", fontSize: 28, fontWeight: "bold" }}>
                    Bs {(selected.descuento > 0 ? selected.precio - (selected.precio * selected.descuento / 100) : selected.precio).toFixed(2)}
                  </span>
                  {selected.descuento > 0 && (
                    <span style={{ background: "#ef4444", color: "white", padding: "3px 14px", borderRadius: 99, fontSize: 14, fontWeight: "bold" }}>
                      -{selected.descuento}%
                    </span>
                  )}
                </div>

                {/* Descripción completa */}
                <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                  {selected.descripcion}
                </p>

                {/* Características */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ color: "#cbd5e1", marginBottom: 10, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
                    📋 Características
                  </h4>
                  <ul style={{ color: "#94a3b8", fontSize: 14, lineHeight: 2, paddingLeft: 20 }}>
                    {selected.descripcion?.split(".").filter((s: string) => s.trim()).slice(0, 4).map((item: string, idx: number) => (
                      <li key={idx}>{item.trim()}</li>
                    ))}
                  </ul>
                </div>

                {/* Botón de compra */}
                <button onClick={() => {
                  agregarAlCarrito(selected);
                  setSelected(null);
                }} style={{
                  width: "100%", padding: 16,
                  background: "#22c55e", border: "none", borderRadius: 12,
                  color: "white", fontWeight: "bold", fontSize: 18, cursor: "pointer",
                  marginBottom: 12,
                }}>
                  🛒 Comprar ahora - Bs {(selected.descuento > 0 ? selected.precio - (selected.precio * selected.descuento / 100) : selected.precio).toFixed(2)}
                </button>

                <button onClick={() => {
                  navigate("/carrito");
                  setSelected(null);
                }} style={{
                  width: "100%", padding: 14,
                  background: "transparent", border: "2px solid #3b82f6", borderRadius: 12,
                  color: "#3b82f6", fontWeight: "bold", fontSize: 16, cursor: "pointer",
                }}>
                  Ir al carrito ({carrito.length})
                </button>
              </div>
            </div>

            {/* Productos similares */}
            {(() => {
              const similares = getSimilares(selected);
              if (similares.length > 0) {
                return (
                  <div style={{ marginTop: 40, borderTop: "1px solid #334155", paddingTop: 28 }}>
                    <h3 style={{ marginBottom: 20, fontSize: 18, color: "#cbd5f1" }}>✨ Productos similares</h3>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                      gap: 16,
                    }}>
                      {similares.map((sim: any) => {
                        const precioSim = sim.descuento > 0 ? sim.precio - (sim.precio * sim.descuento / 100) : sim.precio;
                        return (
                          <div key={sim.id} style={{
                            background: "#0f172a", borderRadius: 12, padding: 14,
                            textAlign: "center", cursor: "pointer",
                            border: "1px solid #334155", transition: "all 0.2s",
                          }} onClick={() => setSelected(sim)}>
                            {sim.imagenUrl ? (
                              <img src={sim.imagenUrl} alt={sim.nombre} style={{
                                width: "100%", height: 120, objectFit: "cover",
                                borderRadius: 8, marginBottom: 10,
                              }} />
                            ) : (
                              <div style={{
                                width: "100%", height: 120, background: "#1e293b",
                                borderRadius: 8, display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 40, marginBottom: 10,
                              }}>📦</div>
                            )}
                            <h4 style={{ color: "white", fontSize: 13, marginBottom: 6 }}>{sim.nombre}</h4>
                            <p style={{ color: "#22c55e", fontWeight: "bold", fontSize: 14 }}>
                              Bs {precioSim.toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}
    </>
  );
}