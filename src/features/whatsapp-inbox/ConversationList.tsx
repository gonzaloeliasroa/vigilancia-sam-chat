import { Search, RefreshCw, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConversacionConVoluntario, FiltroBandeja } from "./types";
import { formatearTelefono, tiempoRelativo } from "./utils";

const FILTROS: { key: FiltroBandeja; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "no_leidas", label: "No leídas" },
  { key: "abiertas", label: "Abiertas" },
  { key: "sin_vincular", label: "Sin vincular" },
];

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
            <p className="text-sm font-medium text-foreground">Sin conversaciones</p>
            <p className="text-xs text-muted-foreground">
              Cuando un voluntario escriba al número de Vigilancia SAM, la conversación aparecerá
              acá.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {conversaciones.map((c) => {
              const activa = c.id === seleccionada;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSeleccionar(c.id)}
                    className={cn(
                      "w-full px-3 py-3 text-left transition-colors hover:bg-accent",
                      activa && "bg-accent",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {c.voluntario_nombre ?? c.nombre_contacto ?? "Sin vincular"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatearTelefono(c.telefono)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[11px] text-muted-foreground">
                          {tiempoRelativo(c.ultimo_mensaje_at)}
                        </span>
                        {c.no_leidos > 0 && (
                          <Badge className="h-5 min-w-5 justify-center px-1.5">{c.no_leidos}</Badge>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {c.ultimo_mensaje_direccion === "saliente" && (
                        <span className="text-foreground/70">Vos: </span>
                      )}
                      {c.ultimo_mensaje ?? "—"}
                    </p>
                    {!c.voluntario_nombre && (
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <UserX className="size-3" /> Sin vincular
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
