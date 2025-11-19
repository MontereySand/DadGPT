import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DadGPT",
  description: "A pixel-perfect DadGPT chat surface.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
