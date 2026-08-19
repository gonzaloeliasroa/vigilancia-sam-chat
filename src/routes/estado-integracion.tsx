import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntegrationStatus } from "@/features/whatsapp-inbox/IntegrationStatus";

export const Route = createFileRoute("/estado-integracion")({
  head: () => ({
    meta: [
      { title: "Estado de integración WhatsApp — Vigilancia SAM" },
      {
        name: "description",
        content:
          "Checklist de la integración de WhatsApp Cloud API: migración SQL, webhook, secretos y pruebas.",
      },
      { property: "og:title", content: "Estado de integración WhatsApp — Vigilancia SAM" },
      {
        property: "og:description",
        content: "Verificá qué pasos de la bandeja de WhatsApp están listos y qué falta configurar.",
      },
    ],
  }),
  component: EstadoIntegracion,
});

function EstadoIntegracion() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="size-4" /> Volver a la bandeja
          </Link>
        </Button>
        <IntegrationStatus />
      </div>
    </main>
  );
}
