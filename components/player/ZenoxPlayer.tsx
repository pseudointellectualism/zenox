"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2 } from "lucide-react";
import StreamWaitingScreen from "./StreamWaitingScreen";
import ZenoxTopControls from "./controls/ZenoxTopControls";
import ZenoxBottomControls from "./controls/ZenoxBottomControls";
import ZenoxEpisodeDrawer from "./controls/ZenoxEpisodeDrawer";
import ZenoxSubtitleOverlay from "./ZenoxSubtitleOverlay";
import ZenoxSkipOverlay from "./controls/ZenoxSkipOverlay";
import ZenoxPauseOverlay from "./ZenoxPauseOverlay";
import {
  fetchAndParseSubtitles,
  matchSubtitleTrack,
  parseSubtitles,
  type SubtitleCue,
} from "./utils/subtitles";
import type { QualityOption, SubtitleOption, AudioTrackOption } from "./controls/ZenoxSettingsMenu";
import type { PlayerSegment } from "./controls/ZenoxProgressBar";
import {
  DEFAULT_VIDEO_SETTINGS,
  useSettingsStore,
} from "@/lib/store/useSettingsStore";
import { useConnectionsStore } from "@/lib/store/useConnectionsStore";
import { useLibraryStore } from "@/lib/store/useLibraryStore";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import type { MediaDetails, MediaType } from "@/lib/types";
import { fetchPlaybackSession } from "@/lib/stream/client";

interface SubtitleTrackProp {
  label: string;
  src: string;
  lang?: string;
}

interface ZenoxPlayerProps {
  details: MediaDetails;
  mediaType: MediaType;
  src?: string;
  sourceName?: string;
  season?: number;
  episode?: number;
  initialServer?: number;
  subtitleTracks?: SubtitleTrackProp[];
  onEpisodeChange?: (season: number, episode: number) => void;
  onBack?: () => void;
  backHref?: string;
}

const STANDARD_TIERS = ["4K", "1080p", "720p", "480p", "360p", "240p"] as const;
type QualityTier = (typeof STANDARD_TIERS)[number];

function mapHeightToTier(height: number): QualityTier {
  if (height >= 1600) return "4K";
  if (height >= 800) return "1080p";
  if (height >= 550) return "720p";
  if (height >= 400) return "480p";
  if (height >= 260) return "360p"; // 288p, 286p -> 360p
  return "240p"; // 184p -> 240p
}

function resolveBestLevelIndex(
  levels: Array<{ height?: number; bitrate?: number }>,
  preference: string = "auto",
): number {
  if (!levels || levels.length === 0) return -1;

  if (preference === "auto") {
    let bestIdx = 0;
    for (let i = 1; i < levels.length; i++) {
      if ((levels[i].height || 0) > (levels[bestIdx].height || 0)) {
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  const prefTargetTier = preference.toLowerCase();
  const matchIdx = levels.findIndex(
    (lvl) => mapHeightToTier(lvl.height || 0).toLowerCase() === prefTargetTier,
  );
  if (matchIdx !== -1) {
    return matchIdx;
  }

  let targetHeight = 1080;
  if (preference === "720p") targetHeight = 720;
  else if (preference === "480p") targetHeight = 480;
  else if (preference === "360p") targetHeight = 360;

  const eligible = levels
    .map((lvl, idx) => ({ idx, height: lvl.height || 0 }))
    .filter((l) => l.height <= targetHeight);

  if (eligible.length > 0) {
    eligible.sort((a, b) => b.height - a.height);
    return eligible[0].idx;
  }

  let highestIdx = 0;
  for (let i = 1; i < levels.length; i++) {
    if ((levels[i].height || 0) > (levels[highestIdx].height || 0)) {
      highestIdx = i;
    }
  }
  return highestIdx;
}

export default function ZenoxPlayer({
  details,
  mediaType,
  src,
  sourceName = "Bubbles",
  season = 1,
  episode = 1,
  initialServer,
  subtitleTracks,
  onEpisodeChange,
  onBack,
  backHref = "/",
}: ZenoxPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Sync with global settings store
  const defaultVolumeSetting = useSettingsStore((s) => s.defaultVolume) ?? 1.0;
  const subtitlesEnabled = useSettingsStore((s) => s.subtitlesEnabled);
  const subtitleLanguage = useSettingsStore((s) => s.subtitleLanguage) || "en";
  const preferredQuality = useSettingsStore((s) => s.preferredQuality) || "auto";
  const preferredServerPref = useSettingsStore((s) => s.preferredServer) || "primary";
  const defaultServerIdx = typeof initialServer === "number" ? initialServer : (preferredServerPref === "sienna" ? 2 : preferredServerPref === "sydney" ? 1 : 0);
  const resumePlaybackSetting = useSettingsStore((s) => s.resumePlayback) ?? true;
  const videoSettings =
    useSettingsStore((s) => s.videoSettings) ?? DEFAULT_VIDEO_SETTINGS;
  const setSetting = useSettingsStore((s) => s.set);

  // Web Audio volume booster
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const boostRatio = (videoSettings.volumeBoost ?? 100) / 100;
    if (boostRatio > 1.0) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!audioContextRef.current && AudioCtx) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaElementSource(videoRef.current);
          const gain = ctx.createGain();
          source.connect(gain);
          gain.connect(ctx.destination);
          audioContextRef.current = ctx;
          gainNodeRef.current = gain;
        }
        if (
          audioContextRef.current &&
          audioContextRef.current.state === "suspended"
        ) {
          audioContextRef.current.resume();
        }
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = boostRatio;
        }
      } catch (e) {
        console.warn("Volume booster audio node notice:", e);
      }
    } else if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = 1.0;
    }
  }, [videoSettings.volumeBoost]);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(defaultVolumeSetting);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Controls visibility & overlay
  const [showControls, setShowControls] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [episodesDrawerOpen, setEpisodesDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Quality & Subtitles
  const [qualities, setQualities] = useState<QualityOption[]>([
    { id: -1, label: "Auto", available: true },
    ...STANDARD_TIERS.map((tier, idx) => ({
      id: -100 - idx,
      label: tier,
      available: false,
    })),
  ]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);

  const [subtitles, setSubtitles] = useState<SubtitleOption[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1);
  const [activeCues, setActiveCues] = useState<SubtitleCue[]>([]);

  // Audio tracks
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(0);

  // Server selection (0 = Primary, 1 = Sydney)
  const [currentServer, setCurrentServer] = useState<number>(defaultServerIdx);
  const [activeSrc, setActiveSrc] = useState<string | undefined>(src);
  const resumePositionRef = useRef<number>(0);
  const hasFallenOverRef = useRef<boolean>(false);

  // TheIntroDB segments
  const theintrodbEnabled = useConnectionsStore((s) => s.theintrodb?.enabled ?? true);
  const [segments, setSegments] = useState<PlayerSegment[]>([]);

  useEffect(() => {
    if (!theintrodbEnabled || !details?.id) {
      setSegments([]);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams();
    params.set("tmdb_id", String(details.id));
    if (mediaType === "tv" && season) {
      params.set("season", String(season));
      params.set("episode", String(episode || 1));
    }

    const parseTidbData = (data: any): PlayerSegment[] => {
      const parsed: PlayerSegment[] = [];
      // intro
      if (Array.isArray(data?.intro)) {
        for (const item of data.intro) {
          if (typeof item.end_ms === "number") {
            parsed.push({
              type: "intro",
              start: item.start_ms ? item.start_ms / 1000 : 0,
              end: item.end_ms / 1000,
              label: "Intro",
            });
          }
        }
      }
      // recap
      if (Array.isArray(data?.recap)) {
        for (const item of data.recap) {
          if (typeof item.end_ms === "number") {
            parsed.push({
              type: "recap",
              start: item.start_ms ? item.start_ms / 1000 : 0,
              end: item.end_ms / 1000,
              label: "Recap",
            });
          }
        }
      }
      // credits
      if (Array.isArray(data?.credits)) {
        for (const item of data.credits) {
          if (typeof item.start_ms === "number") {
            parsed.push({
              type: "credits",
              start: item.start_ms / 1000,
              end: item.end_ms ? item.end_ms / 1000 : 999999,
              label: "Credits",
            });
          }
        }
      }
      // preview
      if (Array.isArray(data?.preview)) {
        for (const item of data.preview) {
          if (typeof item.end_ms === "number") {
            parsed.push({
              type: "preview",
              start: item.start_ms ? item.start_ms / 1000 : 0,
              end: item.end_ms / 1000,
              label: "Preview",
            });
          }
        }
      }
      return parsed;
    };

    // Query server proxy endpoint which normalizes 404s to { intro: [] } and caches responses
    fetch(`/api/integrations/theintrodb?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const parsed = parseTidbData(data);
        setSegments(parsed);
      })
      .catch(() => {
        if (!cancelled) {
          setSegments([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [theintrodbEnabled, details?.id, mediaType, season, episode]);

  useEffect(() => {
    hasFallenOverRef.current = false;
  }, [details?.id, season, episode]);

  // Check and restore resume position from user's playback mark
  useEffect(() => {
    if (!resumePlaybackSetting || !details?.id) return;
    const mark = usePlayerStore.getState().getMark(mediaType, details.id);
    if (mark && mark.positionSeconds > 5) {
      if (mediaType === "tv") {
        if (mark.season === season && mark.episode === episode) {
          resumePositionRef.current = mark.positionSeconds;
        }
      } else {
        resumePositionRef.current = mark.positionSeconds;
      }
    }
  }, [details?.id, mediaType, season, episode, resumePlaybackSetting]);

  useEffect(() => {
    setActiveSrc(src);
  }, [src]);

  const handleSelectServer = useCallback(
    async (serverId: number) => {
      if (serverId === currentServer) return;

      const currentPos = videoRef.current?.currentTime || currentTime || 0;
      resumePositionRef.current = currentPos;
      setCurrentServer(serverId);
      setIsBuffering(true);
      setLoadError(null);

      try {
        const newStreamUrl = await fetchPlaybackSession({
          mediaId: details.id,
          mediaType,
          season,
          episode,
          serverIndex: serverId,
          title: details.title,
          year: details.releaseDate ? details.releaseDate.slice(0, 4) : undefined,
          imdbId: details.imdbId || undefined,
        });

        const srvName = serverId === 2 ? "Sienna" : serverId === 1 ? "Sydney" : "Stellar";
        if (newStreamUrl) {
          setActiveSrc(newStreamUrl);
        } else {
          setLoadError(
            `Server "${srvName}" is currently unavailable. Try switching back.`
          );
          setIsBuffering(false);
        }
      } catch {
        const srvName = serverId === 2 ? "Sienna" : serverId === 1 ? "Sydney" : "Stellar";
        setLoadError(
          `Failed to connect to ${srvName}.`
        );
        setIsBuffering(false);
      }
    },
    [currentServer, currentTime, details.id, details.imdbId, details.releaseDate, details.title, episode, mediaType, season]
  );

  // Sync volume with defaultVolumeSetting if it changes in settings
  useEffect(() => {
    setVolume(defaultVolumeSetting);
    if (videoRef.current) {
      videoRef.current.volume = defaultVolumeSetting;
    }
  }, [defaultVolumeSetting]);

  // Reset controls timer
  const triggerShowControls = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    if (!isScrubbing && isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isScrubbing]);

  // Setup video stream with hls.js or direct MP4/WebM
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Apply default volume from settings
    video.volume = defaultVolumeSetting;

    const effectiveSrc = activeSrc;
    if (!effectiveSrc) {
      setIsBuffering(true);
      return;
    }

    // Reset states
    setIsBuffering(true);
    setHasStartedPlayback(false);
    setLoadError(null);
    setCurrentTime(0);

    // Watchdog timeout: if stream does not start playing within 22s, display error screen instead of spinning forever
    const streamTimeout = setTimeout(() => {
      if (!hasStartedPlayback && (!videoRef.current || videoRef.current.currentTime === 0)) {
        setIsBuffering(false);
        setLoadError("Stream connection timed out. No working stream found from upstream providers for this title.");
      }
    }, 22000);

    // Destroy existing Hls instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsStream =
      effectiveSrc.includes(".m3u8") ||
      effectiveSrc.includes("m3u8") ||
      effectiveSrc.includes("/api/v1/stream/") ||
      effectiveSrc.includes("z_");

    video.autoplay = true;

    const attemptAutoplay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsBuffering(false);
            setIsPlaying(true);
            setHasStartedPlayback(true);
          })
          .catch(() => {
            // Autoplay with audio was not allowed yet (e.g. cold page refresh)
            setIsBuffering(false);
            setIsPlaying(false);
          });
      }
    };

    const onCanPlay = () => {
      if (video.paused) {
        attemptAutoplay();
      }
    };
    video.addEventListener("canplay", onCanPlay, { once: true });

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(effectiveSrc);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);

        if (resumePositionRef.current > 0 && videoRef.current) {
          videoRef.current.currentTime = resumePositionRef.current;
          resumePositionRef.current = 0;
        }

        // Populate standard quality tiers with availability mapping
        const mappedQualities: QualityOption[] = [
          { id: -1, label: "Auto", available: true },
          ...STANDARD_TIERS.map((tier, idx) => {
            const matchIndex = data.levels.findIndex(
              (lvl) => mapHeightToTier(lvl.height || 0) === tier,
            );
            if (matchIndex !== -1) {
              return {
                id: matchIndex,
                label: tier,
                height: data.levels[matchIndex].height,
                bitrate: data.levels[matchIndex].bitrate,
                available: true,
              };
            }
            return {
              id: -100 - idx,
              label: tier,
              available: false,
            };
          }),
        ];

        setQualities(mappedQualities);

        // Apply preferred quality to Auto level selection
        const bestLevel = resolveBestLevelIndex(data.levels, preferredQuality);
        if (bestLevel !== -1) {
          hls.startLevel = bestLevel;
          hls.nextLevel = bestLevel;
          hls.loadLevel = bestLevel;
          hls.autoLevelCapping = bestLevel;
        }
        hls.currentLevel = -1;
        setCurrentQuality(-1);

        // Check if HLS manifest already had subtitles
        const hlsSubs: SubtitleOption[] = (hls.subtitleTracks || []).map((track, i) => ({
          id: i,
          label: track.name || track.lang || `Track ${i + 1}`,
          lang: track.lang,
          source: "source",
        }));
        const externalSubs: SubtitleOption[] = (subtitleTracks || []).map((ext, idx) => ({
          id: 1000 + idx,
          label: ext.label,
          lang: ext.lang,
          src: ext.src,
          source: "source",
        }));
        const combined = [...hlsSubs, ...externalSubs];

        setSubtitles((prev) => {
          const customSubs = prev.filter((s) => s.isCustom);
          const extSubs = prev.filter((s) => s.source && s.source !== "source");
          return [...customSubs, ...combined, ...extSubs];
        });

        // Detect audio tracks from HLS manifest
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          const tracks: AudioTrackOption[] = hls.audioTracks.map((track, i) => ({
            id: i,
            label: track.name || track.lang || `Track ${i + 1}`,
            lang: track.lang || "unknown",
          }));
          setAudioTracks(tracks);
          setCurrentAudioTrack(hls.audioTrack >= 0 ? hls.audioTrack : 0);
        } else {
          setAudioTracks([]);
        }

        attemptAutoplay();
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          const tracks: AudioTrackOption[] = data.audioTracks.map((track, i) => ({
            id: i,
            label: track.name || track.lang || `Track ${i + 1}`,
            lang: track.lang || "unknown",
          }));
          setAudioTracks(tracks);
          setCurrentAudioTrack(hls.audioTrack >= 0 ? hls.audioTrack : 0);
        } else {
          setAudioTracks([]);
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        setCurrentAudioTrack(data.id);
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        const hlsSubs: SubtitleOption[] = data.subtitleTracks.map((track, i) => ({
          id: i,
          label: track.name || track.lang || `Track ${i + 1}`,
          lang: track.lang,
          source: "source",
        }));

        const externalSubs: SubtitleOption[] = (subtitleTracks || []).map((ext, idx) => ({
          id: 1000 + idx,
          label: ext.label,
          lang: ext.lang,
          src: ext.src,
          source: "source",
        }));

        const combined = [...hlsSubs, ...externalSubs];

        setSubtitles((prev) => {
          const customSubs = prev.filter((s) => s.isCustom);
          const extSubs = prev.filter((s) => s.source && s.source !== "source");
          return [...customSubs, ...combined, ...extSubs];
        });
      });

      let networkErrorCount = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          // If playback hasn't started and we haven't failed over yet, auto-switch silently to the alternate server
          if (!hasStartedPlayback && !hasFallenOverRef.current) {
            hasFallenOverRef.current = true;
            const fallbackServer = currentServer === 0 ? 1 : currentServer === 1 ? 2 : 0;
            console.warn(`[AutoFailover] Initial stream failed on server ${currentServer}, silently falling back to server ${fallbackServer}`);
            handleSelectServer(fallbackServer);
            return;
          }

          setIsBuffering(false);
          const responseCode = data.response?.code;

          // HTTP 404, 502, 503, 504 means the stream is not available upstream
          if (responseCode === 404 || responseCode === 502 || responseCode === 503 || responseCode === 504) {
            setLoadError("Stream is currently unavailable for this title. No working source found on servers.");
            hls.destroy();
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCount++;
              if (networkErrorCount > 2 || !hasStartedPlayback) {
                setLoadError("Unable to connect to stream server. No working stream found for this title.");
                hls.destroy();
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setLoadError(`Unable to load stream (${data.details || "network error"})`);
              hls.destroy();
              break;
          }
        }
      });
    } else if (isHlsStream && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS
      video.src = effectiveSrc;
      const onLoaded = () => {
        setIsBuffering(false);
        const v = video as HTMLVideoElement & {
          audioTracks?: Array<{ label: string; language: string; enabled: boolean }>;
        };
        if (v.audioTracks && v.audioTracks.length > 0) {
          const tracks: AudioTrackOption[] = [];
          for (let i = 0; i < v.audioTracks.length; i++) {
            const at = v.audioTracks[i];
            tracks.push({
              id: i,
              label: at.label || at.language || `Track ${i + 1}`,
              lang: at.language || "unknown",
            });
            if (at.enabled) {
              setCurrentAudioTrack(i);
            }
          }
          setAudioTracks(tracks);
        } else {
          setAudioTracks([]);
        }
        if (resumePositionRef.current > 0 && videoRef.current) {
          videoRef.current.currentTime = resumePositionRef.current;
          resumePositionRef.current = 0;
        }
        attemptAutoplay();
      };
      video.addEventListener("loadedmetadata", onLoaded);

      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
      };
    } else {
      // Direct MP4 / WebM video file
      video.src = effectiveSrc;
      video.load();

      const onCanPlay = () => {
        setIsBuffering(false);
        const v = video as HTMLVideoElement & {
          audioTracks?: Array<{ label: string; language: string; enabled: boolean }>;
        };
        if (v.audioTracks && v.audioTracks.length > 0) {
          const tracks: AudioTrackOption[] = [];
          for (let i = 0; i < v.audioTracks.length; i++) {
            const at = v.audioTracks[i];
            tracks.push({
              id: i,
              label: at.label || at.language || `Track ${i + 1}`,
              lang: at.language || "unknown",
            });
            if (at.enabled) {
              setCurrentAudioTrack(i);
            }
          }
          setAudioTracks(tracks);
        } else {
          setAudioTracks([]);
        }
        if (resumePositionRef.current > 0 && videoRef.current) {
          videoRef.current.currentTime = resumePositionRef.current;
          resumePositionRef.current = 0;
        }
        attemptAutoplay();
      };
      video.addEventListener("canplay", onCanPlay);

      // Default quality options for single file
      setQualities([
        { id: -1, label: "Auto", available: true },
        { id: 0, label: "1080p", available: true },
        ...STANDARD_TIERS.filter((t) => t !== "1080p").map((tier, idx) => ({
          id: -100 - idx,
          label: tier,
          available: false,
        })),
      ]);

      const externalSubs: SubtitleOption[] = (subtitleTracks || []).map((ext, idx) => ({
        id: 1000 + idx,
        label: ext.label,
        lang: ext.lang,
        src: ext.src,
        source: "source",
      }));
      setSubtitles((prev) => {
        const customSubs = prev.filter((s) => s.isCustom);
        const extSubs = prev.filter((s) => s.source && s.source !== "source");
        return [...customSubs, ...externalSubs, ...extSubs];
      });

      return () => {
        clearTimeout(streamTimeout);
        video.removeEventListener("canplay", onCanPlay);
      };
    }

    return () => {
      clearTimeout(streamTimeout);
      video.removeEventListener("canplay", onCanPlay);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeSrc, details?.id, retryCount, subtitleTracks]);

  // Fetch real external subtitles (MeowTV, Wyzie, Granite, OpenSubtitles)
  useEffect(() => {
    if (!details?.id) return;
    let isCurrent = true;

    const query = new URLSearchParams();
    query.set("tmdbId", String(details.id));
    query.set("mediaType", mediaType);
    if (mediaType === "tv" && season && episode) {
      query.set("season", String(season));
      query.set("episode", String(episode));
    }

    fetch(`/api/v1/subtitles?${query.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isCurrent || !data.success || !Array.isArray(data.subtitles)) return;
        setSubtitles((prev) => {
          const customSubs = prev.filter((s) => s.isCustom);
          const sourceSubs = prev.filter((s) => s.source === "source" || s.source === "cinejoy");
          const externalSubs: SubtitleOption[] = data.subtitles;

          const combined = [...customSubs, ...sourceSubs, ...externalSubs];
          return combined.map((item, idx) => ({
            ...item,
            id: item.id ?? idx + 1,
          }));
        });
      })
      .catch((err) => {
        console.warn("[ZenoxPlayer] Subtitles fetch error:", err);
      });

    return () => {
      isCurrent = false;
    };
  }, [details?.id, mediaType, season, episode]);

  // Progress saving helper
  const lastSavedTimeRef = useRef<number>(0);

  const savePlaybackProgress = useCallback(
    (pos: number, dur: number) => {
      if (!details?.id || dur <= 0 || pos <= 0) return;
      // Record progress into library store (for My List & Continue Watching)
      useLibraryStore.getState().recordProgress(details, {
        positionSeconds: pos,
        durationSeconds: dur,
        season: mediaType === "tv" ? season : undefined,
        episode: mediaType === "tv" ? episode : undefined,
      });

      // Save mark into player store (for instant resume)
      usePlayerStore.getState().saveMark(mediaType, details.id, {
        positionSeconds: pos,
        durationSeconds: dur,
        season: mediaType === "tv" ? season : undefined,
        episode: mediaType === "tv" ? episode : undefined,
      });
    },
    [details, mediaType, season, episode],
  );

  // Video event handlers
  const handlePlay = () => {
    setIsPlaying(true);
    setHasStartedPlayback(true);
    triggerShowControls();
  };

  const handlePause = () => {
    setIsPlaying(false);
    triggerShowControls();
    if (videoRef.current) {
      savePlaybackProgress(videoRef.current.currentTime, videoRef.current.duration || duration);
    }
  };

  // Save progress when unmounting
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.currentTime > 5) {
        savePlaybackProgress(videoRef.current.currentTime, videoRef.current.duration || duration);
      }
    };
  }, [savePlaybackProgress, duration]);

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    setIsPlaying(true);
    setHasStartedPlayback(true);
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isScrubbing) return;
    setCurrentTime(video.currentTime);
    if (video.currentTime > 0.1 && !hasStartedPlayback) {
      setHasStartedPlayback(true);
    }

    // Periodically save playback progress every 4 seconds
    if (Math.abs(video.currentTime - lastSavedTimeRef.current) >= 4) {
      lastSavedTimeRef.current = video.currentTime;
      savePlaybackProgress(video.currentTime, video.duration || duration);
    }

    // Update buffered ranges
    if (video.buffered.length > 0) {
      for (let i = video.buffered.length - 1; i >= 0; i--) {
        if (video.buffered.start(i) <= video.currentTime) {
          setBuffered(video.buffered.end(i));
          break;
        }
      }
    }
  };

  const handleDurationChange = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
  };

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      video.play().catch(() => { });
    } else {
      video.pause();
    }
    triggerShowControls();
  }, [triggerShowControls]);

  // Seek time
  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, time));
    setCurrentTime(video.currentTime);
  }, []);

  // Skip relative seconds (+10s, -10s)
  const handleSkip = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(
        0,
        Math.min(video.duration || 0, video.currentTime + seconds),
      );
      setCurrentTime(video.currentTime);
      triggerShowControls();
    },
    [triggerShowControls],
  );

  // Volume & Mute with bidirectional sync to useSettingsStore
  const handleVolumeChange = useCallback(
    (newVol: number) => {
      const video = videoRef.current;
      if (!video) return;
      const clamped = Math.max(0, Math.min(1, newVol));
      video.volume = clamped;
      setVolume(clamped);
      setSetting("defaultVolume", clamped);
      if (clamped > 0 && video.muted) {
        video.muted = false;
        setIsMuted(false);
      }
    },
    [setSetting],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  // Playback rate
  const handleSelectPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  // Quality selector
  const handleSelectQuality = useCallback(
    (id: number) => {
      if (id < -1) return; // disabled / unavailable tier
      setCurrentQuality(id);
      if (hlsRef.current) {
        if (id === -1) {
          // Auto mode: set ABR and target highest / preferred quality level
          const bestLevel = resolveBestLevelIndex(
            hlsRef.current.levels,
            preferredQuality,
          );
          if (bestLevel !== -1) {
            hlsRef.current.autoLevelCapping = bestLevel;
            hlsRef.current.nextLevel = bestLevel;
            hlsRef.current.loadLevel = bestLevel;
          } else {
            hlsRef.current.autoLevelCapping = -1;
          }
          hlsRef.current.currentLevel = -1;
        } else {
          // Manual quality override
          hlsRef.current.autoLevelCapping = -1;
          hlsRef.current.currentLevel = id;
        }
      }
    },
    [preferredQuality],
  );



  // Subtitles selector (supports default demo captions, HLS embedded tracks, and external .vtt / .srt files)
  const handleSelectSubtitle = useCallback(
    async (id: number) => {
      setCurrentSubtitle(id);

      if (id === -1) {
        // Turn off
        setActiveCues([]);
        if (hlsRef.current) {
          hlsRef.current.subtitleTrack = -1;
        }
        return;
      }

      const selected = subtitles.find((s) => s.id === id);
      if (selected) {
        if (selected.content) {
          if (hlsRef.current) {
            hlsRef.current.subtitleTrack = -1;
          }
          const cues = parseSubtitles(selected.content);
          setActiveCues(cues);
          return;
        }
        if (selected.src) {
          // External .vtt or .srt file
          if (hlsRef.current) {
            hlsRef.current.subtitleTrack = -1;
          }
          const cues = await fetchAndParseSubtitles(selected.src);
          setActiveCues(cues);
          return;
        }
      }

      // HLS embedded track
      setActiveCues([]);
      if (hlsRef.current) {
        hlsRef.current.subtitleTrack = id;
      }
    },
    [subtitles],
  );

  // Auto-select preferred subtitle track when subtitles are enabled in settings
  const hasAutoSelectedSubsRef = useRef(false);

  useEffect(() => {
    hasAutoSelectedSubsRef.current = false;
  }, [details?.id, season, episode]);

  useEffect(() => {
    if (!subtitlesEnabled || hasAutoSelectedSubsRef.current || currentSubtitle !== -1) return;
    if (!subtitles || subtitles.length === 0) return;

    const matched = matchSubtitleTrack(subtitles, subtitleLanguage);
    if (matched) {
      hasAutoSelectedSubsRef.current = true;
      handleSelectSubtitle(matched.id);
    }
  }, [subtitles, subtitlesEnabled, subtitleLanguage, currentSubtitle, handleSelectSubtitle]);

  const handleUploadSubtitle = useCallback(
    (track: SubtitleOption, cues?: SubtitleCue[]) => {
      setSubtitles((prev) => [track, ...prev.filter((s) => s.id !== track.id)]);
      setCurrentSubtitle(track.id);
      if (hlsRef.current) {
        hlsRef.current.subtitleTrack = -1;
      }
      if (cues && cues.length > 0) {
        setActiveCues(cues);
      } else if (track.content) {
        setActiveCues(parseSubtitles(track.content));
      }
    },
    [],
  );

  // Audio track change
  const handleSelectAudioTrack = useCallback((id: number) => {
    setCurrentAudioTrack(id);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = id;
    } else if (videoRef.current) {
      const v = videoRef.current as HTMLVideoElement & {
        audioTracks?: Array<{ enabled: boolean }>;
      };
      if (v.audioTracks && v.audioTracks.length > id) {
        for (let i = 0; i < v.audioTracks.length; i++) {
          v.audioTracks[i].enabled = i === id;
        }
      }
    }
  }, []);

  // Fullscreen toggle with iOS WebKit fallback
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const doc = document as any;
    const isCurrentlyFullscreen =
      !!doc.fullscreenElement ||
      !!doc.webkitFullscreenElement ||
      !!doc.mozFullScreenElement ||
      !!doc.msFullscreenElement ||
      !!(video as any)?.webkitDisplayingFullscreen;

    if (isCurrentlyFullscreen) {
      if ((video as any)?.webkitDisplayingFullscreen && typeof (video as any).webkitExitFullscreen === "function") {
        try {
          (video as any).webkitExitFullscreen();
          setIsFullscreen(false);
          return;
        } catch {}
      }
      if (doc.exitFullscreen) {
        await doc.exitFullscreen().catch(() => { });
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      setIsFullscreen(false);
      return;
    }

    // Entering fullscreen:
    // 1. Standard HTML5 Container Fullscreen
    if (container.requestFullscreen) {
      try {
        await container.requestFullscreen();
        setIsFullscreen(true);
        return;
      } catch (err) {
        console.warn("container.requestFullscreen error:", err);
      }
    }

    // 2. WebKit prefixed Container Fullscreen (iPad / Safari desktop)
    if ((container as any).webkitRequestFullscreen) {
      try {
        (container as any).webkitRequestFullscreen();
        setIsFullscreen(true);
        return;
      } catch (err) {
        console.warn("container.webkitRequestFullscreen error:", err);
      }
    }

    // 3. iOS Video Native Fullscreen (iPhone Safari)
    if (video && typeof (video as any).webkitEnterFullscreen === "function") {
      try {
        (video as any).webkitEnterFullscreen();
        setIsFullscreen(true);
        return;
      } catch (err) {
        console.warn("video.webkitEnterFullscreen error:", err);
      }
    }
  }, []);

  // Sync fullscreen change listener across standard and iOS WebKit events
  useEffect(() => {
    const doc = document as any;
    const video = videoRef.current;

    const onFullscreenChange = () => {
      const isFs =
        !!doc.fullscreenElement ||
        !!doc.webkitFullscreenElement ||
        !!doc.mozFullScreenElement ||
        !!doc.msFullscreenElement ||
        !!(video as any)?.webkitDisplayingFullscreen;
      setIsFullscreen(isFs);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);

    const onWebkitBegin = () => setIsFullscreen(true);
    const onWebkitEnd = () => setIsFullscreen(false);

    if (video) {
      video.addEventListener("webkitbeginfullscreen", onWebkitBegin);
      video.addEventListener("webkitendfullscreen", onWebkitEnd);
    }

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", onWebkitBegin);
        video.removeEventListener("webkitendfullscreen", onWebkitEnd);
      }
    };
  }, []);

  // Picture in Picture
  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => { });
    } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
      await video.requestPictureInPicture().catch(() => { });
    }
  }, []);

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          handleSkip(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          handleSkip(10);
          break;
        case "arrowup":
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          triggerShowControls();
          break;
        case "arrowdown":
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          triggerShowControls();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    toggleFullscreen,
    toggleMute,
    handleSkip,
    handleVolumeChange,
    volume,
    triggerShowControls,
  ]);

  // Click & Double-click on video screen target
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsWereVisibleOnTouchRef = useRef<boolean>(true);
  const lastScreenTapTimeRef = useRef<number>(0);

  const handleTouchStart = () => {
    controlsWereVisibleOnTouchRef.current = showControls;
    triggerShowControls();
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If settings is open, clicking on the screen closes it first and DOES NOT pause
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    const now = Date.now();
    const isDoubleTap = now - lastScreenTapTimeRef.current < 320;
    lastScreenTapTimeRef.current = now;

    if (isDoubleTap) {
      // Double click / Double tap!
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      if (ratio < 0.35) {
        handleSkip(-10);
      } else if (ratio > 0.65) {
        handleSkip(10);
      } else {
        toggleFullscreen();
      }
      triggerShowControls();
      return;
    }

    // If controls were hidden before this tap occurred, first tap only hovers / reveals controls
    if (!controlsWereVisibleOnTouchRef.current || !showControls) {
      controlsWereVisibleOnTouchRef.current = true;
      triggerShowControls();
      return;
    }

    const video = videoRef.current;
    if (video && (video.paused || video.ended)) {
      // If paused, play immediately without delay
      togglePlay();
    } else {
      // Single click when playing: toggle play after 250ms (permits double-click)
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        togglePlay();
      }, 250);
    }
  };

  const hasNextEpisode =
    mediaType === "tv" &&
    details.seasons &&
    details.seasons.length > 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={() => {
        controlsWereVisibleOnTouchRef.current = true;
        triggerShowControls();
      }}
      onTouchStart={handleTouchStart}
      className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-black select-none cursor-default"
    >
      {/* HTML5 Video Layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        crossOrigin="anonymous"
        preload="auto"
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onEnded={() => {
          setIsPlaying(false);
          const autoplay = useSettingsStore.getState().autoplayNext ?? true;
          if (autoplay && hasNextEpisode && onEpisodeChange) {
            onEpisodeChange(season, episode + 1);
          }
        }}
        onError={() => {
          setIsBuffering(false);
          if (!hasStartedPlayback) {
            setLoadError("Unable to play video stream. No working source found on servers for this title.");
          }
        }}
        style={{
          filter: `brightness(${videoSettings.brightness}%) contrast(${videoSettings.contrast}%) saturate(${videoSettings.saturation}%) hue-rotate(${videoSettings.hue}deg)`,
        }}
        className="size-full max-h-dvh object-contain transition-[filter] duration-150"
      />

      {/* Screen Click Target */}
      <div
        onClick={handleScreenClick}
        className="absolute inset-0 z-10 cursor-default"
      />

      {/* Subtitles Overlay */}
      <ZenoxSubtitleOverlay
        cues={activeCues}
        currentTime={currentTime}
        controlsVisible={showControls}
      />

      {/* Dynamic Animated Waiting Screen (fades away once stream plays) */}
      <StreamWaitingScreen
        isReady={hasStartedPlayback}
        sourceName={currentServer === 2 ? "Sienna" : currentServer === 1 ? "Sydney" : "Stellar"}
        title={details?.title}
        season={mediaType === "tv" ? season : undefined}
        episode={mediaType === "tv" ? episode : undefined}
        onBack={onBack}
        hasError={!!loadError}
      />

      {/* Mid-Stream Buffering Spinner (only appears during playback hiccups) */}
      {isBuffering && hasStartedPlayback && !loadError && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/30">
          <Loader2 className="size-12 sm:size-14 animate-spin text-primary drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]" />
        </div>
      )}

      {/* Playback Error */}
      {loadError && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/85 p-6 backdrop-blur-md">
          <div className="flex max-w-md flex-col items-center gap-3 text-center">
            <p className="text-title-lg font-bold text-white">Playback Error</p>
            <p className="text-body-md text-white/60">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setHasStartedPlayback(false);
                setIsBuffering(true);
                setRetryCount((c) => c + 1);
              }}
              className="mt-3 rounded-full bg-primary px-6 py-2.5 text-label-md font-bold text-on-primary transition-transform hover:scale-105 active:scale-95"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Top & Bottom Controls Overlays */}
      <div
        className={`pointer-events-none absolute inset-0 z-30 flex flex-col justify-between transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"
          }`}
      >
        {/* Top gradient vignette + controls */}
        <div className="pointer-events-auto w-full bg-gradient-to-b from-black/90 via-black/40 to-transparent pb-8">
          <ZenoxTopControls
            title={details.title}
            mediaType={mediaType}
            year={details.releaseDate ? details.releaseDate.slice(0, 4) : null}
            season={season}
            episode={episode}
            onBack={onBack}
            backHref={backHref}
          />
        </div>

        {/* Bottom gradient vignette + controls */}
        <div className="pointer-events-auto w-full bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-12">
          <ZenoxBottomControls
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onSkip={handleSkip}
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            onSeek={handleSeek}
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onTogglePip={togglePip}
            qualities={qualities}
            currentQuality={currentQuality}
            onSelectQuality={handleSelectQuality}
            currentServer={currentServer}
            onSelectServer={handleSelectServer}
            subtitles={subtitles}
            currentSubtitle={currentSubtitle}
            onSelectSubtitle={handleSelectSubtitle}
            onUploadSubtitle={handleUploadSubtitle}
            playbackRate={playbackRate}
            onSelectPlaybackRate={handleSelectPlaybackRate}
            audioTracks={audioTracks}
            currentAudioTrack={currentAudioTrack}
            onSelectAudioTrack={handleSelectAudioTrack}
            mediaType={mediaType}
            hasNextEpisode={hasNextEpisode}
            onNextEpisode={() => onEpisodeChange?.(season, episode + 1)}
            onOpenEpisodes={() => setEpisodesDrawerOpen(true)}
            onScrubStart={() => setIsScrubbing(true)}
            onScrubEnd={() => setIsScrubbing(false)}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen((prev) => !prev)}
            onCloseSettings={() => setSettingsOpen(false)}
            tmdbId={details?.id}
            mediaTitle={details?.title}
            season={season}
            episode={episode}
            releaseYear={details?.releaseDate ? new Date(details.releaseDate).getFullYear() : undefined}
            segments={segments}
          />
        </div>
      </div>

      {/* Floating Skip Content / Next Episode Countdown Overlay (z-50 on top of controls so 100% clickable) */}
      <ZenoxSkipOverlay
        currentTime={currentTime}
        duration={duration}
        segments={segments}
        mediaType={mediaType}
        hasNextEpisode={hasNextEpisode}
        onNextEpisode={() => onEpisodeChange?.(season, episode + 1)}
        onSeek={handleSeek}
        season={season}
        episode={episode}
        controlsVisible={showControls}
        isPlaying={isPlaying}
      />

      {/* Cinematic Pause Overlay (appears after customized delay when paused; never on loading screen) */}
      {hasStartedPlayback && !isBuffering && (
        <ZenoxPauseOverlay
          details={details}
          mediaType={mediaType}
          season={season}
          episode={episode}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          hasStartedPlayback={hasStartedPlayback}
          isBuffering={isBuffering}
          onResume={togglePlay}
          onSeek={handleSeek}
        />
      )}

      {/* In-Player TV Episode Drawer */}
      {mediaType === "tv" && (
        <ZenoxEpisodeDrawer
          open={episodesDrawerOpen}
          onClose={() => setEpisodesDrawerOpen(false)}
          details={details}
          currentSeason={season}
          currentEpisode={episode}
          onSelectEpisode={(s, ep) => onEpisodeChange?.(s, ep)}
        />
      )}
    </div>
  );
}
