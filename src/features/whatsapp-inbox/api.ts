import { requireSupabase } from "./supabaseClient";
import type { ChatMensaje, Conversacion, ConversacionConVoluntario } from "./types";
import { normalizarTelefono } from "./utils";

/** Lista conversaciones y resuelve el nombre del voluntario vinculado (si existe). */
export async function fetchConversaciones(): Promise<ConversacionConVoluntario[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("whatsapp_conversaciones")
    .select("*")
    .order("ultimo_mensaje_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw error;

  const convs = (data ?? []) as Conversacion[];
  const voluntarios = await fetchVoluntariosIndex();

  return convs.map((c) => {
    const porId = c.voluntario_id ? voluntarios.porId.get(c.voluntario_id) : undefined;
    const porTel = voluntarios.porTelefono.get(normalizarTelefono(c.telefono));
    return { ...c, voluntario_nombre: porId?.nombre ?? porTel?.nombre ?? null };
  });
}

interface VoluntarioLite {
  id: string;
  nombre: string;
  telefono: string | null;
}

/** Lectura de solo lectura sobre public.voluntarios (nunca escribe). */
export async function fetchVoluntariosIndex(): Promise<{
  porId: Map<string, VoluntarioLite>;
  porTelefono: Map<string, VoluntarioLite>;
}> {
  const sb = requireSupabase();
  const porId = new Map<string, VoluntarioLite>();
  const porTelefono = new Map<string, VoluntarioLite>();
  const { data, error } = await sb.from("voluntarios").select("*").limit(1000);
  if (error) return { porId, porTelefono };

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const id = String(row['id'] ?? "");
    const nombre = String(
      row['nombre'] ?? row['nombre_completo'] ?? row['name'] ?? row['apellido'] ?? "Voluntario",
    );
    const telRaw = (row['telefono'] ?? row['celular'] ?? row['whatsapp'] ?? null) as string | null;
    const v: VoluntarioLite = { id, nombre, telefono: telRaw };
    if (id) porId.set(id, v);
    const norm = normalizarTelefono(telRaw);
    if (norm) porTelefono.set(norm, v);
  }
  return { porId, porTelefono };
}

export async function fetchMensajes(conversacionId: string): Promise<ChatMensaje[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("whatsapp_chat_mensajes")
    .select("*")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as ChatMensaje[];
}

export async function marcarComoLeida(conversacionId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("whatsapp_conversaciones")
    .update({ no_leidos: 0 })
    .eq("id", conversacionId);
  if (error) throw error;
}

/** Envía texto libre vía la Edge Function `whatsapp-chat-send` (nunca directo a Meta). */
export async function enviarRespuesta(input: {
  conversacion_id: string;
  texto: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke("whatsapp-chat-send", { body: input });
  if (error) {
    return { ok: false, error: error.message || "No se pudo enviar el mensaje." };
  }
  const res = (data ?? {}) as { ok?: boolean; error?: string };
  if (res.ok === false) return { ok: false, error: res.error ?? "Meta rechazó el envío." };
  return { ok: true };
}

/** Chequeos de la vista "Estado de integración" (solo lectura). */
export async function checkIntegracion(): Promise<{
  tablasOk: boolean;
  conversaciones: number;
  entrantes: number;
  salientesOk: number;
  detalle: string | null;
}> {
  const sb = requireSupabase();
  const conv = await sb
    .from("whatsapp_conversaciones")
    .select("id", { count: "exact", head: true });
  if (conv.error) {
    return {
      tablasOk: false,
      conversaciones: 0,
      entrantes: 0,
      salientesOk: 0,
      detalle: conv.error.message,
    };
  }
  const entrantes = await sb
    .from("whatsapp_chat_mensajes")
    .select("id", { count: "exact", head: true })
    .eq("direccion", "entrante");
  const salientes = await sb
    .from("whatsapp_chat_mensajes")
    .select("id", { count: "exact", head: true })
    .eq("direccion", "saliente")
    .not("meta_message_id", "is", null);

  return {
    tablasOk: true,
    conversaciones: conv.count ?? 0,
    entrantes: entrantes.count ?? 0,
    salientesOk: salientes.count ?? 0,
    detalle: null,
  };
}
