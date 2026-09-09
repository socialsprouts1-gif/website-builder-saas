/**
 * Languages offered for voice input, as ISO-639-1 codes the transcription
 * models accept.
 *
 * English is first and is the default. Auto-detect exists but is not the
 * default on purpose: given a short clip, background noise, or a moment of
 * silence, detection guesses — and a wrong guess returns text in a script the
 * speaker cannot read. Naming the language up front removes that whole class
 * of failure.
 */

export interface SpokenLanguage {
  code: string;
  label: string;
}

/** Empty code means "let the model decide". */
export const AUTO_DETECT = '';

export const LANGUAGES: SpokenLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी — Hindi' },
  { code: 'mr', label: 'मराठी — Marathi' },
  { code: 'bn', label: 'বাংলা — Bengali' },
  { code: 'ta', label: 'தமிழ் — Tamil' },
  { code: 'te', label: 'తెలుగు — Telugu' },
  { code: 'gu', label: 'ગુજરાતી — Gujarati' },
  { code: 'kn', label: 'ಕನ್ನಡ — Kannada' },
  { code: 'ml', label: 'മലയാളം — Malayalam' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ — Punjabi' },
  { code: 'ur', label: 'اردو — Urdu' },
  { code: 'ne', label: 'नेपाली — Nepali' },
  { code: 'si', label: 'සිංහල — Sinhala' },
  { code: 'ar', label: 'العربية — Arabic' },
  { code: 'fa', label: 'فارسی — Persian' },
  { code: 'tr', label: 'Türkçe — Turkish' },
  { code: 'es', label: 'Español — Spanish' },
  { code: 'pt', label: 'Português — Portuguese' },
  { code: 'fr', label: 'Français — French' },
  { code: 'de', label: 'Deutsch — German' },
  { code: 'it', label: 'Italiano — Italian' },
  { code: 'nl', label: 'Nederlands — Dutch' },
  { code: 'pl', label: 'Polski — Polish' },
  { code: 'ru', label: 'Русский — Russian' },
  { code: 'uk', label: 'Українська — Ukrainian' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'vi', label: 'Tiếng Việt — Vietnamese' },
  { code: 'th', label: 'ไทย — Thai' },
  { code: 'fil', label: 'Filipino' },
  { code: 'zh', label: '中文 — Chinese' },
  { code: 'ja', label: '日本語 — Japanese' },
  { code: 'ko', label: '한국어 — Korean' },
  { code: 'sw', label: 'Kiswahili — Swahili' },
  { code: 'he', label: 'עברית — Hebrew' },
  { code: 'el', label: 'Ελληνικά — Greek' },
  { code: 'ro', label: 'Română — Romanian' },
  { code: 'cs', label: 'Čeština — Czech' },
  { code: 'sv', label: 'Svenska — Swedish' },
  { code: 'no', label: 'Norsk — Norwegian' },
  { code: 'da', label: 'Dansk — Danish' },
  { code: 'fi', label: 'Suomi — Finnish' },
  { code: 'hu', label: 'Magyar — Hungarian' },
];

export const DEFAULT_LANGUAGE = 'en';

const CODES = new Set(LANGUAGES.map((language) => language.code));

/** Anything unrecognised falls back to English rather than to auto-detect. */
export function normaliseLanguage(input: unknown): string {
  if (input === AUTO_DETECT) return AUTO_DETECT;
  if (typeof input !== 'string') return DEFAULT_LANGUAGE;
  const code = input.trim().toLowerCase().split('-')[0];
  if (code === 'auto') return AUTO_DETECT;
  return CODES.has(code) ? code : DEFAULT_LANGUAGE;
}

export function languageLabel(code: string): string {
  if (code === AUTO_DETECT) return 'Detect';
  return LANGUAGES.find((language) => language.code === code)?.label ?? code;
}
