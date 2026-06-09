import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";


const API_URL = "${import.meta.env.VITE_API_URL}";
interface Note {
  id: number;
  text: string;
  createdAt: string;
}

interface DayNote {
  id: number;
  text: string;
  fecha: string;
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        display: "inline-block", width: 16, height: 16,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTop: "2px solid white", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </>
  );
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];

function Notes() {
  const { token } = useAuth();
  const { isMobile } = useWindowSize();
  const [notes, setNotes] = useState<Note[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [text, setText] = useState("");
  const [dayText, setDayText] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingDayId, setDeletingDayId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [calMes, setCalMes] = useState(new Date().getMonth());
  const [calAnio, setCalAnio] = useState(new Date().getFullYear());
  // Para expandir notas largas individualmente
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/notes`, { headers });
    setNotes(await res.json());
    setLoading(false);
  };

  const loadDayNotes = async () => {
    const res = await fetch(`${API_URL}/day-notes`, { headers });
    setDayNotes(await res.json());
  };

  useEffect(() => { load(); loadDayNotes(); }, []);

  const add = async () => {
    if (!text.trim()) return;
    setAdding(true);
    try {
      await fetch(`${API_URL}/notes`, {
        method: "POST", headers,
        body: JSON.stringify({ text }),
      });
      setText("");
      await load();
    } finally { setAdding(false); }
  };

  const remove = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`${API_URL}/notes/${id}`, { method: "DELETE", headers });
      await load();
    } finally { setDeletingId(null); }
  };

  const addDayNote = async () => {
    if (!dayText.trim() || selectedDay === null) return;
    setAddingDay(true);
    const fecha = `${calAnio}-${String(calMes + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    try {
      await fetch(`${API_URL}/day-notes`, {
        method: "POST", headers,
        body: JSON.stringify({ text: dayText, fecha }),
      });
      setDayText("");
      await loadDayNotes();
    } finally { setAddingDay(false); }
  };

  const removeDayNote = async (id: number) => {
    setDeletingDayId(id);
    try {
      await fetch(`${API_URL}/day-notes/${id}`, { method: "DELETE", headers });
      await loadDayNotes();
    } finally { setDeletingDayId(null); }
  };

  const getDiasConNotas = () => {
    const set = new Set<number>();
    dayNotes.forEach(n => {
      const d = new Date(n.fecha + "T00:00:00");
      if (d.getMonth() === calMes && d.getFullYear() === calAnio) set.add(d.getDate());
    });
    return set;
  };

  const getNotasDelDia = (day: number) => {
    const fecha = `${calAnio}-${String(calMes + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dayNotes.filter(n => n.fecha === fecha || n.fecha.startsWith(fecha));
  };

  const getDiasEnMes = () => new Date(calAnio, calMes + 1, 0).getDate();

  const getPrimerDia = () => {
    let d = new Date(calAnio, calMes, 1).getDay();
    return d === 0 ? 6 : d - 1;
  };

  const toggleExpand = (id: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Cuántos caracteres antes de mostrar "Ver más"
  const PREVIEW_LENGTH = 180;

  const hoy = new Date();
  const diasConNotas = getDiasConNotas();
  const totalDias = getDiasEnMes();
  const primerDia = getPrimerDia();
  const notasDelSeleccionado = selectedDay ? getNotasDelDia(selectedDay) : [];

  return (
    <div>
      <h1 style={{ marginBottom: 8, fontSize: isMobile ? 22 : 28 }}>📌 Notas</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: isMobile ? 13 : 15 }}>
        Notas generales y notas del día.
      </p>

      {/* BOTONES */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <button onClick={() => { setModalOpen(true); setSelectedDay(null); }} style={btnBlue}>
          ➕ Nota general
        </button>
        <button onClick={() => {
          setModalOpen(true);
          setSelectedDay(hoy.getDate());
          setCalMes(hoy.getMonth());
          setCalAnio(hoy.getFullYear());
        }} style={btnGreen}>
          📅 Nota del día
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* NOTAS GENERALES */}
        <div style={{ background: "#1e293b", padding: 20, borderRadius: 14 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
            📌 Notas generales
          </h3>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Spinner /></div>
          ) : notes.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>No hay notas aún.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {notes.map((n) => {
                const isLong = n.text.length > PREVIEW_LENGTH;
                const isExpanded = expandedNotes.has(n.id);
                const displayText = isLong && !isExpanded
                  ? n.text.slice(0, PREVIEW_LENGTH) + "…"
                  : n.text;
                return (
                  <div key={n.id} style={{
                    background: "#0f172a",
                    padding: "12px 14px",
                    borderRadius: 10,
                    borderLeft: "3px solid #3b82f6",
                  }}>
                    {/* Texto + botón eliminar en fila */}
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <p style={{
                        color: "white", lineHeight: 1.7, margin: 0,
                        fontSize: 14, flex: 1,
                        // Evita que palabras largas (URLs, etc.) rompan el layout
                        wordBreak: "break-word", overflowWrap: "anywhere",
                        whiteSpace: "pre-wrap",
                      }}>
                        {displayText}
                      </p>
                      <button
                        onClick={() => remove(n.id)}
                        disabled={deletingId === n.id}
                        title="Eliminar nota"
                        style={{
                          flexShrink: 0, background: "none", border: "none",
                          color: "#ef4444", cursor: "pointer", fontSize: 14,
                          padding: "2px 4px", lineHeight: 1,
                        }}
                      >
                        {deletingId === n.id ? <Spinner /> : "✕"}
                      </button>
                    </div>

                    {/* Ver más / Ver menos */}
                    {isLong && (
                      <button
                        onClick={() => toggleExpand(n.id)}
                        style={{
                          background: "none", border: "none",
                          color: "#60a5fa", cursor: "pointer",
                          fontSize: 12, padding: "4px 0 0", fontWeight: "bold",
                        }}
                      >
                        {isExpanded ? "▲ Ver menos" : "▼ Ver más"}
                      </button>
                    )}

                    <p style={{ color: "#64748b", fontSize: 11, marginTop: 8, marginBottom: 0 }}>
                      {new Date(n.createdAt).toLocaleDateString("es-BO", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CALENDARIO */}
        <div style={{ background: "#1e293b", padding: 20, borderRadius: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
              📅 {MESES[calMes]} {calAnio}
            </h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => {
                if (calMes === 0) { setCalMes(11); setCalAnio(calAnio - 1); }
                else setCalMes(calMes - 1);
                setSelectedDay(null);
              }} style={btnSmallGray}>←</button>
              <button onClick={() => {
                if (calMes === 11) { setCalMes(0); setCalAnio(calAnio + 1); }
                else setCalMes(calMes + 1);
                setSelectedDay(null);
              }} style={btnSmallGray}>→</button>
            </div>
          </div>

          {/* DIAS SEMANA */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6, textAlign: "center" }}>
            {DIAS_SEMANA.map(d => (
              <span key={d} style={{ fontSize: 11, color: "#64748b", fontWeight: "bold", padding: "2px 0" }}>{d}</span>
            ))}
          </div>

          {/* DIAS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, textAlign: "center" }}>
            {Array.from({ length: primerDia }).map((_, i) => <span key={`e-${i}`} />)}
            {Array.from({ length: totalDias }, (_, i) => i + 1).map(day => {
              const isHoy = day === hoy.getDate() && calMes === hoy.getMonth() && calAnio === hoy.getFullYear();
              const isSelected = day === selectedDay;
              const hasNote = diasConNotas.has(day);
              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  title={hasNote ? "Tiene notas" : undefined}
                  style={{
                    padding: "6px 2px", borderRadius: 7, cursor: "pointer",
                    background: isSelected ? "#3b82f6" : isHoy ? "#1e3a5f" : "transparent",
                    border: isHoy && !isSelected ? "1px solid #3b82f6" : "1px solid transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    color: isSelected ? "white" : isHoy ? "#60a5fa" : "#e2e8f0",
                    fontWeight: isHoy || isSelected ? "bold" : "normal",
                    display: "block",
                  }}>
                    {day}
                  </span>
                  {/* Punto indicador de nota */}
                  <div style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: hasNote ? (isSelected ? "white" : "#22c55e") : "transparent",
                    margin: "2px auto 0",
                  }} />
                </div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} /> Con notas
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1e3a5f", border: "1px solid #3b82f6" }} /> Hoy
            </span>
          </div>
        </div>
      </div>

      {/* NOTAS DEL DIA SELECCIONADO */}
      {selectedDay && (
        <div style={{ background: "#1e293b", padding: 20, borderRadius: 14, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
            📅 {selectedDay} de {MESES[calMes]} {calAnio}
          </h3>

          {/* INPUT NUEVA NOTA DEL DIA */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexDirection: isMobile ? "column" : "row" }}>
            <textarea
              placeholder="Agregar nota para este día..."
              value={dayText}
              onChange={(e) => setDayText(e.target.value)}
              rows={2}
              style={{
                flex: 1, padding: 10, borderRadius: 8,
                border: "none", background: "#334155",
                color: "white", fontSize: 14, resize: "vertical",
                minHeight: 60, boxSizing: "border-box",
              }}
            />
            <button
              onClick={addDayNote}
              disabled={addingDay}
              style={{
                ...btnGreen,
                display: "flex", alignItems: "center", gap: 8,
                justifyContent: "center",
                alignSelf: isMobile ? "stretch" : "flex-end",
                whiteSpace: "nowrap",
              }}
            >
              {addingDay ? <Spinner /> : "➕ Agregar"}
            </button>
          </div>

          {notasDelSeleccionado.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>No hay notas para este día.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notasDelSeleccionado.map(n => (
                <div key={n.id} style={{
                  background: "#0f172a", padding: "12px 14px",
                  borderRadius: 10, borderLeft: "3px solid #22c55e",
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <p style={{
                    color: "white", fontSize: 14, margin: 0,
                    lineHeight: 1.7, flex: 1,
                    wordBreak: "break-word", overflowWrap: "anywhere",
                    whiteSpace: "pre-wrap",
                  }}>
                    {n.text}
                  </p>
                  <button
                    onClick={() => removeDayNote(n.id)}
                    disabled={deletingDayId === n.id}
                    title="Eliminar nota"
                    style={{
                      flexShrink: 0, background: "none", border: "none",
                      color: "#ef4444", cursor: "pointer", fontSize: 14,
                      padding: "2px 4px", lineHeight: 1,
                    }}
                  >
                    {deletingDayId === n.id ? <Spinner /> : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL NOTA GENERAL */}
      {modalOpen && selectedDay === null && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 9999, padding: "20px",
        }}>
          <div style={{
            background: "#1e293b", padding: 28, borderRadius: 16,
            width: "100%", maxWidth: 480, color: "white",
            // scroll por si la pantalla es muy chica
            maxHeight: "90vh", overflowY: "auto",
            boxSizing: "border-box",
          }}>
            <h3 style={{ marginBottom: 6 }}>📌 Nueva nota general</h3>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
              Podés escribir todo lo que necesites, sin límite de extensión.
            </p>
            <textarea
              placeholder="Escribe una nota..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              autoFocus
              style={{
                width: "100%", padding: 12, borderRadius: 8,
                border: "none", background: "#334155",
                color: "white", fontSize: 14,
                resize: "vertical", minHeight: 120,
                boxSizing: "border-box",
              }}
            />
            {/* Contador de caracteres */}
            <p style={{ color: "#475569", fontSize: 11, textAlign: "right", marginTop: 4 }}>
              {text.length} caracteres
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={async () => { await add(); setModalOpen(false); }}
                disabled={adding || !text.trim()}
                style={{
                  ...btnBlue,
                  display: "flex", alignItems: "center", gap: 8,
                  opacity: !text.trim() ? 0.5 : 1,
                  cursor: !text.trim() ? "not-allowed" : "pointer",
                }}
              >
                {adding ? <Spinner /> : "💾 Guardar"}
              </button>
              <button onClick={() => { setModalOpen(false); setText(""); }} style={btnGray}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnBlue: React.CSSProperties    = { background: "#3b82f6", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGreen: React.CSSProperties   = { background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnGray: React.CSSProperties    = { background: "#334155", border: "none", padding: "8px 16px", borderRadius: 8, color: "white", cursor: "pointer", fontWeight: "bold" };
const btnSmallGray: React.CSSProperties = { background: "#334155", border: "none", padding: "4px 10px", borderRadius: 6, color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 13 };

export default Notes;
