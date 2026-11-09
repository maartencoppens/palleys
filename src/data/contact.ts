// The contact form on the homepage. No server-only imports: the form uses these limits too.
export const CONTACT_LIMITS = {
  name: 80,
  message: 5000,
} as const;
