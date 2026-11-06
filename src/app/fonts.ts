import { DM_Sans, DynaPuff, Nunito_Sans } from "next/font/google";

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

// On <html> in every root layout, because globals.css resolves them in :root.
export const fontClassName = `${dynaPuff.variable} ${nunitoSans.variable} ${dmSans.variable}`;

// Light initial on a dark browser UI, dark initial on a light one.
export const siteIcons = {
  icon: [
    { url: "/images/initial-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
    { url: "/images/initial-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
  ],
};
