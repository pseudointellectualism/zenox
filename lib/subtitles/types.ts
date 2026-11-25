export type SubtitleSourceType =
  | "wyzie"
  | "opensubs"
  | "granite"
  | "meowtv"
  | "source"
  | "cinejoy"
  | "custom";

export interface RawExternalSubtitle {
  id: string | number;
  url: string;
  language: string;
  display?: string;
  label?: string;
  source: SubtitleSourceType | string;
  type?: "vtt" | "srt";
  isHearingImpaired?: boolean;
}

export interface SubtitleOption {
  id: number;
  label: string;
  lang?: string;
  src?: string;
  content?: string;
  isCustom?: boolean;
  source?: SubtitleSourceType | string;
  type?: "vtt" | "srt";
  isHearingImpaired?: boolean;
}
