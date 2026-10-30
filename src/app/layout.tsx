import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Low Ticket Intelligence",
  description: "Inteligência comercial para ofertas digitais. Fase 1.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
