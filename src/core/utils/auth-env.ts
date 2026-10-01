import "server-only";
import { z } from "zod";

// Formaat: "1:sleutel" of "2:nieuw,1:oud". Elke sleutel minstens 32 tekens, zonder komma's of dubbele punten.
const secretsPattern = /^\d+:[^,:\s]{32,}(,\d+:[^,:\s]{32,})*$/;

const schema = z.object({
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRETS: z
    .string()
    .regex(
      secretsPattern,
      "Verwacht formaat 1:sleutel (of 2:nieuw,1:oud), sleutel minstens 32 tekens",
    ),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  ADMIN_EMAILS: z.string().refine((value) => {
    const emails = value
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    return (
      emails.length > 0 && emails.every((e) => z.email().safeParse(e).success)
    );
  }, "ADMIN_EMAILS moet minstens één geldig e-mailadres bevatten, gescheiden door komma's"),
});

export const authEnv = schema.parse(process.env);
