# Integración de la Bandeja de WhatsApp en “Vigilancia SAM”

App temporal de desarrollo. No crea ni requiere un proyecto Supabase nuevo:
apunta al **mismo** proyecto existente de Vigilancia SAM.

## 1. Archivos a copiar a la app principal

| Origen (app temporal) | Destino (Vigilancia SAM) |
| --- | --- |
| `src/features/whatsapp-inbox/types.ts` | `src/features/whatsapp-inbox/types.ts` |
| `src/features/whatsapp-inbox/utils.ts` | idem |
| `src/features/whatsapp-inbox/api.ts` | idem |
| `src/features/whatsapp-inbox/InboxPage.tsx` | idem |
| `src/features/whatsapp-inbox/ConversationList.tsx` | idem |
| `src/features/whatsapp-inbox/ConversationView.tsx` | idem |
| `src/features/whatsapp-inbox/MessageComposer.tsx` | idem |
| `src/features/whatsapp-inbox/IntegrationStatus.tsx` | idem |
| `edge-functions/whatsapp-webhook/index.ts` | `supabase/functions/whatsapp-webhook/index.ts` |
| `edge-functions/whatsapp-chat-send/index.ts` | `supabase/functions/whatsapp-chat-send/index.ts` |
| `supabase-whatsapp-inbox.sql` | ejecutar una vez en el SQL Editor |

En la app principal, reemplazar `src/features/whatsapp-inbox/supabaseClient.ts`
por el cliente ya existente (`@/integrations/supabase/client`): sólo hay que
cambiar el import en `api.ts` y en `InboxPage.tsx`/`IntegrationStatus.tsx`.
Montar `InboxPage` en una ruta protegida, p. ej. `/whatsapp`.

## 2. Migración SQL

Ejecutar `supabase-whatsapp-inbox.sql` (idempotente). Crea sólo:

- `public.whatsapp_conversaciones`
- `public.whatsapp_chat_mensajes`
- índices, trigger `updated_at`, grants, RLS (`authenticated`, sin `anon`)
- publicación Realtime de ambas tablas

No modifica ni borra nada existente.

## 3. Secretos

- **Nuevo:** `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (cadena aleatoria larga, elegida por vos).
- **Existentes, se reutilizan sin cambios:** `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los inyecta Supabase.
- No se tocan `WHATSAPP_TEMPLATE_NAME` ni `WHATSAPP_TEMPLATE_LANGUAGE`.

## 4. Edge Functions a desplegar

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt   # pública (Meta llama sin JWT)
supabase functions deploy whatsapp-chat-send                 # llamada desde la bandeja
```

URLs a registrar/usar:

- `https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-webhook` → Callback URL en Meta
- `https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-chat-send` → uso interno de la app

## 5. Variables requeridas en el frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (o `VITE_SUPABASE_ANON_KEY`)

## 6. Configurar el webhook en Meta (pasos manuales)

1. Meta for Developers → tu app de la WABA “Vigilancia SAM” → WhatsApp → Configuration.
2. Webhook → Edit:
   - Callback URL: `https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-webhook`
   - Verify token: el valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
3. Verify and save (Meta hace un GET; la función responde `hub.challenge`).
4. Webhook fields → suscribirse a **messages** (incluye entrantes + statuses).
5. Enviar un WhatsApp de prueba desde un celular al +54 9 2635 03-4375 y verificar
   que aparezca en la bandeja.

## 7. Qué NO modificar

- La Edge Function `whatsapp-send` (plantillas y avisos de turno).
- Las plantillas aprobadas de Meta y la WABA/el número existentes.
- Los secretos existentes de WhatsApp.
- Cron / recordatorios automáticos (no se activa ninguno).
- Las tablas `voluntarios`, `whatsapp_config`, `whatsapp_estados`,
  `whatsapp_mensajes` (la bandeja sólo **lee** `voluntarios`).

## Fase 2 (pendiente, no implementado a propósito)

- Selector de plantillas para reabrir conversaciones fuera de las 24 h.
- Aplicar automáticamente confirmaciones/rechazos a `whatsapp_estados` y turnos
  (hoy sólo se muestra “Posible confirmación detectada”).
- Endurecer RLS por rol administrador (ver comentarios en el SQL).
