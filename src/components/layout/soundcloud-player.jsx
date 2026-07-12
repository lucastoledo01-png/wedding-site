import { useEffect, useRef, useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const WIDGET_API = "https://w.soundcloud.com/player/api.js";

function loadSoundCloudApi() {
  if (window.SC?.Widget) {
    return Promise.resolve(window.SC);
  }

  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${WIDGET_API}"]`);

    window.onSoundCloudWidgetReady = () => resolve(window.SC);

    if (existing) {
      existing.addEventListener("load", () => resolve(window.SC), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_API;
    script.async = true;
    script.onload = () => resolve(window.SC);
    document.head.appendChild(script);
  });
}

export default function SoundCloudPlayer({ url, autoPlay = true, volume = 28 }) {
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const params = new URLSearchParams({
    url,
    auto_play: autoPlay ? "true" : "false",
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

    loadSoundCloudApi().then((SC) => {
      if (cancelled || !iframeRef.current || !SC?.Widget) return;

      const widget = SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      widget.bind(SC.Widget.Events.READY, () => {
        if (cancelled) return;
        setIsReady(true);
        widget.setVolume(volume);
        if (autoPlay) {
          widget.play();
        }
      });

      widget.bind(SC.Widget.Events.PLAY, () => setIsPlaying(true));
      widget.bind(SC.Widget.Events.PAUSE, () => setIsPlaying(false));
      widget.bind(SC.Widget.Events.FINISH, () => setIsPlaying(false));
    });

    return () => {
      cancelled = true;
    };
  }, [autoPlay, url, volume]);

  const toggle = () => {
    if (!widgetRef.current || !isReady) return;

    if (isPlaying) {
      widgetRef.current.pause();
    } else {
      widgetRef.current.setVolume(volume);
      widgetRef.current.play();
    }
  };

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Musica do casamento"
        src={`https://w.soundcloud.com/player/?${params.toString()}`}
        allow="autoplay"
        style={{
          position: "fixed",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          left: 0,
          bottom: 0,
          border: 0,
        }}
      />

      <button
        type="button"
        onClick={toggle}
        className={cn(
          "super-glass fixed right-4 top-4 z-50 rounded-full p-3 shadow-lg transition hover:scale-105 disabled:opacity-60",
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
