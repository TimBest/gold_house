import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gold House — Home Value Commodity Visualizer",
  description:
    "Visualize how tall a block of gold, oil, sugar, or soybeans worth your home's assessed value would be.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
