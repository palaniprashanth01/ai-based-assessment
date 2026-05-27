import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

// Aeonik is licensed (CoType Foundry). Space Grotesk is the closest open
// substitute. If you license Aeonik, drop the .woff2 into /public/fonts and
// list it first in font-family — the stack already prefers Aeonik.
const sans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Navigate · PDF → Assessment",
  description:
    "Drop a PDF, generate Bloom's-aligned MCQs, a summary, and a knowledge graph. Built on Gemini 2.5 Flash. Deploy on Netlify.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
