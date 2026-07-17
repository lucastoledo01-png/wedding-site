import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const WIDGET_API = "https://w.soundcloud.com/player/api.js";

const isIOS = typeof window !== "undefined" && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
);

function loadSoundCloudApi() {
  if (window.SC?.Widget) {
    return Promise.resolve(window.SC);
  }

  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${WIDGET_API}"]`);

    window.onSoundCloudWidgetReady = () => resolve(window.SC);

    if (existing) {
      existing.addEventListener("load", () => resolve(window.SC), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_API;
    script.async = true;
    script.onload = () => resolve(window.SC);
    document.head.appendChild(script);
  });
}

const shouldAutoPlay = false; // Always start paused to enable gesture sync on click

export default function SoundCloudPlayer({
  url,
  volume = 28,
  loop = true,
  onTrackChange,
  isInvitationOpen = false,
}) {
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const localAudioRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [promptChoiceMade, setPromptChoiceMade] = useState(false);
  const [shouldPlayWhenReady, setShouldPlayWhenReady] = useState(false);
  const [delayedInvitationOpen, setDelayedInvitationOpen] = useState(false);

  useEffect(() => {
    if (isInvitationOpen) {
      const timer = setTimeout(() => {
        setDelayedInvitationOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setDelayedInvitationOpen(false);
    }
  }, [isInvitationOpen]);

  const urls = useMemo(() => {
    if (!url) return [];
    if (Array.isArray(url)) return url;
    return url.split(",").map((s) => s.trim()).filter(Boolean);
  }, [url]);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  useEffect(() => {
    if (onTrackChange) {
      onTrackChange(currentTrackIndex);
    }
  }, [currentTrackIndex, onTrackChange]);

  const currentTrackIndexRef = useRef(0);
  currentTrackIndexRef.current = currentTrackIndex;

  const urlsRef = useRef(urls);
  urlsRef.current = urls;

  const initialTrackUrl = urls[0] || "";

  // Auto-detect local MP3 files vs SoundCloud links
  const isLocal = useMemo(() => {
    const firstUrl = initialTrackUrl.toLowerCase();
    return firstUrl.endsWith(".mp3") || firstUrl.includes("/audio/") || firstUrl.includes(".mp3?");
  }, [initialTrackUrl]);

  const iframeSrc = useMemo(() => {
    if (isLocal) return "";
    const p = new URLSearchParams({
      url: initialTrackUrl,
      auto_play: "false",
      buying: "false",
      liking: "false",
      download: "false",
      sharing: "false",
      show_artwork: "false",
      show_comments: "false",
      show_playcount: "false",
      show_user: "false",
      hide_related: "true",
      visual: "false",
    });
    return `https://w.soundcloud.com/player/?${p.toString()}`;
  }, [initialTrackUrl, isLocal]);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const loopRef = useRef(loop);
  loopRef.current = loop;

  const shouldPlayWhenReadyRef = useRef(shouldPlayWhenReady);
  shouldPlayWhenReadyRef.current = shouldPlayWhenReady;

  // Initialize SoundCloud API (only if not local mode)
  useEffect(() => {
    if (isLocal) {
      setIsReady(true);
      return;
    }

    let cancelled = false;
    setIsReady(false);

    loadSoundCloudApi().then((SC) => {
      if (cancelled || !iframeRef.current || !SC?.Widget) return;

      const widget = SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      widget.bind(SC.Widget.Events.READY, () => {
        if (cancelled) return;
        setIsReady(true);
        widget.setVolume(volumeRef.current);
        if (!isIOS && (shouldAutoPlay || shouldPlayWhenReadyRef.current)) {
          widget.play();
          setShouldPlayWhenReady(false);
        }
      });

      widget.bind(SC.Widget.Events.PLAY, () => {
        setIsPlaying(true);
      });
      widget.bind(SC.Widget.Events.PAUSE, () => {
        setIsPlaying(false);
      });

      widget.bind(SC.Widget.Events.FINISH, () => {
        const nextIndex = currentTrackIndexRef.current + 1;
        const currentUrls = urlsRef.current;

        if (nextIndex < currentUrls.length) {
          setCurrentTrackIndex(nextIndex);
          widget.load(currentUrls[nextIndex], {
            auto_play: true,
            buying: "false",
            liking: "false",
            download: "false",
            sharing: "false",
            show_artwork: "false",
            show_comments: "false",
            show_playcount: "false",
            show_user: "false",
            hide_related: "true",
            visual: "false",
            callback: () => {
              widget.setVolume(volumeRef.current);
              widget.play();
            },
          });
        } else if (loopRef.current) {
          setCurrentTrackIndex(0);
          widget.load(currentUrls[0], {
            auto_play: true,
            buying: "false",
            liking: "false",
            download: "false",
            sharing: "false",
            show_artwork: "false",
            show_comments: "false",
            show_playcount: "false",
            show_user: "false",
            hide_related: "true",
            visual: "false",
            callback: () => {
              widget.setVolume(volumeRef.current);
              widget.play();
            },
          });
        } else {
          setIsPlaying(false);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [initialTrackUrl, isLocal]);

  // Adjust volume for local audio element
  useEffect(() => {
    if (isLocal && localAudioRef.current) {
      localAudioRef.current.volume = volumeRef.current / 100;
    }
  }, [isLocal, currentTrackIndex]);

  // Handle local track completion and transitions
  const handleLocalTrackEnded = useCallback(() => {
    const nextIndex = currentTrackIndexRef.current + 1;
    const currentUrls = urlsRef.current;

    if (nextIndex < currentUrls.length) {
      setCurrentTrackIndex(nextIndex);
      setTimeout(() => {
        if (localAudioRef.current) {
          localAudioRef.current.play().catch(console.error);
        }
      }, 100);
    } else if (loopRef.current) {
      setCurrentTrackIndex(0);
      setTimeout(() => {
        if (localAudioRef.current) {
          localAudioRef.current.play().catch(console.error);
        }
      }, 100);
    } else {
      setIsPlaying(false);
    }
  }, []);

  const play = useCallback(() => {
    if (isLocal) {
      if (localAudioRef.current) {
        localAudioRef.current.play().catch((err) => {
          console.error("Local audio play failed:", err);
        });
      }
    } else {
      if (!widgetRef.current || !isReady) return;
      widgetRef.current.play();
    }
  }, [isLocal, isReady]);

  // Triggers play if player became ready after click
  useEffect(() => {
    if (isReady && shouldPlayWhenReady) {
      play();
      setShouldPlayWhenReady(false);
    }
  }, [isReady, play, shouldPlayWhenReady]);

  // Autoplay track changes when already playing in local mode
  useEffect(() => {
    if (isLocal && isPlaying && localAudioRef.current) {
      localAudioRef.current.play().catch(console.error);
    }
  }, [currentTrackIndex, isLocal, isPlaying]);

  const toggle = () => {
    setPromptChoiceMade(true);
    if (isPlaying) {
      if (isLocal) {
        if (localAudioRef.current) localAudioRef.current.pause();
      } else {
        if (widgetRef.current) widgetRef.current.pause();
      }
    } else {
      play();
    }
  };

  const acceptMusic = () => {
    setPromptChoiceMade(true);
    if (isReady) {
      play();
      return;
    }
    setShouldPlayWhenReady(true);
  };

  const dismissPrompt = () => {
    setPromptChoiceMade(true);
  };

  return (
    <>
      {isLocal ? (
        <audio
          ref={localAudioRef}
          src={urls[currentTrackIndex]}
          preload="auto"
          loop={urls.length === 1 && loop}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleLocalTrackEnded}
        />
      ) : (
        <iframe
          ref={iframeRef}
          title="Musica do casamento"
          src={iframeSrc}
          allow="autoplay"
          style={{
            position: "fixed",
            bottom: "-9999px",
            left: "-9999px",
            width: "10px",
            height: "10px",
            opacity: 0.01,
            pointerEvents: "none",
          }}
        />
      )}

      {delayedInvitationOpen && isReady && (
        <div
          className={cn(
            "fixed right-[4.25rem] top-4 z-50 w-[190px] rounded-2xl border border-white/55 bg-[#fdf8f3]/90 px-3 py-3 text-[#262626] shadow-[0_18px_50px_rgba(38,38,38,0.16)] backdrop-blur-xl transition-all duration-300",
            (promptChoiceMade || isPlaying)
              ? "pointer-events-none scale-95 opacity-0"
              : "scale-100 opacity-100",
          )}
        >
          <div
            className={cn(
              "absolute -right-1.5 top-5 h-3 w-3 rotate-45 border-r border-t border-white/55 bg-[#fdf8f3]/90",
            )}
          />
          <p className={cn("text-sm font-medium leading-tight")}>
            Deseja ouvir nossa playlist?
          </p>
          <div className={cn("mt-2 flex items-center gap-2")}>
            <button
              type="button"
              onClick={acceptMusic}
              className={cn(
                "rounded-full bg-[#ff4582] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#f73576]",
              )}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={dismissPrompt}
              className={cn(
                "rounded-full border border-[#262626]/10 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#262626]/60 transition hover:text-[#262626]",
              )}
            >
              Não
            </button>
          </div>
        </div>
      )}

      {isInvitationOpen && (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "super-glass fixed right-4 top-4 z-50 rounded-full p-3 shadow-lg transition hover:scale-105 disabled:opacity-60",
            !isPlaying && isReady && "animate-pulse",
          )}
          disabled={!isReady}
          aria-label={isPlaying ? "Pausar musica" : "Tocar musica"}
        >
          {isPlaying ? (
            <div className={cn("relative")}>
              <PauseCircle className={cn("h-6 w-6 text-[#262626]")} />
              <span
                className={cn(
                  "absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#ff4582] animate-pulse",
                )}
              />
            </div>
          ) : (
            <PlayCircle className={cn("h-6 w-6 text-[#262626]")} />
          )}
        </button>
      )}
    </>
  );
}
