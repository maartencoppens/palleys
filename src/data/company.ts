// Company details shown in mails, the footer and legal pages (WER Boek XII: name, geographic address, e-mail; no VAT
// number, we are exempt). These are the starting values; the live ones are set in /admin/settings/company.
// As a student business under Unizo Step Up we have no enterprise number of our own: empty hides it everywhere.
export const COMPANY = {
  legalName: "Palleys",
  address: "Bernheimlaan 26, 9050 Gentbrugge, België",
  enterpriseNumber: "",
  email: "hallo@palleys.be",
  phone: "+32 476 28 68 13",
  // LEGAL-REVIEW: where a withdrawn Palley goes back to (return policy). Emptied in the settings: /retour shows a placeholder.
  returnAddress: "Bernheimlaan 26, 9050 Gentbrugge",
};

// Starting values; the real profile URLs are set in /admin/settings/company. An empty URL hides the icon.
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/palleysofficial/",
  tiktok: "https://www.tiktok.com/",
  facebook: "https://www.facebook.com/",
};

// The page with the legally required company details (WER boek XII), linked from the footer.
export const CONTACT_DETAILS_URL = "/contactgegevens";
