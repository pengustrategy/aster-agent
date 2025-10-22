import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aster Agent - AI Trading Terminal',
  description: 'Multi-Agent Automated Trading System for Aster DEX',
  icons: {
    icon: '/aster_agent.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-gray-100 antialiased">{children}</body>
    </html>
  );
}
