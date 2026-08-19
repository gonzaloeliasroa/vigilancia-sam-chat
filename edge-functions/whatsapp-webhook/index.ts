// Edge Function PÚBLICA (Deno / Supabase): whatsapp-webhook
// Copiar a `supabase/functions/whatsapp-webhook/index.ts` en la app principal
// "Vigilancia SAM" y desplegar con:  supabase functions deploy whatsapp-webhook --no-verify-jwt
//
// GET  -> verificación de Meta (hub.mode / hub.verify_token / hub.challenge)
// POST -> mensajes entrantes y estados de entrega/lectura
//
// Secretos usados: WHATSAPP_WEBHOOK_VERIFY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// NO toca whatsapp-send, plantillas, whatsapp_estados ni turnos.
// Nunca loguea tokens ni teléfonos completos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const NO_COMPATIBLES = ["image", "audio", "video", "document", "location", "sticker", "contacts"];

/** Enmascara el teléfono para logs: 549263***4375 */
function maskTel(t: string): string {
  if (t.length < 8) return "***";
  return `${t.slice(0, 6)}***${t.slice(-4)}`;
}

function normalizarTelefono(raw: string): string {
  let d = String(raw ?? "").replace(/[^\d]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(-10);
}

const CONFIRMA = ["si", "sí", "confirmo", "confirmado", "ok", "okay", "dale", "puedo", "asisto", "voy"];
const RECHAZA = ["no", "no puedo", "rechazo", "cancelar", "cancelo", "no voy", "no asisto"];

function clasificar(texto: string | null): "confirmacion" | "rechazo" | null {
  if (!texto) return null;
  const t = texto.toLowerCase().trim().replace(/[.!¡?¿,]/g, "");
  if (RECHAZA.some((k) => t === k || t.startsWith(k + " "))) return "rechazo";
  if (CONFIRMA.some((k) => t === k || t.startsWith(k + " "))) return "confirmacion";
  return null;
}

/** Extrae el texto útil de text / button / interactive (lista o botón). */
function extraerContenido(msg: Record<string, any>): { tipo: string; contenido: string | null } {
  const tipo = String(msg.type ?? "unknown");
  if (tipo === "text") return { tipo: "texto", contenido: msg.text?.body ?? null };
  if (tipo === "button")
    return { tipo: "boton", contenido: msg.button?.text ?? msg.button?.payload ?? null };
  if (tipo === "interactive") {
    const i = msg.interactive ?? {};
    if (i.button_reply) return { tipo: "boton", contenido: i.button_reply.title ?? i.button_reply.id };
    if (i.list_reply) return { tipo: "lista", contenido: i.list_reply.title ?? i.list_reply.id };
    return { tipo: "interactivo", contenido: null };
  }
  if (NO_COMPATIBLES.includes(tipo)) return { tipo: "no_compatible", contenido: null };
  return { tipo: "no_compatible", contenido: null };
}

/** Busca (solo lectura) un voluntario cuyo teléfono normalizado coincida. */
async function buscarVoluntarioId(telefono: string): Promise<string | null> {
  const objetivo = normalizarTelefono(telefono);
  if (!objetivo) return null;
  const { data, error } = await sb.from("voluntarios").select("*").limit(1000);
  if (error || !data) return null;
  for (const row of data as Record<string, any>[]) {
    const cand = row.telefono ?? row.celular ?? row.whatsapp ?? null;
    if (cand && normalizarTelefono(String(cand)) === objetivo) return String(row.id);
  }
  return null;
}

async function obtenerOCrearConversacion(telefono: string, nombre: string | null) {
  const { data: existente } = await sb
    .from("whatsapp_conversaciones")
    .select("*")
    .eq("telefono", telefono)
    .maybeSingle();

  if (existente) {
    if (!existente.voluntario_id) {
      const vid = await buscarVoluntarioId(telefono);
      if (vid) {
        await sb.from("whatsapp_conversaciones").update({ voluntario_id: vid }).eq("id", existente.id);
        existente.voluntario_id = vid;
      }
    }
    return existente;
  }

  const voluntario_id = await buscarVoluntarioId(telefono);
  const { data: creada, error } = await sb
    .from("whatsapp_conversaciones")
    .insert({ telefono, nombre_contacto: nombre, voluntario_id, estado: "abierta" })
    .select("*")
    .single();

  if (error) {
    // Carrera: otro evento la creó primero.
    const { data: retry } = await sb
      .from("whatsapp_conversaciones")
      .select("*")
      .eq("telefono", telefono)
      .maybeSingle();
    return retry ?? null;
  }
  return creada;
}

async function procesarEntrante(value: Record<string, any>, msg: Record<string, any>) {
  const wamid = String(msg.id ?? "");
  if (!wamid) return;

  // Deduplicación por wamid.
  const { data: dup } = await sb
    .from("whatsapp_chat_mensajes")
    .select("id")
    .eq("meta_message_id", wamid)
    .maybeSingle();
  if (dup) return;

  const telefono = String(msg.from ?? "");
  const perfil = value.contacts?.[0]?.profile?.name ?? null;
  const conv = await obtenerOCrearConversacion(telefono, perfil);
  if (!conv) return;

  const { tipo, contenido } = extraerContenido(msg);
  const clasificacion = clasificar(contenido);
  const tsIso = msg.timestamp
    ? new Date(Number(msg.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  await sb.from("whatsapp_chat_mensajes").insert({
    conversacion_id: conv.id,
    meta_message_id: wamid,
    direccion: "entrante",
    tipo,
    contenido,
    payload: {
      tipo_original: msg.type ?? null,
      clasificacion_sugerida: clasificacion, // sugerencia visual; NO cambia turnos
      timestamp: msg.timestamp ?? null,
    },
    estado: "recibido",
    created_at: tsIso,
  });

  const ventana = new Date(new Date(tsIso).getTime() + 24 * 3600 * 1000).toISOString();
  await sb
    .from("whatsapp_conversaciones")
    .update({
      nombre_contacto: conv.nombre_contacto ?? perfil,
      ultimo_mensaje: contenido ?? "[contenido no compatible]",
      ultimo_mensaje_at: tsIso,
      ultimo_mensaje_direccion: "entrante",
      ultimo_mensaje_entrante_at: tsIso,
      ventana_24h_hasta: ventana,
      no_leidos: (conv.no_leidos ?? 0) + 1,
      estado: conv.estado === "archivada" ? "abierta" : conv.estado,
    })
    .eq("id", conv.id);

  console.log(`entrante ok tipo=${tipo} tel=${maskTel(telefono)}`);
}

async function procesarEstado(st: Record<string, any>) {
  const wamid = String(st.id ?? "");
  if (!wamid) return;
  const estado = String(st.status ?? "");
  const tsIso = st.timestamp
    ? new Date(Number(st.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  const patch: Record<string, unknown> = { estado };
  if (estado === "sent") patch.enviado_at = tsIso;
  if (estado === "delivered") patch.entregado_at = tsIso;
  if (estado === "read") patch.leido_at = tsIso;
  if (estado === "failed") {
    const err = st.errors?.[0] ?? {};
    patch.error_detalle = `Meta ${err.code ?? "?"}: ${err.title ?? err.message ?? "error desconocido"}${
      err.error_data?.details ? ` — ${err.error_data.details}` : ""
    }`;
  }

  await sb.from("whatsapp_chat_mensajes").update(patch).eq("meta_message_id", wamid);
  console.log(`estado ${estado} wamid=***${wamid.slice(-6)}`);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      console.log("verificación de webhook OK");
      return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
    }
    console.warn("verificación de webhook rechazada");
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  // Siempre 200: Meta reintenta si no recibe 200 rápido.
  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        for (const msg of value.messages ?? []) await procesarEntrante(value, msg);
        for (const st of value.statuses ?? []) await procesarEstado(st);
      }
    }
  } catch (e) {
    console.error("error procesando webhook:", e instanceof Error ? e.message : String(e));
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
});
