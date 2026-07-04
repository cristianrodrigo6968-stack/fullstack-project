import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

interface UltimoMensaje {
  texto: string;
  emisor: string;
  createdAt: string;
}

interface ClienteChat {
  id: number;
  nombre: string;
  fotografia: string | null;
  ultimoMensaje: UltimoMensaje | null;
  noLeidos: number;
}

interface Mensaje {
  id: number;
  clienteId: number;
  emisor: string;
  texto: string;
  archivos: string[];
  leido: boolean;
  createdAt: string;
}
interface ClienteBusqueda {
  id: number;
  nombreCompleto: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  fotografia: string | null;
}
function AdminMensajes() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();

  const [clientes, setClientes] = useState<ClienteChat[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
 const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [todosClientes, setTodosClientes] = useState<ClienteBusqueda[]>([]);
  const [cargandoTodos, setCargandoTodos] = useState(false);
  const [busquedaNuevo, setBusquedaNuevo] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const cargarLista = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/mensajes`, { headers: headers() });
      if (res.ok && mountedRef.current) {
        const data: ClienteChat[] = await res.json();
        setClientes(prev => {
          const pendientes = prev.filter(
            p => p.ultimoMensaje === null && !data.some(d => d.id === p.id)
          );
          return [...pendientes, ...data];
        });
      }
    } catch (err) {
      console.warn("Error al cargar lista de mensajes:", err);
    }
    if (mountedRef.current) setLoading(false);
  }, [headers]);

  const cargarMensajes = useCallback(async (clienteId: number) => {
    try {
      const res = await fetch(`${API_URL}/mensajes/${clienteId}`, { headers: headers() });
      if (res.ok && mountedRef.current) setMensajes(await res.json());
    } catch (err) {
      console.warn("Error al cargar mensajes:", err);
    }
  }, [headers]);
  const cargarTodosClientes = useCallback(async () => {
    setCargandoTodos(true);
    try {
      const res = await fetch(`${API_URL}/clients`, { headers: headers() });
      if (res.ok) setTodosClientes(await res.json());
    } catch (err) {
      console.warn("Error al cargar clientes:", err);
    }
    setCargandoTodos(false);
  }, [headers]);

  const iniciarConversacion = (c: ClienteBusqueda) => {
    const nombre = c.nombreCompleto || [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(" ") || "Sin nombre";
    setClientes(prev => {
      if (prev.some(existing => existing.id === c.id)) return prev;
      return [{ id: c.id, nombre, fotografia: c.fotografia, ultimoMensaje: null, noLeidos: 0 }, ...prev];
    });
    setSelectedId(c.id);
    setMostrarNuevo(false);
    setBusquedaNuevo("");
  };

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (mostrarNuevo) cargarTodosClientes();
  }, [mostrarNuevo, cargarTodosClientes]);
  useEffect(() => {
    cargarLista();
    const interval = setInterval(cargarLista, 5000);
    return () => clearInterval(interval);
  }, [cargarLista]);

  useEffect(() => {
    if (!selectedId) { setMensajes([]); return; }
    cargarMensajes(selectedId);
    const interval = setInterval(() => cargarMensajes(selectedId!), 5000);
    return () => clearInterval(interval);
  }, [selectedId, cargarMensajes]);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`${API_URL}/mensajes/${selectedId}/leidos`, { method: "PUT", headers: headers() }).catch(() => {});
  }, [selectedId, mensajes.length, headers]);

  useEffect(() => {
    if (bottomRef.current) {
      const timer = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 50);
      return () => clearTimeout(timer);
    }
  }, [mensajes]);

  const handleArchivosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const validFiles = Array.from(files).filter(f => {
      const isValid = f.type.startsWith("image/") || f.type === "application/pdf" ||
        f.type === "application/msword" ||
        f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (!isValid) alert("Solo imágenes, PDF y Word permitidos.");
      return isValid;
    });
    setArchivos(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removerArchivo = (index: number) => setArchivos(prev => prev.filter((_, i) => i !== index));

  const enviar = async () => {
    if (!texto.trim() && archivos.length === 0) return;
    if (!selectedId) return;
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("texto", texto);
      archivos.forEach(file => formData.append("archivos", file));

      const res = await fetch(`${API_URL}/mensajes/${selectedId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setTexto("");
        setArchivos([]);
        await Promise.all([cargarMensajes(selectedId), cargarLista()]);
      } else {
        const data = await res.json();
        alert(data.error || "Error al enviar");
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
    setEnviando(false);
  };

  const clienteSeleccionado = clientes.find(c => c.id === selectedId);

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const todosFiltrados = todosClientes.filter(c => {
    const nombre = c.nombreCompleto || [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(" ") || "";
    return nombre.toLowerCase().includes(busquedaNuevo.toLowerCase());
  });

  const renderContenido = (m: Mensaje) => (
    <>
      {m.texto && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.texto}</p>}
      {m.archivos?.length > 0 && (
        <div style={{ marginTop: m.texto ? 8 : 0 }}>
          {m.archivos.map((url, i) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
            if (isImage) {
              return (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="adjunto" style={{ maxWidth: "100%", borderRadius: 8, marginTop: 4 }} />
                </a>
              );
            } else {
              const fileName = url.split("/").pop() || "Documento";
              return (
                <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#1e293b", padding: "6px 12px", borderRadius: 8, color: "#60a5fa", textDecoration: "none", marginRight: 8, marginTop: 4 }}>
                  📄 {fileName}
                </a>
              );
            }
          })}
        </div>
      )}
    </>
  );

  return (
    <div translate="no" style={{ overflowX: "hidden" }}>
      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 20 : 28, wordBreak: "break-word" }}>💬 Mensajes</h1>
      <p style={{ color: "#94a3b8", marginBottom: isMobile ? 16 : 24, fontSize: isMobile ? 13 : 15 }}>Comunicación directa con los clientes.</p>

      <div style={{
        display: isMobile ? "block" : "grid",
        gridTemplateColumns: isMobile ? undefined : "320px 1fr",
        gap: 16,
        height: isMobile ? "calc(100dvh - 210px)" : "calc(100vh - 220px)",
        minHeight: isMobile ? 420 : undefined,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Lista de clientes */}
        <div translate="no" style={{
          background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 14, overflow: "auto", display: "flex", flexDirection: "column",
          height: isMobile ? "100%" : "auto",
          position: isMobile ? "absolute" : "static",
          inset: isMobile ? 0 : undefined,
          transform: isMobile ? (selectedId ? "translateX(-100%)" : "translateX(0)") : "none",
          transition: isMobile ? "transform .25s ease" : "none",
          zIndex: isMobile ? 2 : "auto",
        }}>
          <div style={{ padding: 16, borderBottom: "1px solid #1e1b4b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontWeight: "bold", fontSize: 14, color: "#94a3b8" }}>Clientes ({clientes.length})</span>
              <button
                onClick={() => setMostrarNuevo(true)}
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 8, color: "white", cursor: "pointer", padding: "8px 14px", minHeight: 36, fontSize: 12, fontWeight: "bold" }}
              >
                + Nuevo
              </button>
            </div>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar cliente..."
              style={{ width: "100%", padding: "10px 12px", minHeight: 44, borderRadius: 8, border: "1px solid #1e1b4b", background: "#0a0a14", color: "white", fontSize: 16, boxSizing: "border-box" }}
            />
          </div>
          {loading ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>Cargando...</p>
          ) : clientesFiltrados.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>
              {busqueda ? "No se encontraron clientes." : "No hay conversaciones aún."}
            </p>
          ) : (
            clientesFiltrados.map(c => (
              <div key={c.id} onClick={() => setSelectedId(c.id)} style={{ padding: 14, minHeight: 44, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: selectedId === c.id ? "#0a0a14" : "transparent", borderBottom: "1px solid #1e1b4b", borderLeft: selectedId === c.id ? "4px solid #6366f1" : "4px solid transparent" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1e1b4b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, overflow: "hidden" }}>
                  {c.fotografia ? <img src={c.fotografia} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ color: "white", fontWeight: "bold", fontSize: 13, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nombre}</p>
                    {c.noLeidos > 0 && <span style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: "bold", padding: "2px 8px", borderRadius: 99, flexShrink: 0 }}>{c.noLeidos}</span>}
                  </div>
                  {c.ultimoMensaje && <p style={{ color: "#64748b", fontSize: 11, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.ultimoMensaje.emisor === "admin" ? "Tú: " : ""}{c.ultimoMensaje.texto}</p>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat */}
        {selectedId && clienteSeleccionado ? (
          <div key={selectedId} translate="no" style={{
            background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden",
            height: isMobile ? "100%" : "auto",
            position: isMobile ? "absolute" : "static",
            inset: isMobile ? 0 : undefined,
            transform: isMobile ? "translateX(0)" : "none",
            zIndex: isMobile ? 3 : "auto",
          }}>
            <div style={{ padding: 14, borderBottom: "1px solid #1e1b4b", display: "flex", alignItems: "center", gap: 12, background: "#050508" }}>
              {isMobile && (
                <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontSize: 20, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
              )}
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1e1b4b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, overflow: "hidden", flexShrink: 0 }}>
                {clienteSeleccionado.fotografia ? <img src={clienteSeleccionado.fotografia} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </div>
              <div style={{ minWidth: 0 }}><p style={{ color: "white", fontWeight: "bold", fontSize: 14, margin: 0, wordBreak: "break-word" }}>{clienteSeleccionado.nombre}</p></div>
              {!isMobile && <button onClick={() => setSelectedId(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, minWidth: 44, minHeight: 44 }}>✕</button>}
            </div>

            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: isMobile ? 12 : 16, display: "flex", flexDirection: "column", gap: 12, background: "#050508" }}>
              {mensajes.map(m => (
                <div key={m.id} style={{ alignSelf: m.emisor === "admin" ? "flex-end" : "flex-start", maxWidth: isMobile ? "88%" : "70%", background: m.emisor === "admin" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1e1b4b", color: "white", padding: "10px 16px", borderRadius: 12, fontSize: 14, wordBreak: "break-word" }}>
                  {renderContenido(m)}
                  <p style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{new Date(m.createdAt).toLocaleTimeString()}{m.emisor === "cliente" && !m.leido && " · No leído"}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {archivos.length > 0 && (
              <div style={{ padding: "0 16px", display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {archivos.map((file, i) => (
                  <div key={i} style={{ position: "relative", display: "inline-block" }}>
                    {file.type.startsWith("image/") ? (
                      <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, background: "#1e293b", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📄</div>
                    )}
                    <button onClick={() => removerArchivo(i)} style={{ position: "absolute", top: -8, right: -8, background: "#ef4444", border: "none", borderRadius: "50%", width: 18, height: 18, color: "white", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: "1px solid #1e1b4b", padding: isMobile ? 10 : 12, display: "flex", gap: 8, alignItems: "flex-end", background: "#050508" }}>
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx" ref={fileInputRef} onChange={handleArchivosChange} style={{ display: "none" }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ background: "#1e1b4b", border: "none", borderRadius: 8, color: "white", cursor: "pointer", padding: "10px 12px", minWidth: 44, minHeight: 44, fontSize: 14, flexShrink: 0 }} title="Adjuntar archivos">📎</button>
              <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()} placeholder="Escribe un mensaje..." style={{ flex: 1, minWidth: 0, padding: 12, minHeight: 44, borderRadius: 8, border: "1px solid #1e1b4b", background: "#0a0a14", color: "white", fontSize: 16, boxSizing: "border-box" }} />
              <button onClick={enviar} disabled={enviando || (!texto.trim() && archivos.length === 0)} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", padding: "10px 18px", minHeight: 44, borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", opacity: enviando || (!texto.trim() && archivos.length === 0) ? 0.7 : 1, flexShrink: 0 }}>{enviando ? "..." : "Enviar"}</button>
            </div>
          </div>
        ) : (
          !isMobile && <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 15, padding: 20, textAlign: "center" }}>Selecciona una conversación para ver los mensajes</div>
        )}
      </div>

      {mostrarNuevo && (
        <div
          onClick={() => setMostrarNuevo(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 999, padding: isMobile ? 0 : 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: isMobile ? "18px 18px 0 0" : 14, width: "100%", maxWidth: isMobile ? "100%" : 420, maxHeight: isMobile ? "80vh" : "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <div style={{ padding: 16, borderBottom: "1px solid #1e1b4b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "bold", color: "white", fontSize: 15 }}>Iniciar conversación</span>
              <button onClick={() => setMostrarNuevo(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <div style={{ padding: 16, borderBottom: "1px solid #1e1b4b" }}>
              <input
                autoFocus
                value={busquedaNuevo}
                onChange={e => setBusquedaNuevo(e.target.value)}
                placeholder="Buscar por nombre..."
                style={{ width: "100%", padding: "12px 12px", minHeight: 44, borderRadius: 8, border: "1px solid #1e1b4b", background: "#0a0a14", color: "white", fontSize: 16, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {cargandoTodos ? (
                <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>Cargando...</p>
              ) : todosFiltrados.length === 0 ? (
                <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>No se encontraron clientes.</p>
              ) : (
                todosFiltrados.map(c => {
                  const nombre = c.nombreCompleto || [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(" ") || "Sin nombre";
                  return (
                    <div
                      key={c.id}
                      onClick={() => iniciarConversacion(c)}
                      style={{ padding: 14, minHeight: 44, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: "1px solid #1e1b4b" }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e1b4b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, overflow: "hidden" }}>
                        {c.fotografia ? <img src={c.fotografia} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                      </div>
                      <p style={{ color: "white", fontSize: 13, margin: 0, wordBreak: "break-word" }}>{nombre}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMensajes;