import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'Pulse POS',
  description: 'Fast retail operations for inventory, checkout, and reporting.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(148, 163, 184, 0.18)',
              borderRadius: '18px',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.22)',
            },
          }}
        />
      </body>
    </html>
  );
}
