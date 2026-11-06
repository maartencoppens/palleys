"use server";

export type ContactState = {
  status: "idle" | "success" | "error";
  /** Which text the form shows, in the visitor's language. */
  code?: "missing" | "invalidEmail" | "sent";
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
      code: "missing",
      values,
    };
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    return {
      status: "error",
      code: "invalidEmail",
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
    code: "sent",
  };
}
