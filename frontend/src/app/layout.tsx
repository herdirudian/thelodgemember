"use client";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {isAuthPage ? (
          // Layout untuk halaman auth tanpa sidebar
          <div className="min-h-screen w-full bg-white">
            <main className="w-full min-h-screen">
              <div className="container mx-auto px-4 py-8">
                {children}
              </div>
            </main>
          </div>
        ) : (
          // Layout normal dengan sidebar
          <div className="flex h-screen bg-white">
            <Sidebar />
            <main className="flex-1 lg:pl-64 pt-14 lg:pt-0 pb-14 lg:pb-0 overflow-auto">
              <div className="px-3 py-4 sm:px-4 lg:px-8 lg:py-6">
                {children}
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}
