import type { ClasificacionRespuesta } from "./types";

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

export function tiempoRelativo(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export function horaCorta(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function ventanaAbierta(ventana_24h_hasta: string | null | undefined): boolean {
  if (!ventana_24h_hasta) return false;
  return new Date(ventana_24h_hasta).getTime() > Date.now();
}

export function restanteVentana(ventana_24h_hasta: string | null | undefined): string {
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
const RECHAZA = ["no", "no puedo", "rechazo", "cancelar", "cancelo", "no voy", "no asisto"];

/** Clasificación sugerida (no modifica turnos ni whatsapp_estados). */
export function clasificarRespuesta(texto: string | null | undefined): ClasificacionRespuesta {
  if (!texto) return null;
  const t = texto
    .toLowerCase()
    .trim()
    .replace(/[.!¡?¿,]/g, "");
  if (RECHAZA.some((k) => t === k || t.startsWith(k + " "))) return "rechazo";
  if (CONFIRMA.some((k) => t === k || t.startsWith(k + " "))) return "confirmacion";
  return null;
}
