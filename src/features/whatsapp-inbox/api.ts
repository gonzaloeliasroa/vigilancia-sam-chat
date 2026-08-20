import { requireSupabase } from "./supabaseClient";
import type { Conversacion, Mensaje } from "./types";

export async function obtenerConversaciones(): Promise<Conversacion[]> {
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

export async function obtenerMensajes(conversacionId: string): Promise<Mensaje[]> {
  const supabase = requireSupabase();
  
  const { data, error } = await supabase
    .from('whatsapp_chat_mensajes')
    .select('*')
    .eq('conversacion_id', conversacionId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('[API] Error obteniendo mensajes:', error);
    return [];
  }
  
  return data || [];
}

export async function enviarMensaje(conversacionId: string, contenido: string): Promise<boolean> {
  const supabase = requireSupabase();
  
  const { error } = await supabase
    .from('whatsapp_chat_mensajes')
    .insert({
      conversacion_id: conversacionId,
      direccion: 'saliente',
      tipo: 'texto',
      contenido,
      estado: 'pendiente',
    });
  
  return !error;
}

export async function marcarComoLeida(conversacionId: string): Promise<void> {
  const supabase = requireSupabase();
  
  await supabase
    .from('whatsapp_conversaciones')
    .update({ no_leidos: 0 })
    .eq('id', conversacionId);
}
