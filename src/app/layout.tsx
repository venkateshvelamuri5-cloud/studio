
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'AAGO Hub - Smart Mobility',
  description: 'The easiest way to get around. Real-time tracking and secure booking for modern commuters.',
  manifest: '/manifest.json',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2230%22 cy=%2230%22 r=%2210%22 fill=%22%23EAB308%22/><circle cx=%2270%22 cy=%2230%22 r=%2210%22 fill=%22%23EAB308%22/><circle cx=%2250%22 cy=%2270%22 r=%2210%22 fill=%22%23EAB308%22/><path d=%22M30 30L70 30L50 70Z%22 stroke=%22%23EAB308%22 stroke-width=%224%22 fill=%22none%22 stroke-dasharray=%225 5%22/></svg>',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AAGO',
  },
  applicationName: 'AAGO',
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-black">
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          {children}
          <Toaster />
        </FirebaseClientProvider>
        <Script 
          id="razorpay-checkout-js"
          src="https://checkout.razorpay.com/v1/checkout.js" 
          strategy="afterInteractive" 
        />
      </body>
    </html>
  );
}
