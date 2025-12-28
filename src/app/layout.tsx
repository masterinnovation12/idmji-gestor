import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/PWARegister";
import { InstallPrompt } from "@/components/InstallPrompt";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e293b",
};

export const metadata: Metadata = {
  title: "IDMJI Sabadell",
  description: "Gestión de cultos y púlpito para IDMJI Sabadell",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IDMJI Sabadell",
    startupImage: [
      // iPhone 14 Pro Max, 15 Plus, 15 Pro Max (1290x2796)
      {
        url: "/splash/splash-iphone.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14 Pro, 15, 15 Pro (1179x2556)
      {
        url: "/splash/splash-iphone.png",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14, 13, 13 Pro, 12, 12 Pro (1170x2532)
      {
        url: "/splash/splash-iphone.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14 Plus, 13 Pro Max, 12 Pro Max (1284x2778)
      {
        url: "/splash/splash-iphone.png",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 13 mini, 12 mini (1080x2340)
      {
        url: "/splash/splash-iphone.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 11 Pro Max, XS Max (1242x2688)
      {
        url: "/splash/splash-iphone.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 11, XR (828x1792)
      {
        url: "/splash/splash-iphone.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPhone SE 3rd gen (750x1334)
      {
        url: "/splash/splash-iphone.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="IDMJI Sabadell" />
      </head>
      <body className={`${inter.variable} font-sans antialiased no-scrollbar`}>
        <ThemeProvider>
          <I18nProvider>
            <div className="gradient-mesh fixed inset-0 -z-10" />
            <Toaster position="top-center" closeButton />
            <PWARegister />
            <InstallPrompt />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
