import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4PACK | Licitación logística",
  description: "Intermediación logística para pequeños importadores"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
