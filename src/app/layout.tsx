import type { Metadata } from "next";
import { Manrope, Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./pf-theme.css";
import { Providers } from "@/components/providers";
import { ThemeController } from "@/components/theme-controller";
import { AppChrome } from "@/components/pf/shell";

// Set the Intelligence Terminal mode before first paint to avoid a flash.
// Default = Light; Dark is the mission-control mode (stored as pf-theme).
const NO_FLASH_THEME = `(function(){try{var s=localStorage.getItem('pf-theme');document.documentElement.setAttribute('data-theme',s==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Inter — secondary UI typeface in the Intelligence Terminal system.
const inter = Inter({
  variable: "--font-ui-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Instrument Serif — italic display accents in the redesigned system.
const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// Absolute base for social images (the landing's og:image). Without it Next resolves them
// against localhost, and every shared link previews a broken image. Vercel sets the
// production host; NEXT_PUBLIC_APP_URL overrides it.
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "PathFinder — AI Career Mentor for Internships",
  description: "AI-powered internship navigation platform. From direction to offer — step by step.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body
        className={`${manrope.variable} ${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} antialiased min-h-screen bg-[var(--canvas)] text-[var(--ink)]`}
      >
        <Providers>
          <ThemeController />
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
