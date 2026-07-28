import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jacob's Exchange",
  description: "Jacob's Exchange — калькулятор обменного пункта.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Jacob's Exchange",
    statusBarStyle: "black",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-black text-white antialiased">{children}</body>
    </html>
  );
}
