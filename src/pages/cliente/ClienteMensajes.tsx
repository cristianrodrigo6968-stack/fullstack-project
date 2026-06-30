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

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando mensajes...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>💬 Mensajes</h1>
      <div style={{ background: "#1e293b", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: 16, height: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {mensajes.length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>No hay mensajes aún.</p>}
          {mensajes.map(m => (
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
              {renderContenido(m)}
              <p style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                {new Date(m.createdAt).toLocaleTimeString()}
              </p>
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
                <button onClick={() => removerArchivo(i)} style={{ position: "absolute", top: -8, right: -8, background: "#ef4444", border: "none", borderRadius: "50%", width: 18, height: 18, color: "white", fontSize: 10, cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: "1px solid #334155", padding: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx" ref={fileInputRef} onChange={handleArchivosChange} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} style={{ background: "#334155", border: "none", borderRadius: 8, color: "white", cursor: "pointer", padding: "10px 12px", fontSize: 14 }} title="Adjuntar archivos">📎</button>
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder="Escribe un mensaje..."
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#0f172a", color: "white", fontSize: 14 }}
          />
          <button
            onClick={enviar}
            disabled={enviando || (!texto.trim() && archivos.length === 0)}
            style={{
              background: "#3b82f6", border: "none", padding: "10px 18px",
              borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer",
              opacity: enviando || (!texto.trim() && archivos.length === 0) ? 0.7 : 1,
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