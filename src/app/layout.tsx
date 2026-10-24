import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PBTC | Prince Brass Trading Co.",
  description: "Stock, billing, GST and reports",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
