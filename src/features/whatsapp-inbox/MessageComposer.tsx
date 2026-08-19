import { useState } from "react";
import { Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  ventanaAbierta: boolean;
  enviando: boolean;
  onEnviar: (texto: string) => Promise<void>;
}

export function MessageComposer({ ventanaAbierta, enviando, onEnviar }: Props) {
  const [texto, setTexto] = useState("");

  const submit = async () => {
    const t = texto.trim();
    if (!t || !ventanaAbierta || enviando) return;
    await onEnviar(t);
    setTexto("");
  };

  if (!ventanaAbierta) {
    return (
      <div className="border-t border-border bg-muted/50 p-4">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" />
          La ventana de 24 horas está cerrada. Para iniciar nuevamente la conversación se requiere
          una plantilla aprobada.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Escribí una respuesta…"
          rows={2}
          className="min-h-11 resize-none"
          aria-label="Respuesta"
        />
        <Button onClick={() => void submit()} disabled={enviando || !texto.trim()}>
          <Send className="size-4" />
          Enviar
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Solo texto libre dentro de la ventana de 24 h. Las plantillas siguen saliendo por
        whatsapp-send.
      </p>
    </div>
  );
}
