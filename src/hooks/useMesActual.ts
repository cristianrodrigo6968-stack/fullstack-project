import { useState } from "react";

export function useMesActual() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [anio, setAnio] = useState(now.getFullYear());

  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const anterior = () => {
    if (mes === 0) { setMes(11); setAnio(anio - 1); }
    else setMes(mes - 1);
  };

  const siguiente = () => {
    const n = new Date();
    if (anio === n.getFullYear() && mes === n.getMonth()) return;
    if (mes === 11) { setMes(0); setAnio(anio + 1); }
    else setMes(mes + 1);
  };

  const esActual = () => {
    const n = new Date();
    return mes === n.getMonth() && anio === n.getFullYear();
  };

  const filtrarPorMes = <T extends { createdAt: string }>(items: T[]): T[] => {
    return items.filter(item => {
      const d = new Date(item.createdAt);
      return d.getMonth() === mes && d.getFullYear() === anio;
    });
  };

  return {
    mes, anio,
    mesLabel: MESES[mes],
    anterior, siguiente, esActual,
    filtrarPorMes,
  };
}
