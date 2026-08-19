# Vigilancia SAM — Bandeja WhatsApp (app temporal de desarrollo)

Bandeja de chat interna para leer y responder mensajes de WhatsApp de los
voluntarios. **No crea un proyecto Supabase nuevo**: se conecta al proyecto
existente de Vigilancia SAM mediante variables públicas.

## Variables de entorno

```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable o anon key>
# alternativa aceptada: VITE_SUPABASE_ANON_KEY
```

Si faltan, la app muestra un aviso claro y no intenta consultar nada.

## Ejecutar

```bash
bun install
bun run dev
```

- `/` → Bandeja de WhatsApp — Vigilancia SAM
- `/estado-integracion` → checklist del estado de la integración

## Validación paso a paso

1. Ejecutar `supabase-whatsapp-inbox.sql` en el SQL Editor del proyecto existente.
2. Crear el secreto `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
3. Desplegar `whatsapp-webhook` (con `--no-verify-jwt`) y `whatsapp-chat-send`
   desde `edge-functions/` (ver `INTEGRACION_VIGILANCIA_SAM.md`).
4. Configurar el webhook en Meta y suscribirse a `messages` (paso manual).
5. Escribir desde un celular al número de producción y verificar que la
   conversación aparezca en la bandeja.
6. Responder texto libre dentro de las 24 h y verificar los tics de estado.

## Alcance actual

- Entrantes: texto, botones, listas y respuestas interactivas. Imágenes, audio,
  documentos y ubicaciones se registran como “contenido no compatible”.
- Deduplicación por `wamid`.
- Salientes: sólo texto libre y sólo con ventana de 24 h abierta.
- Vinculación con `voluntarios` por teléfono normalizado (solo lectura).
- Confirmaciones/rechazos: sólo sugerencia visual, no modifican turnos ni
  `whatsapp_estados`.
- Realtime + polling cada 30 s como respaldo.
- Sin cron, sin YCloud, sin plantillas nuevas, sin tocar `whatsapp-send`.

Documentación de importación a la app principal: `INTEGRACION_VIGILANCIA_SAM.md`.
