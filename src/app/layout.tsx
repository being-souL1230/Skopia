import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skopia | Project Health Analyzer",
  description: "Rule-based repository health: dependencies, README completeness, env docs and hygiene.",
  icons: {
    icon: [
      { url: "/skopia.webp?v=4", type: "image/webp" },
      { url: "/favicon.ico?v=4", type: "image/x-icon" },
    ],
    shortcut: "/skopia.webp?v=4",
    apple: "/skopia.webp?v=4",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
