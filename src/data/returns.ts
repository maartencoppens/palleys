// Returns, withdrawals and warranty claims (/retour). No server-only imports.

export const RETURN_URL = "/retour";
// The full return and refund policy; /retour and the terms (art. 8.1) link to it.
export const RETURN_POLICY_URL = "/retourbeleid";

// LEGAL-REVIEW: the periods from the return policy. Withdrawal counts from the day the Palleys were received or picked
// up; the legal guarantee from delivery.
export const WITHDRAWAL_DAYS = 14;
export const WARRANTY_YEARS = 2;

// A bpost parcel arrives this many working days after it was posted, unless the team fills in the real date. Weekends
// are skipped, public holidays are not: the estimate errs a day early at most, the team can correct it.
export const ESTIMATED_DELIVERY_WORKING_DAYS = 2;

// The link from the lookup mail works once and for this long; the session it opens lasts as long again.
export const RETURN_LINK_TTL_MS = 30 * 60 * 1000;
export const RETURN_SESSION_TTL_MS = 30 * 60 * 1000;
// The session cookie holds a random token, only sent to the returns API.
export const RETURN_SESSION_COOKIE = "palleys_return";
export const RETURN_SESSION_COOKIE_PATH = "/api/returns";

// Photos with a warranty claim: same types and size as the pet photos (data/uploads.ts), private in R2.
export const MIN_RETURN_PHOTOS = 1;
export const MAX_RETURN_PHOTOS = 4;
export const RETURN_PHOTO_PREFIX = "returns";

export const MAX_RETURN_REASON_LENGTH = 1000;
export const MIN_WARRANTY_DESCRIPTION_LENGTH = 10;
export const MAX_DECISION_NOTE_LENGTH = 1000;
