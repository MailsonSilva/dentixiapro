import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "DentixIA Pro - Inteligência Artificial para Odontologia",
  description: "Transformando sorrisos com o poder da inteligência artificial. Gestão e simulações de ponta para dentistas.",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "DentixiaPro",
    statusBarStyle: "default",
    capable: true,
  },
};

import { ClientLayout } from "@/components/ClientLayout";

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
