import i18n from "@/src/i18n/config";

/**
 * Returns the language tag the UI is actually rendered in (e.g. 'en', 'de').
 * Used by sort/format helpers in non-React modules so locale-sensitive
 * behaviour follows the user's chosen UI language instead of being
 * hardcoded to one locale.
 *
 * `resolvedLanguage`, not `language`: `i18n.language` is the *requested*
 * language, and `supportedLngs` in i18n/config.ts lists 13 of them while only
 * `en` and `de` ship resource bundles. A browser set to French therefore leaves
 * `i18n.language === "fr"` while every string on screen comes from the `en`
 * fallback — and `Intl.NumberFormat("fr")` then rendered French separators
 * ("1 234 567", "24/08/2026") next to English text, in a document that same
 * config tags `lang="en"` for exactly this reason. `resolvedLanguage` is the
 * first language in the fallback chain that has translations, i.e. the one the
 * user really sees. For `en` and `de` the two values are identical, so nothing
 * changes for a user who has a bundle.
 */
export function getLocale(): string {
  return i18n.resolvedLanguage || i18n.language || "en";
}
