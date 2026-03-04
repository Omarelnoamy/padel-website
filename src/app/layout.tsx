import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/custom.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { IntroVideoOverlay } from "@/components/IntroVideoOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StarPoint - Book Your Court in Port Said",
  description:
    "Premier padel facility offering world-class courts, professional coaching, and exciting tournaments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0A0A0A] text-white`}
      >
        <Providers>
          {children}
          <IntroVideoOverlay />
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
