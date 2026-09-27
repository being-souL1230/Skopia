import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skopia — Project Health Analyzer",
  description: "Rule-based repository health: dependencies, README completeness, env docs and hygiene.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
