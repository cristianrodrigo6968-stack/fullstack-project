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
    formData.append("descripcion", descripcion);
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

  return (
    <div>
      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>🛒 Catálogo de Productos</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Gestiona los productos que aparecen en el catálogo público.
      </p>

      <button onClick={openCreate} style={{ ...btnBlue, marginBottom: 24 }}>➕ Nuevo producto</button>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Cargando productos...</p>
      ) : productos.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center", padding: 40 }}>
          No hay productos creados aún.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {productos.map(p => (
            <div key={p.id} style={{
              background: "#1e293b", padding: 16, borderRadius: 12,
              borderLeft: `4px solid ${p.activo ? "#22c55e" : "#ef4444"}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {p.imagenUrl && (
                  <img src={p.imagenUrl} alt={p.nombre} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }} />
                )}
                <div>
                  <p style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{p.nombre}</p>
                  <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, whiteSpace: "pre-wrap" }}>{p.descripcion}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "#22c55e", fontWeight: "bold" }}>
                      Bs {p.precio.toFixed(2)}
                    </span>
                    {p.descuento > 0 && (
                      <span style={{ background: "#ef4444", color: "white", padding: "2px 10px", borderRadius: 99, fontSize: 12 }}>
                        -{p.descuento}%
                      </span>
                    )}
                    <span style={{
                      fontSize: 11, padding: "2px 10px", borderRadius: 99,
                      background: p.activo ? "#14532d" : "#7f1d1d",
                      color: p.activo ? "#22c55e" : "#ef4444",
                      fontWeight: "bold",
                    }}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => toggleActivo(p)} style={btnGray}>
                  {p.activo ? "❌ Inactivar" : "✅ Activar"}
                </button>
                <button onClick={() => openEdit(p)} style={btnYellow}>✏️ Editar</button>
                <button onClick={() => remove(p.id)} style={btnRed}>🗑 Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 999, padding: "20px",
        }}>
          <div style={{
            background: "#1e293b", padding: 24, borderRadius: 14,
            width: "100%", maxWidth: 460, color: "white",
          }}>
            <h3 style={{ marginBottom: 16 }}>{editId ? "Editar producto" : "Nuevo producto"}</h3>
            <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
      <textarea
  placeholder="Descripción (puedes usar saltos de línea)"
  value={descripcion}
  onChange={e => setDescripcion(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.stopPropagation(); // Evita que el formulario se envíe
    }
  }}
  rows={6}
  style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "none", background: "#334155", color: "white", fontSize: 14, boxSizing: "border-box", resize: "vertical" }}
/>
            <input placeholder="Precio (Bs)" type="number" value={precio} onChange={e => setPrecio(e.target.value)} style={inputStyle} />
            <input placeholder="Descuento (%)" type="number" value={descuento} onChange={e => setDescuento(e.target.value)} style={inputStyle} />
            <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Imagen del producto</label>
            <input type="file" accept="image/*" onChange={e => setImagen(e.target.files?.[0] || null)} style={{ color: "white", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={save} disabled={saving} style={btnBlue}>
                {saving ? "Guardando..." : "💾 Guardar"}
              </button>
              <button onClick={() => setOpen(false)} style={btnRed}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "none", background: "#334155", color: "white", fontSize: 14, boxSizing: "border-box" };
const btnBlue: React.CSSProperties = { background: "#3b82f6", border: "none", padding: "10px 18px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnRed: React.CSSProperties = { background: "#ef4444", border: "none", padding: "10px 18px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnYellow: React.CSSProperties = { background: "#f59e0b", border: "none", padding: "10px 18px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };
const btnGray: React.CSSProperties = { background: "#334155", border: "none", padding: "10px 18px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13 };

export default AdminProductos;