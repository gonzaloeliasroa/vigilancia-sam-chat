import { requireSupabase } from "./supabaseClient";
import type {
  ConversacionConVoluntario,
  EstadoConversacion,
  Mensaje,
} from "./types";

function esColumnaFaltante(error: { code?: string; message?: string }) {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    msg.includes("last_read_at")
  );
}

export async function fetchConversaciones(): Promise<
  ConversacionConVoluntario[]
> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("whatsapp_conversaciones")
    .select("*")
    .neq("estado", "archivada")
    .order("ultimo_mensaje_at", { ascending: false });

  if (error) {
    console.error("[API] Error obteniendo conversaciones:", error);
    throw new Error(error.message);
  }

  return ((data ?? []) as ConversacionConVoluntario[]).map((c) => ({
    ...c,
    voluntario_nombre: c.voluntario_nombre ?? null,
  }));
}

export async function fetchMensajes(conversacionId: string): Promise<Mensaje[]> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("v_todos_mensajes")
    .select("*")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[API] Error obteniendo mensajes:", error);
    throw new Error(error.message);
  }

  // Deduplicación defensiva (webhook/realtime repetidos).
  const vistos = new Set<string>();
  const salida: Mensaje[] = [];
  for (const m of (data ?? []) as Mensaje[]) {
    const clave = m.meta_message_id ?? m.id;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push(m);
  }
  return salida;
}

export async function enviarRespuesta(
  conversacionId: string,
  contenido: string,
): Promise<boolean> {
  const supabase = requireSupabase();
  const texto = contenido.trim();

  if (!conversacionId || !texto) {
    console.error("[API] Faltan datos para enviar el mensaje");
    return false;
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "whatsapp-chat-send",
      { body: { conversacion_id: conversacionId, texto } },
    );

    if (error) {
      console.error("[API] Error llamando a whatsapp-chat-send:", error);
      return false;
    }

    if (!data?.ok) {
      console.error(
        "[API] La Edge Function rechazó el mensaje:",
        data?.error ?? "Error desconocido",
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[API] Error enviando respuesta:", error);
    return false;
  }
}

/**
 * Marca la conversación como leída hasta `hastaIso` (por defecto, ahora).
 * Persiste `last_read_at` si la columna existe; si no, sólo resetea no_leidos.
 */
export async function marcarLeidaHasta(
  conversacionId: string,
  hastaIso: string = new Date().toISOString(),
): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from("whatsapp_conversaciones")
    .update({ no_leidos: 0, last_read_at: hastaIso })
    .eq("id", conversacionId);

  if (!error) return;

  if (esColumnaFaltante(error)) {
    const { error: e2 } = await supabase
      .from("whatsapp_conversaciones")
      .update({ no_leidos: 0 })
      .eq("id", conversacionId);
    if (e2) throw new Error(e2.message);
    return;
  }

  throw new Error(error.message);
}

/** Compatibilidad con el nombre anterior. */
export const marcarComoLeida = (id: string) => marcarLeidaHasta(id);

/** Marca la conversación como NO leída (badge = 1) sin tocar mensajes. */
export async function marcarNoLeida(conversacionId: string): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from("whatsapp_conversaciones")
    .update({ no_leidos: 1, last_read_at: null })
    .eq("id", conversacionId);

  if (!error) return;

  if (esColumnaFaltante(error)) {
    const { error: e2 } = await supabase
      .from("whatsapp_conversaciones")
      .update({ no_leidos: 1 })
      .eq("id", conversacionId);
    if (e2) throw new Error(e2.message);
    return;
  }

  throw new Error(error.message);
}

export async function cambiarEstadoConversacion(
  conversacionId: string,
  estado: EstadoConversacion,
): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from("whatsapp_conversaciones")
    .update({ estado })
    .eq("id", conversacionId);

  if (error) throw new Error(error.message);
}

export async function checkIntegracion(): Promise<{
  ok: boolean;
  tablasOk: boolean;
  conversaciones: number;
  entrantes: number;
  salientesOk: number;
  detalle: string | null;
}> {
  const vacio = {
    ok: false,
    tablasOk: false,
    conversaciones: 0,
    entrantes: 0,
    salientesOk: 0,
  };

  try {
    const supabase = requireSupabase();

    const { count: conversaciones, error } = await supabase
      .from("whatsapp_conversaciones")
      .select("id", { count: "exact", head: true });

    if (error) return { ...vacio, detalle: error.message };

    const { count: entrantes } = await supabase
      .from("whatsapp_chat_mensajes")
      .select("id", { count: "exact", head: true })
      .eq("direccion", "entrante");

    const { count: salientes } = await supabase
      .from("whatsapp_chat_mensajes")
      .select("id", { count: "exact", head: true })
      .eq("direccion", "saliente")
      .not("meta_message_id", "is", null);

    return {
      ok: true,
      tablasOk: true,
      conversaciones: conversaciones ?? 0,
      entrantes: entrantes ?? 0,
      salientesOk: salientes ?? 0,
      detalle: null,
    };
  } catch (error) {
    return {
      ...vacio,
      detalle: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
