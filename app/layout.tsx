import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sistema de Estoque', description: 'Controle de estoque com histórico, alertas, API e Google Sheets.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
