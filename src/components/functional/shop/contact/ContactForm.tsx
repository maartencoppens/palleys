"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  ContactState,
  sendContactMessage,
} from "@/core/modules/contact/service";
import { Label, Input, Textarea } from "@/components/design/form";

const initialState: ContactState = { status: "idle", message: "" };

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(
    sendContactMessage,
    initialState,
  );

  return (
    <form
      action={formAction}
      data-animate="fade-up"
      className="flex w-full max-w-[1008px] flex-col gap-6 md:gap-10"
    >
      <div className="flex flex-col gap-5 md:gap-8">
        <div className="grid gap-5 md:grid-cols-2 md:gap-12">
          <div className="flex flex-col gap-3">
            <Label htmlFor="contact-name">Je naam</Label>
            <Input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Jan Janssens"
              defaultValue={state.values?.name}
              required
              className="h-14 md:h-16"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="contact-email">E-mailadres</Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="jij@voorbeeld.be"
              defaultValue={state.values?.email}
              required
              className="h-14 md:h-16"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label htmlFor="contact-message">Je bericht</Label>
          <Textarea
            id="contact-message"
            name="message"
            placeholder="Waarmee kunnen we je helpen?"
            defaultValue={state.values?.message}
            required
            rows={4}
            className="min-h-32 md:min-h-[200px] md:px-[30px] md:py-6"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={pending}
          className="group flex h-[60px] w-full items-center justify-center gap-6 rounded-pill bg-accent-highlights px-2xl text-2xl leading-[19.5px] font-extrabold text-button-primary-text transition hover:bg-accent-highlights-hover active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 md:h-[72px] md:gap-[34px] md:text-[32px]"
        >
          {pending ? "Versturen…" : "Verstuur bericht"}
          <Image
            className="shrink-0 transition-transform group-hover:translate-x-1"
            src="/images/arrow-lg.svg"
            width={28.7143}
            height={23}
            alt=""
            aria-hidden
          />
        </button>

        <p
          role="status"
          aria-live="polite"
          className={`min-h-7 text-center text-lg font-semibold ${state.status === "error" ? "text-[#8a2410]" : "text-medium-green"}`}
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
