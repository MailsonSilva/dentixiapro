import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0F50A6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "DentixIA Pro - Inteligência Artificial para Odontologia",
    template: "%s | DentixIA Pro",
  },
  description: "Plataforma de simulações estéticas odontológicas fotorrealistas com inteligência artificial para clínicas e dentistas.",
  keywords: ["odontologia", "simulação de sorriso", "IA odontológica", "facetas", "clareamento", "implantes"],
  authors: [{ name: "DentixIA Pro" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo-icon.png",
  },
  openGraph: {
    title: "DentixIA Pro - Inteligência Artificial para Odontologia",
    description: "Transformando sorrisos com o poder da inteligência artificial. Simulações antes e depois fotorrealistas para dentistas.",
    url: "https://app.dentixia.com.br",
    siteName: "DentixIA Pro",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "DentixIA Pro",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DentixIA Pro - Inteligência Artificial para Odontologia",
    description: "Transforme consultas e encante pacientes com simulações odontológicas de alta fidelidade.",
    images: ["/logo.png"],
  },
  appleWebApp: {
    title: "DentixiaPro",
    statusBarStyle: "default",
    capable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} antialiased selection:bg-primary/20`}
        suppressHydrationWarning
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
