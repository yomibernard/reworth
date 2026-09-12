import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReWorth Admin",
  description: "ReWorth operations portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}
