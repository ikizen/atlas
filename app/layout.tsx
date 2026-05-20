import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeEffect } from "@/components/theme-effect";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlas",
  description: "A fast, minimal launcher for folders, links and sheets.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

// Runs before first paint: applies the persisted theme so there's no flash.
const NO_FLASH = `(function(){try{var d=localStorage.getItem('atlas:v1');var t='dark';if(d){var p=JSON.parse(d);if(p&&p.settings&&p.settings.theme==='light')t='light';}document.documentElement.classList.toggle('dark',t!=='light');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
        <ThemeEffect />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
