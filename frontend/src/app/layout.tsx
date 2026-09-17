import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Logística Delivery - Gestão & Expedição de Pedidos',
  description: 'Sistema unificado de recepção, padronização e expedição de pedidos de delivery (Cardápio Web + iFood).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
