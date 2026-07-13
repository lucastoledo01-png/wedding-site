import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useConfig } from "@/features/invitation/hooks/use-config";
import { cn } from "@/lib/utils";
import { getCountdownTimeLeft } from "@/lib/countdown";

export default function InvitationFooter() {
  const config = useConfig();
  const ceremonyTime = config.agenda?.[0]?.startTime || "20:00";
  const [timeLeft, setTimeLeft] = useState(() =>
    getCountdownTimeLeft(config.date, ceremonyTime),
  );
  const isFinished = Object.values(timeLeft).every((value) => value === 0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getCountdownTimeLeft(config.date, ceremonyTime));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [config.date, ceremonyTime]);

  return (
    <footer
      className={cn(
        "relative overflow-hidden bg-[#f5f0eb] px-5 pb-12 pt-16 text-center",
      )}
    >
      <div className={cn("mx-auto max-w-sm")}>
        <p className={cn("super-label text-[#ff4582]")}>Contagem regressiva</p>
        <div
          className={cn(
            "mt-5 rounded-[28px] border border-[#262626]/10 bg-[#fdf8f3]/80 px-4 py-5 backdrop-blur-xl",
          )}
        >
          <div className={cn("mb-4 flex items-center justify-center gap-2")}>
            <span className={cn("h-px w-10 bg-[#262626]/10")} />
            <Heart className={cn("h-4 w-4 fill-[#ff4582] text-[#ff4582]")} />
            <span className={cn("h-px w-10 bg-[#262626]/10")} />
          </div>
          {isFinished ? (
            <p
              className={cn(
                "py-2 text-center text-xl font-medium text-[#ff4582]",
              )}
            >
              Chegou a hora! 🎉
            </p>
          ) : (
            <div className={cn("grid grid-cols-4")}>
              {Object.entries(timeLeft).map(([label, value]) => (
                <div
                  key={label}
                  className={cn(
                    "relative text-center after:absolute after:right-0 after:top-1/2 after:h-8 after:w-px after:-translate-y-1/2 after:bg-[#262626]/10 last:after:hidden",
                  )}
                >
                  <p
                    className={cn(
                      "text-2xl font-light leading-none tabular-nums text-[#ff4582]",
                    )}
                  >
                    {String(value).padStart(2, "0")}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[8px] font-normal uppercase tracking-[0.2em] text-[#262626]/45",
                    )}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className={cn("mt-6 text-sm font-medium text-[#262626]/55")}>
          Lucas & Andressa · 14/11/2026 · 20h
        </p>
      </div>
    </footer>
  );
}
