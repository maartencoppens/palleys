import type { Metadata } from "next";
import { DM_Sans, DynaPuff, Nunito_Sans } from "next/font/google";
import Script from "next/script";
import "@/app/globals.css";

const dynaPuff = DynaPuff({
  variable: "--font-dynapuff",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Palleys | A pal for your keys",
  description:
    "Maak kennis met je Palley: je huisdier als 3D-geprinte sleutelhanger, gemaakt van je favoriete foto en met de hand afgewerkt in Gent. Je beste vriend, klein genoeg om overal mee te gaan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${dynaPuff.variable} ${nunitoSans.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Marks JS as available before first paint, so animated elements can start hidden (see globals.css). */}
        <Script id="js-flag" strategy="beforeInteractive">
          {"document.documentElement.classList.add('js')"}
        </Script>
        {children}
      </body>
    </html>
  );
}
