import './globals.css';

export const metadata = {
  title: 'Bhakti Daily — Your Daily Spiritual Companion',
  description:
    'Receive personalised Rashi readings, sacred Hindu scripture, and daily spiritual challenges every morning via WhatsApp.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
