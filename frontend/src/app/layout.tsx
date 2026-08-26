import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ChatYa — Vende por WhatsApp",
  description: "Plataforma SaaS de comercio por WhatsApp para cualquier tipo de negocio",
  keywords: "WhatsApp, ventas, tienda online, ecommerce, chatya",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💬</text></svg>" />
      </head>
      <body className="font-sans antialiased bg-background text-textPrimary">
        {children}
      </body>
    </html>
  );
}
