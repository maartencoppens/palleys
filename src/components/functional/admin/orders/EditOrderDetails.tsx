"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchOrderDetails } from "@/core/modules/orders/api";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";
import { Input, Textarea } from "@/components/design/form";

type EditOrderDetailsProps = {
  orderId: string;
  customer: { firstName: string; lastName: string; email: string | null; phone: string | null };
  /** Null when nothing is shipped (pickup, handover): then there's no address to edit. */
  address: { street: string; houseNumber: string; postalCode: string; city: string } | null;
  needsAddress: boolean;
  /** A parcel that left keeps its address. */
  addressLocked: boolean;
  hasShipment: boolean;
  trackingCode: string | null;
  items: { id: string; title: string; notes: string | null }[];
};

const labelClassName = "font-label text-sm font-semibold text-text-muted";
const inputClassName = "mt-1 h-11 text-base!";

/* Correcting an order's details in the backoffice instead of in the database. The server checks every field again. */
export function EditOrderDetails(props: EditOrderDetailsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState(() => ({
    firstName: props.customer.firstName,
    lastName: props.customer.lastName,
    email: props.customer.email ?? "",
    phone: props.customer.phone ?? "",
    street: props.address?.street ?? "",
    houseNumber: props.address?.houseNumber ?? "",
    postalCode: props.address?.postalCode ?? "",
    city: props.address?.city ?? "",
    trackingCode: props.trackingCode ?? "",
  }));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(props.items.map((item) => [item.id, item.notes ?? ""])));

  const set = (name: keyof typeof fields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFields((current) => ({ ...current, [name]: event.target.value }));
  const field = (name: keyof typeof fields, label: string, disabled = false) => (
    <div>
      <label htmlFor={`edit-${name}`} className={labelClassName}>
        {label}
      </label>
      <Input id={`edit-${name}`} value={fields[name]} onChange={set(name)} disabled={disabled} className={inputClassName} />
    </div>
  );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { changed } = await patchOrderDetails(props.orderId, {
        firstName: fields.firstName,
        lastName: fields.lastName,
        email: fields.email.trim() || null,
        phone: fields.phone.trim() || undefined,
        address: props.needsAddress
          ? { street: fields.street, houseNumber: fields.houseNumber, postalCode: fields.postalCode, city: fields.city }
          : null,
        trackingCode: fields.trackingCode.trim() || null,
        itemNotes: Object.fromEntries(Object.entries(notes).map(([id, value]) => [id, value.trim() || null])),
      });
      setNotice(changed.length > 0 ? `Aangepast: ${changed.join(", ")}` : "Niets gewijzigd");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-4 flex flex-col gap-1">
        <button type="button" onClick={() => setEditing(true)} className="self-start font-label text-sm font-bold text-medium-green underline underline-offset-4 hover:text-orange">
          Gegevens bewerken
        </button>
        {notice && <p className="text-sm text-medium-green">{notice}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mt-4 flex flex-col gap-3 border-t border-off-white-dark pt-4">
      <div className="grid grid-cols-2 gap-3">
        {field("firstName", "Voornaam")}
        {field("lastName", "Achternaam")}
      </div>
      {field("email", "E-mail")}
      {field("phone", "Telefoon")}
      {props.needsAddress && (
        <>
          {props.addressLocked && <p className="text-xs text-text-muted">Al verzonden: het adres blijft zoals het was.</p>}
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
            {field("street", "Straat", props.addressLocked)}
            {field("houseNumber", "Nr. / bus", props.addressLocked)}
          </div>
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
            {field("postalCode", "Postcode", props.addressLocked)}
            {field("city", "Gemeente", props.addressLocked)}
          </div>
        </>
      )}
      {props.hasShipment && field("trackingCode", "Trackingcode")}
      {props.items.map((item) => (
        <div key={item.id}>
          <label htmlFor={`edit-note-${item.id}`} className={labelClassName}>
            Opmerking bij {item.title}
          </label>
          <Textarea
            id={`edit-note-${item.id}`}
            rows={2}
            value={notes[item.id]}
            onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
            className="mt-1 min-h-16 text-base!"
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={busy}>
          Opslaan
        </Button>
        <button type="button" onClick={() => setEditing(false)} className="font-label text-sm font-bold text-text-muted underline underline-offset-4">
          Annuleren
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </form>
  );
}
