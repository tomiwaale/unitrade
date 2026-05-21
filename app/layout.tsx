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
    "Nigeria's #1 student marketplace. Buy cheap hostel items, second-hand textbooks, laptops, phones and electronics from verified students at UNILAG, UI, OAU, LASU, FUTA, UNIPORT, ABU, UNIBEN and 50+ universities. Safe escrow payments. Free to join.",
  keywords: [
    // Platform
    "KolejSwap",
    "kolejswap Nigeria",
    "student marketplace Nigeria",
    "campus marketplace Nigeria",
    "buy sell university Nigeria",
    "Nigeria student buy sell",
    "Nigeria school market",
    "university items for sale Nigeria",
    // Actions
    "buy cheap items Nigerian students",
    "sell used items campus Nigeria",
    "swap items Nigerian university",
    "student to student marketplace Nigeria",
    "buy sell swap campus Nigeria",
    "student secondhand market Nigeria",
    "sell old school items Nigeria",
    "buy school supplies Nigeria",
    // Textbooks
    "buy used textbooks Nigeria",
    "cheap textbooks Nigerian students",
    "second hand textbooks university Nigeria",
    "sell old textbooks university Nigeria",
    "affordable course materials Nigeria",
    "buy school books online Nigeria",
    "cheap school books Nigeria",
    "used books university Nigeria",
    // Electronics
    "buy cheap laptop student Nigeria",
    "second hand laptop student Nigeria",
    "buy used phone student Nigeria",
    "cheap electronics student Nigeria",
    "affordable laptop university Nigeria",
    "sell used laptop Nigeria",
    "student laptop Nigeria",
    "buy Tecno Samsung iPhone student Nigeria",
    // Furniture / hostel
    "buy hostel furniture Nigeria",
    "second hand hostel items Nigeria",
    "buy hostel room items Nigeria",
    "campus room furniture Nigeria",
    "hostel bed mattress Nigeria",
    "sell hostel items graduating student",
    "hostel items for sale Nigeria",
    "room items for sale student Nigeria",
    // Clothing / fashion
    "buy cheap clothing student Nigeria",
    "student fashion Nigeria",
    "school uniform buy sell Nigeria",
    "affordable campus clothing Nigeria",
    // Services
    "student tutor Nigeria",
    "hire student Nigeria campus",
    "student photographer Nigeria campus",
    "student delivery service campus Nigeria",
    "campus food delivery Nigeria",
    // UNILAG / Lagos
    "UNILAG marketplace",
    "UNILAG buy sell",
    "University of Lagos student market",
    "UNILAG student items",
    "LASU marketplace",
    "LASU student market",
    "Lagos State University buy sell",
    "LASUSTECH student market",
    "MAPOLY student marketplace",
    // UI / Ibadan
    "UI Ibadan buy sell",
    "University of Ibadan marketplace",
    "UI student market",
    "LAUTECH student market",
    "Ladoke Akintola University buy sell",
    // OAU / Southwest
    "OAU campus items",
    "OAU Ile-Ife student market",
    "Obafemi Awolowo University marketplace",
    "AAUA student market",
    "Adekunle Ajasin University buy sell",
    "EKSU student marketplace",
    "Ekiti State University buy sell",
    // Benin / Delta
    "UNIBEN student marketplace",
    "University of Benin buy sell",
    "DELSU student market",
    "Delta State University buy sell",
    // Ilorin
    "UNILORIN student market",
    "University of Ilorin buy sell",
    // Port Harcourt / Rivers
    "UNIPORT marketplace",
    "University of Port Harcourt buy sell",
    "RSUST student market",
    "Rivers State University buy sell",
    // Imo / Owerri
    "FUTO student marketplace",
    "Federal University of Technology Owerri buy sell",
    "IMSU student market",
    // Enugu / Nsukka
    "UNN student marketplace",
    "University of Nigeria Nsukka buy sell",
    "UNEC student market",
    // Anambra / Awka
    "UNIZIK student market",
    "Nnamdi Azikiwe University buy sell",
    "COOU student marketplace",
    // ABU / Zaria
    "ABU Zaria student market",
    "Ahmadu Bello University marketplace",
    // Kano / North
    "BUK student market",
    "Bayero University Kano buy sell",
    "KUST student marketplace",
    // Akure / FUTA
    "FUTA campus",
    "Federal University of Technology Akure student market",
    "FUTA student buy sell",
    // Abeokuta
    "FUNAAB student marketplace",
    "Federal University of Agriculture Abeokuta buy sell",
    // Abuja / FCT
    "UNIABUJA student market",
    "University of Abuja buy sell",
    "FUTMINNA student marketplace",
    "Federal University of Technology Minna buy sell",
    // Akwa Ibom / Cross River
    "UNIUYO student market",
    "University of Uyo buy sell",
    // Jos / Plateau
    "UNIJOS student marketplace",
    "University of Jos buy sell",
    // Private universities
    "Covenant University marketplace",
    "Covenant University buy sell",
    "Babcock University buy sell",
    "Babcock University student market",
    "Bowen University student marketplace",
    "Bells University student market",
    "Landmark University buy sell",
    "Lead City University student market",
    "American University Nigeria buy sell",
    "Pan-Atlantic University student marketplace",
    "Redeemers University buy sell",
    "Benson Idahosa University student market",
    // Polytechnics
    "YABATECH student marketplace",
    "YABATECH buy sell",
    "FUPRE student market",
    // Trust / safety
    "escrow student marketplace Nigeria",
    "verified student seller Nigeria",
    "safe buy sell campus Nigeria",
    "NIN verified seller Nigeria",
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

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "KolejSwap",
  url: APP_URL,
  description:
    "Nigeria's student marketplace for buying, selling and swapping campus items at universities across Nigeria.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${APP_URL}/catalog?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "KolejSwap",
  url: APP_URL,
  description:
    "KolejSwap is Nigeria's #1 student marketplace — a peer-to-peer platform where university students buy, sell, and swap textbooks, electronics, hostel furniture, clothing, and services on campus.",
  areaServed: { "@type": "Country", name: "Nigeria" },
  knowsAbout: [
    "student marketplace",
    "Nigerian universities",
    "campus items",
    "textbooks",
    "electronics",
    "hostel furniture",
    "peer-to-peer commerce",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(geistSans.variable, geistMono.variable)}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-screen antialiased flex flex-col" suppressHydrationWarning>
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
