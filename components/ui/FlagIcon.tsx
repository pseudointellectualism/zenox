"use client";

import { FileText, Globe } from "lucide-react";
import clsx from "clsx";

const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  // ISO 639-1 & 639-2 codes
  en: "us",
  eng: "us",
  "en-us": "us",
  "en-gb": "gb",
  es: "es",
  spa: "es",
  "es-es": "es",
  "es-la": "es",
  "es-419": "es",
  "es-mx": "es",
  fr: "fr",
  fre: "fr",
  fra: "fr",
  de: "de",
  ger: "de",
  deu: "de",
  it: "it",
  ita: "it",
  pt: "pt",
  por: "pt",
  "pt-pt": "pt",
  "pt-br": "br",
  pob: "br",
  pb: "br",
  ru: "ru",
  rus: "ru",
  ja: "jp",
  jpn: "jp",
  ko: "kr",
  kor: "kr",
  zh: "cn",
  zho: "cn",
  chi: "cn",
  "zh-cn": "cn",
  "zh-tw": "cn",
  "zh-hk": "cn",
  "zh-sg": "cn",
  ar: "sa",
  ara: "sa",
  hi: "in",
  hin: "in",
  nl: "nl",
  dut: "nl",
  nld: "nl",
  pl: "pl",
  pol: "pl",
  tr: "tr",
  tur: "tr",
  sv: "se",
  swe: "se",
  da: "dk",
  dan: "dk",
  fi: "fi",
  fin: "fi",
  no: "no",
  nor: "no",
  nob: "no",
  nno: "no",
  el: "gr",
  ell: "gr",
  gre: "gr",
  id: "id",
  ind: "id",
  vi: "vn",
  vie: "vn",
  th: "th",
  tha: "th",
  cs: "cz",
  ces: "cz",
  cze: "cz",
  ro: "ro",
  ron: "ro",
  rum: "ro",
  hu: "hu",
  hun: "hu",
  uk: "ua",
  ukr: "ua",
  he: "il",
  heb: "il",

  // Missing ISO codes requested
  gl: "es",
  glg: "es",
  kn: "in",
  kan: "in",
  ms: "my",
  msa: "my",
  may: "my",
  ml: "in",
  mal: "in",
  fa: "ir",
  fas: "ir",
  per: "ir",
  sl: "si",
  slv: "si",
  ta: "in",
  tam: "in",
  te: "in",
  tel: "in",
  sq: "al",
  sqi: "al",
  alb: "al",
  bn: "bd",
  ben: "bd",
  eu: "es",
  eus: "es",
  baq: "es",
  br: "fr",
  bre: "fr",
  bg: "bg",
  bul: "bg",
  ca: "es",
  cat: "es",
  hr: "hr",
  hrv: "hr",
  sr: "rs",
  srp: "rs",
  scc: "rs",
  bs: "ba",
  bos: "ba",
  is: "is",
  isl: "is",
  ice: "is",
  et: "ee",
  est: "ee",
  lv: "lv",
  lav: "lv",
  lt: "lt",
  lit: "lt",
  sk: "sk",
  slk: "sk",
  slo: "sk",
  mk: "mk",
  mkd: "mk",
  mac: "mk",
  fil: "ph",
  tl: "ph",
  tgl: "ph",
  ur: "pk",
  urd: "pk",
  si: "lk",
  sin: "lk",
  sw: "ke",
  swa: "ke",
  ka: "ge",
  kat: "ge",
  geo: "ge",
  hy: "am",
  hye: "am",
  arm: "am",
  af: "za",
  afr: "za",
  pa: "in",
  pan: "in",
  km: "kh",
  khm: "kh",
  my: "mm",
  mya: "mm",
  bur: "mm",
  az: "az",
  aze: "az",
  uz: "uz",
  uzb: "uz",
  ch: "gu",
  cha: "gu",

  // Language names & variants
  english: "us",
  spanish: "es",
  "spanish (la)": "es",
  "spanish (latin america)": "es",
  "spanish-la": "es",
  "latin american spanish": "es",
  "español (latinoamérica)": "es",
  "español latino": "es",
  castilian: "es",
  castellano: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  "portuguese (br)": "br",
  "portuguese (brazil)": "br",
  "portuguese-br": "br",
  brazilian: "br",
  "brazilian portuguese": "br",
  russian: "ru",
  japanese: "jp",
  korean: "kr",
  chinese: "cn",
  "chinese (simplified)": "cn",
  "chinese (traditional)": "cn",
  "simplified chinese": "cn",
  "traditional chinese": "cn",
  "chinese-trad": "cn",
  "chinese-simp": "cn",
  arabic: "sa",
  hindi: "in",
  dutch: "nl",
  flemish: "be",
  polish: "pl",
  turkish: "tr",
  swedish: "se",
  danish: "dk",
  finnish: "fi",
  norwegian: "no",
  greek: "gr",
  indonesian: "id",
  vietnamese: "vn",
  thai: "th",
  czech: "cz",
  romanian: "ro",
  hungarian: "hu",
  ukrainian: "ua",
  hebrew: "il",
  galician: "es",
  kannada: "in",
  malay: "my",
  malayalam: "in",
  persian: "ir",
  farsi: "ir",
  slovenian: "si",
  slovene: "si",
  tamil: "in",
  telugu: "in",
  telungu: "in",
  albanian: "al",
  bengali: "bd",
  bangla: "bd",
  basque: "es",
  breton: "fr",
  bulgarian: "bg",
  catalan: "es",
  croatian: "hr",
  serbian: "rs",
  bosnian: "ba",
  icelandic: "is",
  estonian: "ee",
  latvian: "lv",
  lithuanian: "lt",
  slovak: "sk",
  macedonian: "mk",
  filipino: "ph",
  tagalog: "ph",
  urdu: "pk",
  sinhala: "lk",
  sinhalese: "lk",
  swahili: "ke",
  georgian: "ge",
  armenian: "am",
  afrikaans: "za",
  punjabi: "in",
};

export function getCountryCodeForLanguage(lang?: string): string | null {
  if (!lang) return null;
  const raw = lang.trim().toLowerCase();

  // 1. Direct match on full string (e.g. "spanish (la)", "portuguese (br)", "chinese (traditional)")
  if (LANGUAGE_TO_COUNTRY[raw]) {
    return LANGUAGE_TO_COUNTRY[raw];
  }

  // 2. Direct match on hyphen / underscore split (e.g. "en-US" -> "en", "es-LA" -> "es-la")
  const dashSplit = raw.split(/[-_]/)[0];
  if (LANGUAGE_TO_COUNTRY[dashSplit]) {
    return LANGUAGE_TO_COUNTRY[dashSplit];
  }

  // 3. Remove parentheticals / brackets (e.g. "Spanish [CC]" -> "spanish" -> "es", "Galician (gl)" -> "galician")
  const stripped = raw.replace(/\s*(\[.*?\]|\(.*?\)).*$/, "").trim();
  if (stripped && LANGUAGE_TO_COUNTRY[stripped]) {
    return LANGUAGE_TO_COUNTRY[stripped];
  }

  // 4. Base first word match (e.g. "Spanish Latin" -> "spanish" -> "es", "Chinese Traditional" -> "chinese" -> "cn")
  const firstWord = raw.split(/\s+/)[0];
  if (firstWord && LANGUAGE_TO_COUNTRY[firstWord]) {
    return LANGUAGE_TO_COUNTRY[firstWord];
  }

  return null;
}

export interface FlagIconProps {
  lang?: string;
  country?: string;
  isCustom?: boolean;
  className?: string;
}

export default function FlagIcon({
  lang,
  country,
  isCustom,
  className,
}: FlagIconProps) {
  if (isCustom || lang?.toLowerCase() === "custom" || lang?.toLowerCase() === "uploaded") {
    return (
      <span
        className={clsx(
          "inline-flex size-4.5 shrink-0 items-center justify-center rounded-[4px] bg-white/15 text-white/90",
          className,
        )}
        title="Uploaded Subtitle"
      >
        <FileText className="size-2.5" />
      </span>
    );
  }

  const countryCode = (country || getCountryCodeForLanguage(lang))?.toLowerCase();

  if (countryCode) {
    return (
      <span
        className={clsx(
          "fi",
          `fi-${countryCode}`,
          "inline-block !h-3.5 !w-5 shrink-0 rounded-[3px] border border-white/15 bg-cover bg-center shadow-xs",
          className,
        )}
        title={lang || countryCode.toUpperCase()}
      />
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex h-3.5 w-5 shrink-0 items-center justify-center rounded-[3px] border border-white/10 bg-white/10 text-white/50",
        className,
      )}
    >
      <Globe className="size-2.5" />
    </span>
  );
}
