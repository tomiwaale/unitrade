import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const APP_URL =
  process.env.APP_URL?.startsWith("http")
    ? process.env.APP_URL
    : "https://kolejswap.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "KolejSwap — Buy, Sell & Swap at Nigerian Universities",
    template: "%s | KolejSwap",
  },
  description:
    "The student marketplace for Nigerian universities. Buy cheap hostel items, textbooks, laptops, and more from verified students at UNILAG, UI, OAU, LASU, FUTA, UNIPORT, ABU and beyond.",
  keywords: [
    "student marketplace Nigeria",
    "buy sell university Nigeria",
    "campus marketplace Nigeria",
    "buy hostel items Nigeria",
    "cheap textbooks Nigerian students",
    "second hand laptop student Nigeria",
    "UNILAG marketplace",
    "UI Ibadan buy sell",
    "OAU campus items",
    "LASU student market",
    "FUTA campus",
    "UNIPORT marketplace",
    "ABU Zaria student market",
    "Covenant University marketplace",
    "Babcock University buy sell",
    "buy electronics student Nigeria",
    "sell used items campus Nigeria",
    "student to student sales Nigeria",
    "hostel furniture Nigeria",
    "campus swap Nigeria",
  ],
  openGraph: {
    siteName: "KolejSwap",
    locale: "en_NG",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: APP_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(geistSans.variable, geistMono.variable)}>
      <body className="min-h-screen antialiased flex flex-col" suppressHydrationWarning>
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
