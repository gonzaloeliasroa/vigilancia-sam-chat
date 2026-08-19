// Tipos compartidos de la bandeja de WhatsApp.
// Copiar tal cual a la app principal "Vigilancia SAM".

export type Direccion = "entrante" | "saliente";
export type EstadoConversacion = "abierta" | "cerrada" | "archivada";

export interface Conversacion {
  id: string;
  telefono: string;
  voluntario_id: string | null;
  nombre_contacto: string | null;
  ultimo_mensaje: string | null;
  ultimo_mensaje_at: string | null;
  ultimo_mensaje_direccion: Direccion | null;
  ultimo_mensaje_entrante_at: string | null;
  ventana_24h_hasta: string | null;
  no_leidos: number;
  estado: EstadoConversacion;
  created_at: string;
  updated_at: string;
}

export interface ConversacionConVoluntario extends Conversacion {
  voluntario_nombre: string | null;
}

export interface ChatMensaje {
  id: string;
  conversacion_id: string;
  meta_message_id: string | null;
  direccion: Direccion;
  tipo: string;
  contenido: string | null;
  payload: Record<string, unknown> | null;
  estado: string | null;
  enviado_at: string | null;
  entregado_at: string | null;
  leido_at: string | null;
  error_detalle: string | null;
  created_at: string;
}

export type FiltroBandeja = "todas" | "no_leidas" | "abiertas" | "sin_vincular";

export type ClasificacionRespuesta = "confirmacion" | "rechazo" | null;
