import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Feast Mode Catering",
  description: "Delivery routes and weekly pay for Feast Mode drivers.",
  applicationName: "Feast Mode",
  appleWebApp: { capable: true, title: "Feast Mode", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f4f5f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
