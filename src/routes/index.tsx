import { createFileRoute } from '@tanstack/react-router';
import { InboxPage } from '@/features/whatsapp-inbox/InboxPage';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return <InboxPage />;
}
