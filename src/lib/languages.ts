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

/**
 * Regions for live browser dictation, which wants a BCP-47 tag rather than a
 * bare language code and recognises noticeably better when given one.
 */
const SPEECH_REGION: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-Guru-IN',
  ur: 'ur-IN',
  ne: 'ne-NP',
  si: 'si-LK',
  ar: 'ar-SA',
  fa: 'fa-IR',
  tr: 'tr-TR',
  es: 'es-ES',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  ru: 'ru-RU',
  uk: 'uk-UA',
  id: 'id-ID',
  ms: 'ms-MY',
  vi: 'vi-VN',
  th: 'th-TH',
  fil: 'fil-PH',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  sw: 'sw-KE',
  he: 'he-IL',
  el: 'el-GR',
  ro: 'ro-RO',
  cs: 'cs-CZ',
  sv: 'sv-SE',
  no: 'nb-NO',
  da: 'da-DK',
  fi: 'fi-FI',
  hu: 'hu-HU',
};

/**
 * The tag to hand the browser's recogniser.
 *
 * The speaker's own locale wins when it is the same language — someone whose
 * browser is set to en-IN gets Indian English for "English" rather than a
 * region guessed from a table. Everyone else gets the table's default.
 */
export function speechTag(code: string, navigatorLanguage?: string): string {
  const locale = wellFormedTag(navigatorLanguage);

  if (code === AUTO_DETECT) return locale ?? SPEECH_REGION.en;
  if (locale && locale.toLowerCase().split('-')[0] === code.toLowerCase()) return locale;

  return SPEECH_REGION[code] ?? code;
}

/**
 * navigator.language is not guaranteed to be a BCP-47 tag — a POSIX box can
 * report "en-US@posix", and handing that to the recogniser fails outright. Only
 * a tag that actually looks like one is trusted; anything else falls back to
 * the table.
 */
function wellFormedTag(value: string | undefined): string | null {
  const tag = (value ?? '').trim();
  return /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag) ? tag : null;
}
