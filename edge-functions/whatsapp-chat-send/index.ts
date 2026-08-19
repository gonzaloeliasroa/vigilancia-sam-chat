// Edge Function (Deno / Supabase): whatsapp-chat-send
// Copiar a `supabase/functions/whatsapp-chat-send/index.ts` en la app principal
// "Vigilancia SAM" y desplegar con:  supabase functions deploy whatsapp-chat-send
//
// Envía TEXTO LIBRE dentro de la ventana de 24 h y registra el mensaje saliente.
// Reutiliza los secretos existentes WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID.
// NO modifica whatsapp-send (plantillas y avisos de turno siguen igual).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

function maskTel(t: string): string {
  return t.length < 8 ? "***" : `${t.slice(0, 6)}***${t.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return json({ ok: false, error: "Faltan secretos de WhatsApp en el proyecto." }, 500);
  }

  let payload: { conversacion_id?: string; texto?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Cuerpo inválido." }, 400);
  }

  const conversacion_id = payload.conversacion_id?.trim();
  const texto = payload.texto?.trim();
  if (!conversacion_id || !texto) {
    return json({ ok: false, error: "Se requieren conversacion_id y texto." }, 400);
  }
  if (texto.length > 4096) return json({ ok: false, error: "El mensaje supera 4096 caracteres." }, 400);

  const { data: conv, error: convError } = await sb
    .from("whatsapp_conversaciones")
    .select("*")
    .eq("id", conversacion_id)
    .maybeSingle();

  if (convError) return json({ ok: false, error: "No se pudo leer la conversación." }, 500);
  if (!conv) return json({ ok: false, error: "La conversación no existe." }, 404);

  const ventana = conv.ventana_24h_hasta ? new Date(conv.ventana_24h_hasta).getTime() : 0;
  if (!(ventana > Date.now())) {
    return json(
      {
        ok: false,
        error:
          "La ventana de 24 horas está cerrada. Para iniciar nuevamente la conversación se requiere una plantilla aprobada.",
      },
      409,
    );
  }

  const ahora = new Date().toISOString();
  const { data: fila } = await sb
    .from("whatsapp_chat_mensajes")
    .insert({
      conversacion_id,
      direccion: "saliente",
      tipo: "texto",
      contenido: texto,
      estado: "pendiente",
      payload: { origen: "bandeja" },
    })
    .select("id")
    .single();

  let metaId: string | null = null;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: conv.telefono,
        type: "text",
        text: { preview_url: false, body: texto },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error ?? {};
      const detalle = `Meta ${err.code ?? res.status}: ${err.message ?? "error desconocido"}${
        err.error_data?.details ? ` — ${err.error_data.details}` : ""
      }`;
      console.error(`envío fallido tel=${maskTel(String(conv.telefono))} ${detalle}`);
      if (fila?.id) {
        await sb
          .from("whatsapp_chat_mensajes")
          .update({ estado: "failed", error_detalle: detalle })
          .eq("id", fila.id);
      }
      return json({ ok: false, error: detalle }, 502);
    }
    metaId = data?.messages?.[0]?.id ?? null;
  } catch (e) {
    const detalle = e instanceof Error ? e.message : "Fallo de red al contactar Meta.";
    if (fila?.id) {
      await sb
        .from("whatsapp_chat_mensajes")
        .update({ estado: "failed", error_detalle: detalle })
        .eq("id", fila.id);
    }
    return json({ ok: false, error: detalle }, 502);
  }

  if (fila?.id) {
    await sb
      .from("whatsapp_chat_mensajes")
      .update({ meta_message_id: metaId, estado: "sent", enviado_at: ahora })
      .eq("id", fila.id);
  }

  await sb
    .from("whatsapp_conversaciones")
    .update({
      ultimo_mensaje: texto,
      ultimo_mensaje_at: ahora,
      ultimo_mensaje_direccion: "saliente",
      no_leidos: 0,
    })
    .eq("id", conversacion_id);

  return json({ ok: true, meta_message_id: metaId });
});
