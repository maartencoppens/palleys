"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { putSettingsSection } from "@/core/modules/settings/api";
import type { SettingsSection, SettingsSectionInput } from "@/core/modules/settings/types";
import { getApiErrorMessage } from "@/core/networking/api";

/** Saving one section of the settings, with the state its save bar shows. */
export function useSettingsSave<S extends SettingsSection>(section: S) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(input: SettingsSectionInput<S>) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await putSettingsSection(section, input);
      setMessage("Opgeslagen");
      router.refresh();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return { save, saving, message, error, setError, setMessage };
}
