// bpost shipping labels: we make them by hand in bpost's online tool, from a CSV upload ("CSV Manual NL" v1.2,
// national template). No server-only imports. The file names come from core/utils/naming.ts.

// bpost's own national example file. The two header rows below are copied from it literally (a test checks that).
export const BPOST_TEMPLATE_FILE = "src/data/bpost/SML_template_national_import_V2.csv";

// The template is Windows-1252 with ";" between fields, LF line ends and a decimal comma in the weight. Try a real
// upload when changing this: "utf-8" (with or without BOM) is the alternative if accents come through wrong.
export const BPOST_CSV_FORMAT = {
  separator: ";",
  lineEnding: "\n",
  encoding: "windows-1252" as "windows-1252" | "utf-8",
  utf8Bom: false,
  decimalSeparator: ",",
};

export const BPOST_GROUP_HEADER =
  "Receiver;;;;;;;;;;Sender;;;;;;;;;;;Parcel;;Options;;;;;;;";
export const BPOST_FIELD_HEADER =
  "Receiver First name (20);Receiver Last name (20);Receiver Company (optional-40);Receiver Street (50);Receiver Number (12);Receiver Box (optional-12);Receiver Postal code (20);Receiver City (40);Receiver Email address (optional-50);Receiver Mobile number (optional-12);Sender First name (20);Sender Last name (20);Sender Company (optional-40);Sender VAT number (optional-12);Sender Street (50);Sender Number (12);Sender Box (optional-12);Sender Postal code (20);Sender City (40);Sender Email address (50);Sender Mobile number (optional-12);Weight kg (6);Your reference (optional-50);Payment by receiver on delivery (optional-1);Payment by receiver on delivery amount (optional-7);Payment by receiver on delivery IBAN bank account (optional-16);With warranty (optional-1);Confirmation of delivery (optional-1);Notification language of confirmation of delivery (optional-2);Notification type of confirmation of delivery (optional-50);Contact data of confirmation of delivery (optional-50)";

// At most this many labels in one file; more go in -BE-2, -BE-3, ... together in a zip.
export const BPOST_MAX_LABELS_PER_FILE = 50;
export const BPOST_MAX_WEIGHT_KG = 30;
// The manual's text says 12 for "Your reference", its column header says 50: we keep to 12.
export const BPOST_REFERENCE_MAX = 12;

// Who sends. bpost needs it split up, so it is kept here rather than read from the one-line company address.
export const BPOST_SENDER = {
  firstName: "Joran",
  lastName: "Vreye",
  company: "Palleys",
  vatNumber: "", // exempt (Unizo Step Up)
  street: "Bernheimlaan",
  number: "26",
  box: "",
  postalCode: "9050",
  city: "Gentbrugge",
  email: "hallo@palleys.be",
  mobile: "+32476286813",
};
