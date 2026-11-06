import { notFound } from "next/navigation";

// A URL no page answers to: this shows the shop's own not-found page, in the right language.
export default function UnknownPage() {
  notFound();
}
