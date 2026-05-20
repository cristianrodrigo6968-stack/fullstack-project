import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

function ClienteMensajes() {
  const { token } = useAuth();
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const cargar = async () => {
    const res = await fetch(`${API_URL}/cliente/mensajes`, { headers });
    setMensajes(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    await fetch(`${API_URL}/cliente/mensajes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ texto }),
    });
    setTexto("");
    setEnviando(false);
    cargar();
  };

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando mensajes...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>💬 Mensajes</h1>
      <div style={{ background: "#1e293b", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: 16, height: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {mensajes.length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>No hay mensajes aún.</p>}
          {mensajes.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.emisor === "cliente" ? "flex-end" : "flex-start",
                maxWidth: "75%",
                background: m.emisor === "cliente" ? "#3b82f6" : "#334155",
                color: "white",
                padding: "10px 16px",
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              <p style={{ margin: 0 }}>{m.texto}</p>
              <p style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                {new Date(m.createdAt).toLocaleTimeString()}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
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
    </div>
  );
}

export default ClienteMensajes;