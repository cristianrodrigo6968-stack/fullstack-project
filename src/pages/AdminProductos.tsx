import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  descuento: number;
  activo: boolean;
  imagenUrl?: string;
}

function AdminProductos() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [descuento, setDescuento] = useState("0");
  const [imagen, setImagen] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/productos/admin`, { headers });
    if (res.ok) setProductos(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setNombre("");
    setDescripcion("");
    setPrecio("");
    setDescuento("0");
    setImagen(null);
    setOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditId(p.id);
    setNombre(p.nombre);
    setDescripcion(p.descripcion);
    setPrecio(String(p.precio));
    setDescuento(String(p.descuento));
    setImagen(null);
    setOpen(true);
  };

  const save = async () => {
    if (!nombre || !precio) return;
    setSaving(true);

    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("descripcion", descripcion.replace(/\r\n/g, "\n"));
    formData.append("precio", precio);
    formData.append("descuento", descuento);
    if (imagen) formData.append("imagen", imagen);

    if (editId) {
      await fetch(`${API_URL}/productos/${editId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } else {
      await fetch(`${API_URL}/productos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }
    setSaving(false);
    setOpen(false);
    await load();
  };

  const toggleActivo = async (p: Producto) => {
    const formData = new FormData();
    formData.append("activo", String(!p.activo));
    await fetch(`${API_URL}/productos/${p.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    await load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`${API_URL}/productos/${id}`, { method: "DELETE", headers });
    await load();
  };

  const precioFinal = (p: Producto) =>
    p.descuento > 0 ? p.precio - (p.precio * p.descuento / 100) : p.precio;

  return (
    <div style={{ fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

        .prod-card {
          background: #0f172a;
          border-radius: 16px;
          border: 1px solid #1e293b;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .prod-card:hover {
          border-color: #334155;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .action-btn {
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          font-family: inherit;
          border-radius: 8px;
          padding: 7px 14px;
          transition: opacity 0.15s, transform 0.15s;
          white-space: nowrap;
        }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .action-btn:active { transform: translateY(0); }

        .modal-input {
          width: 100%;
          padding: 11px 14px;
          margin-bottom: 10px;
          border-radius: 10px;
          border: 1px solid #334155;
          background: #0f172a;
          color: white;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }
        .modal-input:focus { border-color: #3b82f6; }
        .modal-input::placeholder { color: #475569; }

        .file-label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #0f172a;
          border: 1px dashed #334155;
          border-radius: 10px;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
          margin-bottom: 10px;
          transition: border-color 0.2s, color 0.2s;
        }
        .file-label:hover { border-color: #3b82f6; color: #94a3b8; }

        .badge-active {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 99px; letter-spacing: 0.3px;
        }
      `}</style>

      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🛒</div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 700, color: "#f1f5f9" }}>
            Catálogo de Productos
          </h1>
        </div>
        <p style={{ color: "#475569", fontSize: 13, margin: "0 0 20px 50px" }}>
          Gestiona los productos del catálogo público
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          {/* Contador */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 20 }}>{productos.length}</div>
              <div style={{ color: "#475569", fontSize: 11 }}>Total</div>
            </div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 20 }}>{productos.filter(p => p.activo).length}</div>
              <div style={{ color: "#475569", fontSize: 11 }}>Activos</div>
            </div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 20 }}>{productos.filter(p => !p.activo).length}</div>
              <div style={{ color: "#475569", fontSize: 11 }}>Inactivos</div>
            </div>
          </div>

          <button onClick={openCreate} style={{
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            border: "none", padding: "11px 20px", borderRadius: 10,
            color: "white", fontWeight: 600, cursor: "pointer",
            fontSize: 13, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 7,
            boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
            transition: "opacity 0.2s, transform 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <span style={{ fontSize: 16 }}>＋</span> Nuevo producto
          </button>
        </div>
      </div>

      {/* LISTA */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              background: "#0f172a", borderRadius: 16, height: 90,
              border: "1px solid #1e293b", opacity: 0.5,
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.3} }`}</style>
        </div>
      ) : productos.length === 0 ? (
        <div style={{
          background: "#0f172a", border: "1px dashed #1e293b",
          borderRadius: 16, padding: "60px 40px", textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <p style={{ color: "#475569", margin: 0, fontSize: 15 }}>No hay productos creados aún.</p>
          <button onClick={openCreate} style={{
            marginTop: 16, background: "#1e293b", border: "1px solid #334155",
            color: "#94a3b8", padding: "9px 20px", borderRadius: 8,
            cursor: "pointer", fontFamily: "inherit", fontSize: 13,
          }}>
            Crear el primero
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {productos.map(p => (
            <div key={p.id} className="prod-card">
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", flexWrap: "wrap", gap: 12, padding: "14px 16px",
                borderLeft: `3px solid ${p.activo ? "#22c55e" : "#ef4444"}`,
              }}>
                {/* Izquierda: imagen + info */}
                <div style={{ display: "flex", gap: 14, alignItems: "center", flex: 1, minWidth: 0 }}>
                  {p.imagenUrl ? (
                    <img
                      src={p.imagenUrl}
                      alt={p.nombre}
                      style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                      background: "#1e293b", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 22,
                    }}>📦</div>
                  )}

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                      <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{p.nombre}</span>
                      <span className="badge-active" style={{
                        background: p.activo ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        color: p.activo ? "#22c55e" : "#ef4444",
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <p style={{
                      color: "#475569", fontSize: 12, margin: "0 0 6px",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      maxHeight: 36, overflow: "hidden",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>
                      {p.descripcion}
                    </p>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      {p.descuento > 0 && (
                        <span style={{ color: "#475569", fontSize: 12, textDecoration: "line-through" }}>
                          Bs {p.precio.toFixed(2)}
                        </span>
                      )}
                      <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 14 }}>
                        Bs {precioFinal(p).toFixed(2)}
                      </span>
                      {p.descuento > 0 && (
                        <span style={{
                          background: "rgba(239,68,68,0.15)", color: "#ef4444",
                          padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                        }}>
                          -{p.descuento}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Derecha: botones */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActivo(p)}
                    className="action-btn"
                    style={{ background: p.activo ? "#1e293b" : "rgba(34,197,94,0.15)", color: p.activo ? "#94a3b8" : "#22c55e" }}
                  >
                    {p.activo ? "Inactivar" : "✓ Activar"}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="action-btn"
                    style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="action-btn"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {open && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 999, padding: 20,
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            padding: "28px 24px",
            borderRadius: 18,
            width: "100%", maxWidth: 460,
            color: "white",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>
                  {editId ? "Editar producto" : "Nuevo producto"}
                </h3>
                <p style={{ margin: "2px 0 0", color: "#475569", fontSize: 12 }}>
                  {editId ? "Modifica los datos del producto" : "Completa los datos del nuevo producto"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "#1e293b", border: "none", color: "#64748b",
                  width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                  fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "inherit",
                }}
              >✕</button>
            </div>

            {/* Campos */}
            <label style={labelStyle}>Nombre del producto</label>
            <input
              placeholder="Ej: Membresía Categoría A"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="modal-input"
            />

            <label style={labelStyle}>Descripción</label>
            <textarea
              placeholder="Descripción del producto (Enter para nueva línea)"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={5}
              className="modal-input"
              style={{ resize: "vertical", lineHeight: 1.6 }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Precio (Bs)</label>
                <input
                  placeholder="0.00"
                  type="number"
                  value={precio}
                  onChange={e => setPrecio(e.target.value)}
                  className="modal-input"
                />
              </div>
              <div>
                <label style={labelStyle}>Descuento (%)</label>
                <input
                  placeholder="0"
                  type="number"
                  value={descuento}
                  onChange={e => setDescuento(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>

            <label style={labelStyle}>Imagen del producto</label>
            <label className="file-label">
              <span style={{ fontSize: 18 }}>🖼️</span>
              <span>{imagen ? imagen.name : "Seleccionar imagen..."}</span>
              <input
                type="file"
                accept="image/*"
                onChange={e => setImagen(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
            </label>

            {/* Acciones */}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  flex: 1,
                  background: saving ? "#1e293b" : "linear-gradient(135deg, #3b82f6, #6366f1)",
                  border: "none", padding: "12px", borderRadius: 10,
                  color: saving ? "#475569" : "white",
                  fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                  fontSize: 14, fontFamily: "inherit",
                  transition: "opacity 0.2s",
                }}
              >
                {saving ? "Guardando..." : "💾 Guardar"}
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "#1e293b", border: "1px solid #334155",
                  padding: "12px 20px", borderRadius: 10,
                  color: "#94a3b8", fontWeight: 600,
                  cursor: "pointer", fontSize: 14, fontFamily: "inherit",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 5,
};

export default AdminProductos;
