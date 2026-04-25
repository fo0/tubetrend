import i18n from '@/src/i18n/config';

/**
 * Returns the active i18n language tag (e.g. 'en', 'de').
 * Used by sort/format helpers in non-React modules so locale-sensitive
 * behaviour follows the user's chosen UI language instead of being
 * hardcoded to one locale.
 */
export function getLocale(): string {
  return i18n.language || 'en';
}
