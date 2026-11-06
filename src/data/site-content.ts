// Starting values for the website texts. An admin can change all of them in /admin/settings/content;
// the live values come from core/modules/settings. No server-only imports.
import type { Locale } from "@/core/locale/config";
import { RETURN_NOTE } from "./options";

const nl = {
  infoBannerMessages: [
    "A pal for your keys",
    "Jouw huisdier als sleutelhanger",
    "Met de hand afgewerkt in Gent",
    "Het perfecte cadeau voor dierenliefhebbers",
  ],
  deliveryTime: "2-3 weken",
  returnNote: RETURN_NOTE,
  faq: [
    {
      question: "Hoe maak ik een Palley van mijn huisdier?",
      answer:
        "Je kiest je huisdier en uploadt je favoriete foto’s. Wij zetten ze met behulp van AI om in een 3D-model en controleren elke stap. Daarna wordt je Palley in volle kleur geprint. Wij bevestigen de ketting, doen een laatste check en verpakken hem. Dan valt hij bij jou in de bus.",
    },
    {
      question: "Welke foto’s upload ik best?",
      answer:
        "Upload tot 4 heldere, scherpe foto’s waarop de kop en het lichaam van je huisdier goed te zien zijn, bij voorkeur uit verschillende hoeken. Eén foto is genoeg, maar hoe beter we je huisdier zien, hoe meer je Palley erop lijkt.",
    },
    {
      question: "Kan ik een Palley cadeau geven?",
      answer:
        "Zeker weten. Een Palley is een persoonlijk cadeau voor elke dierenliefhebber. Upload gewoon foto’s van hun huisdier.",
    },
    {
      question: "Hoelang duurt mijn bestelling?",
      answer:
        "Een Palley op maat valt binnen 2 tot 3 weken in je bus. Palleys uit onze collectie die op voorraad zijn, krijg je binnen 1 tot 2 weken. Is een Palley niet op voorraad, dan maken we hem op bestelling en duurt het ook 2 tot 3 weken.",
    },
    {
      question: "Hoe groot is een Palley en hoe stevig is hij?",
      answer:
        "Ongeveer 3,7 cm op zijn langste zijde. Hij is stevig, maar kan vervormen boven 50°C. Laat hem dus niet achter in de auto, op het dashboard of in de volle zon.",
    },
    {
      question: "Kan ik mijn bestelling terugsturen?",
      answer:
        "Een Palley op maat maken we speciaal voor jou, daarom kan je hem niet terugsturen. Een Palley uit onze collectie kan je wel binnen 14 dagen na ontvangst terugsturen. Is er iets mis met je bestelling, neem dan contact met ons op.",
    },
    {
      question: "Welk goed doel steunen jullie?",
      answer: "We geven 50% van onze winst aan Dierenasiel Gent, dat dieren in nood opvangt en een nieuw thuis helpt zoeken.",
    },
    {
      question: "Wat gebeurt er met mijn foto’s?",
      answer:
        "Je foto’s gebruiken we alleen om jouw Palley te maken. We sturen ze daarvoor naar AI-diensten die er een 3D-model van maken. We verwijderen je foto’s van onze systemen 14 dagen nadat je je Palley hebt ontvangen. Wil je ze eerder laten verwijderen, mail ons dan. Meer info vind je in ons privacybeleid.",
    },
  ],
};

const en: typeof nl = {
  infoBannerMessages: [
    "A pal for your keys",
    "Your pet as a keychain",
    "Finished by hand in Ghent",
    "The perfect gift for animal lovers",
  ],
  deliveryTime: "2-3 weeks",
  returnNote:
    "Every Palley is made especially for your pet, so it cannot be returned. Did it arrive damaged, or is it not what you ordered? Then we’ll sort it out.",
  faq: [
    {
      question: "How do I make a Palley of my pet?",
      answer:
        "You choose your pet and upload your favourite photos. We use AI to turn them into a 3D model and check every step. Your Palley is then printed in full colour. We attach the chain, do a final check and pack it. Then it lands in your mailbox.",
    },
    {
      question: "Which photos should I upload?",
      answer:
        "Upload up to 4 clear, sharp photos in which your pet’s head and body are easy to see, preferably from different angles. One photo is enough, but the better we can see your pet, the more your Palley will look like them.",
    },
    {
      question: "Can I give a Palley as a gift?",
      answer: "Absolutely. A Palley is a personal gift for any animal lover. Just upload photos of their pet.",
    },
    {
      question: "How long does my order take?",
      answer:
        "A custom Palley lands in your mailbox within 2 to 3 weeks. Palleys from our collection that are in stock arrive within 1 to 2 weeks. If a Palley is not in stock, we make it to order and it also takes 2 to 3 weeks.",
    },
    {
      question: "How big is a Palley, and how sturdy is it?",
      answer:
        "About 3.7 cm on its longest side. It is sturdy, but it can deform above 50°C. So don’t leave it in the car, on the dashboard or in direct sunlight.",
    },
    {
      question: "Can I return my order?",
      answer:
        "We make a custom Palley especially for you, so it cannot be returned. A Palley from our collection can be returned within 14 days of receipt. If something is wrong with your order, please contact us.",
    },
    {
      question: "Which charity do you support?",
      answer: "We give 50% of our profit to Dierenasiel Gent, which takes in animals in need and helps them find a new home.",
    },
    {
      question: "What happens to my photos?",
      answer:
        "We only use your photos to make your Palley. To do so, we send them to AI services that turn them into a 3D model. We delete your photos from our systems 14 days after you receive your Palley. If you want them deleted sooner, email us. You can find more information in our privacy policy.",
    },
  ],
};

export const DEFAULT_SITE_CONTENT: Record<Locale, typeof nl> = { nl, en };

export const SITE_CONTENT_LIMITS = {
  infoBannerMessages: { items: 8, length: 60 },
  deliveryTime: 40,
  returnNote: 400,
  faq: { items: 20, question: 150, answer: 1000 },
} as const;
