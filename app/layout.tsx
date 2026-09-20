import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://backyard-brigade.rocky-wasp-5860.chatgpt.site'),
  title: 'Backyard Brigade — Garden Defense',
  description: 'Grow a defense. Guard the porch. Survive the shuffle.',
  openGraph: {
    title: 'Backyard Brigade — Garden Defense',
    description: 'Grow. Defend. Survive the shuffle.',
    images: [{ url: '/og.png', width: 1730, height: 909, alt: 'Backyard Brigade garden defense game' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Backyard Brigade — Garden Defense',
    description: 'Grow. Defend. Survive the shuffle.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
