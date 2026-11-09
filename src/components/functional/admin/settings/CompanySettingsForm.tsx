"use client";

import { useState } from "react";
import type { CompanySettings } from "@/core/modules/settings/types";
import { Input } from "@/components/design/form";
import { compactFieldClassName, fieldLabelClassName, SaveBar, SettingsCard } from "./SettingsParts";
import { useSettingsSave } from "./useSettingsSave";

const COMPANY_FIELDS = [
  { name: "legalName", label: "Naam" },
  { name: "address", label: "Adres (straat, nummer, postcode, gemeente)" },
  { name: "enterpriseNumber", label: "Ondernemingsnummer (leeg als we er geen hebben)" },
  { name: "email", label: "E-mail" },
  { name: "phone", label: "Telefoon" },
  { name: "returnAddress", label: "Retouradres (waar een herroepen Palley naartoe gaat)" },
] as const;

const SOCIAL_FIELDS = [
  { name: "instagram", label: "Instagram" },
  { name: "tiktok", label: "TikTok" },
  { name: "facebook", label: "Facebook" },
] as const;

export function CompanySettingsForm({ company }: { company: CompanySettings }) {
  const [values, setValues] = useState(company);
  const { save, saving, message, error } = useSettingsSave("company");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(values);
      }}
      className="flex flex-col gap-6"
    >
      <SettingsCard
        title="Bedrijfsgegevens"
        intro="Wettelijk verplicht op de site en in mails. Staat in de algemene voorwaarden, het privacybeleid en de bevestigingsmail."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {COMPANY_FIELDS.map((field) => (
            <div key={field.name} className={field.name === "address" || field.name === "returnAddress" ? "sm:col-span-2" : ""}>
              <label htmlFor={`company-${field.name}`} className={fieldLabelClassName}>
                {field.label}
              </label>
              <Input
                id={`company-${field.name}`}
                value={values[field.name]}
                onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                className={`mt-2 ${compactFieldClassName}`}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Sociale media" intro="De iconen in de footer. Laat een veld leeg om het icoon te verbergen.">
        <div className="flex flex-col gap-4">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.name}>
              <label htmlFor={`social-${field.name}`} className={fieldLabelClassName}>
                {field.label}
              </label>
              <Input
                id={`social-${field.name}`}
                type="url"
                placeholder="https://"
                value={values.socials[field.name]}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    socials: { ...current.socials, [field.name]: event.target.value.trim() },
                  }))
                }
                className={`mt-2 ${compactFieldClassName}`}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      <SaveBar saving={saving} message={message} error={error} />
    </form>
  );
}
