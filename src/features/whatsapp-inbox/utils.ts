import type {
  ClasificacionRespuesta,
  ConversacionConVoluntario,
  EstadoDerivado,
} from "./types";

export {
  claveDiaAR,
  etiquetaListaAR,
  etiquetaMensajeAR,
  fechaHoraCompletaAR,
  horaAR,
  separadorDiaAR,
  tiempoRelativoAR,
  ultimaActividadAR,
  esReciente,
  ZONA_AR,
} from "./fechas";

import {
  etiquetaListaAR,
  fechaHoraCompletaAR,
  horaAR,
  tiempoRelativoAR,
} from "./fechas";

/** Normalización tolerante de teléfonos argentinos: sólo dígitos, sin 54/9 inicial. */
export function normalizarTelefono(raw: string | null | undefined): string {
  if (!raw) return "";
  let d = String(raw).replace(/[^\d]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  // Comparamos por los últimos 10 dígitos (código de área + número local).
  return d.slice(-10);
}

/** Formato legible: +54 9 2635 03-4375 */
export function formatearTelefono(raw: string | null | undefined): string {
  if (!raw) return "—";
  const local = normalizarTelefono(raw);
  if (local.length !== 10) return String(raw);
  return `+54 9 ${local.slice(0, 4)} ${local.slice(4, 6)}-${local.slice(6)}`;
}

// --- Compatibilidad con nombres previos (delegan a la utilidad única) ---
export const tiempoRelativo = (iso: string | null | undefined) =>
  etiquetaListaAR(iso) || tiempoRelativoAR(iso);
export const horaCorta = horaAR;
export const fechaLarga = fechaHoraCompletaAR;

export function ventanaAbierta(
  ventana_24h_hasta: string | null | undefined,
): boolean {
  if (!ventana_24h_hasta) return false;
  return new Date(ventana_24h_hasta).getTime() > Date.now();
}

export function restanteVentana(
  ventana_24h_hasta: string | null | undefined,
): string {
  if (!ventanaAbierta(ventana_24h_hasta)) return "cerrada";
  const ms = new Date(ventana_24h_hasta as string).getTime() - Date.now();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

const CONFIRMA = [
  "si",
  "sí",
  "confirmo",
  "confirmado",
  "ok",
  "okay",
  "dale",
  "puedo",
  "puedo asistir",
  "asisto",
  "voy",
];
const RECHAZA = [
  "no",
  "no puedo",
  "rechazo",
  "cancelar",
  "cancelo",
  "no voy",
  "no asisto",
];

/** Clasificación sugerida (no modifica turnos ni whatsapp_estados). */
export function clasificarRespuesta(
  texto: string | null | undefined,
): ClasificacionRespuesta {
  if (!texto) return null;
  const t = texto
    .toLowerCase()
    .trim()
    .replace(/[.!¡?¿,]/g, "");
  if (RECHAZA.some((k) => t === k || t.startsWith(k + " "))) return "rechazo";
  if (CONFIRMA.some((k) => t === k || t.startsWith(k + " ")))
    return "confirmacion";
  return null;
}

/** Estado visual derivado de la conversación. */
export function estadoDerivado(c: {
  estado: string;
  no_leidos: number;
  ultimo_mensaje_direccion: string | null;
}): EstadoDerivado {
  if (c.estado === "cerrada" || c.estado === "archivada") return "cerrada";
  if (c.estado === "resuelta") return "resuelta";
  if (c.no_leidos > 0) return "sin_leer";
  if (c.ultimo_mensaje_direccion === "entrante") return "requiere_respuesta";
  if (c.estado === "en_seguimiento") return "en_seguimiento";
  return "al_dia";
}

export const ETIQUETA_ESTADO: Record<EstadoDerivado, string> = {
  sin_leer: "Sin leer",
  requiere_respuesta: "Requiere respuesta",
  en_seguimiento: "En seguimiento",
  resuelta: "Resuelta",
  cerrada: "Cerrada",
  al_dia: "Al día",
};

/** No leídas primero, después por último mensaje descendente. */
export function ordenarConversaciones<T extends ConversacionConVoluntario>(
  lista: T[],
): T[] {
  return [...lista].sort((a, b) => {
    const ua = a.no_leidos > 0 ? 1 : 0;
    const ub = b.no_leidos > 0 ? 1 : 0;
    if (ua !== ub) return ub - ua;
    const ta = a.ultimo_mensaje_at ? Date.parse(a.ultimo_mensaje_at) : 0;
    const tb = b.ultimo_mensaje_at ? Date.parse(b.ultimo_mensaje_at) : 0;
    return tb - ta;
  });
}
