/**
 * Options page logic.
 *
 * On load: read the user's stored preference and check the matching radio.
 * On change: persist the new value to chrome.storage.sync, then briefly
 * show a "Saved" confirmation so the user knows the change took effect.
 *
 * No explicit Save button — selecting a radio auto-saves. Simpler UX,
 * one less step, and there's no scenario where we'd want to discard
 * a deliberate radio click.
 */

import { getPreferredSource, setPreferredSource } from "../lib/storage";
import type { PreferredSource } from "../lib/storage";

const STATUS_VISIBLE_MS = 1500;
let statusTimeout: number | undefined;

async function init(): Promise<void> {
  const radios = document.querySelectorAll<HTMLInputElement>(
    "input[type='radio'][name='source']",
  );

  // Load the current stored value and check the matching radio.
  const current = await getPreferredSource();
  for (const radio of radios) {
    if (radio.value === current) {
      radio.checked = true;
    }
  }

  // Auto-save on change.
  for (const radio of radios) {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      const value = radio.value as PreferredSource;
      try {
        await setPreferredSource(value);
        showStatus(`Saved · using ${labelFor(value)} as the source`);
      } catch (err) {
        console.error("[omscs-radar] options save failed:", err);
        showStatus("Save failed — see console for details");
      }
    });
  }
}

function labelFor(source: PreferredSource): string {
  switch (source) {
    case "omscentral": return "OMSCentral";
    case "omshub": return "OMSHub";
  }
}

function showStatus(message: string): void {
  const status = document.getElementById("status");
  if (status === null) return;
  status.textContent = message;
  if (statusTimeout !== undefined) clearTimeout(statusTimeout);
  statusTimeout = window.setTimeout(() => {
    status.innerHTML = "&nbsp;"; // restore non-breaking space so the row keeps its height
  }, STATUS_VISIBLE_MS);
}

init();