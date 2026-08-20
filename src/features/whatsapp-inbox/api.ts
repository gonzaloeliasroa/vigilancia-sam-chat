import { requireSupabase } from "./supabaseClient";
import type { Conversacion, Mensaje } from "./types";

export async function fetchConversaciones(): Promise<Conversacion[]> {
  const supabase = requireSupabase();
  
  console.log('[API] Obteniendo conversaciones...');
  
  const { data, error } = await supabase
    .from('whatsapp_conversaciones')
    .select('*')
    .neq('estado', 'archivada')
    .order('ultimo_mensaje_at', { ascending: false });
  
  if (error) {
    console.error('[API] Error obteniendo conversaciones:', error);
    return [];
  }
  
  console.log('[API] Conversaciones obtenidas:', data?.length || 0);
  return data || [];
}

export async function fetchMensajes(conversacionId: string): Promise<Mensaje[]> {
  const supabase = requireSupabase();
  
  console.log('[API] Obteniendo mensajes para:', conversacionId);
  
  const { data, error } = await supabase
    .from('v_todos_mensajes')  // CAMBIADO: usa la vista unificada
    .select('*')
    .eq('conversacion_id', conversacionId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('[API] Error obteniendo mensajes:', error);
    return [];
  }
  
  console.log('[API] Mensajes obtenidos:', data?.length || 0);
  return data || [];
}

export async function enviarRespuesta(conversacionId: string, contenido: string): Promise<boolean> {
  const supabase = requireSupabase();
  
  // 1. Obtener el teléfono de la conversación
  const { data: convData } = await supabase
    .from('whatsapp_conversaciones')
    .select('telefono')
    .eq('id', conversacionId)
    .single();

  if (!convData?.telefono) {
    console.error('[API] No se encontró el teléfono');
    return false;
  }

  // 2. Llamar a la Edge Function para enviar por WhatsApp
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/whatsapp-chat-send`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversacion_id: conversacionId,
        texto: contenido,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[API] Error enviando por WhatsApp:', result.error);
      return false;
    }

    console.log('[API] Mensaje enviado por WhatsApp');
    return true;
  } catch (error) {
    console.error('[API] Error llamando a la función:', error);
    return false;
  }
}

export async function marcarComoLeida(conversacionId: string): Promise<void> {
  const supabase = requireSupabase();
  
  await supabase
    .from('whatsapp_conversaciones')
    .update({ no_leidos: 0 })
    .eq('id', conversacionId);
}

export async function checkIntegracion(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = requireSupabase();
    
    const { data, error } = await supabase
      .from('whatsapp_conversaciones')
      .select('id')
      .limit(1);
    
    if (error) {
      return { ok: false, error: error.message };
    }
    
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
