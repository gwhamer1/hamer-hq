import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hamer HQ',
  description: 'Family calendar for Gary and Andrea',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: '#0f0f1a', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
