import type { Metadata } from "next";
import { DM_Sans, DynaPuff, Nunito_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

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
  title: "Palleys",
  description: "A Pal for your Keys",
  // Light initial on a dark browser UI, dark initial on a light one.
  icons: {
    icon: [
      { url: "/images/initial-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/images/initial-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

// The only root layout: <html> and <body> live here, so the shop and admin layouts below never nest a second one.
// Font variables sit on <html> because globals.css resolves them in :root.
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
