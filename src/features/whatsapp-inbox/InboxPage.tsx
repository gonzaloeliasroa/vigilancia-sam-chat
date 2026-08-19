import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { enviarRespuesta, fetchConversaciones, fetchMensajes, marcarComoLeida } from "./api";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import type { ChatMensaje, ConversacionConVoluntario, FiltroBandeja } from "./types";
import { normalizarTelefono } from "./utils";
import { ConversationList } from "./ConversationList";
import { ConversationView } from "./ConversationView";

export function InboxPage() {
  const [conversaciones, setConversaciones] = useState<ConversacionConVoluntario[]>([]);
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroBandeja>("todas");
  const [cargando, setCargando] = useState(false);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarConversaciones = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setCargando(true);
    try {
      setConversaciones(await fetchConversaciones());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las conversaciones.");
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarMensajes = useCallback(async (id: string) => {
    setCargandoMensajes(true);
    try {
      setMensajes(await fetchMensajes(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar los mensajes.");
    } finally {
      setCargandoMensajes(false);
    }
  }, []);

  useEffect(() => {
    void cargarConversaciones();
  }, [cargarConversaciones]);

  useEffect(() => {
    if (seleccionada) void cargarMensajes(seleccionada);
    else setMensajes([]);
  }, [seleccionada, cargarMensajes]);

  // Realtime + polling moderado como respaldo.
  useEffect(() => {
    if (!supabase) return;
    const canal = supabase
      .channel("whatsapp-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversaciones" }, () => {
        void cargarConversaciones();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_chat_mensajes" }, () => {
        void cargarConversaciones();
        if (seleccionada) void cargarMensajes(seleccionada);
      })
      .subscribe();

    const timer = window.setInterval(() => {
      void cargarConversaciones();
      if (seleccionada) void cargarMensajes(seleccionada);
    }, 30000);

    return () => {
      window.clearInterval(timer);
      void supabase?.removeChannel(canal);
    };
  }, [cargarConversaciones, cargarMensajes, seleccionada]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const qTel = normalizarTelefono(busqueda);
    return conversaciones.filter((c) => {
      if (filtro === "no_leidas" && c.no_leidos <= 0) return false;
      if (filtro === "abiertas" && c.estado !== "abierta") return false;
      if (filtro === "sin_vincular" && (c.voluntario_id || c.voluntario_nombre)) return false;
      if (!q) return true;
      const nombre = (c.voluntario_nombre ?? c.nombre_contacto ?? "").toLowerCase();
      return nombre.includes(q) || (qTel && normalizarTelefono(c.telefono).includes(qTel));
    });
  }, [conversaciones, busqueda, filtro]);

  const actual = filtradas.find((c) => c.id === seleccionada) ??
    conversaciones.find((c) => c.id === seleccionada) ?? null;

  const onMarcarLeida = async () => {
    if (!seleccionada) return;
    try {
      await marcarComoLeida(seleccionada);
      setConversaciones((prev) =>
        prev.map((c) => (c.id === seleccionada ? { ...c, no_leidos: 0 } : c)),
      );
      toast.success("Conversación marcada como leída.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo marcar como leída.");
    }
  };

  const onEnviar = async (texto: string) => {
    if (!seleccionada) return;
    setEnviando(true);
    const res = await enviarRespuesta({ conversacion_id: seleccionada, texto });
    setEnviando(false);
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo enviar.");
      return;
    }
    await cargarMensajes(seleccionada);
    await cargarConversaciones();
  };

  return (
    <div className="flex h-screen min-h-0 flex-col bg-muted/30">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="size-4" />
          </span>
          <h1 className="text-sm font-semibold text-foreground sm:text-base">
            Bandeja de WhatsApp — Vigilancia SAM
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/estado-integracion">
            <ShieldCheck className="size-4" />
            <span className="hidden sm:inline">Estado de integración</span>
          </Link>
        </Button>
      </header>

      {!isSupabaseConfigured && (
        <div className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
          Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (o
          VITE_SUPABASE_ANON_KEY) del proyecto existente de Vigilancia SAM.
        </div>
      )}
      {error && (
        <div className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 md:grid-cols-[340px_1fr]">
        <div className={cn("min-h-0", seleccionada && "hidden md:block")}>
          <ConversationList
            conversaciones={filtradas}
            seleccionada={seleccionada}
            onSeleccionar={setSeleccionada}
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            filtro={filtro}
            onFiltro={setFiltro}
            onRefrescar={() => void cargarConversaciones()}
            cargando={cargando}
          />
        </div>
        <div className={cn("min-h-0", !seleccionada && "hidden md:block")}>
          {seleccionada && (
            <div className="border-b border-border bg-card px-3 py-2 md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setSeleccionada(null)}>
                <ArrowLeft className="size-4" /> Conversaciones
              </Button>
            </div>
          )}
          <ConversationView
            conversacion={actual}
            mensajes={mensajes}
            cargando={cargandoMensajes}
            enviando={enviando}
            onMarcarLeida={() => void onMarcarLeida()}
            onEnviar={onEnviar}
          />
        </div>
      </div>
    </div>
  );
}
