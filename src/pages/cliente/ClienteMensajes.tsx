import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

interface Mensaje {
  id: number;
  clienteId: number;
  emisor: string;
  texto: string;
  archivos: string[];
  leido: boolean;
  createdAt: string;
}

function ClienteMensajes() {
  const { token } = useAuth();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const marcarComoLeidos = async () => {
    try {
      await fetch(`${API_URL}/cliente/mensajes/leidos`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.warn("Error al marcar leídos", err);
    }
  };

  const cargar = async () => {
    try {
      const res = await fetch(`${API_URL}/cliente/mensajes`, { headers: headers() });
      if (res.ok) setMensajes(await res.json());
    } catch (err) {
      console.warn("Error cargando mensajes:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    marcarComoLeidos();
    cargar();
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
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
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("texto", texto);
      archivos.forEach(file => formData.append("archivos", file));

      const res = await fetch(`${API_URL}/cliente/mensajes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setTexto("");
        setArchivos([]);
        await cargar();
      } else {
        const data = await res.json();
        alert(data.error || "Error al enviar");
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
    setEnviando(false);
  };

  const renderContenido = (m: Mensaje) => (
    <>
      {m.texto && <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.texto}</p>}
      {m.archivos?.length > 0 && (
        <div style={{ marginTop: m.texto ? 8 : 0 }}>
          {m.archivos.map((url, i) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
            if (isImage) {
              return (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt="adjunto"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 250,
                      borderRadius: 10,
                      marginTop: 6,
                      border: "1px solid #334155",
                    }}
                  />
                </a>
              );
            } else {
              const fileName = url.split("/").pop() || "Documento";
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#1e293b",
                    padding: "8px 14px",
                    borderRadius: 10,
                    color: "#60a5fa",
                    textDecoration: "none",
                    marginRight: 8,
                    marginTop: 6,
                    fontSize: 13,
                    border: "1px solid #334155",
                  }}
                >
                  <span style={{ fontSize: 18 }}>📄</span> {fileName}
                </a>
              );
            }
          })}
        </div>
      )}
    </>
  );

  if (loading) return <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando mensajes...</p>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: 24, marginBottom: 16, fontWeight: 700, color: "#f1f5f9" }}>
        💬 Mensajes
      </h1>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#1e293b",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid #334155",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        {/* Cabecera del chat */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#1e293b",
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg,#3b82f6,#6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}
          >
            📖
          </div>
          <div>
            <p style={{ color: "white", fontWeight: "bold", fontSize: 14, margin: 0 }}>Asociación Vanguardistas 3.0</p>
            <p style={{ color: "#64748b", fontSize: 12, margin: "2px 0 0" }}>Equipo editorial</p>
          </div>
        </div>

        {/* Zona de mensajes */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "#0f172a",
          }}
        >
          {mensajes.length === 0 && (
            <p style={{ color: "#64748b", textAlign: "center", paddingTop: 60 }}>
              No hay mensajes aún. Envía uno para comenzar.
            </p>
          )}

          {mensajes.map(m => {
            const esPropio = m.emisor === "cliente";
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: esPropio ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  background: esPropio ? "#2563eb" : "#1e293b",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: esPropio ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  fontSize: 14,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  border: esPropio ? "1px solid #3b82f6" : "1px solid #334155",
                }}
              >
                {renderContenido(m)}
                <p
                  style={{
                    fontSize: 10,
                    opacity: 0.6,
                    marginTop: 6,
                    textAlign: "right",
                  }}
                >
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Previsualización de archivos */}
        {archivos.length > 0 && (
          <div
            style={{
              padding: "8px 20px",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              background: "#0f172a",
              borderTop: "1px solid #1e293b",
            }}
          >
            {archivos.map((file, i) => (
              <div key={i} style={{ position: "relative", display: "inline-block" }}>
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #334155",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      background: "#1e293b",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      border: "1px solid #334155",
                    }}
                  >
                    📄
                  </div>
                )}
                <button
                  onClick={() => removerArchivo(i)}
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    background: "#ef4444",
                    border: "none",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    color: "white",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Campo de envío */}
        <div
          style={{
            borderTop: "1px solid #334155",
            padding: "12px 16px",
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            background: "#1e293b",
          }}
        >
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            ref={fileInputRef}
            onChange={handleArchivosChange}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "#334155",
              border: "none",
              borderRadius: 10,
              color: "#94a3b8",
              cursor: "pointer",
              padding: "10px 14px",
              fontSize: 18,
              transition: "background 0.2s, color 0.2s",
            }}
            title="Adjuntar archivos"
          >
            📎
          </button>
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder="Escribe un mensaje..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #334155",
              background: "#0f172a",
              color: "white",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={enviar}
            disabled={enviando || (!texto.trim() && archivos.length === 0)}
            style={{
              background: enviando ? "#334155" : "#3b82f6",
              border: "none",
              padding: "10px 18px",
              borderRadius: 10,
              color: "white",
              fontWeight: "bold",
              cursor: enviando ? "not-allowed" : "pointer",
              fontSize: 14,
              opacity: enviando ? 0.6 : 1,
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