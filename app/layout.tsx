import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";
import { SITE_META } from "@/content/film";
import "./globals.css";

// Шрифты по CLAUDE.md: Unbounded 600 — заголовки, Manrope 500 — навигация
// и кнопки, JetBrains Mono 400 — служебные строки.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["500"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jb-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: SITE_META.title,
  description: SITE_META.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      className={`${manrope.variable} ${unbounded.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
