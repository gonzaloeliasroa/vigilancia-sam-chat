// Utilidad ÚNICA de fechas para la bandeja de WhatsApp.
// Todo se guarda en UTC (ISO). Acá sólo se formatea para mostrar en pantalla
// en la zona horaria de Argentina.

export const ZONA_AR = "America/Argentina/Buenos_Aires";

const LOCALE = "es-AR";

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Clave de día (YYYY-MM-DD) según la zona horaria argentina. */
export function claveDiaAR(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_AR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function claveHoy(offsetDias = 0): string {
  const d = new Date(Date.now() + offsetDias * 86400000);
  return claveDiaAR(d.toISOString());
}

/** Cantidad de días de diferencia (en días calendario AR) respecto de hoy. */
function diasDesdeHoy(iso: string | null | undefined): number | null {
  const clave = claveDiaAR(iso);
  if (!clave) return null;
  const hoy = claveHoy();
  const a = Date.parse(`${clave}T00:00:00Z`);
  const b = Date.parse(`${hoy}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** 15:42 */
export function horaAR(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_AR,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** martes */
export function diaSemanaAR(
  iso: string | null | undefined,
  corto = false,
): string {
  const d = parse(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_AR,
    weekday: corto ? "short" : "long",
  })
    .format(d)
    .replace(".", "");
}

/** 18 ago 2026 */
export function fechaCortaAR(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_AR,
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(/\./g, "");
}

/** 18/08/2026 */
export function fechaNumericaAR(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_AR,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** martes 18 de agosto de 2026, 15:42 — texto completo para tooltips. */
export function fechaHoraCompletaAR(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "";
  const fecha = new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_AR,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
  return `${fecha}, ${horaAR(iso)}`;
}

/**
 * Etiqueta de burbuja de mensaje:
 * hoy -> 15:42 · esta semana -> martes 15:42 · anterior -> 18 ago 2026, 15:42
 */
export function etiquetaMensajeAR(iso: string | null | undefined): string {
  const dias = diasDesdeHoy(iso);
  if (dias === null) return "";
  if (dias === 0) return horaAR(iso);
  if (dias === 1) return `ayer ${horaAR(iso)}`;
  if (dias > 1 && dias < 7) return `${diaSemanaAR(iso)} ${horaAR(iso)}`;
  return `${fechaCortaAR(iso)}, ${horaAR(iso)}`;
}

/** Separador de día: HOY · AYER · LUNES 17 DE AGOSTO · 18 DE AGOSTO DE 2025 */
export function separadorDiaAR(iso: string | null | undefined): string {
  const d = parse(iso);
  const dias = diasDesdeHoy(iso);
  if (!d || dias === null) return "";
  if (dias === 0) return "HOY";
  if (dias === 1) return "AYER";
  const mismoAnio = claveDiaAR(iso).slice(0, 4) === claveHoy().slice(0, 4);
  const partes = new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_AR,
    weekday: dias < 7 ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: mismoAnio ? undefined : "numeric",
  }).format(d);
  return partes.replace(/,/g, "").toUpperCase();
}

/** Lista lateral: hoy -> 15:42 · esta semana -> mar · anterior -> 18/08/2026 */
export function etiquetaListaAR(iso: string | null | undefined): string {
  const dias = diasDesdeHoy(iso);
  if (dias === null) return "";
  if (dias === 0) return horaAR(iso);
  if (dias === 1) return "ayer";
  if (dias < 7) return diaSemanaAR(iso, true);
  return fechaNumericaAR(iso);
}

/** hace 12 min / hace 3 h / hace 2 d */
export function tiempoRelativoAR(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "";
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dd = Math.round(h / 24);
  return `hace ${dd} d`;
}

/** "martes 18 de agosto, 15:42" para el encabezado de conversación. */
export function ultimaActividadAR(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "sin actividad";
  const dias = diasDesdeHoy(iso);
  if (dias === 0) return `hoy, ${horaAR(iso)}`;
  if (dias === 1) return `ayer, ${horaAR(iso)}`;
  const fecha = new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_AR,
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(claveDiaAR(iso).slice(0, 4) === claveHoy().slice(0, 4)
      ? {}
      : { year: "numeric" as const }),
  }).format(d);
  return `${fecha}, ${horaAR(iso)}`;
}

/** ¿El mensaje es reciente (menos de 6 h)? Para mostrar texto relativo extra. */
export function esReciente(iso: string | null | undefined): boolean {
  const d = parse(iso);
  if (!d) return false;
  return Date.now() - d.getTime() < 6 * 3600000;
}
