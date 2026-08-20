import { requireSupabase } from "./supabaseClient";
import type { Conversacion, Mensaje } from "./types";

export async function fetchConversaciones(): Promise<Conversacion[]> {
  const supabase = requireSupabase();

  console.log("[API] Obteniendo conversaciones...");

  const { data, error } = await supabase
    .from("whatsapp_conversaciones")
    .select("*")
    .neq("estado", "archivada")
    .order("ultimo_mensaje_at", { ascending: false });

  if (error) {
    console.error("[API] Error obteniendo conversaciones:", error);
    return [];
  }

  console.log("[API] Conversaciones obtenidas:", data?.length || 0);
  return data || [];
}

export async function fetchMensajes(
  conversacionId: string,
): Promise<Mensaje[]> {
  const supabase = requireSupabase();

  console.log("[API] Obteniendo mensajes para:", conversacionId);

  const { data, error } = await supabase
    .from("v_todos_mensajes")
    .select("*")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[API] Error obteniendo mensajes:", error);
    return [];
  }

  console.log("[API] Mensajes obtenidos:", data?.length || 0);
  return data || [];
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
      {
        body: {
          conversacion_id: conversacionId,
          texto,
        },
      },
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

    console.log("[API] Mensaje enviado por WhatsApp:", data.meta_message_id);
    return true;
  } catch (error) {
    console.error("[API] Error enviando respuesta:", error);
    return false;
  }
}

export async function marcarComoLeida(
  conversacionId: string,
): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from("whatsapp_conversaciones")
    .update({ no_leidos: 0 })
    .eq("id", conversacionId);

  if (error) {
    console.error("[API] Error marcando la conversación como leída:", error);
  }
}

export async function checkIntegracion(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const supabase = requireSupabase();

    const { error } = await supabase
      .from("whatsapp_conversaciones")
      .select("id")
      .limit(1);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
