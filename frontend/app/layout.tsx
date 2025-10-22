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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-gray-100 antialiased font-inter">{children}</body>
    </html>
  );
}
