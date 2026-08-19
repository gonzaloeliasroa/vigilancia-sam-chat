import { useEffect, useRef } from "react";
import { Check, CheckCheck, Clock, AlertTriangle, CheckCircle2, XCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatMensaje, ConversacionConVoluntario } from "./types";
import {
  clasificarRespuesta,
  formatearTelefono,
  horaCorta,
  restanteVentana,
  ventanaAbierta as esVentanaAbierta,
} from "./utils";
import { MessageComposer } from "./MessageComposer";

interface Props {
  conversacion: ConversacionConVoluntario | null;
  mensajes: ChatMensaje[];
  cargando: boolean;
  enviando: boolean;
  onMarcarLeida: () => void;
  onEnviar: (texto: string) => Promise<void>;
}

function EstadoSaliente({ m }: { m: ChatMensaje }) {
  if (m.estado === "failed" || m.error_detalle) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
        <AlertTriangle className="size-3" /> falló
      </span>
    );
  }
  if (m.leido_at)
    return <CheckCheck className="size-3.5 text-primary" aria-label="leído" />;
  if (m.entregado_at)
    return <CheckCheck className="size-3.5 text-muted-foreground" aria-label="entregado" />;
  if (m.enviado_at) return <Check className="size-3.5 text-muted-foreground" aria-label="enviado" />;
  return <Clock className="size-3.5 text-muted-foreground" aria-label="pendiente" />;
}

export function ConversationView({
  conversacion,
  mensajes,
  cargando,
  enviando,
  onMarcarLeida,
  onEnviar,
}: Props) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length, conversacion?.id]);

  if (!conversacion) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium text-foreground">Elegí una conversación</p>
        <p className="text-xs text-muted-foreground">
          Seleccioná un contacto de la lista para ver el historial y responder.
        </p>
      </div>
    );
  }

  const abierta = esVentanaAbierta(conversacion.ventana_24h_hasta);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {conversacion.voluntario_nombre ?? conversacion.nombre_contacto ?? "Sin vincular"}
            </h2>
            {conversacion.voluntario_id || conversacion.voluntario_nombre ? (
              <Badge variant="secondary" className="gap-1">
                <User className="size-3" /> Voluntario vinculado
              </Badge>
            ) : (
              <Badge variant="outline">Sin vincular</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatearTelefono(conversacion.telefono)} ·{" "}
            {abierta ? (
              <span className="text-primary">
                Ventana 24 h abierta ({restanteVentana(conversacion.ventana_24h_hasta)})
              </span>
            ) : (
              <span className="text-destructive">Ventana 24 h cerrada</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onMarcarLeida}>
          Marcar como leída
        </Button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {cargando && mensajes.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">Cargando mensajes…</p>
        )}
        {!cargando && mensajes.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">Sin mensajes todavía.</p>
        )}
        {mensajes.map((m) => {
          const entrante = m.direccion === "entrante";
          const clasif = entrante ? clasificarRespuesta(m.contenido) : null;
          const noCompatible = m.tipo === "no_compatible";
          return (
            <div
              key={m.id}
              className={cn("flex flex-col gap-1", entrante ? "items-start" : "items-end")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm md:max-w-[70%]",
                  entrante
                    ? "rounded-bl-sm bg-card text-card-foreground"
                    : "rounded-br-sm bg-[var(--bubble-out)] text-[var(--bubble-out-foreground)]",
                )}
              >
                {noCompatible ? (
                  <span className="italic opacity-80">
                    Contenido no compatible ({String(m.payload?.['tipo_original'] ?? "adjunto")})
                  </span>
                ) : (
                  <span className="whitespace-pre-wrap break-words">{m.contenido ?? "—"}</span>
                )}
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1.5 text-[11px]",
                    entrante ? "text-muted-foreground" : "opacity-80",
                  )}
                >
                  <span>{horaCorta(m.created_at)}</span>
                  {!entrante && <EstadoSaliente m={m} />}
                </div>
              </div>
              {clasif && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px]",
                    clasif === "confirmacion" ? "text-primary" : "text-destructive",
                  )}
                >
                  {clasif === "confirmacion" ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  {clasif === "confirmacion"
                    ? "Posible confirmación detectada"
                    : "Posible rechazo detectado"}
                </span>
              )}
              {m.error_detalle && !entrante && (
                <span className="text-[11px] text-destructive">{m.error_detalle}</span>
              )}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <MessageComposer ventanaAbierta={abierta} enviando={enviando} onEnviar={onEnviar} />
    </div>
  );
}
