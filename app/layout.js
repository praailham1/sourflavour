import './globals.css';

export const metadata = {
  title: 'Sourflavour - Artisanal Order',
  description: 'Custom Artisanal Bakery Order System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}