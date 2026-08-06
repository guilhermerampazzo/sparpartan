import type { Metadata } from "next";
import { Manrope, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";
import { ThemeProvider } from "@/components/theme-provider";
import { SwRegister } from "@/components/sw-register";
import { obterTemaServidor } from "@/lib/tema";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "Sparapan Solução Naval",
  description: "Gestão de despachante e escola náutica",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#002b5b",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tema = await obterTemaServidor();

  return (
    <html
      lang="pt-BR"
      data-theme={tema}
      className={`${manrope.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider temaInicial={tema}>{children}</ThemeProvider>
        <SwRegister />
      </body>
    </html>
  );
}
