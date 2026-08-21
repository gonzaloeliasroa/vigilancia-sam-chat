import {
  Search,
  RefreshCw,
  UserX,
  MoreVertical,
  MailOpen,
  Mail,
  CheckCircle2,
  RotateCcw,
  Archive,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  ConversacionConVoluntario,
  EstadoConversacion,
  FiltroBandeja,
} from "./types";
import {
  ETIQUETA_ESTADO,
  estadoDerivado,
  formatearTelefono,
} from "./utils";
import { etiquetaListaAR, fechaHoraCompletaAR } from "./fechas";

const FILTROS: { key: FiltroBandeja; label: string }[] = [
  { key: "todas", label: "Todos" },
  { key: "no_leidas", label: "Sin leer" },
  { key: "requieren_respuesta", label: "Requieren respuesta" },
  { key: "en_seguimiento", label: "En seguimiento" },
  { key: "cerradas", label: "Cerrados" },
  { key: "sin_vincular", label: "Sin vincular" },
];

const COLOR_ESTADO: Record<string, string> = {
  sin_leer: "border-primary/40 bg-primary/10 text-primary",
  requiere_respuesta:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  en_seguimiento: "border-border bg-muted text-muted-foreground",
  resuelta: "border-border bg-muted text-muted-foreground",
  cerrada: "border-border bg-muted text-muted-foreground",
  al_dia: "border-border bg-muted text-muted-foreground",
};

interface Props {
  conversaciones: ConversacionConVoluntario[];
  seleccionada: string | null;
  onSeleccionar: (id: string) => void;
  busqueda: string;
  onBusqueda: (v: string) => void;
  filtro: FiltroBandeja;
  onFiltro: (f: FiltroBandeja) => void;
  onRefrescar: () => void;
  cargando: boolean;
  onMarcarLeida: (id: string) => void;
  onMarcarNoLeida: (id: string) => void;
  onCambiarEstado: (id: string, estado: EstadoConversacion) => void;
}

export function ConversationList({
  conversaciones,
  seleccionada,
  onSeleccionar,
  busqueda,
  onBusqueda,
  filtro,
  onFiltro,
  onRefrescar,
  cargando,
  onMarcarLeida,
  onMarcarNoLeida,
  onCambiarEstado,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col border-border bg-card md:border-r">
      <div className="space-y-3 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => onBusqueda(e.target.value)}
              placeholder="Buscar por nombre o teléfono"
              className="pl-8"
              aria-label="Buscar conversaciones"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefrescar}
            aria-label="Actualizar conversaciones"
          >
            <RefreshCw className={cn("size-4", cargando && "animate-spin")} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFiltro(f.key)}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors",
                filtro === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversaciones.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Sin conversaciones
            </p>
            <p className="text-xs text-muted-foreground">
              Cuando un voluntario escriba al número de Vigilancia SAM, la
              conversación aparecerá acá.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {conversaciones.map((c) => {
              const activa = c.id === seleccionada;
              const estado = estadoDerivado(c);
              const sinLeer = c.no_leidos > 0;
              return (
                <li
                  key={c.id}
                  className={cn(
                    "relative flex items-start transition-colors hover:bg-accent",
                    activa && "bg-accent",
                  )}
                >
                  <button
                    onClick={() => onSeleccionar(c.id)}
                    className="min-w-0 flex-1 px-3 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-sm text-foreground",
                            sinLeer ? "font-bold" : "font-semibold",
                          )}
                        >
                          {c.voluntario_nombre ??
                            c.nombre_contacto ??
                            "Sin vincular"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatearTelefono(c.telefono)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className="text-[11px] text-muted-foreground"
                          title={fechaHoraCompletaAR(c.ultimo_mensaje_at)}
                        >
                          {etiquetaListaAR(c.ultimo_mensaje_at)}
                        </span>
                        {sinLeer && (
                          <Badge className="h-5 min-w-5 justify-center px-1.5">
                            {c.no_leidos}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p
                      className={cn(
                        "mt-1 line-clamp-1 text-xs",
                        sinLeer
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {c.ultimo_mensaje_direccion === "saliente" && (
                        <span className="text-foreground/70">Vos: </span>
                      )}
                      {c.ultimo_mensaje ?? "—"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px]",
                          COLOR_ESTADO[estado],
                        )}
                      >
                        {ETIQUETA_ESTADO[estado]}
                      </span>
                      {!c.voluntario_nombre && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <UserX className="size-3" /> Sin vincular
                        </span>
                      )}
                    </div>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-1 mt-2 size-8 shrink-0"
                        aria-label="Acciones de la conversación"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {sinLeer ? (
                        <DropdownMenuItem onClick={() => onMarcarLeida(c.id)}>
                          <MailOpen className="size-4" /> Marcar como leído
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onMarcarNoLeida(c.id)}>
                          <Mail className="size-4" /> Marcar como no leído
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onCambiarEstado(c.id, "en_seguimiento")}
                      >
                        <RotateCcw className="size-4" /> En seguimiento
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onCambiarEstado(c.id, "resuelta")}
                      >
                        <CheckCircle2 className="size-4" /> Marcar como resuelta
                      </DropdownMenuItem>
                      {c.estado === "abierta" ||
                      c.estado === "en_seguimiento" ? (
                        <DropdownMenuItem
                          onClick={() => onCambiarEstado(c.id, "cerrada")}
                        >
                          <Archive className="size-4" /> Cerrar conversación
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onCambiarEstado(c.id, "abierta")}
                        >
                          <RotateCcw className="size-4" /> Reabrir conversación
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
