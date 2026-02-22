import type { Metadata } from "next";
import "./globals.css";
import { Orbitron, Inter } from "next/font/google";
import AppCheckInit from "../components/AppCheckInit";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-orbitron",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Equinox Galactic",
  description: "Courier Contract Calculator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
      <body>
        <AppCheckInit />
        {children}
      </body>
    </html>
  );
}
