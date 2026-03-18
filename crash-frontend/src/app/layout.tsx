import type { Metadata } from "next";
import { Geist, Geist_Mono, Lilita_One } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/Providers";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NewSidebar } from "@/components/sidebar/newSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lilitaOne = Lilita_One({
  variable: "--font-lilita-one",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRAZD — Crypto Crash & Casino Games on Stellar",
  description:
    "Play provably fair crash, candleflip, keno and battle games on CRAZD. Instant payouts powered by Stellar & Soroban smart contracts.",
  keywords: [
    "crypto crash game",
    "stellar blockchain casino",
    "provably fair crash",
    "soroban casino",
    "candleflip",
    "keno crypto",
    "CRAZD",
  ],
  metadataBase: new URL("https://crazd.vercel.app"),
  openGraph: {
    title: "CRAZD — Crypto Crash & Casino Games on Stellar",
    description:
      "Provably fair crash, candleflip, keno and battles. Instant payouts on Stellar.",
    url: "https://crazd.vercel.app",
    siteName: "CRAZD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CRAZD — Crypto Crash & Casino Games on Stellar",
    description:
      "Provably fair crash, candleflip, keno and battles. Instant payouts on Stellar.",
  },
  icons: {
    icon: "/ico.svg",
    shortcut: "/ico.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased ${lilitaOne.className}`}
      >
        <Providers>
          <NewSidebar />
          {/* <div className='absolute bottom-10 right-10 z-50'>
            <SidebarTrigger className='text-white border-2 border-white/20 h-10 w-10 rounded-2xl' />
          </div> */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
