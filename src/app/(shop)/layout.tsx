import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Palleys | A pal for your keys",
  description:
    "Maak kennis met je Palley: je huisdier als 3D-geprinte sleutelhanger, gemaakt van je favoriete foto en met de hand afgewerkt in Gent. Je beste vriend, klein genoeg om overal mee te gaan.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
