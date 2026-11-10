// All texts of the shop, in Dutch: the source for the other languages, whose files have to match this shape.
// Plain data, so it can go from the server to the browser. {name} is filled in with fill() or fillNodes().
// The backoffice stays Dutch and keeps its texts in its own components.
export const nl = {
  meta: {
    site: {
      title: "Palleys | A pal for your keys",
      description:
        "Maak kennis met je Palley: je huisdier als 3D-geprinte sleutelhanger, gemaakt van je favoriete foto en met de hand afgewerkt in Gent. Je beste vriend, klein genoeg om overal mee te gaan.",
    },
    about: {
      title: "Over ons | Palleys",
      description:
        "Palleys is een studentenonderneming uit Gent die je favoriete foto van je huisdier omtovert tot een 3D-geprinte sleutelhanger, met de hand afgewerkt. Leer het team kennen.",
    },
    create: {
      title: "Maak je eigen Palley | Palleys",
      description:
        "Your pet, your pal, your Palley. Upload je foto’s en wij maken van je huisdier een 3D-geprinte sleutelhanger, met de hand afgewerkt in Gent. Klaar in drie stappen.",
    },
    shop: {
      title: "Collectie | Palleys",
      description:
        "Kant-en-klare Palleys, 3D-geprint en met de hand afgewerkt in Gent.",
    },
    cart: "Winkelmandje | Palleys",
    checkout: "Afrekenen | Palleys",
    order: "Bestelling | Palleys",
    privacy: "Privacybeleid | Palleys",
    terms: "Algemene voorwaarden | Palleys",
    returns: "Retourneren | Palleys",
    returnPolicy: "Retour- en terugbetalingsbeleid | Palleys",
    shippingPolicy: "Verzendbeleid | Palleys",
    contactDetails: "Contactgegevens | Palleys",
    notFound: "Pagina niet gevonden | Palleys",
  },

  notFound: {
    title: "Deze pagina bestaat niet",
    text: "Misschien is de link verouderd. Op de homepage vind je alles terug.",
    cta: "Naar de homepage",
  },

  common: {
    loading: "Laden",
    genericError: "Er ging iets mis. Probeer het nog eens.",
    retry: "Opnieuw proberen",
    createPalley: "Maak je Palley",
    checkout: "Afrekenen",
    heatWarning:
      "Let op: een Palley kan vervormen boven 50°C. Laat hem dus niet achter in de auto, op het dashboard of in de volle zon.",
  },

  nav: {
    home: "Home",
    collection: "Onze collectie",
    about: "Over ons",
    cart: "Winkelmandje",
    homeLabel: "Palleys startpagina",
    mainMenu: "Hoofdmenu",
    menu: "Menu",
    openMenu: "Menu openen",
    closeMenu: "Menu sluiten",
    language: "Taal kiezen",
    mobileTagline:
      "Met de hand afgewerkt in Gent · 50% van onze winst naar Dierenasiel Gent",
  },

  banner: { label: "Waarom Palleys" },

  footer: {
    tagline: "A pal for your keys",
    subtextLine1: "Je favoriete maatje,",
    subtextLine2: "in zakformaat",
    discover: "Ontdek",
    createPalley: "Maak je Palley",
    shopCollection: "Shop de collectie",
    howItWorks: "Zo werkt het",
    about: "Over ons",
    help: "Hulp nodig?",
    contact: "Contact",
    faq: "Veelgestelde vragen",
    doingGood: "Goed doen",
    charityText: "50% van onze winst gaat naar Dierenasiel Gent",
    charityLink: "Ontdek ons goede doel",
    rights: "Palleys. Alle rechten voorbehouden.",
    social: "Palleys op {network}",
    privacy: "Privacy",
    terms: "Algemene voorwaarden",
    returns: "Retourneren",
    shipping: "Verzending",
    contactDetails: "Contactgegevens",
  },

  hero: {
    titleAccent: "Palleys,",
    titleRest: "a pal for your keys.",
    text: "Maak kennis met je Palley: je huisdier als 3D-geprinte sleutelhanger, gemaakt van je favoriete foto en met de hand afgewerkt. Je beste vriend, klein genoeg om overal mee te gaan.",
    collection: "Bekijk de collectie",
    flow: {
      label: "Van foto tot Palley",
      step: "Stap {current} van {total}",
      goTo: "Toon stap {number}: {title}",
      steps: [
        { title: "Jouw foto", alt: "Foto van een zwart-witte kat in het gras" },
        {
          title: "AI-pose",
          alt: "Door AI gemaakte liggende pose van dezelfde kat",
        },
        { title: "3D-model", alt: "3D-model van de kat, klaar om te printen" },
        {
          title: "Je Palley",
          alt: "De afgewerkte Palley: de kat als sleutelhanger",
        },
      ],
    },
  },

  howItWorks: {
    tag: "Zo werkt het",
    title: "Van foto tot Palley in drie stappen.",
    steps: [
      {
        title: "Kies je huisdier",
        text: "Hond, kat, konijn, egel, kameleon en nog veel meer: vertel ons wie jouw Palley wordt.",
      },
      {
        title: "Upload je foto’s",
        text: "Upload je favoriete foto’s van je huisdier. Wij ontwerpen het 3D-model en maken het printklaar.",
      },
      {
        title: "Ontmoet je Palley",
        text: "Binnen {deliveryTime} valt je Palley in de bus, klaar voor je sleutelbos.",
      },
    ],
  },

  collection: {
    tag: "Geen huisdier? Geen probleem",
    title: "Ontdek onze collectie",
    empty: "Binnenkort vind je hier onze kant-en-klare Palleys.",
    viewAll: "Bekijk de hele collectie",
    brand: "Palleys",
    shop: "Shop",
    soldOut: "Uitverkocht",
    imageAlt: "{name} sleutelhanger",
    availability: {
      label: "Op bestelling",
      explanation: "Geleverd binnen 2-3 weken",
    },
  },

  madeInGent: {
    tag: "Made in Gent",
    title: "Ontworpen en afgewerkt in Gent",
    text: "Elke Palley begint als foto en eindigt aan iemands sleutelbos. Daartussen zit ons studententeam uit Gent.",
    steps: [
      {
        title: "Naar jouw foto",
        text: "Vlekjes, kleuren, dat ene flapoortje: geen standaardmodel, maar jouw huisdier.",
      },
      {
        title: "In volle kleur geprint",
        text: "De kleuren zitten in de resinprint zelf. Geen verf, geen foute tinten.",
      },
      {
        title: "Door mensen gecontroleerd",
        text: "AI maakt het 3D-model, wij keuren elke stap. Klopt iets niet? Dan opnieuw.",
      },
      {
        title: "Met de hand afgewerkt",
        text: "Ketting eraan, laatste check en zorgvuldig ingepakt.",
      },
    ],
    link: "Lees ons verhaal",
    photoAlt:
      "Een maker werkt een 3D-geprinte corgi met de hand af, met een resinprinter op de achtergrond",
  },

  why: {
    tag: "Waarom een Palley?",
    title: "Je Palley, altijd bij je",
    photoAlt:
      "Een golden retriever, een pluizige puppy en een rosse kat liggen samen in het gras",
    benefits: [
      {
        title: "Jouw huisdier, tot in de details",
        text: "Gemaakt naar je eigen foto, dus onmiskenbaar jouw maatje. Geen twee Palleys zijn hetzelfde.",
      },
      {
        title: "Een cadeau met een verhaal",
        text: "Een verjaardag, een afscheid, een nieuw huisdier: een Palley past bij elk moment.",
      },
      {
        title: "Elke dag mee",
        text: "Aan je sleutels, je tas of je rugzak: je beste vriend gaat voortaan overal mee.",
      },
    ],
  },

  charity: {
    tag: "Kleine Palley. Grote impact.",
    titleLine1: "Voor je huisdier",
    titleLine2: "En voor dieren die nog een thuis zoeken",
    text: "De helft van onze winst gaat naar Dierenasiel Gent, dat dieren in nood opvangt en een nieuw thuis helpt zoeken.",
    badgeLine1: "van onze winst",
    badgeLine2: "voor Dierenasiel Gent",
    link: "Ontdek Dierenasiel Gent",
    photoAlt:
      "Een golden retriever, een pluizige puppy en een rosse kat liggen samen in het gras",
  },

  faq: {
    tag: "Even helpen",
    title: "Veelgestelde vragen",
    subtitle: "Dingen die je je misschien afvraagt",
  },

  contact: {
    tag: "Zeg het maar",
    title: "Nog een vraag?",
    subtitle: "We helpen je graag op weg naar jouw perfecte Palley",
    name: "Je naam",
    namePlaceholder: "Jan Janssens",
    email: "E-mailadres",
    emailPlaceholder: "jij@voorbeeld.be",
    message: "Je bericht",
    messagePlaceholder: "Waarmee kunnen we je helpen?",
    send: "Verstuur bericht",
    sending: "Versturen…",
    missing: "Vul je naam, e-mailadres en bericht in.",
    invalidEmail: "Dat e-mailadres lijkt niet te kloppen.",
    tooLong: "Je naam of bericht is te lang. Kort het wat in.",
    rateLimited:
      "Je stuurde net al een paar berichten. Probeer het over een paar minuten opnieuw.",
    failed:
      "Je bericht kon niet verstuurd worden. Probeer het later opnieuw, of mail ons rechtstreeks.",
    sent: "Bedankt! We laten zo snel mogelijk iets van ons horen.",
  },

  cta: {
    eyebrow: "Your pet, your pal, your Palley",
    title: "Klaar voor je eigen Palley?",
    text: "Upload je foto’s, wij doen de rest, en je beste vriend gaat voortaan overal mee.",
    photoAlt:
      "Een 3D-geprinte sleutelhanger van een Franse bulldog op een crèmekleurige achtergrond",
  },

  about: {
    eyebrow: "Over ons",
    title: "Een team van dierenliefhebbers",
    intro:
      "We zijn een studententeam uit Gent dat je favoriete foto van je huisdier omtovert tot een kleine 3D-pal voor aan je sleutels.",
    ctaLabel: "Maak je eigen Palley",
    story: {
      tag: "Ons verhaal",
      title: "Team Palleys",
      photoAlt:
        "Een golden retriever, een pluizige puppy en een rosse kat liggen samen in het gras",
      paragraphs: [
        "We zijn een groep studenten Grafische en Digitale Media aan de Arteveldehogeschool in Gent. Toen we door onze gsm’s scrolden, zagen we één ding dat we allemaal gemeen hadden: honderden foto’s van onze huisdieren.",
        "Maar een foto blijft op een scherm. Wij wilden iets dat je echt kunt vasthouden, meenemen en laten zien. Dus combineerden we wat we elke dag leren (3D-modelleren, design en een flinke dosis creativiteit) met AI en full-color resin printing. Elke stap controleren we zelf, zodat jouw huisdier ook echt herkenbaar is.",
        "Het resultaat? Een Palley: a pal for your keys. Een piepkleine, herkenbare versie van je beste vriend die overal met je mee op avontuur gaat.",
      ],
    },
    student: {
      tag: "Goed om te weten",
      title: "Een echte studentenonderneming",
      text: "Palleys is een studentenonderneming, opgericht binnen het vak Creative Business Studio van de bachelor Grafische en Digitale Media aan de Arteveldehogeschool. We runnen het als een echt bedrijf: we ontwerpen, laten printen, werken af, verkopen, verzenden en houden de boekhouding zelf bij, en leren onderweg ontzettend veel. Bedankt om ons te steunen!",
      factGhent: "Uit Gent",
      factSchool: "Arteveldehogeschool",
      factCharity: "50% naar Dierenasiel Gent",
    },
    team: {
      tag: "Het team",
      title: "De mensen achter de Palleys",
      owner: "Trots baasje van {pet}",
    },
  },

  shop: {
    eyebrow: "Geen huisdier? Geen probleem",
    title: "Ontdek onze collectie",
    intro:
      "Onze eigen modellen, 3D-geprint en met de hand afgewerkt in Gent. Geen foto nodig: kiezen, bestellen en klaar.",
    loading: "Collectie laden",
    emptyTitle: "Binnenkort vind je hier onze collectie",
    emptyText: "Ondertussen maken we graag een Palley van jouw eigen huisdier.",
    back: "Terug naar de collectie",
    productLoading: "Product laden",
    exclShipping: "excl. verzendkosten",
    delivery: "Binnen {deliveryTime} valt je bestelling in de bus.",
    returnNote:
      "Een Palley uit onze collectie kun je zonder reden herroepen tot 14 dagen nadat je hem ontvangen of opgehaald hebt.",
    add: "In winkelmandje",
    adding: "Toevoegen…",
    errors: {
      collectible_unavailable: "Dit product is net niet meer beschikbaar.",
      cart_full: "Je winkelmandje zit vol. Reken eerst af of verwijder iets.",
      rate_limited:
        "Even rustig aan: probeer het over een paar minuten opnieuw.",
      fallback: "Er ging iets mis bij het toevoegen. Probeer het nog eens.",
    },
  },

  options: {
    editions: { keychain: "Met sleutelhanger", figure: "Enkel figuurtje" },
    attachments: { clip: "Klemmetje", "key-ring": "Sleutelring" },
  },

  create: {
    heading: "Your pet, your pal, your Palley: maak je eigen Palley",
    loading: "Configurator laden",
    stepper: {
      label: "Voortgang van je bestelling",
      step: "Stap {number}: {label}, {status}",
      done: "voltooid",
      active: "huidige stap",
      upcoming: "nog niet gestart",
    },
    steps: { choose: "Kiezen", upload: "Uploaden", order: "Bevestigen" },
    panelDone: "Klaar",
    panelNext: "Volgende",
    choose: {
      title: "Kies je Palley",
      animal: "Welk huisdier heb je?",
      animalError: "Kies je soort huisdier.",
      edition: "Sleutelhanger of figuurtje?",
      attachment: "Hoe wil je hem aan je sleutels hangen?",
      size: "Ongeveer {size}: iets groter dan een 2-euromunt.",
      sizeTitle: "Zo groot is een Palley",
      keychainHint:
        "De sleutelhanger komt met een ketting en een klemmetje of sleutelring, naar keuze.",
    },
    upload: {
      title: "Upload je foto’s",
      missing: "Upload minstens één foto van je huisdier om verder te gaan.",
      infoLabel: "Goed om te weten",
      infoTitle: "Elk model wordt gecontroleerd.",
      infoText:
        "We zetten je foto’s met behulp van AI om in een 3D-model en kijken elke stap na, zodat vlekjes, kleuren en andere details er precies goed uitkomen.",
      intro:
        "Voeg tot {max} foto’s van je huisdier toe. Verschillende hoeken helpen ons om elk vlekje juist te krijgen.",
      drop: "Sleep je foto’s hierheen",
      dropActive: "Laat ze hier maar los",
      or: "of",
      browse: "Kies bestanden",
      hint: "JPG, PNG of WebP · max. {size} per foto",
      listLabel: "Je foto’s",
      example: "Voorbeeld",
      remove: "Verwijder foto {number}: {name}",
      full: "Dat is het maximum van {max} foto’s. Verwijder er een om een andere foto toe te voegen.",
      count: "{count} van {max}",
      countRest: "foto’s · je kunt er nog {remaining} toevoegen",
      add: "Nog een foto toevoegen",
      announce: "{count} van {max} foto’s toegevoegd.",
      wrongType: "{name} is geen JPG-, PNG- of WebP-foto.",
      tooBig: "{name} is {size}; foto’s mogen maximaal {max} zijn.",
      tooMany:
        "Je kunt maximaal {max} foto’s toevoegen, dus {names} is niet toegevoegd.",
      quality: {
        great: "Top, mooi scherp!",
        ok: "Ziet er goed uit.",
        small:
          "Lage resolutie: een foto met meer pixels geeft een scherper resultaat.",
        unknown: "We checken de kwaliteit voor je.",
      },
    },
    tips: {
      title: "Tips voor de perfecte foto",
      light: {
        title: "Goed licht",
        text: "Daglicht werkt het best, zonder flits.",
      },
      frame: {
        title: "Scherp en helemaal in beeld",
        text: "Van kop tot staart, op ooghoogte, en niet wazig.",
      },
      animal: {
        title: "Eén dier per foto",
        text: "Enkel het huisdier dat je als Palley wilt.",
      },
    },
    order: {
      title: "Bevestigen",
      notes: "Iets wat we moeten weten?",
      optional: "(optioneel)",
      notesPlaceholder: "Bepaalde vlekjes, iets bijzonders aan zijn uiterlijk…",
      consentIntro: "Ik bevestig dat:",
      consentPoints: [
        "deze foto’s van mij zijn, of dat ik ze mag gebruiken;",
        "Palleys ze met AI-diensten mag omzetten naar een 3D-model van mijn huisdier;",
        "ik akkoord ga met de {terms} en het {privacy}.",
      ],
      terms: "algemene voorwaarden",
      privacy: "privacybeleid",
      consentError: "Vink dit aan om je bestelling te plaatsen.",
      info: "Elke Palley wordt speciaal voor jou gemaakt en in volle kleur geprint. Binnen {deliveryTime} valt hij in je bus.",
      addedTitle: "Je Palley zit in je winkelmandje!",
      addedLine: "{animal}, {edition} · {price}",
      addedCount: " · {count} Palleys in je mandje",
      viewCart: "Bekijk winkelmandje",
      another: "Nog een Palley maken",
      uploading: "Foto’s uploaden…",
      adding: "Toevoegen…",
      add: "In winkelmandje",
    },
    summary: {
      title: "Jouw Palley",
      imageAlt: "Voorbeeld: een Palley-sleutelhanger van een golden retriever",
      example: "Een voorbeeld-Palley.",
      pet: "Huisdier",
      palley: "Palley",
      attachment: "Bevestiging",
      size: "Formaat",
      photos: "Foto’s",
      photosCount: "{count} foto’s",
      total: "Totaal",
      exclShipping: "excl. verzendkosten",
      charity:
        "Met je Palley help je ook andere dieren: 50% van onze winst gaat naar Dierenasiel Gent.",
    },
    errors: {
      photos_missing:
        "Je foto’s zijn niet goed aangekomen. Probeer het nog eens.",
      preview_not_orderable:
        "Deze upload is verlopen. Voeg je foto’s opnieuw toe.",
      preview_not_found: "Deze upload is verlopen. Voeg je foto’s opnieuw toe.",
      option_unavailable:
        "Deze keuze is even niet beschikbaar. Kies een ander dier of een andere uitvoering.",
      cart_full:
        "Je winkelmandje zit vol. Reken eerst af of verwijder een Palley.",
      rate_limited:
        "Even rustig aan: probeer het over een paar minuten opnieuw.",
      fallback: "Er ging iets mis bij het toevoegen. Probeer het nog eens.",
    },
  },

  cart: {
    title: "Winkelmandje",
    subtitle: "Bijna klaar! Kijk je Palleys na en reken veilig af.",
    loading: "Winkelmandje laden",
    loadError: "We konden je winkelmandje niet laden",
    loadErrorText:
      "Geen zorgen, je Palleys zijn niet weg. Probeer het nog eens.",
    emptyTitle: "Je winkelmandje is nog leeg",
    emptyText:
      "Upload je foto’s en wij maken van je huisdier een Palley, met de hand afgewerkt in Gent.",
    countOne: "1 Palley",
    countOther: "{count} Palleys",
    another: "+ Nog een Palley maken",
    linesLabel: "Producten in je winkelmandje",
    personalized: "Gepersonaliseerde Palley",
    palleyLine: "Palley · {animal}",
    perUnit: "{price} per stuk",
    remove: "Verwijder",
    removing: "Verwijderen…",
    removeLabel: "{title} verwijderen",
    photoAlt: "Je foto",
    quantity: { label: "Aantal {name}", less: "Eén minder", more: "Eén meer" },
    next: {
      title: "Zo gaat het verder",
      payTitle: "Veilig afrekenen",
      payText: "Je vult je adres in en betaalt veilig online.",
      workTitle: "Wij gaan aan de slag",
      workPersonalized:
        "Ons team in Gent zet je foto’s met AI om in een 3D-model, controleert elke stap en laat je Palley in volle kleur printen.",
      workCollectible:
        "Ons team in Gent maakt je bestelling klaar en pakt ze zorgvuldig in.",
      mailTitle: "In je bus",
      mailPersonalized: "Binnen {deliveryTime} valt je Palley in je bus.",
      mailCollectible: "Binnen {deliveryTime} valt je bestelling in je bus.",
    },
    summary: {
      title: "Overzicht",
      subtotal: "Subtotaal ({count})",
      shipping: "Verzending",
      shippingLater: "Wordt berekend bij het afrekenen",
      total: "Totaal",
      exclShipping: "excl. verzendkosten",
      wait: "Even geduld…",
      secure: "Veilig online betalen",
      charity:
        "Met je Palley help je ook andere dieren: 50% van onze winst gaat naar Dierenasiel Gent.",
      collectibleReturn:
        "Een Palley uit onze collectie kun je zonder reden herroepen tot 14 dagen nadat je hem ontvangen of opgehaald hebt.",
    },
    mini: {
      button: "Winkelmandje",
      buttonCount: "Winkelmandje, {count}",
      label: "Overzicht van je winkelmandje",
      title: "Je winkelmandje",
      emptyTitle: "Nog geen Palley in je mandje",
      emptyText: "Upload je foto’s en wij doen de rest.",
      subtotal: "Subtotaal",
      view: "Bekijk winkelmandje",
      failed: "Er ging iets mis met je winkelmandje. Probeer het nog eens.",
    },
  },

  checkout: {
    title: "Afrekenen",
    subtitle:
      "Nog één stap: vul je gegevens in en betaal veilig met Bancontact.",
    emptyTitle: "Je winkelmandje is leeg",
    emptyText: "Maak eerst je Palley, dan kun je hier afrekenen.",
    closedPaused: "Bestellen is even gepauzeerd",
    closedPayments: "Betalen is tijdelijk niet mogelijk",
    closedText: "Probeer het later opnieuw. Je winkelmandje blijft bewaard.",
    contact: "Contactgegevens",
    email: "E-mailadres",
    phone: "Telefoon (optioneel, voor de vervoerder)",
    address: "Leveradres",
    firstName: "Voornaam",
    lastName: "Achternaam",
    street: "Straat",
    houseNumber: "Nummer",
    postalCode: "Postcode",
    city: "Gemeente",
    country: "Land",
    belgium: "België",
    belgiumOnly: "(we leveren voorlopig enkel in België)",
    delivery: "Levering",
    friendsNote:
      "Ken je ons persoonlijk? Stuur ons een DM op {instagram}, dan krijg je een code om je Palley bij ons af te halen in plaats van hem te laten leveren.",
    summary: "Je bestelling",
    products: "Producten",
    discount: "Kortingscode",
    discountOther: "Andere code",
    discountAsk: "Heb je een code?",
    discountApply: "Toepassen",
    subtotal: "Subtotaal",
    discountLine: "Korting ({code}, {label})",
    discountApplied: "Code {code} toegepast",
    attachmentLegend: "Hoe wil je hem aan je sleutels hangen?",
    discountRemove: "Weghalen",
    shipping: "Levering",
    shippingChoose: "Kies een optie",
    total: "Totaal",
    noVat:
      "Palleys is vrijgesteld van btw, dus je betaalt geen btw. Levering binnen {deliveryTime} na je bestelling.",
    customTitle: "Op maat gemaakt.",
    customText:
      "Je Palley wordt gemaakt op basis van jouw foto’s, dus het herroepingsrecht geldt niet. De wettelijke garantie van 2 jaar blijft natuurlijk gelden.",
    customAi:
      "We zetten je foto’s met behulp van AI om in een 3D-model en controleren elke stap.",
    collectibleTitle: "Collectie.",
    collectibleText:
      "Een Palley uit onze collectie kun je zonder reden herroepen tot 14 dagen nadat je hem ontvangen of opgehaald hebt.",
    accept: "Ik ga akkoord met de {terms}.",
    acceptCustom:
      "Ik ga akkoord met de {terms} en weet dat ik een op maat gemaakte Palley niet kan herroepen.",
    terms: "algemene voorwaarden",
    marketing:
      "Hou me op de hoogte van nieuwe Palleys (optioneel, uitschrijven kan altijd).",
    // LEGAL-REVIEW: consent for art. 5.4 of the terms; withdrawing it is by mail.
    photoMarketing:
      "Palleys mag de foto van mijn huisdier en mijn Palley gebruiken op de website en sociale media (optioneel, intrekken kan altijd met een mailtje).",
    submit: "Bestellen met betalingsverplichting",
    submitting: "Naar betalen…",
    payNote:
      "Je betaalt veilig met {methods}: scan de QR-code of betaal in je bankapp. Lees ook ons {privacy}.",
    methodsJoin: " of ",
    privacy: "privacybeleid",
    fieldErrors: {
      email: "Vul een geldig e-mailadres in.",
      firstName: "Vul je voornaam in.",
      lastName: "Vul je achternaam in.",
      phone: "Dat telefoonnummer lijkt niet te kloppen.",
      street: "Vul je straat in.",
      houseNumber: "Vul je huisnummer in.",
      postalCode: "Vul een geldige postcode in.",
      city: "Vul je gemeente in.",
      country: "Kies een land.",
      deliveryOptionId: "Kies hoe je je bestelling wil ontvangen.",
      acceptTerms: "Vink dit aan om je bestelling te plaatsen.",
    },
    submitErrors: {
      checkout_closed: "Bestellen is op dit moment niet mogelijk.",
      payments_unavailable:
        "Betalen is tijdelijk niet mogelijk. Probeer het later opnieuw.",
      cart_empty: "Je winkelmandje is leeg.",
      preview_not_orderable:
        "Een van je uploads is verlopen. Ga terug naar je winkelmandje en voeg je foto’s opnieuw toe.",
      delivery_option_invalid:
        "Deze leveroptie is niet meer beschikbaar. Kies opnieuw.",
      address_required: "Vul je volledige leveradres in.",
      discount_invalid:
        "Je kortingscode is niet (meer) geldig. We haalden hem weg: controleer je totaal en bestel opnieuw.",
      discount_min_subtotal:
        "Je bestelling komt niet meer aan het minimumbedrag van je kortingscode. We haalden hem weg: controleer je totaal en bestel opnieuw.",
      total_changed:
        "De prijs is intussen gewijzigd. Controleer je nieuwe totaal en bestel opnieuw.",
      payment_failed:
        "We konden de betaling niet starten. Probeer het nog eens.",
      rate_limited:
        "Te veel pogingen. Wacht een paar minuten en probeer opnieuw.",
      invalid_input: "Controleer de gemarkeerde velden.",
    },
    discountInvalid: "Deze kortingscode is niet geldig.",
    discountMinimum: "Deze code geldt vanaf {amount} aan producten.",
  },

  shipping: {
    home: "Thuislevering",
    servicePoint: "Afhaalpunt",
    pickup: "Zelf ophalen",
    handover: "Vrienden en familie",
    loading: "Leveropties laden…",
    error:
      "We konden de leveropties niet laden. Controleer je postcode of probeer het opnieuw.",
    none: "We leveren voorlopig niet naar dit adres.",
    free: "Gratis",
    // By option id. An option that isn't listed (a carrier's own) shows the label the server sends.
    options: {
      "be-postnl-home": {
        label: "Thuislevering met PostNL",
        eta: "1–2 werkdagen na verzending",
      },
      "be-pickup-kantienberg": {
        label: "Ophalen op campus Kantienberg",
        eta: "We laten je weten wanneer je bestelling klaarligt.",
      },
      "friends-family": {
        label: "Persoonlijk overhandigen",
        eta: "We spreken samen af wanneer we hem geven.",
      },
    } as Record<string, { label: string; eta: string }>,
  },

  orderReturn: {
    errorTitle: "Deze link werkt niet",
    errorText:
      "We vinden deze bestelling niet. Kreeg je een bevestigingsmail? Dan is alles in orde. Twijfel je, neem dan contact met ons op.",
    home: "Naar de homepage",
    paidTitle: "Bedankt voor je bestelling!",
    paidText:
      "Je betaling is gelukt. Bestelnummer {number}. Je krijgt een bevestiging per mail, en ons team in Gent gaat aan de slag met je Palley.",
    backToShop: "Terug naar de winkel",
    closedTitle: "De betaling is niet gelukt",
    closedText:
      "Er is niets aangerekend. Je Palleys staan nog in je winkelmandje, dus je kunt het meteen opnieuw proberen.",
    payAgain: "Opnieuw afrekenen",
    toCart: "Naar winkelmandje",
    timeoutTitle: "Je betaling wordt nog verwerkt",
    timeoutText:
      "Dit duurt langer dan normaal. Zodra je bank de betaling bevestigt, krijg je een mail. Je hoeft niets opnieuw te doen.",
    timeoutTextNumber:
      "Dit duurt langer dan normaal. Zodra je bank de betaling bevestigt, krijg je een mail voor bestelling {number}. Je hoeft niets opnieuw te doen.",
    checkAgain: "Opnieuw controleren",
    waitTitle: "Je betaling wordt verwerkt…",
    waitText: "Even geduld, dit duurt meestal maar een paar seconden.",
    summaryTitle: "Overzicht",
  },

  // LEGAL-REVIEW: everything on /retour, from the return policy of 9 November 2026: the periods, the exception for a
  // Palley op maat, what the guarantee covers, and the online withdrawal function (Directive (EU) 2023/2673).
  returns: {
    eyebrow: "Retour",
    title: "Annuleren, herroepen of een probleem melden",
    intro:
      "Vul je bestelnummer en e-mailadres in. We mailen je een link naar je bestelling, waar je per Palley ziet wat kan.",
    lookup: {
      title: "Je bestelling opzoeken",
      orderNumber: "Bestelnummer",
      orderNumberHint: "Staat in je bevestigingsmail, bijvoorbeeld PLY1042.",
      email: "E-mailadres",
      emailHint: "Het adres waarmee je bestelde.",
      submit: "Stuur me een link",
      sent: "Klopt dit, dan sturen we je binnen enkele minuten een link.",
      sentHint:
        "De link werkt één keer en 30 minuten lang. Niets ontvangen? Kijk in je spam of mail ons op {email}.",
      again: "Opnieuw opzoeken",
      errors: {
        orderNumber:
          "Vul je bestelnummer in zoals in je bevestigingsmail, bijvoorbeeld PLY1042.",
        email: "Dat e-mailadres lijkt niet te kloppen.",
        rateLimited:
          "Even te veel pogingen. Probeer het over een paar minuten opnieuw.",
      },
    },
    policy: {
      title: "Kort samengevat",
      items: [
        "Palley op maat: je annuleert kosteloos zolang je bestelling nog niet in productie is. Daarna geldt het herroepingsrecht niet, want we maken hem speciaal voor jou (art. VI.53, 3° WER).",
        "Palley uit onze collectie: je herroept zonder reden tot 14 dagen nadat je hem ontvangen of opgehaald hebt. Dat kan ook al vóór je hem hebt.",
        "Beschadigd, defect of niet wat je bestelde: meld het binnen 2 maanden nadat je het zag. We printen gratis opnieuw of betalen terug.",
      ],
      mail: "Liever mailen? Dat kan op {email}, met je bestelnummer.",
      full: "Alles staat in ons {policy}.",
    },
    session: {
      opening: "Je bestelling wordt geopend…",
      expiredTitle: "Deze link werkt niet meer",
      expiredText:
        "Een link werkt één keer en 30 minuten lang. Vraag hieronder een nieuwe aan.",
    },
    overview: {
      title: "Bestelling {number}",
      hello:
        "Hoi {name}, dit zit in je bestelling. Per Palley zie je wat je kunt doen.",
      received: "Ontvangen op {date}",
      receivedEstimated: "Ontvangen rond {date}",
      quantity: "Aantal: {quantity}",
      kinds: {
        personalized: "Palley op maat",
        collectible: "Palley uit onze collectie",
      },
      statuses: {
        paid: "Betaald, nog niet in productie",
        in_production: "In productie",
        sent: "Verzonden",
        picked_up: "Opgehaald of overhandigd",
        refunded: "Terugbetaald",
        cancelled: "Geannuleerd",
        request_open: "Aanvraag loopt",
      },
      canCancel: "Kosteloos annuleren",
      canWithdraw: "Herroepen",
      canWithdrawUntil: "Herroepen tot en met {date}",
      canWarranty: "Probleem melden",
      notices: {
        custom_no_withdrawal:
          "Deze Palley op maat is al in productie. We maken hem speciaal voor jou, daarom geldt het herroepingsrecht niet (art. VI.53, 3° WER). Is er iets mis mee, dan kun je een probleem melden zodra je hem hebt.",
        withdrawal_expired:
          "De termijn van 14 dagen om te herroepen is voorbij.",
        warranty_expired: "De wettelijke garantie van 2 jaar is voorbij.",
        refunded: "Deze bestelling is terugbetaald.",
        request_open: "Voor deze Palley loopt al een aanvraag.",
      },
      actionsTitle: "Wat wil je doen?",
      actions: {
        CANCELLATION:
          "Kosteloos annuleren, zolang je Palley op maat nog niet in productie is. Je krijgt het volledige bedrag terug.",
        WITHDRAWAL:
          "Palleys uit onze collectie: 14 dagen bedenktijd, zonder reden.",
        WARRANTY:
          "Beschadigd, defect of niet wat je bestelde? We printen gratis opnieuw of betalen terug.",
      },
      nothing:
        "Voor deze bestelling kun je online niets meer aanvragen. Vragen? Mail ons op {email}.",
      requestsTitle: "Je aanvragen",
      requestStatuses: {
        SUBMITTED: "Ontvangen",
        APPROVED: "Goedgekeurd",
        REJECTED: "Afgewezen",
        COMPLETED: "Afgerond",
      },
      rejectedBecause: "Reden: {reason}",
      submittedOn: "Verstuurd op {date}",
    },
    types: {
      CANCELLATION: "Annulering",
      WITHDRAWAL: "Herroeping",
      WARRANTY: "Garantieclaim",
    },
    typesLower: {
      CANCELLATION: "annulering",
      WITHDRAWAL: "herroeping",
      WARRANTY: "garantieclaim",
    },
    start: {
      CANCELLATION: "Annuleren",
      WITHDRAWAL: "Herroepen",
      WARRANTY: "Probleem melden",
    },
    form: {
      back: "Terug naar je bestelling",
      itemsLegend: "Welke Palleys?",
      itemsHint: "Vink de Palleys aan en kies hoeveel.",
      quantityLabel: "Aantal voor {title}",
      reasonLabel: "Reden (niet verplicht)",
      reasonHint: "Je hoeft geen reden te geven.",
      descriptionLabel: "Wat is er mis?",
      descriptionHint: "Beschrijf kort het probleem en wanneer je het zag.",
      photosLabel: "Foto’s",
      photosHint:
        "{min} tot {max} foto’s, JPG, PNG of WebP, maximaal {size} per foto. Toon het probleem zo duidelijk mogelijk.",
      addPhotos: "Foto’s kiezen",
      removePhoto: "Foto {index} verwijderen",
      resolutionLegend: "Wat wil je?",
      resolutions: {
        REPRINT: "Gratis opnieuw printen",
        REFUND: "Terugbetalen",
      },
      notCoveredTitle: "Wat valt niet onder de garantie?",
      notCovered: [
        "Normale slijtage door gebruik, bijvoorbeeld aan je sleutelbos.",
        "Schade door een val of verkeerd gebruik na ontvangst.",
        "Kenmerken die we vooraf op de site beschreven hebben, zoals vervorming boven 50 °C (bijvoorbeeld in een warme auto of in de volle zon).",
        "Kenmerken die eigen zijn aan het 3D-printen: zichtbare printlagen, lichte kleurverschillen.",
        "Leveringsproblemen door een fout adres dat je zelf opgaf.",
      ],
      likenessNote:
        "Een Palley op maat is een 3D-interpretatie van je huisdier, gemaakt met behulp van AI. Op de gelijkenis geven we geen extra tevredenheidsgarantie.",
      continue: "Verder naar het overzicht",
      errors: {
        items: "Kies minstens één Palley.",
        description: "Beschrijf het probleem in minstens {min} tekens.",
        photos: "Voeg {min} tot {max} foto’s toe.",
        photoType:
          "Dit bestand kunnen we niet gebruiken. Kies een JPG, PNG of WebP.",
        photoSize: "Een foto is groter dan {size}.",
        resolution: "Kies wat je wilt.",
        upload: "Je foto’s konden niet geüpload worden. Probeer het opnieuw.",
        session: "Je sessie is verlopen. Vraag een nieuwe link aan.",
        notAllowed:
          "Dit kan niet meer voor (een van) deze Palleys. Bekijk je bestelling opnieuw.",
      },
    },
    summary: {
      title: "Controleer je {type}",
      items: "Palleys",
      reason: "Reden",
      noReason: "Geen reden opgegeven",
      description: "Probleem",
      photos: "{count} foto’s",
      resolution: "Je kiest",
      edit: "Aanpassen",
      confirm: {
        CANCELLATION: "Annulering bevestigen",
        WITHDRAWAL: "Herroeping bevestigen",
        WARRANTY: "Melding versturen",
      },
      cancellation:
        "We maken deze Palley op maat niet en betalen je het volledige bedrag terug binnen 14 dagen, op de rekening waarmee je met Bancontact betaalde.",
      withdrawalBefore:
        "Je Palleys zijn nog niet verstuurd of opgehaald. We betalen je meteen terug, binnen 14 dagen, en je hoeft niets terug te sturen.",
      withdrawalAfter:
        "Stuur de Palleys ongebruikt en in goede staat terug, ten laatste 14 dagen na vandaag, naar {address}. Je betaalt zelf het terugsturen; bewaar het verzendbewijs. We betalen je terug binnen 14 dagen, inclusief de standaardverzendkosten van je bestelling, maar mogen wachten tot we de Palleys of je verzendbewijs hebben.",
      warranty:
        "We bekijken je melding en laten je zo snel mogelijk weten wat we doen. Meestal hoef je niets terug te sturen, en je betaalt nooit verzend- of retourkosten.",
      returnAddressMissing: "het adres dat we je mailen",
    },
    done: {
      title: "{type} ontvangen",
      text: "We ontvingen je {type} op {date}. Je krijgt deze bevestiging ook per mail.",
      returnBy: "Stuur je Palleys terug ten laatste op {date}.",
      back: "Terug naar je bestelling",
    },
  },

  // LEGAL-REVIEW: wording of the withdrawal exception, the right of withdrawal, the legal guarantee and the VAT exemption.
  email: {
    subject: "Bedankt voor je bestelling {number}",
    title: "Bedankt, {name}!",
    intro:
      "We hebben je betaling ontvangen. Ons team in Gent gaat aan de slag met je Palley.",
    orderNumber: "Bestelnummer",
    discount: "Korting",
    shipping: "Levering",
    total: "Totaal",
    address: "Leveradres",
    deliveryHandover:
      "We laten je weten wanneer je bestelling klaar is, dan overhandigen we ze persoonlijk.",
    deliveryPickup:
      "Je haalt je bestelling op op campus Kantienberg. We laten je weten wanneer ze klaarligt.",
    deliveryCollectible: "Binnen {deliveryTime} valt je bestelling in je bus.",
    deliveryPersonalized:
      "Elke Palley wordt speciaal voor jou gemaakt en in volle kleur geprint. Binnen {deliveryTime} valt hij in je bus.",
    noWithdrawal:
      "Je Palley wordt op maat gemaakt op basis van jouw foto’s. Daarom geldt het herroepingsrecht niet (art. VI.53, 3° WER).",
    withdrawal:
      "Een Palley uit onze collectie is niet op maat gemaakt: die mag je binnen 14 dagen na ontvangst zonder reden herroepen en terugsturen, via palleys.be/retour of door ons te mailen met je bestelnummer.",
    guarantee:
      "De wettelijke garantie van 2 jaar blijft gelden: is er iets mis met je Palley, laat het ons weten.",
    vatExempt:
      "Palleys is een studentenonderneming binnen het Step Up-programma van Unizo en is vrijgesteld van btw: er wordt geen btw aangerekend.",
    termsAccepted:
      "Je ging akkoord met onze algemene voorwaarden (versie {version})",
    termsApply: "Op je bestelling gelden onze algemene voorwaarden",
    enterprise: "Ondernemingsnummer",
    itemTitle: "Palley {animal}",
  },

  // DRAFT: to be reviewed. Sent from the backoffice (Productie) for orders picked up on campus.
  pickupEmail: {
    location: "campus Kantienberg van Arteveldehogeschool in Gent",
    readySubject: "Je bestelling {number} ligt klaar om af te halen",
    readyTitle: "Je Palley is klaar, {name}!",
    readyText:
      "Je bestelling {number} ligt klaar op {location}. We zijn niet elke dag op de campus: we mailen je wanneer je kunt langskomen. Noem je bestelnummer als je hem komt halen.",
    updateSubject: "Afhalen van je bestelling {number}",
    updateTitle: "Hoi {name},",
    updateIntro:
      "Een update over het afhalen van je bestelling {number} op {location}:",
    footer: "Vragen of past het niet? Antwoord gewoon op deze mail.",
  },

  // LEGAL-REVIEW: the link mail, the acknowledgement of receipt (durable medium) and the decision mails of /retour.
  returnEmail: {
    linkSubject: "Je link voor bestelling {number}",
    linkTitle: "Hoi {name},",
    linkText:
      "Via deze link bekijk je bestelling {number}. Je kunt er annuleren, herroepen of een probleem melden.",
    linkButton: "Open je bestelling",
    linkExpiry:
      "De link werkt één keer en 30 minuten lang. Heb je dit niet zelf aangevraagd? Dan mag je deze mail negeren.",
    receiptSubject: "Ontvangstbevestiging: {type} voor bestelling {number}",
    receiptTitle: "We hebben je {type} ontvangen",
    receiptText:
      "Hoi {name}, op {date} ontvingen we je {type} voor bestelling {number}. Dit stuurde je ons:",
    approvedSubject: "Je {type} voor bestelling {number} is goedgekeurd",
    approvedTitle: "Goed nieuws, {name}",
    approved: {
      cancellation:
        "We maken je Palley op maat niet en betalen je het volledige bedrag terug binnen 14 dagen, op de rekening waarmee je met Bancontact betaalde.",
      withdrawalBefore:
        "We betalen je het volledige bedrag terug binnen 14 dagen, op de rekening waarmee je met Bancontact betaalde.",
      withdrawalAfter:
        "Stuur de Palleys terug naar {address}, als je dat nog niet deed. We betalen je terug zodra we ze hebben of je ons het verzendbewijs toont, en ten laatste 14 dagen na je herroeping.",
      reprint:
        "We printen je Palley gratis opnieuw en laten je weten wanneer hij vertrekt.",
      refund:
        "We betalen je het volledige bedrag terug zo snel mogelijk, en ten laatste binnen 14 dagen, op de rekening waarmee je met Bancontact betaalde.",
    },
    rejectedSubject: "Over je {type} voor bestelling {number}",
    rejectedTitle: "Hoi {name},",
    rejectedText:
      "We kunnen je {type} voor bestelling {number} helaas niet goedkeuren. De reden:",
    rejectedFooter:
      "Ben je het hier niet mee eens? Antwoord op deze mail. Komen we er samen niet uit, dan kun je terecht bij de Consumentenombudsdienst (consumentenombudsdienst.be). Deze regels beperken je wettelijke rechten niet.",
    footer: "Vragen? Antwoord gewoon op deze mail.",
  },

  // LEGAL-REVIEW: "Je krijgt een mail zodra je bestelling in productie gaat" (return policy). Sent once per order, when
  // the team approves the first pose of a Palley op maat; from then on it can't be cancelled free of charge.
  productionEmail: {
    subject: "Je bestelling {number} is in productie",
    title: "Je Palley gaat in productie, {name}!",
    text: "We hebben de pose van je huisdier goedgekeurd. Je Palley op maat uit bestelling {number} gaat nu in productie: we maken er een 3D-model van, laten hem printen en werken hem met de hand af in Gent.",
    noCancel:
      "Omdat we hem nu speciaal voor jou maken, kun je je Palley op maat niet meer kosteloos annuleren. Is er straks iets mis mee, dan lossen we het op via onze garantie.",
    footer: "Vragen? Antwoord gewoon op deze mail.",
  },

  legal: {
    eyebrow: "Juridisch",
    // LEGAL-REVIEW: privacy policy of 9 November 2026. Changed from the given text: the database and the website run on a
    // server in the EU (not Aiven), Trustpilot is left out until the checkout asks for it (like the terms' old art. 12), and
    // the carrier is PostNL (not bpost).
    // The retention periods in art. 6 are applied by the cron (core/modules/retention, data/retention.ts).
    privacy: {
      title: "Privacybeleid",
      intro: "Laatst bijgewerkt: 9 november 2026.",
      sections: [
        {
          title: "1. Wie zijn wij?",
          blocks: [
            "Palleys is een studentenonderneming binnen het Step Up-programma van Unizo. Wij zijn verantwoordelijk voor de verwerking van je persoonsgegevens.",
            "{companyAddress}. E-mail: {email}.",
          ],
        },
        {
          title: "2. Welke gegevens verwerken we en waarom?",
          blocks: [
            {
              head: ["Gegevens", "Doel", "Rechtsgrond"],
              rows: [
                [
                  "Naam, e-mailadres, bestelinformatie (gekozen dier, uitvoering, aantal)",
                  "Je bestelling uitvoeren, klantenservice, garantie",
                  "Uitvoering van de overeenkomst",
                ],
                [
                  "Leveringsadres (alleen bij levering, niet bij ophalen)",
                  "Je bestelling leveren",
                  "Uitvoering van de overeenkomst",
                ],
                [
                  "Telefoonnummer (optioneel)",
                  "Contact en leveringsmeldingen",
                  "Uitvoering van de overeenkomst",
                ],
                [
                  "1 tot 4 foto’s van je huisdier",
                  "Je Palley op maat maken",
                  "Uitvoering van de overeenkomst",
                ],
                [
                  "Printklaar 3D-model van je Palley",
                  "Je Palley binnen de garantie opnieuw kunnen printen",
                  "Uitvoering van de overeenkomst",
                ],
                [
                  "Betaalstatus",
                  "Je betaling afhandelen. Je betaalt met Bancontact. Je kaart- of rekeninggegevens zien en bewaren wij niet: die blijven bij Bancontact en je bank.",
                  "Uitvoering van de overeenkomst",
                ],
                [
                  "Administratieve gegevens (bestelling, betaling)",
                  "Boekhouding en wettelijke verplichtingen",
                  "Wettelijke verplichting",
                ],
                [
                  "Berichten via het contactformulier of e-mail",
                  "Je vraag beantwoorden",
                  "Gerechtvaardigd belang",
                ],
                [
                  "Technische gegevens (serverlogs, versleutelde code van je IP-adres)",
                  "Beveiliging, misbruik voorkomen, foutopsporing",
                  "Gerechtvaardigd belang",
                ],
                [
                  "E-mailadres voor nieuws over nieuwe Palleys (optioneel)",
                  "Nieuwsbrief",
                  "Je toestemming",
                ],
                [
                  "Je foto en Palley voor marketing (optioneel)",
                  "Communicatie op de website en sociale media",
                  "Je toestemming",
                ],
                [
                  "Noodzakelijke cookies (winkelmandje, taal)",
                  "De webshop laten werken",
                  "Gerechtvaardigd belang (strikt noodzakelijk, geen toestemming nodig)",
                ],
              ],
            },
            "We gebruiken geen marketingcookies.",
          ],
        },
        {
          title: "3. Foto’s en AI",
          blocks: [
            "Voor een Palley op maat verwerken we je foto’s pas nadat je besteld en betaald hebt. Dat doen we met betaalde AI-diensten van derden: Google (Gemini) maakt er een afbeelding in de juiste pose van, en Meshy maakt daar een 3D-model van. Ons team controleert elke stap. Upload alleen foto’s van je huisdier, zonder personen of kinderen.",
          ],
        },
        {
          title: "4. Met wie delen we je gegevens?",
          blocks: [
            "We delen gegevens alleen met dienstverleners die we nodig hebben, op basis van een verwerkersovereenkomst:",
            [
              "Bancontact Pro / KBC (betalingen)",
              "Google (AI-verwerking van je foto’s), Meshy (3D-model)",
              "Cloudflare (opslag van foto’s en bestanden), onze hostingprovider (een server in de EU, voor de website en de database), Resend (e-mails)",
              "PostNL (levering: naam, adres, e-mail en telefoon, alleen als je voor levering kiest)",
            ],
            "Onze printpartner krijgt alleen het 3D-model met een bestelcode, geen naam of adres.",
            "We verkopen je gegevens niet.",
          ],
        },
        {
          title: "5. Doorgifte buiten de EU",
          blocks: [
            "Sommige dienstverleners zitten (deels) buiten de EU, bijvoorbeeld in de Verenigde Staten. In dat geval zorgen we voor passende waarborgen, zoals standaardcontractbepalingen of een erkend adequaatheidsbesluit (zoals het EU-VS Data Privacy Framework).",
          ],
        },
        {
          title: "6. Hoe lang bewaren we je gegevens?",
          blocks: [
            [
              "Uploads van niet-betaalde bestellingen: 7 dagen, daarna automatisch verwijderd.",
              "Foto’s van je huisdier en de AI-afbeeldingen van betaalde bestellingen: 6 weken na levering of ophaling, daarna automatisch verwijderd.",
              "Het printklare 3D-model van je Palley: 2 jaar na levering, zodat we je Palley binnen de garantie exact opnieuw kunnen printen. Daarna wordt het automatisch verwijderd.",
              "Foto’s waarvoor je toestemming gaf voor marketing: tot je die toestemming intrekt.",
              "Je e-mailadres voor de nieuwsbrief: tot je je uitschrijft.",
              "Order- en betaalgegevens: 7 jaar, omwille van boekhoudkundige verplichtingen.",
              "Contactgegevens bij klantenservice: tot 2 jaar na het laatste contact.",
            ],
            "Wil je je foto’s of je 3D-model eerder laten verwijderen? Mail ons. Zonder 3D-model kunnen we je Palley later niet meer exact opnieuw printen.",
          ],
        },
        {
          title: "7. Beveiliging",
          blocks: [
            "Foto’s en modellen worden opgeslagen in een afgeschermde omgeving. Ze zijn alleen bereikbaar via tijdelijke, beveiligde links en alleen toegankelijk voor bevoegde teamleden. We bewaren je IP-adres niet als leesbare tekst. Geen enkel systeem is helemaal veilig, maar we nemen redelijke technische en organisatorische maatregelen.",
          ],
        },
        {
          title: "8. Je rechten",
          blocks: [
            "Je hebt recht op inzage, correctie, verwijdering, beperking van de verwerking, overdraagbaarheid en bezwaar. Heb je toestemming gegeven, dan kun je die altijd intrekken. Dat heeft geen gevolgen voor de verwerking tot dan. Mail ons op {email}. We reageren binnen één maand.",
          ],
        },
        {
          title: "9. Klachten",
          blocks: [
            "Ben je niet tevreden, mail ons dan eerst. Je kunt ook klacht indienen bij de Gegevensbeschermingsautoriteit, Drukpersstraat 35, 1000 Brussel, contact@apd-gba.be, www.gegevensbeschermingsautoriteit.be.",
          ],
        },
        {
          title: "10. Minderjarigen",
          blocks: [
            "Onze webshop is bedoeld voor personen van 18 jaar en ouder. We verzamelen niet bewust gegevens van minderjarigen.",
          ],
        },
        {
          title: "11. Wijzigingen",
          blocks: [
            "We kunnen dit beleid aanpassen. De laatste versie staat altijd op onze website, met de datum bovenaan.",
          ],
        },
      ],
    },
    // LEGAL-REVIEW: terms of 9 November 2026. Art. 5.4 goes with the separate, unticked box in the checkout
    // (Order.photoMarketingConsent). Left out until the checkout asks for it: the old art. 12 (Trustpilot invitation); the
    // articles after it moved up one. Keep every published version reachable; Order.termsVersion refers to
    // TERMS_VERSION.
    terms: {
      title: "Algemene voorwaarden",
      intro: "Versie {version}, laatst bijgewerkt op 9 november 2026.",
      company: "{name}, {address}. E-mail: {email}.",
      // Only when the company settings have one.
      companyEnterprise:
        "{name}, {address}. Ondernemingsnummer {enterprise}. E-mail: {email}.",
      sections: [
        {
          title: "Artikel 1 – Wie zijn wij en wanneer gelden deze voorwaarden",
          blocks: [
            "1.1 Deze voorwaarden gelden voor elke bestelling in onze webshop door een consument, dat is een natuurlijke persoon die niet handelt voor beroepsdoeleinden. We verkopen en leveren alleen in België.",
            "1.2 Palleys is een studentenonderneming binnen het Step Up-programma van Unizo. {company}",
            "1.3 Om te bestellen moet je minstens 18 jaar zijn.",
            "1.4 De voorwaarden zijn opgesteld in het Nederlands. Bij verschillen met een vertaling geldt de Nederlandse tekst.",
          ],
        },
        {
          title: "Artikel 2 – Onze producten",
          blocks: [
            "2.1 We verkopen twee soorten producten:",
            [
              "Palley op maat: een 3D-geprint figuurtje in full-color resin van jouw huisdier, gemaakt op basis van 1 tot 4 foto’s die jij uploadt. Dit product is gepersonaliseerd.",
              "Palley uit onze collectie: een 3D-geprint figuurtje van een dier uit onze collectie. Dit product is niet gepersonaliseerd.",
            ],
            "2.2 Een Palley op maat bestel je met sleutelhanger of als enkel figuurtje. Een Palley met sleutelhanger, en elke Palley uit onze collectie, krijgt een ketting met een klemmetje of een sleutelring, naar keuze. Die keuzes hebben geen invloed op de prijs.",
            "2.3 De afmetingen en kenmerken vind je bij het product. Zichtbare printlaagjes en lichte kleurverschillen tussen je foto, je scherm en de print zijn eigen aan 3D-printen.",
            "2.4 Voor een Palley op maat maken we met behulp van AI een 3D-model op basis van jouw foto’s. Ons team controleert de foto’s en het resultaat voor het printen. Je krijgt vooraf geen voorbeeld te zien. Een Palley is een interpretatie van je huisdier en geen exact beeld.",
          ],
        },
        {
          title: "Artikel 3 – Prijzen en kortingscodes",
          blocks: [
            "3.1 Alle prijzen staan in euro. Palleys is als studentenonderneming binnen het Step Up-programma van Unizo vrijgesteld van btw: je betaalt geen btw. Verzendkosten zie je voor je betaalt. Er zijn geen verborgen kosten.",
            "3.2 De prijs die geldt, is de prijs op het moment van bestellen.",
            "3.3 Een kortingscode gebruik je in de checkout, onder de voorwaarden die bij de code horen (bijvoorbeeld geldigheidsduur of aantal keer bruikbaar). Je kunt een kortingscode niet inruilen voor geld.",
          ],
        },
        {
          title: "Artikel 4 – Bestellen en totstandkoming van de overeenkomst",
          blocks: [
            "4.1 Je bestelt in deze stappen: je kiest een product. Voor een Palley op maat kies je je huisdier en upload je 1 tot 4 foto’s. Daarna controleer je je winkelmandje, vul je je gegevens in, kies je levering of ophalen, aanvaard je deze voorwaarden en betaal je.",
            "4.2 Met de knop “Bestellen met betalingsverplichting” plaats je je bestelling. De overeenkomst komt tot stand zodra je betaling bevestigd is. Je krijgt dan een bevestigingsmail met een overzicht van je bestelling en een link naar deze voorwaarden. Betaal je niet, dan vervalt je bestelling.",
            "4.3 We kunnen een bestelling weigeren om een geldige reden, bijvoorbeeld een leveringsprobleem. Weigeren we een bestelling, dan betalen we je volledig terug.",
          ],
        },
        {
          title: "Artikel 5 – Foto’s (Palley op maat)",
          blocks: [
            "5.1 Je bent eigenaar van de foto’s of je hebt het recht om ze te gebruiken. Gebruik geen foto’s met personen, kinderen, beschermde personages, auteursrechtelijk beschermd werk van anderen of onwettige of kwetsende inhoud.",
            "5.2 Goede foto’s (scherp, goed belicht, het hele dier zichtbaar) leiden tot een beter resultaat. Lukt het met je foto’s niet om een goede Palley te maken, dan vragen we je om nieuwe foto’s. Lukt het ook daarmee niet, dan betalen we je het volledige bedrag terug, inclusief de verzendkosten.",
            "5.3 Je geeft ons een beperkte licentie om je foto’s te gebruiken om je Palley te maken. Dat omvat de verwerking door onze technische dienstverleners, waaronder AI-diensten. Meer details staan in ons privacybeleid. Je behoudt alle rechten op je foto’s.",
            "5.4 Met aparte, vrijwillige toestemming mogen we je foto en je Palley gebruiken in onze communicatie (website, sociale media). Die toestemming kun je altijd intrekken door te mailen naar {email}. Zonder toestemming gebruiken we ze nooit voor marketing.",
          ],
        },
        {
          title: "Artikel 6 – Betaling",
          blocks: [
            "6.1 Je betaalt bij je bestelling met Bancontact, via Bancontact Pro (KBC): je scant de QR-code of betaalt in je bank- of Bancontact-app. Je kaart- of rekeninggegevens komen niet bij ons terecht.",
          ],
        },
        {
          title: "Artikel 7 – Levering en ophalen",
          blocks: [
            "7.1 We leveren alleen in België, thuis met bpost/postNL. Voor familie, vrienden en kennissen is een kortingscode voorzien voor gratis verzending aangezien we de Palley persoonlijk overhandigen. Details en tarieven vind je bij bestelling.",
            "7.2 Een Palley op maat leveren we gemiddeld binnen 2 tot 3 weken na je bestelling. Een Palley uit onze collectie die op voorraad is, krijg je binnen 1 tot 2 weken. Is hij niet op voorraad, dan duurt het ook 2 tot 3 weken. We leveren uiterlijk 30 dagen na je bestelling, tenzij we iets anders met je afspreken.",
            "7.3 Het risico voor verlies of beschadiging ligt bij ons tot je het pakje ontvangen of je bestelling opgehaald hebt.",
            "7.4 Lukt levering niet binnen 30 dagen, dan kun je de overeenkomst ontbinden en betalen we je terug.",
          ],
        },
        {
          title: "Artikel 8 – Herroepingsrecht en annuleren",
          blocks: [
            "8.1 Een Palley uit onze collectie kun je zonder reden herroepen tot 14 dagen nadat je hem ontvangen of opgehaald hebt. De kosten van het terugsturen zijn voor jou. Stuur het product ongebruikt en in goede staat terug. Zie ons {returnPolicy} voor de procedure, de online herroepingsfunctie en het modelformulier.",
            "8.2 Voor een Palley op maat geldt geen herroepingsrecht. Hij wordt gemaakt volgens jouw specificaties en is duidelijk gepersonaliseerd (art. VI.53, 3° Wetboek van economisch recht). Je wordt hierover ook geïnformeerd tijdens het bestellen.",
            "8.3 Een Palley op maat kun je kosteloos annuleren zolang je bestelling nog niet in productie is gegaan. We laten je per e-mail weten wanneer je bestelling in productie gaat. Wil je annuleren, mail ons dan zo snel mogelijk met je bestelnummer.",
          ],
        },
        {
          title: "Artikel 9 – Wettelijke garantie",
          blocks: [
            "9.1 Voor al onze producten geldt de wettelijke garantie van 2 jaar vanaf levering. Toont een gebrek zich binnen het eerste jaar, dan wordt vermoed dat het er bij levering al was. Meld een gebrek binnen 2 maanden nadat je het vaststelde, met je bestelnummer en foto’s.",
            "9.2 Bij schade, een printfout of een product dat niet overeenstemt met je bestelling printen we je Palley gratis opnieuw of betalen we het volledige bedrag terug, naar jouw keuze. Je betaalt geen verzend- of retourkosten.",
            "9.3 Bij een Palley op maat bieden we geen extra tevredenheidsgarantie op de gelijkenis met je huisdier. De garantie geldt bij schade of een gebrek, zoals hierboven beschreven.",
            "9.4 Niet onder de garantie vallen normale slijtage, schade door een val, door warmte boven 50 °C of door verkeerd gebruik na ontvangst, en problemen door een fout adres dat je zelf opgaf. Eigenschappen die we vooraf duidelijk beschreven hebben (art. 2.3) zijn geen gebrek.",
            "9.5 Deze voorwaarden beperken je wettelijke rechten niet.",
          ],
        },
        {
          title: "Artikel 10 – Veiligheid en gebruik",
          blocks: [
            "10.1 Een Palley is geen speelgoed. Hij is niet geschikt voor kinderen jonger dan 3 jaar (kleine onderdelen en een metalen ring of klemmetje, verstikkingsgevaar). Laat huisdieren er niet op kauwen.",
            "10.2 De hars kan vervormen boven 50 °C. Laat je Palley dus niet achter in de auto, op het dashboard of in de volle zon. Het materiaal kan breken bij een val.",
          ],
        },
        {
          title: "Artikel 11 – Intellectuele eigendom",
          blocks: [
            "11.1 Onze naam, ons logo, de ontwerpen uit onze collectie, teksten en afbeeldingen zijn van Palleys of van onze licentiegevers. Je mag ze niet zonder onze toestemming kopiëren of commercieel gebruiken.",
            "11.2 Je mag je Palley privé gebruiken. Onze ontwerpen commercieel verkopen of reproduceren is niet toegestaan.",
          ],
        },
        {
          title: "Artikel 12 – Aansprakelijkheid",
          blocks: [
            "12.1 We zijn aansprakelijk volgens het toepasselijke recht. We sluiten onze aansprakelijkheid niet uit voor wat wettelijk niet uitgesloten kan worden, zoals opzet, zware fout, lichamelijk letsel of productaansprakelijkheid.",
            "12.2 We zijn niet aansprakelijk voor indirecte schade of voor schade door verkeerd gebruik van het product, voor zover de wet dat toestaat.",
          ],
        },
        {
          title: "Artikel 13 – Overmacht",
          blocks: [
            "13.1 Gebeurtenissen buiten onze redelijke controle, zoals stakingen, storingen bij vervoerders of leveranciers, extreme weersomstandigheden of overheidsmaatregelen, kunnen onze verplichtingen vertragen. We laten je dat dan weten, en je kunt de overeenkomst ontbinden als de vertraging te lang duurt. Je rechten blijven gelden.",
          ],
        },
        {
          title: "Artikel 14 – Klachten en geschillen",
          blocks: [
            "14.1 Heb je een klacht? Mail ons op {email}. We reageren binnen 5 werkdagen en geven je ten laatste binnen 30 dagen een inhoudelijk antwoord.",
          ],
        },
        {
          title: "Artikel 15 – Persoonsgegevens",
          blocks: [
            "15.1 We verwerken je gegevens zoals beschreven in ons {privacyPolicy}.",
          ],
        },
        {
          title: "Artikel 16 – Wijzigingen",
          blocks: [
            "16.1 We kunnen deze voorwaarden wijzigen. Voor jouw bestelling gelden de voorwaarden zoals ze golden toen je bestelde.",
          ],
        },
        {
          title: "Artikel 17 – Toepasselijk recht",
          blocks: [
            "17.1 Het Belgisch recht is van toepassing. Je kunt ook naar de rechter van je woonplaats stappen.",
          ],
        },
      ],
      returnPolicyLink: "retour- en terugbetalingsbeleid",
      privacyLink: "privacybeleid",
    },
    // LEGAL-REVIEW: the return and refund policy of 9 November 2026, word for word, except "artikel 6" of the terms, which
    // is article 14 since the terms of the same day. Address and e-mail come from the company settings.
    returnPolicy: {
      title: "Retour- en terugbetalingsbeleid",
      intro: "Laatst bijgewerkt: 9 november 2026.",
      sections: [
        {
          title: "Palley op maat",
          blocks: [
            "Een Palley op maat maken we speciaal voor jou, op basis van de foto’s van je huisdier. Daarom geldt het wettelijke herroepingsrecht van 14 dagen niet (art. VI.53, 3° Wetboek van economisch recht). Je kunt hem dus niet terugsturen omdat je van gedachten veranderd bent.",
            "Als je foto’s niet volstaan: we controleren je foto’s en elk 3D-model voor we iets laten printen. Lukt het met je foto’s niet om een goede Palley te maken, dan vragen we je om nieuwe foto’s. Lukt het ook daarmee niet, dan betalen we je het volledige bedrag terug, inclusief de verzendkosten.",
            "Annuleren: we laten je Palley in batches printen bij onze printpartner. Zolang je bestelling nog niet in productie is gegaan, kun je kosteloos annuleren. Je krijgt een mail zodra je bestelling in productie gaat. Wil je annuleren, mail ons dan zo snel mogelijk op {email} met je bestelnummer. We betalen je dan binnen 14 dagen volledig terug.",
          ],
        },
        {
          title: "Palleys uit onze collectie, geldt niet voor custom Palleys",
          blocks: [
            "Herroepingsrecht: je kunt je aankoop zonder reden herroepen tot 14 dagen nadat je ze ontvangen of opgehaald hebt. Dat kan ook al vóór je ze ontvangt.",
            [
              "Hoe: via onze online herroepingsfunctie: {returnUrl}, door ons te mailen op {email} of met het modelformulier hieronder.",
              "Nog niet verstuurd of opgehaald? Dan betalen we je meteen terug en hoef je niets terug te sturen.",
              "Terugsturen: stuur het product ten laatste 14 dagen nadat je herroepen hebt terug naar {returnAddress}. Je betaalt zelf de kosten van het terugsturen. Bewaar het verzendbewijs.",
              "Staat van het product: stuur het product ongebruikt en in goede staat terug. Gebruik je het meer dan nodig is om het te bekijken, dan kunnen we de waardevermindering aanrekenen.",
              "Terugbetaling: we betalen je terug binnen 14 dagen nadat we je herroeping ontvangen hebben. Dat is inclusief de standaardverzendkosten van je oorspronkelijke bestelling. We mogen wachten tot we het product terug hebben, of tot je ons het bewijs van verzending toont.",
              "Gemengde bestelling: bestelde je ook een Palley op maat? Dan kun je alleen de Palleys uit de collectie herroepen.",
            ],
          ],
        },
        {
          title: "Beschadigd, defect of niet wat je bestelde? (alle Palleys)",
          blocks: [
            "Op elke Palley heb je 2 jaar wettelijke garantie vanaf de levering. Tot je je pakje ontvangt of je bestelling ophaalt, zijn wij verantwoordelijk voor verlies of schade.",
            "Meld het probleem binnen 2 maanden nadat je het vaststelde, met je bestelnummer en een paar foto’s. Meestal hoef je het product niet terug te sturen. Je kiest zelf: we laten je Palley gratis opnieuw printen of we betalen het volledige bedrag terug. Je betaalt hiervoor nooit verzend- of retourkosten.",
            "Palley op maat: een Palley op maat is een 3D-interpretatie van je huisdier, gemaakt met behulp van AI. We controleren je foto’s en elk model voor we het laten printen. We geven geen extra tevredenheidsgarantie op de gelijkenis. De garantie geldt bij schade, een printfout of een Palley die niet overeenkomt met wat je bestelde, bijvoorbeeld een verkeerd dier of een verkeerde uitvoering.",
            "Wat valt niet onder de garantie?",
            [
              "Normale slijtage door gebruik, bijvoorbeeld aan je sleutelbos.",
              "Schade door een val of verkeerd gebruik na ontvangst.",
              "Kenmerken die we vooraf op de site beschreven hebben, zoals vervorming boven 50 °C (bijvoorbeeld in een warme auto of in de volle zon).",
              "Kenmerken die eigen zijn aan het 3D-printen: zichtbare printlagen, lichte kleurverschillen,…",
              "Leveringsproblemen door een fout adres dat je zelf opgaf.",
            ],
            "Deze regels beperken je wettelijke rechten niet.",
          ],
        },
        {
          title: "Terugbetaling",
          blocks: [
            "We betalen terug op de rekening waarmee je met Bancontact betaald hebt, tenzij we samen iets anders afspreken. Annuleer of herroep je, dan betalen we binnen 14 dagen terug. Bij een garantieclaim doen we dat zo snel mogelijk en ten laatste binnen 14 dagen na onze beslissing.",
          ],
        },
        {
          title: "Klachten",
          blocks: [
            "Mail ons op {email}. Zie ook artikel 14 van onze {terms}. Komen we er samen niet uit, dan kun je terecht bij de Consumentenombudsdienst (consumentenombudsdienst.be).",
          ],
        },
        {
          title:
            "Modelformulier voor herroeping (alleen voor Palleys uit onze collectie)",
          blocks: [
            "(Vul dit formulier alleen in en stuur het naar ons terug als je de overeenkomst wilt herroepen.)",
            "Aan: {companyContact}",
            "Ik/Wij (*) deel/delen (*) u hierbij mede dat ik/wij (*) onze overeenkomst betreffende de verkoop van de volgende goederen herroep/herroepen (*):",
            [
              "Besteld op (*) / ontvangen op (*):",
              "Bestelnummer:",
              "Naam consument(en):",
              "Adres consument(en):",
              "Handtekening consument(en) (alleen bij een papieren formulier):",
              "Datum:",
            ],
            "(*) Doorhalen wat niet van toepassing is.",
          ],
        },
      ],
      termsLink: "algemene voorwaarden",
    },
    // LEGAL-REVIEW: shipping policy of 9 November 2026. Changed from the given text: every carrier mention is PostNL (the
    // text said bpost in two places), and the costs come live from the shipping settings. The Christmas date is fixed text:
    // take it out after the holidays.
    shippingPolicy: {
      title: "Verzendbeleid",
      intro:
        "Laatst bijgewerkt: 9 november 2026. Bedankt voor je bestelling bij Palleys. Hieronder lees je hoe je bestelling bij jou terechtkomt.",
      sections: [
        { title: "Waar leveren we?", blocks: ["We leveren alleen in België."] },
        {
          title: "Hoe lang duurt het?",
          blocks: [
            [
              "Palley op maat: gemiddeld 10 tot 15 werkdagen na je bestelling.",
              "Palley uit onze collectie: 7 tot 10 werkdagen als hij op voorraad is. Is hij niet op voorraad, dan maken we hem op bestelling en duurt het ook 10 tot 15 werkdagen.",
            ],
            "Dit zijn inschattingen. We leveren ten laatste 30 dagen na je bestelling, tenzij we iets anders met je afspreken. Tijdens de feestdagen kan het langer duren door drukte bij de post. Wil je je Palley voor Kerstmis, bestel dan vóór 1 december.",
          ],
        },
        {
          title: "Zo loopt het",
          blocks: [
            [
              "1. We controleren je bestelling. Voor een Palley op maat zetten we je foto’s met behulp van AI om in een 3D-model en controleren we elke stap.",
              "2. We laten je Palley in volle kleur printen bij onze printpartner. Dat gebeurt samen met andere bestellingen.",
              "3. We controleren de print, bevestigen de ketting met het klemmetje of de sleutelring als je een sleutelhanger koos, en pakken je Palley zorgvuldig in.",
              "4. We versturen je bestelling met PostNL, of laten je weten dat ze klaarligt om op te halen.",
            ],
          ],
        },
        {
          title: "Verzending",
          blocks: [
            "We versturen met PostNL, thuis geleverd. Je pakje komt meestal 1 tot 2 werkdagen nadat we het verstuurd hebben bij je aan. PostNL stuurt je een e-mail om je pakje te volgen.",
          ],
        },
        {
          title: "Verzendkosten",
          blocks: [
            "Je ziet de verzendkosten in de checkout voor je betaalt. Je betaalt dus nooit onverwachte kosten.",
            ["{deliveryPrices}"],
          ],
        },
        {
          title: "Adres controleren",
          blocks: [
            "Controleer je adres goed bij het afrekenen. Wil je iets aanpassen, mail ons dan zo snel mogelijk, voor we je pakje versturen.",
          ],
        },
        {
          title: "Verloren, beschadigd of vertraagd pakje",
          blocks: [
            "Tot je je pakje ontvangt of je bestelling ophaalt, ben je niet verantwoordelijk voor verlies of schade. Is je pakje beschadigd of niet aangekomen, mail ons dan op {email} met je bestelnummer en, als het kan, een paar foto’s. We zoeken het uit met PostNL en lossen het op: we printen je Palley gratis opnieuw of betalen je terug, naar jouw keuze.",
          ],
        },
        { title: "Wijzigen of annuleren", blocks: ["Zie ons {returnPolicy}."] },
        { title: "Vragen?", blocks: ["Mail ons op {email}."] },
      ],
      inBelgium: "{label} in België: {price}",
      free: "gratis",
    },
    // LEGAL-REVIEW: the legally required company details (WER boek XII), from the text of 9 November 2026. Name, address,
    // e-mail and phone come from the company settings.
    contactDetails: {
      title: "Contactgegevens",
      intro: "Laatst bijgewerkt: 9 november 2026.",
      tradeName: "Handelsnaam",
      capacity: "Hoedanigheid",
      capacityText:
        "studentenonderneming in het kader van Step Up, een initiatief van Unizo, de Unie van Zelfstandige Ondernemers",
      vat: "Btw",
      vatText: "vrijgesteld van btw binnen het Step Up-programma van Unizo",
      address: "Adres",
      email: "E-mail klantendienst",
      phone: "Telefoon",
      controller: "Verantwoordelijke voor de verwerking van persoonsgegevens",
      controllerText:
        "{name}, zie hierboven. Meer info vind je in ons {privacyPolicy}.",
      complaints: "Klachten",
      complaintsText: "mail ons op {email}.",
      seeAlso:
        "Zie ook: {terms} · {privacy} · {returnPolicy} · {shippingPolicy}.",
      termsLink: "algemene voorwaarden",
      privacyLink: "privacybeleid",
      shippingPolicyLink: "verzendbeleid",
    },
  },
};

export type Messages = typeof nl;
