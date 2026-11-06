// Discount codes. No server-only imports: the admin form and the checkout use these too.

// Letters, digits and dashes, stored in capitals. A customer can type it in any case.
export const DISCOUNT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;
export const DISCOUNT_CODE_MAX_LENGTH = 32;
export const DISCOUNT_NOTE_MAX_LENGTH = 200;
export const MAX_FIXED_DISCOUNT_CENTS = 100_000;
export const MAX_DISCOUNT_REDEMPTIONS = 100_000;

// Long enough that a generated code can't be guessed within the rate limit. No 0/O or 1/I: people retype these.
export const GENERATED_CODE_LENGTH = 10;
export const GENERATED_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
