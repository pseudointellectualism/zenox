/**
 * Lightweight, robust parser for WebVTT (.vtt) and SubRip (.srt) subtitles.
 */

export interface SubtitleCue {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

function parseTimestamp(timeStr: string): number {
  const normalized = timeStr.trim().replace(",", ".");
  const parts = normalized.split(":");

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return parseFloat(minutes) * 60 + parseFloat(seconds);
  }
  return 0;
}

export function parseSubtitles(content: string): SubtitleCue[] {
  if (!content) return [];

  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\n+/);
  const cues: SubtitleCue[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block || block.startsWith("WEBVTT") || block.startsWith("NOTE")) continue;

    const lines = block.split("\n");
    let timeLineIndex = -1;

    for (let j = 0; j < lines.length; j++) {
      if (lines[j].includes("-->")) {
        timeLineIndex = j;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const [startStr, endStrWithSettings] = timeLine.split("-->");
    if (!startStr || !endStrWithSettings) continue;

    const endStr = endStrWithSettings.trim().split(/\s+/)[0];

    const start = parseTimestamp(startStr);
    const end = parseTimestamp(endStr);
    const textLines = lines.slice(timeLineIndex + 1);
    const rawText = textLines.join("\n").trim();

    // Clean up formatting tags like <v ...>, <c.color>, etc.
    const text = rawText
      .replace(/<v[^>]*>/g, "")
      .replace(/<\/v>/g, "")
      .replace(/<c[^>]*>/g, "")
      .replace(/<\/c>/g, "")
      .trim();

    const lower = text.toLowerCase();
    const isPromo =
      lower.includes("flickystream") ||
      lower.includes("opensubtitles.org") ||
      lower.includes("subtitle edited by") ||
      lower.includes("support us on") ||
      lower.includes("advertise your product");

    if (text && end > start && !isPromo) {
      cues.push({
        id: `cue-${i}-${start}`,
        start,
        end,
        text,
      });
    }
  }

  return cues;
}

export async function fetchAndParseSubtitles(url: string): Promise<SubtitleCue[]> {
  try {
    let targetUrl = url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      targetUrl = `/api/v1/subtitles/proxy?url=${encodeURIComponent(url)}`;
    }
    const res = await fetch(targetUrl);
    if (!res.ok) {
      const direct = await fetch(url);
      if (!direct.ok) return [];
      const text = await direct.text();
      return parseSubtitles(text);
    }
    const text = await res.text();
    return parseSubtitles(text);
  } catch (err) {
    console.warn("Failed to fetch subtitles from", url, err);
    return [];
  }
}

function toTitleCase(str: string): string {
  if (!str) return "";
  return str.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

const COMMON_LANGUAGE_MAP: Record<string, string> = {
  // English
  en: "English",
  eng: "English",
  "en-us": "English",
  "en-gb": "English",
  english: "English",

  // Spanish variants
  es: "Spanish",
  spa: "Spanish",
  "es-es": "Spanish",
  spanish: "Spanish",
  castilian: "Spanish",
  castellano: "Spanish",
  "es-la": "Spanish (LA)",
  "es-419": "Spanish (LA)",
  "es-mx": "Spanish (LA)",
  "spanish (la)": "Spanish (LA)",
  "spanish (latin america)": "Spanish (LA)",
  "spanish-la": "Spanish (LA)",
  "latin american spanish": "Spanish (LA)",
  "español (latinoamérica)": "Spanish (LA)",
  "español latino": "Spanish (LA)",

  // Portuguese variants
  pt: "Portuguese",
  por: "Portuguese",
  "pt-pt": "Portuguese",
  portuguese: "Portuguese",
  português: "Portuguese",
  "pt-br": "Portuguese (BR)",
  pb: "Portuguese (BR)",
  pob: "Portuguese (BR)",
  "portuguese (br)": "Portuguese (BR)",
  "portuguese (brazil)": "Portuguese (BR)",
  "portuguese-br": "Portuguese (BR)",
  brazilian: "Portuguese (BR)",
  "brazilian portuguese": "Portuguese (BR)",

  // Chinese variants
  zh: "Chinese (Simplified)",
  zho: "Chinese (Simplified)",
  chi: "Chinese (Simplified)",
  "zh-cn": "Chinese (Simplified)",
  "zh-sg": "Chinese (Simplified)",
  chinese: "Chinese (Simplified)",
  "chinese (simplified)": "Chinese (Simplified)",
  "simplified chinese": "Chinese (Simplified)",
  "chinese-simp": "Chinese (Simplified)",
  "zh-tw": "Chinese (Traditional)",
  "zh-hk": "Chinese (Traditional)",
  "chinese (traditional)": "Chinese (Traditional)",
  "traditional chinese": "Chinese (Traditional)",
  "chinese-trad": "Chinese (Traditional)",

  // French, German, Italian
  fr: "French",
  fre: "French",
  fra: "French",
  french: "French",
  de: "German",
  ger: "German",
  deu: "German",
  german: "German",
  it: "Italian",
  ita: "Italian",
  italian: "Italian",

  // Russian, Japanese, Korean
  ru: "Russian",
  rus: "Russian",
  russian: "Russian",
  ja: "Japanese",
  jpn: "Japanese",
  japanese: "Japanese",
  ko: "Korean",
  kor: "Korean",
  korean: "Korean",

  // Arabic, Hindi
  ar: "Arabic",
  ara: "Arabic",
  arabic: "Arabic",
  hi: "Hindi",
  hin: "Hindi",
  hindi: "Hindi",

  // Dutch
  nl: "Dutch",
  dut: "Dutch",
  nld: "Dutch",
  dutch: "Dutch",
  nederlands: "Dutch",
  flemish: "Dutch",

  // User requested missing languages
  gl: "Galician",
  glg: "Galician",
  galician: "Galician",
  galego: "Galician",
  kn: "Kannada",
  kan: "Kannada",
  kannada: "Kannada",
  ms: "Malay",
  msa: "Malay",
  may: "Malay",
  malay: "Malay",
  ml: "Malayalam",
  mal: "Malayalam",
  malayalam: "Malayalam",
  fa: "Persian",
  fas: "Persian",
  per: "Persian",
  persian: "Persian",
  farsi: "Persian",
  sl: "Slovenian",
  slv: "Slovenian",
  slovenian: "Slovenian",
  slovene: "Slovenian",
  ta: "Tamil",
  tam: "Tamil",
  tamil: "Tamil",
  te: "Telugu",
  tel: "Telugu",
  telugu: "Telugu",
  telungu: "Telugu",
  sq: "Albanian",
  sqi: "Albanian",
  alb: "Albanian",
  albanian: "Albanian",
  bn: "Bengali",
  ben: "Bengali",
  bengali: "Bengali",
  bangla: "Bengali",
  eu: "Basque",
  eus: "Basque",
  baq: "Basque",
  basque: "Basque",
  br: "Breton",
  bre: "Breton",
  breton: "Breton",
  bg: "Bulgarian",
  bul: "Bulgarian",
  bulgarian: "Bulgarian",
  ca: "Catalan",
  cat: "Catalan",
  catalan: "Catalan",

  // Other common languages
  pl: "Polish",
  pol: "Polish",
  polish: "Polish",
  tr: "Turkish",
  tur: "Turkish",
  turkish: "Turkish",
  sv: "Swedish",
  swe: "Swedish",
  swedish: "Swedish",
  da: "Danish",
  dan: "Danish",
  danish: "Danish",
  fi: "Finnish",
  fin: "Finnish",
  finnish: "Finnish",
  no: "Norwegian",
  nor: "Norwegian",
  nob: "Norwegian",
  nno: "Norwegian",
  norwegian: "Norwegian",
  el: "Greek",
  ell: "Greek",
  gre: "Greek",
  greek: "Greek",
  id: "Indonesian",
  ind: "Indonesian",
  indonesian: "Indonesian",
  vi: "Vietnamese",
  vie: "Vietnamese",
  vietnamese: "Vietnamese",
  th: "Thai",
  tha: "Thai",
  thai: "Thai",
  cs: "Czech",
  ces: "Czech",
  cze: "Czech",
  czech: "Czech",
  ro: "Romanian",
  ron: "Romanian",
  rum: "Romanian",
  romanian: "Romanian",
  hu: "Hungarian",
  hun: "Hungarian",
  hungarian: "Hungarian",
  uk: "Ukrainian",
  ukr: "Ukrainian",
  ukrainian: "Ukrainian",
  he: "Hebrew",
  heb: "Hebrew",
  hebrew: "Hebrew",
  hr: "Croatian",
  hrv: "Croatian",
  croatian: "Croatian",
  sr: "Serbian",
  srp: "Serbian",
  scc: "Serbian",
  serbian: "Serbian",
  bs: "Bosnian",
  bos: "Bosnian",
  bosnian: "Bosnian",
  is: "Icelandic",
  isl: "Icelandic",
  ice: "Icelandic",
  icelandic: "Icelandic",
  et: "Estonian",
  est: "Estonian",
  estonian: "Estonian",
  lv: "Latvian",
  lav: "Latvian",
  latvian: "Latvian",
  lt: "Lithuanian",
  lit: "Lithuanian",
  lithuanian: "Lithuanian",
  sk: "Slovak",
  slk: "Slovak",
  slo: "Slovak",
  slovak: "Slovak",
  mk: "Macedonian",
  mkd: "Macedonian",
  mac: "Macedonian",
  macedonian: "Macedonian",
  fil: "Filipino",
  tl: "Filipino",
  tgl: "Filipino",
  filipino: "Filipino",
  tagalog: "Filipino",
  ur: "Urdu",
  urd: "Urdu",
  urdu: "Urdu",
  si: "Sinhala",
  sin: "Sinhala",
  sinhala: "Sinhala",
  sinhalese: "Sinhala",
  sw: "Swahili",
  swa: "Swahili",
  swahili: "Swahili",
  ka: "Georgian",
  kat: "Georgian",
  geo: "Georgian",
  georgian: "Georgian",
  hy: "Armenian",
  hye: "Armenian",
  arm: "Armenian",
  armenian: "Armenian",
  af: "Afrikaans",
  afr: "Afrikaans",
  afrikaans: "Afrikaans",
  pa: "Punjabi",
  pan: "Punjabi",
  punjabi: "Punjabi",
};

/**
 * Derives a clean base language name (e.g. "English", "Spanish", "Chinese (Simplified)")
 * from an ISO code, locale, or label (e.g. "English [CC]", "en-US", "Spanish (LA)", "Traditional Chinese").
 */
export function extractLanguageName(lang?: string, label?: string): string {
  // 1. Direct or hyphen-split match on lang
  if (lang) {
    const rawLang = lang.trim().toLowerCase();
    if (COMMON_LANGUAGE_MAP[rawLang]) {
      return COMMON_LANGUAGE_MAP[rawLang];
    }
    const cleanLang = rawLang.split(/[-_]/)[0];
    if (COMMON_LANGUAGE_MAP[cleanLang]) {
      return COMMON_LANGUAGE_MAP[cleanLang];
    }
  }

  // 2. Direct or pattern match on label
  if (label) {
    const rawLabel = label.trim().toLowerCase();
    if (COMMON_LANGUAGE_MAP[rawLabel]) {
      return COMMON_LANGUAGE_MAP[rawLabel];
    }

    // Explicit Chinese variants sorting & grouping
    if (/traditional chinese|chinese-trad|chinese\s*\(traditional\)/i.test(rawLabel)) {
      return "Chinese (Traditional)";
    }
    if (/simplified chinese|chinese-simp|chinese\s*\(simplified\)/i.test(rawLabel)) {
      return "Chinese (Simplified)";
    }

    // Explicit Spanish Latin America sorting & grouping
    if (
      /spanish\s*\(la\)|spanish\s*\(latin america\)|spanish\s*latin|latin american spanish|español latino|español\s*\(latinoamérica\)/i.test(
        rawLabel,
      )
    ) {
      return "Spanish (LA)";
    }

    // Explicit Portuguese Brazil sorting & grouping
    if (
      /portuguese\s*\(br\)|portuguese\s*\(brazil\)|portuguese\s*brazil|brazilian portuguese|brazilian/i.test(
        rawLabel,
      )
    ) {
      return "Portuguese (BR)";
    }

    // Dutch normalization (prevent casing duplicates)
    if (/^dutch|^nederlands|^flemish/i.test(rawLabel)) {
      return "Dutch";
    }

    const cleanedLabel = rawLabel
      .replace(/\s*(\[.*?\]|\(.*?\)|-\s*.*|\d+)$/, "")
      .trim();

    if (COMMON_LANGUAGE_MAP[cleanedLabel]) {
      return COMMON_LANGUAGE_MAP[cleanedLabel];
    }

    if (/^english/i.test(cleanedLabel)) return "English";
    if (/^spanish|^español/i.test(cleanedLabel)) return "Spanish";
    if (/^french|^français/i.test(cleanedLabel)) return "French";
    if (/^german|^deutsch/i.test(cleanedLabel)) return "German";
    if (/^italian|^italiano/i.test(cleanedLabel)) return "Italian";
    if (/^portuguese|^português/i.test(cleanedLabel)) return "Portuguese";
    if (/^russian|^русский/i.test(cleanedLabel)) return "Russian";
    if (/^japanese|^日本語/i.test(cleanedLabel)) return "Japanese";
    if (/^korean|^한국어/i.test(cleanedLabel)) return "Korean";
    if (/^chinese|^中文/i.test(cleanedLabel)) return "Chinese (Simplified)";
    if (/^arabic|^العربية/i.test(cleanedLabel)) return "Arabic";
    if (/^hindi|^हिन्दी/i.test(cleanedLabel)) return "Hindi";
    if (/^dutch|^nederlands/i.test(cleanedLabel)) return "Dutch";
    if (/^polish|^polski/i.test(cleanedLabel)) return "Polish";
    if (/^turkish|^türkçe/i.test(cleanedLabel)) return "Turkish";
  }

  // 3. Fallback to Intl.DisplayNames if available
  if (lang) {
    try {
      const cleanLang = lang.trim().toLowerCase().split(/[-_]/)[0];
      if (typeof Intl !== "undefined" && Intl.DisplayNames) {
        const intlName = new Intl.DisplayNames(["en"], { type: "language" }).of(cleanLang);
        if (intlName && !intlName.toLowerCase().startsWith("unknown")) {
          return toTitleCase(intlName);
        }
      }
    } catch {
      // Ignore Intl errors
    }
  }

  // 4. Default cleaned title-cased fallback
  const fallback = label || lang || "Unknown";
  const cleaned = fallback.replace(/\s*(\[.*?\]|\(.*?\)|-\s*.*|\d+)$/, "").trim();
  return toTitleCase(cleaned || fallback);
}

export interface SubtitleTrackLike {
  id: number;
  label: string;
  lang?: string;
}

/**
 * Finds the first subtitle track that matches the viewer's preferred language code or name
 * (e.g. "fr" -> French, "ar" -> Arabic, "en" -> English, "es" -> Spanish).
 */
export function matchSubtitleTrack<T extends SubtitleTrackLike>(
  subtitles: T[],
  preferredLang?: string,
): T | undefined {
  if (!preferredLang || !subtitles || subtitles.length === 0) return undefined;
  const target = preferredLang.trim().toLowerCase();
  const targetCanonical = (COMMON_LANGUAGE_MAP[target] || target).toLowerCase();

  return subtitles.find((s) => {
    if (s.id === -1) return false;
    const sCanonical = extractLanguageName(s.lang, s.label).toLowerCase();
    if (sCanonical === targetCanonical) return true;
    if (s.lang && s.lang.toLowerCase() === target) return true;
    if (s.lang && s.lang.toLowerCase().startsWith(target)) return true;
    if (s.label && s.label.toLowerCase().includes(targetCanonical)) return true;
    return false;
  });
}
