import { useWindowSize } from "../hooks/useWindowSize";

interface Props {
  mesLabel: string;
  anio: number;
  onAnterior: () => void;
  onSiguiente: () => void;
  esActual: boolean;
}

function NavegadorMes({ mesLabel, anio, onAnterior, onSiguiente, esActual }: Props) {
  const { isMobile } = useWindowSize();

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "#1e293b",
      padding: isMobile ? "10px 16px" : "12px 20px",
      borderRadius: 10,
      marginBottom: 24,
      flexWrap: "wrap",
    }}>
      <button
        onClick={onAnterior}
        style={{
          background: "#334155", border: "none",
          color: "white", cursor: "pointer",
          padding: "6px 14px", borderRadius: 8,
          fontSize: 18, fontWeight: "bold",
        }}
      >
        ←
      </button>

      <div style={{ flex: 1, textAlign: "center" }}>
        <span style={{ color: "white", fontWeight: "bold", fontSize: isMobile ? 15 : 17 }}>
          {mesLabel} {anio}
        </span>
        {esActual && (
          <span style={{
            marginLeft: 10, fontSize: 11,
            padding: "2px 10px", borderRadius: 99,
            background: "#1e3a5f", color: "#60a5fa",
            fontWeight: "bold",
          }}>
            Mes actual
          </span>
        )}
      </div>

      <button
        onClick={onSiguiente}
        disabled={esActual}
        style={{
          background: esActual ? "#1e293b" : "#334155",
          border: "none", color: esActual ? "#334155" : "white",
          cursor: esActual ? "not-allowed" : "pointer",
          padding: "6px 14px", borderRadius: 8,
          fontSize: 18, fontWeight: "bold",
        }}
      >
        →
      </button>
    </div>
  );
}

export default NavegadorMes;