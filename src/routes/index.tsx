import { createFileRoute } from "@tanstack/react-router";
import { InboxPage } from "@/features/whatsapp-inbox/InboxPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bandeja de WhatsApp — Vigilancia SAM" },
      {
        name: "description",
        content:
          "Bandeja interna para leer y responder mensajes de WhatsApp de los voluntarios de Vigilancia SAM.",
      },
      { property: "og:title", content: "Bandeja de WhatsApp — Vigilancia SAM" },
      {
        property: "og:description",
        content: "Mensajes entrantes y respuestas dentro de la ventana de 24 horas.",
      },
    ],
  }),
  component: InboxPage,
});
