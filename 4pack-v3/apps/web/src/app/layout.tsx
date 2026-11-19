import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import "./operator.css";
import "./operator-journey.css";
import "./review-delivery.css";
import "./admin-workspace.css";
import "./capacity.css";

export const metadata: Metadata = {
  title: "4PACK | Licitación logística",
  description: "Intermediación logística para pequeños importadores",
  icons: { icon: "/branding/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
