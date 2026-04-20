import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "莲花书院",
  description: "莲花书院 — 全中文书城社区",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-[100dvh] font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <div className="mx-auto max-w-[1400px] px-4 md:px-6">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
