import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/PWARegister";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "IDMJI Gestor de Púlpito",
  description: "Gestión de cultos y púlpito para IDMJI Sabadell",
  manifest: "/manifest.json",
  themeColor: "#4A90E2",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IDMJI Gestor",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/web-app-manifest-192x192.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <I18nProvider>
            <div className="gradient-mesh fixed inset-0 -z-10" />
            <Toaster position="top-center" closeButton />
            <PWARegister />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
