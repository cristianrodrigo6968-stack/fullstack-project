import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const API_URL = import.meta.env.VITE_API_URL;

interface Comentario {
  id: number;
  autorTipo: string;
  texto: string | null;
  archivos: string[];
  creadoEn: string;
}

interface Tarea {
  id: number;
  titulo: string;
  descripcion: string | null;
  completada: boolean;
  vistaCliente: boolean;
  comentarios: Comentario[];
}

interface ItemPedido {
  id: number;
  tipo: string;
  titulo: string | null;
  tareas: Tarea[];
}

interface Pedido {
  id: number;
  items: ItemPedido[];
}

function getTipoLabel(item: ItemPedido) {
  const t = (item.titulo || "").toLowerCase();
  const tip = (item.tipo || "").toLowerCase();
  if (tip === "libro" || t.includes("libro")) {
    let cat = "";
    if (t.includes("categoría a") || t.includes("categoria a")) cat = " — Categoría A";
    else if (t.includes("categoría b") || t.includes("categoria b")) cat = " — Categoría B";
    else if (t.includes("categoría c") || t.includes("categoria c")) cat = " — Categoría C";
    return `📚 Libro${cat}`;
  }
  if (tip === "revista" || t.includes("revista") || t.includes("director") || t.includes("artículo") || t.includes("articulo") || t.includes("fundador")) {
    if (t.includes("director")) return "📘 Director de Revista";
    if (t.includes("fundador")) return "🏆 Fundador de Revista";
    if (t.includes("redacc")) return "📝 Artículo (redacción y publicación)";
    if (t.includes("publicac")) return "📝 Artículo (solo publicación)";
    return "📰 Revista";
  }
  return item.titulo || "📦 Servicio";
}

function renderArchivos(archivos: string[]) {
  if (!archivos?.length) return null;
  return (
    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {archivos.map((url, i) => {
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        if (isImage) {
          return (
            <a key={i} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="adjunto" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 8, border: "1px solid #334155" }} />
            </a>
          );
        }
        const fileName = url.split("/").pop() || "Documento";
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer" style={{ background: "#1e293b", padding: "6px 12px", borderRadius: 8, color: "#60a5fa", textDecoration: "none", fontSize: 12 }}>
            📄 {fileName}
          </a>
        );
      })}
    </div>
  );
}

function TareaCard({ tarea, onEnviar, isMobile }: { tarea: Tarea; onEnviar: (tareaId: number, texto: string, archivos: File[]) => Promise<void>; isMobile: boolean }) {
  const [texto, setTexto] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ajustarAltura = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setArchivos(prev => [...prev, ...Array.from(files)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removerArchivo = (i: number) => setArchivos(prev => prev.filter((_, idx) => idx !== i));

  const enviar = async () => {
    if (!texto.trim() && archivos.length === 0) return;
    setEnviando(true);
    await onEnviar(tarea.id, texto, archivos);
    setTexto("");
    setArchivos([]);
    setEnviando(false);
    requestAnimationFrame(ajustarAltura);
  };

  return (
    <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0, flex: 1 }}>
          {!tarea.vistaCliente && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 5 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "white", fontWeight: "bold", fontSize: 14, margin: 0, wordBreak: "break-word" }}>{tarea.titulo}</p>
            {tarea.descripcion && <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0", wordBreak: "break-word" }}>{tarea.descripcion}</p>}
          </div>
        </div>
        <span style={{
          fontSize: 11, padding: "2px 10px", borderRadius: 99, fontWeight: "bold", whiteSpace: "nowrap", flexShrink: 0,
          background: tarea.completada ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
          color: tarea.completada ? "#34d399" : "#f59e0b",
        }}>
          {tarea.completada ? "✅ Completada" : "⏳ Pendiente"}
        </span>
      </div>
      {/* Hilo de comentarios */}
      {tarea.comentarios.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, marginBottom: 12 }}>
          {tarea.comentarios.map(c => {
            const esCliente = c.autorTipo === "cliente";
            return (
              <div key={c.id} style={{
                alignSelf: esCliente ? "flex-end" : "flex-start", maxWidth: isMobile ? "92%" : "85%",
                background: esCliente ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#0a0a14", color: "white",
                padding: "10px 14px", borderRadius: 10, fontSize: 13, wordBreak: "break-word",
              }}>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>{esCliente ? "Tú" : "Asociación"}</p>
                {c.texto && <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{c.texto}</p>}
                {renderArchivos(c.archivos)}
                <p style={{ fontSize: 10, opacity: 0.6, marginTop: 6, marginBottom: 0, textAlign: "right" }}>
                  {new Date(c.creadoEn).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Previsualización de archivos a enviar */}
      {archivos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {archivos.map((file, i) => (
            <div key={i} style={{ position: "relative" }}>
              {file.type.startsWith("image/") ? (
                <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }} />
              ) : (
                <div style={{ width: 44, height: 44, background: "#0a0a14", border: "1px solid #1e1b4b", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📄</div>
              )}
              <button onClick={() => removerArchivo(i)} style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", border: "none", borderRadius: "50%", width: 16, height: 16, color: "white", fontSize: 9, cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Input de nuevo comentario */}
      <div style={{ display: "flex", gap: isMobile ? 6 : 8, alignItems: "flex-end" }}>
        <input type="file" multiple ref={fileInputRef} onChange={handleFiles} style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current?.click()} style={{ background: "#0a0a14", border: "1px solid #1e1b4b", borderRadius: 8, color: "white", cursor: "pointer", padding: isMobile ? "10px" : "9px 11px", fontSize: 18, flexShrink: 0 }} title="Adjuntar archivos">📎</button>
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={e => { setTexto(e.target.value); ajustarAltura(); }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isMobile) { e.preventDefault(); enviar(); } }}
          placeholder={isMobile ? "Escribe un comentario..." : "Escribe un comentario o sube un archivo... (Shift+Enter para salto de línea)"}
          rows={1}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #1e1b4b", background: "#0a0a14", color: "white", fontSize: 16, resize: "none", fontFamily: "inherit", minHeight: 40, maxHeight: 160, overflowY: "auto", lineHeight: 1.4 }}
        />
        <button
          onClick={enviar}
          disabled={enviando || (!texto.trim() && archivos.length === 0)}
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", padding: isMobile ? "10px 14px" : "9px 16px", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 13, opacity: enviando || (!texto.trim() && archivos.length === 0) ? 0.6 : 1, flexShrink: 0 }}
        >
          {enviando ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}

function ItemTareasAccordion({ item, onEnviar, isMobile }: { item: ItemPedido; onEnviar: (tareaId: number, texto: string, archivos: File[]) => Promise<void>; isMobile: boolean }) {
  const tieneNovedades = item.tareas.some(t => !t.vistaCliente);
  const [abierto, setAbierto] = useState(tieneNovedades);
  const completadas = item.tareas.filter(t => t.completada).length;
  const total = item.tareas.length;

  return (
    <div style={{ background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", borderRadius: 14, overflow: "hidden", border: tieneNovedades ? "1px solid #6366f1" : "1px solid #1e1b4b" }}>
      <div
        onClick={() => setAbierto(v => !v)}
        style={{ padding: isMobile ? 14 : 16, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0, flex: 1 }}>
          {tieneNovedades && (
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 6 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "#a5b4fc", fontWeight: "bold", fontSize: isMobile ? 14 : 15, margin: 0, wordBreak: "break-word" }}>{getTipoLabel(item)}</p>
            <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
              {completadas}/{total} tarea{total !== 1 ? "s" : ""} completada{total !== 1 ? "s" : ""}
              {tieneNovedades && <span style={{ color: "#ef4444", fontWeight: "bold" }}> · Novedades</span>}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: isMobile ? 40 : 60, height: 5, background: "#1e1b4b", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${total > 0 ? (completadas / total) * 100 : 0}%`, height: "100%", background: completadas === total ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
          </div>
          <span style={{ color: "#475569", fontSize: 16, transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
        </div>
      </div>
      {abierto && (
        <div style={{ padding: isMobile ? "0 12px 12px" : "0 16px 16px" }}>
          {item.tareas.map(tarea => (
            <TareaCard key={tarea.id} tarea={tarea} onEnviar={onEnviar} isMobile={isMobile} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClienteContenido() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const cargar = async () => {
    const res = await fetch(`${API_URL}/cliente/pedidos`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPedidos(await res.json());
    setLoading(false);
  };

 useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 8000);
    return () => clearInterval(interval);
  }, []);

  const enviarComentario = async (tareaId: number, texto: string, archivos: File[]) => {
    const formData = new FormData();
    if (texto.trim()) formData.append("texto", texto);
    archivos.forEach(f => formData.append("archivos", f));
    const res = await fetch(`${API_URL}/cliente/tareas/${tareaId}/comentarios`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      await cargar();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Error al enviar el comentario");
    }
  };

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando tareas...</p>;

  const itemsConTareas = pedidos.flatMap(p => p.items || []).filter(item => item.tareas && item.tareas.length > 0);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>📋 Mis Archivos</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>
        Aquí subiras archivos que la asociación te asigne para avanzar tu libro o revista: sube tus archivos y deja comentarios.
      </p>

      {itemsConTareas.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: "linear-gradient(160deg, #0d0d1a, #0a0a14)", border: "1px solid #1e1b4b", borderRadius: 14 }}>
          <p style={{ color: "#64748b", fontSize: 16 }}>Aún no tienes tareas asignadas.</p>
          <p style={{ color: "#334155", fontSize: 13, marginTop: 8 }}>
            La asociación te asignará tareas a medida que avance tu pedido.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {itemsConTareas.map(item => (
            <ItemTareasAccordion key={item.id} item={item} onEnviar={enviarComentario} isMobile={isMobile} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ClienteContenido;