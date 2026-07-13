import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// viewportFit: "cover" is required for env(safe-area-inset-*) to be
// non-zero on notched phones — the bottom tab bar relies on it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://oraki.gr"),
  title: {
    default: "Oraki | Το πρόγραμμα των μαθημάτων σου, χωρίς τηλεφωνήματα",
    template: "%s | Oraki",
  },
  description:
    "Οργάνωσε τα ιδιαίτερα μαθήματά σου σε μία σελίδα. Οι γονείς ζητούν αλλαγή ώρας με ένα άγγιγμα και εσύ απλώς εγκρίνεις.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="el"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">{children}</body>
    </html>
  );
}
