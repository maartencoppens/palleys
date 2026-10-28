"use server";

export type ContactState = {
  status: "idle" | "success" | "error";
  message: string;
  /** Values echoed back on error, so the visitor doesn't lose what they typed. */
  values?: { name: string; email: string; message: string };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  if (!values.name || !values.email || !values.message) {
    return {
      status: "error",
      message: "Vul je naam, e-mailadres en bericht in.",
      values,
    };
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    return {
      status: "error",
      message: "Dat e-mailadres lijkt niet te kloppen.",
      values,
    };
  }

  // TODO: deliver the message (e.g. an email provider or the shop's CRM). Until that's connected,
  // nothing is sent; the visitor still sees the confirmation below.
  console.info("[contact] new message", {
    name: values.name,
    email: values.email,
  });

  return {
    status: "success",
    message: "Bedankt! We laten zo snel mogelijk iets van ons horen.",
  };
}
