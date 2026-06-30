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
  leido: boolean;
  createdAt: string;
}

function AdminMensajes() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();

  const [clientes, setClientes] = useState<ClienteChat[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const cargarLista = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/mensajes`, { headers: headers() });
      if (res.ok && mountedRef.current) {
        setClientes(await res.json());
      }
    } catch (err) {
      console.warn("Error al cargar lista de mensajes:", err);
    }
    if (mountedRef.current) setLoading(false);
  }, [headers]);

  const cargarMensajes = useCallback(async (clienteId: number) => {
    try {
      const res = await fetch(`${API_URL}/mensajes/${clienteId}`, { headers: headers() });
      if (res.ok && mountedRef.current) {
        setMensajes(await res.json());
      }
    } catch (err) {
      console.warn("Error al cargar mensajes:", err);
    }
  }, [headers]);

  // Montaje / desmontaje
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Polling lista de clientes
  useEffect(() => {
    cargarLista();
    const interval = setInterval(cargarLista, 5000);
    return () => clearInterval(interval);
  }, [cargarLista]);

  // Polling mensajes del cliente seleccionado
  useEffect(() => {
    if (!selectedId) return;
    cargarMensajes(selectedId);
    const interval = setInterval(() => cargarMensajes(selectedId!), 5000);
    return () => clearInterval(interval);
  }, [selectedId, cargarMensajes]);

  // Marcar como leídos
  useEffect(() => {
    if (!selectedId) return;
    fetch(`${API_URL}/mensajes/${selectedId}/leidos`, {
      method: "PUT",
      headers: headers(),
    }).catch(() => {});
  }, [selectedId, mensajes.length, headers]);

  // Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviar = async () => {
    if (!texto.trim() || !selectedId) return;
    setEnviando(true);
    try {
      await fetch(`${API_URL}/mensajes/${selectedId}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ texto }),
      });
      setTexto("");
      await Promise.all([
        cargarMensajes(selectedId),
        cargarLista(),
      ]);
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
    setEnviando(false);
  };

  const clienteSeleccionado = clientes.find((c) => c.id === selectedId);

  return (
    <div>
      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>💬 Mensajes</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Comunicación directa con los clientes.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "320px 1fr",
        gap: 16,
        height: isMobile ? "auto" : "calc(100vh - 220px)",
      }}>
        {/* LISTA DE CLIENTES */}
        <div style={{
          background: "#1e293b", borderRadius: 14, overflow: "auto",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: 16, borderBottom: "1px solid #334155", fontWeight: "bold", fontSize: 14, color: "#94a3b8" }}>
            Clientes ({clientes.length})
          </div>
          {loading ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>Cargando...</p>
          ) : clientes.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>No hay conversaciones aún.</p>
          ) : (
            clientes.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  background: selectedId === c.id ? "#0f172a" : "transparent",
                  borderBottom: "1px solid #334155",
                  borderLeft: selectedId === c.id ? "4px solid #3b82f6" : "4px solid transparent",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "#334155", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 18, flexShrink: 0,
                  overflow: "hidden",
                }}>
                  {c.fotografia ? (
                    <img src={c.fotografia} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    "👤"
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ color: "white", fontWeight: "bold", fontSize: 13, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.nombre}
                    </p>
                    {c.noLeidos > 0 && (
                      <span style={{
                        background: "#ef4444", color: "white", fontSize: 10,
                        fontWeight: "bold", padding: "2px 8px", borderRadius: 99,
                        flexShrink: 0,
                      }}>
                        {c.noLeidos}
                      </span>
                    )}
                  </div>
                  {c.ultimoMensaje && (
                    <p style={{ color: "#64748b", fontSize: 11, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.ultimoMensaje.emisor === "admin" ? "Tú: " : ""}
                      {c.ultimoMensaje.texto}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* CHAT */}
        {selectedId && clienteSeleccionado ? (
          <div style={{
            background: "#1e293b", borderRadius: 14,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Header del chat */}
            <div style={{
              padding: 14, borderBottom: "1px solid #334155",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#334155", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 16, overflow: "hidden",
              }}>
                {clienteSeleccionado.fotografia ? (
                  <img src={clienteSeleccionado.fotografia} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "👤"
                )}
              </div>
              <div>
                <p style={{ color: "white", fontWeight: "bold", fontSize: 14, margin: 0 }}>{clienteSeleccionado.nombre}</p>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  marginLeft: "auto", background: "none", border: "none",
                  color: "#94a3b8", cursor: "pointer", fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>

            {/* Mensajes */}
            <div style={{
              flex: 1, overflowY: "auto", padding: 16,
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              {mensajes.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.emisor === "admin" ? "flex-end" : "flex-start",
                    maxWidth: "70%",
                    background: m.emisor === "admin" ? "#3b82f6" : "#334155",
                    color: "white",
                    padding: "10px 16px",
                    borderRadius: 12,
                    fontSize: 14,
                  }}
                >
                  <p style={{ margin: 0 }}>{m.texto}</p>
                  <p style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                    {m.emisor === "cliente" && !m.leido && " · No leído"}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop: "1px solid #334155", padding: 12, display: "flex", gap: 8 }}>
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviar()}
                placeholder="Escribe un mensaje..."
                style={{
                  flex: 1, padding: 10, borderRadius: 8, border: "none",
                  background: "#0f172a", color: "white", fontSize: 14,
                }}
              />
              <button
                onClick={enviar}
                disabled={enviando}
                style={{
                  background: "#3b82f6", border: "none", padding: "10px 18px",
                  borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer",
                  opacity: enviando ? 0.7 : 1,
                }}
              >
                {enviando ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: "#1e293b", borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#64748b", fontSize: 15,
          }}>
            {!isMobile && "Selecciona una conversación para ver los mensajes"}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminMensajes;