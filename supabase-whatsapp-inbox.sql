-- ============================================================================
-- Vigilancia SAM — Bandeja de WhatsApp
-- Migración IDEMPOTENTE. Crea SOLO tablas nuevas.
-- NO modifica ni borra: voluntarios, whatsapp_config, whatsapp_estados,
-- whatsapp_mensajes, plantillas, secretos, funciones ni cron existentes.
-- Ejecutar en el SQL Editor del proyecto Supabase EXISTENTE de Vigilancia SAM.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A) Conversaciones
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_conversaciones (
  id uuid primary key default gen_random_uuid(),
  telefono text unique not null,
  voluntario_id uuid null references public.voluntarios(id) on delete set null,
  nombre_contacto text null,
  ultimo_mensaje text null,
  ultimo_mensaje_at timestamptz null,
  ultimo_mensaje_direccion text null check (ultimo_mensaje_direccion in ('entrante','saliente')),
  ultimo_mensaje_entrante_at timestamptz null,
  ventana_24h_hasta timestamptz null,
  no_leidos integer not null default 0,
  estado text not null default 'abierta' check (estado in ('abierta','cerrada','archivada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- B) Mensajes del chat (independiente de public.whatsapp_mensajes existente)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_chat_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.whatsapp_conversaciones(id) on delete cascade,
  meta_message_id text unique null,
  direccion text not null check (direccion in ('entrante','saliente')),
  tipo text not null default 'texto',
  contenido text null,
  payload jsonb null,
  estado text null,
  enviado_at timestamptz null,
  entregado_at timestamptz null,
  leido_at timestamptz null,
  error_detalle text null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists whatsapp_conversaciones_ultimo_mensaje_at_idx
  on public.whatsapp_conversaciones (ultimo_mensaje_at desc);
create index if not exists whatsapp_conversaciones_voluntario_id_idx
  on public.whatsapp_conversaciones (voluntario_id);
create index if not exists whatsapp_chat_mensajes_conversacion_created_idx
  on public.whatsapp_chat_mensajes (conversacion_id, created_at asc);
create index if not exists whatsapp_chat_mensajes_meta_message_id_idx
  on public.whatsapp_chat_mensajes (meta_message_id);

-- ---------------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------------
create or replace function public.whatsapp_inbox_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists whatsapp_conversaciones_set_updated_at on public.whatsapp_conversaciones;
create trigger whatsapp_conversaciones_set_updated_at
  before update on public.whatsapp_conversaciones
  for each row execute function public.whatsapp_inbox_set_updated_at();

-- ---------------------------------------------------------------------------
-- GRANTS (PostgREST no otorga privilegios por defecto)
-- Sin acceso anon: la bandeja es interna.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.whatsapp_conversaciones to authenticated;
grant select, insert, update, delete on public.whatsapp_chat_mensajes to authenticated;
grant all on public.whatsapp_conversaciones to service_role;
grant all on public.whatsapp_chat_mensajes to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- FASE 1: cualquier usuario autenticado puede leer/escribir la bandeja.
-- FASE 2 (endurecer luego): reemplazar `true` por
--   public.has_role(auth.uid(), 'admin')  -- o el chequeo de rol propio de
-- Vigilancia SAM, para limitar la bandeja a administradores.
-- Las Edge Functions usan service role y NO dependen de estas políticas.
-- ---------------------------------------------------------------------------
alter table public.whatsapp_conversaciones enable row level security;
alter table public.whatsapp_chat_mensajes enable row level security;

drop policy if exists "conversaciones autenticados lectura" on public.whatsapp_conversaciones;
create policy "conversaciones autenticados lectura"
  on public.whatsapp_conversaciones for select to authenticated using (true);

drop policy if exists "conversaciones autenticados insert" on public.whatsapp_conversaciones;
create policy "conversaciones autenticados insert"
  on public.whatsapp_conversaciones for insert to authenticated with check (true);

drop policy if exists "conversaciones autenticados update" on public.whatsapp_conversaciones;
create policy "conversaciones autenticados update"
  on public.whatsapp_conversaciones for update to authenticated using (true) with check (true);

drop policy if exists "chat mensajes autenticados lectura" on public.whatsapp_chat_mensajes;
create policy "chat mensajes autenticados lectura"
  on public.whatsapp_chat_mensajes for select to authenticated using (true);

drop policy if exists "chat mensajes autenticados insert" on public.whatsapp_chat_mensajes;
create policy "chat mensajes autenticados insert"
  on public.whatsapp_chat_mensajes for insert to authenticated with check (true);

drop policy if exists "chat mensajes autenticados update" on public.whatsapp_chat_mensajes;
create policy "chat mensajes autenticados update"
  on public.whatsapp_chat_mensajes for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime (opcional, ignora el error si la publicación ya las incluye)
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.whatsapp_conversaciones;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.whatsapp_chat_mensajes;
  exception when duplicate_object then null;
  end;
end $$;
