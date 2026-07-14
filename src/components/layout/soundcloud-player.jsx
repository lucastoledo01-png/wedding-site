import { useCallback, useEffect, useRef, useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const WIDGET_API = "https://w.soundcloud.com/player/api.js";

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

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

export default function SoundCloudPlayer({
  url,
  autoPlay = false,
  volume = 28,
}) {
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [promptChoiceMade, setPromptChoiceMade] = useState(false);
  const [shouldPlayWhenReady, setShouldPlayWhenReady] = useState(false);
  const isIOS = isIOSDevice();
  const shouldAutoPlay = autoPlay && !isIOS;

  const params = new URLSearchParams({
    url,
    auto_play: shouldAutoPlay ? "true" : "false",
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

  useEffect(() => {
    let cancelled = false;
    setIsReady(false);

    loadSoundCloudApi().then((SC) => {
      if (cancelled || !iframeRef.current || !SC?.Widget) return;

      const widget = SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      widget.bind(SC.Widget.Events.READY, () => {
        if (cancelled) return;
        setIsReady(true);
        widget.setVolume(volume);
        if (shouldAutoPlay || shouldPlayWhenReady) {
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
      widget.bind(SC.Widget.Events.FINISH, () => setIsPlaying(false));
    });

    return () => {
      cancelled = true;
    };
  }, [shouldAutoPlay, shouldPlayWhenReady, url, volume]);

  const play = useCallback(() => {
    if (!widgetRef.current || !isReady) return;

    widgetRef.current.setVolume(volume);
    widgetRef.current.play();
  }, [isReady, volume]);

  useEffect(() => {
    if (isReady && shouldPlayWhenReady) {
      play();
      setShouldPlayWhenReady(false);
    }
  }, [isReady, play, shouldPlayWhenReady]);

  const toggle = () => {
    if (!widgetRef.current || !isReady) return;
    setPromptChoiceMade(true);

    if (isPlaying) {
      widgetRef.current.pause();
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

  const showPrompt = isReady && !isPlaying && !promptChoiceMade;

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Musica do casamento"
        src={`https://w.soundcloud.com/player/?${params.toString()}`}
        allow="autoplay"
        className={cn(
          "pointer-events-none fixed bottom-0 left-0 h-px w-px opacity-0",
        )}
      />

      {showPrompt && (
        <div
          className={cn(
            "fixed right-[4.25rem] top-4 z-50 w-[190px] rounded-2xl border border-white/55 bg-[#fdf8f3]/90 px-3 py-3 text-[#262626] shadow-[0_18px_50px_rgba(38,38,38,0.16)] backdrop-blur-xl",
          )}
        >
          <div
            className={cn(
              "absolute -right-1.5 top-5 h-3 w-3 rotate-45 border-r border-t border-white/55 bg-[#fdf8f3]/90",
            )}
          />
          <p className={cn("text-sm font-medium leading-tight")}>
            Deseja ouvir nossa música?
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
    </>
  );
}
