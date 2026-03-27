import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "../public/fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "../public/fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "RateIt Her",
  description: "芸能人評価・ランキングサイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
