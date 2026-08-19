import { useEffect, useState } from "react";
import { Check, Circle, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkIntegracion } from "./api";
import { isSupabaseConfigured } from "./supabaseClient";

type Estado = "ok" | "pendiente" | "manual";

interface Item {
  label: string;
  estado: Estado;
  detalle: string;
}

function Icono({ estado }: { estado: Estado }) {
  if (estado === "ok") return <Check className="mt-0.5 size-4 shrink-0 text-primary" />;
  if (estado === "manual")
    return <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />;
  return <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />;
}

export function IntegrationStatus() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const base: Item[] = [
        {
          label: "Variables VITE_SUPABASE_* configuradas",
          estado: isSupabaseConfigured ? "ok" : "pendiente",
          detalle: "Apuntan al proyecto Supabase existente de Vigilancia SAM.",
        },
      ];
      if (!isSupabaseConfigured) {
        if (vivo) setItems(base);
        return;
      }
      try {
        const r = await checkIntegracion();
        if (!vivo) return;
        setItems([
          ...base,
          {
            label: "Migración SQL aplicada",
            estado: r.tablasOk ? "ok" : "pendiente",
            detalle: r.tablasOk
              ? `Tablas accesibles · ${r.conversaciones} conversaciones.`
              : "Ejecutar supabase-whatsapp-inbox.sql en el SQL editor.",
          },
          {
            label: "whatsapp-webhook desplegada",
            estado: "manual",
            detalle: "Verificar en Supabase > Edge Functions que exista y esté pública.",
          },
          {
            label: "Secreto WHATSAPP_WEBHOOK_VERIFY_TOKEN creado",
            estado: "manual",
            detalle: "Se crea en Supabase; nunca se expone al frontend.",
          },
          {
            label: "Webhook configurado en Meta",
            estado: "manual",
            detalle: "Callback URL + verify token en la app de Meta (paso manual tuyo).",
          },
          {
            label: "Suscripción a 'messages' activada",
            estado: "manual",
            detalle: "En Meta > WhatsApp > Configuration > Webhook fields.",
          },
          {
            label: "Mensaje entrante recibido",
            estado: r.entrantes > 0 ? "ok" : "pendiente",
            detalle: `${r.entrantes} mensajes entrantes registrados.`,
          },
          {
            label: "Envío de respuesta dentro de 24 h validado",
            estado: r.salientesOk > 0 ? "ok" : "pendiente",
            detalle: `${r.salientesOk} mensajes salientes con ID de Meta.`,
          },
        ]);
        setError(r.detalle);
      } catch (e) {
        if (vivo) {
          setItems(base);
          setError(e instanceof Error ? e.message : "Error consultando el estado.");
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <Card className="mx-auto my-6 max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Estado de integración</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((i) => (
          <div key={i.label} className="flex gap-2">
            <Icono estado={i.estado} />
            <div>
              <p className="text-sm font-medium text-foreground">{i.label}</p>
              <p className="text-xs text-muted-foreground">{i.detalle}</p>
            </div>
          </div>
        ))}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="pt-2 text-xs text-muted-foreground">
          Los ítems marcados con “?” son pasos manuales en Supabase y Meta. La conexión del webhook
          en Meta no se declara conectada hasta que la configures vos.
        </p>
      </CardContent>
    </Card>
  );
}
