import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio Optimizer v2",
  description:
    "Seguimiento de portfolio personal con snapshots, reviews con IA y perfil de inversión.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-419"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Toaster richColors position="top-center" />
        <div className="flex min-h-full flex-1 flex-col">{children}</div>
        <footer className="border-t border-zinc-200 px-4 py-3 text-center text-xs text-zinc-500 dark:border-zinc-800">
          Esta aplicación es solo para seguimiento personal y educación. No
          constituye asesoramiento financiero.
        </footer>
      </body>
    </html>
  );
}
