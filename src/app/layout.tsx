import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-dadgpt-sans",
  display: "swap",
});

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
      <body className={`${inter.variable} bg-[#050509] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
