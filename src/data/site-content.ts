// Starting values for the website texts. An admin can change all of them in /admin/settings/content;
// the live values come from core/modules/settings. No server-only imports.
import { RETURN_NOTE } from "./options";

export const DEFAULT_SITE_CONTENT = {
  infoBannerMessages: [
    "A pal for your keys",
    "Gemaakt van jouw foto",
    "Met de hand afgewerkt in Gent",
    "Keys deserve a pal too",
  ],
  deliveryTime: "2–3 weken",
  returnNote: RETURN_NOTE,
  // Figma only gives the answer to the first question; have the others checked before going live.
  faq: [
    {
      question: "Hoe werkt een Palley op maat?",
      answer:
        "Je kiest je huisdier en uploadt een foto. Wij doen de rest: we modelleren je huisdier in 3D, printen het in volle kleur en werken het met de hand af. Elke Palley is uniek.",
    },
    {
      question: "Welke foto upload ik best?",
      answer:
        "Kies een heldere, scherpe foto waarop het snuitje en de tekening van je huisdier goed te zien zijn. Hoe beter we ze zien, hoe meer je Palley op je huisdier lijkt.",
    },
    {
      question: "Kan ik een Palley cadeau geven?",
      answer:
        "Zeker weten. Een Palley is een heel persoonlijk cadeau voor een ander baasje, een vriend of jezelf. Upload gewoon een foto van hun huisdier.",
    },
    {
      question: "Hoelang duurt mijn bestelling?",
      answer:
        "Elke Palley wordt met de hand gemodelleerd, geprint en afgewerkt in ons atelier in Gent. Reken op 2 tot 3 weken tot hij in je bus valt.",
    },
    {
      question: "Welk goed doel steunt Palleys?",
      answer: "We geven 50% van onze winst aan WWF, voor de bescherming van dieren en hun leefgebied.",
    },
  ],
};

export const SITE_CONTENT_LIMITS = {
  infoBannerMessages: { items: 8, length: 60 },
  deliveryTime: 40,
  returnNote: 400,
  faq: { items: 20, question: 150, answer: 1000 },
} as const;
