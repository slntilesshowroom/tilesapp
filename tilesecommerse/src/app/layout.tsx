import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";

import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { Providers } from "@/providers";
import "@/styles/globals.css";
import "@/styles/colors.css";
import "@/styles/animations.css";

export const metadata: Metadata = {
  title: "SLN TILES SHOWROOM - Premium Tiles Showroom Bengaluru",
  description: "Premium quality tiles showroom in Bengaluru. Wide range of ceramic, vitrified, marble finish tiles for home and commercial spaces.",
  keywords: "tiles, ceramic tiles, vitrified tiles, marble tiles, bengaluru, showroom",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

const isDevelopment = process.env.NODE_ENV === 'development';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Warm up the payment-gateway connection without blocking render.
            The checkout.js tag itself used to live here, render-blocking on
            every page in the app; CheckoutForm now loads it on demand. */}
        <link rel="preconnect" href="https://checkout.razorpay.com" />
      </head>
      <body className={GeistSans.className}>
        <Providers>
          <LayoutWrapper>
            {children}
            <Toaster position="bottom-right" />
            {!isDevelopment && (
              <>
                <Analytics />
                <SpeedInsights />
              </>
            )}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
