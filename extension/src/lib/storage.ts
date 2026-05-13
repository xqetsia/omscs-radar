/**
 * Typed wrapper around chrome.storage.sync.
 *
 * Centralizes how the extension reads/writes user preferences. Other modules
 * import from here rather than calling chrome.storage directly, so the
 * storage key names and default values live in one place.
 *
 * chrome.storage.sync persists across the user's devices when they're
 * signed into Chrome. ~100KB total quota, plenty for our preference data.
 */

/**
 * Allowed values for the preferred source setting. Only "omscentral" is
 * functional today; "omshub" is reserved for when that scraper ships.
 * When that happens, "both" will join this union for users who want to
 * see all sources side-by-side.
 */
export type PreferredSource = "omscentral" | "omshub";

const DEFAULT_PREFERRED_SOURCE: PreferredSource = "omscentral";

const STORAGE_KEY = "preferredSource";

/** Read the user's preferred source. Returns the default if unset. */
export async function getPreferredSource(): Promise<PreferredSource> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY];

  // Defensive: validate the stored value is one we recognize. Bad data
  // could exist if the user installed an old version of the extension.
  if (stored === "omscentral" || stored === "omshub") {
    return stored;
  }
  return DEFAULT_PREFERRED_SOURCE;
}

/** Save the user's preferred source. */
export async function setPreferredSource(source: PreferredSource): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: source });
}