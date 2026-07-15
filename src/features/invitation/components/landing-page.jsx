import { useConfig } from "@/features/invitation/hooks/use-config";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";
import {
  useMotionPreset,
  staggerContainer,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getCountdownTimeLeft } from "@/lib/countdown";

function Countdown({ date, time }) {
  const [timeLeft, setTimeLeft] = useState(() => getCountdownTimeLeft(date, time));
  const isFinished = Object.values(timeLeft).every((value) => value === 0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getCountdownTimeLeft(date, time));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [date, time]);

  return (
    <div className={cn("w-full max-w-[350px] rounded-[30px] border border-white/35 bg-white/15 px-4 py-3 shadow-[0_14px_48px_rgba(80,45,55,0.09)] backdrop-blur-[22px]")}>
      <div className={cn("mx-auto mb-3 flex w-28 items-center justify-center gap-3")}>
        <span className={cn("h-px flex-1 bg-[#262626]/10")} />
        <Heart className={cn("h-4 w-4 fill-[#ff4582] text-[#ff4582]")} />
        <span className={cn("h-px flex-1 bg-[#262626]/10")} />
      </div>
      {isFinished ? (
        <p
          className={cn(
            "pb-2 text-center text-xl font-medium text-[#ff4582]",
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
                "relative text-center after:absolute after:right-0 after:top-1/2 after:h-7 after:w-px after:-translate-y-1/2 after:bg-[#262626]/10 last:after:hidden",
              )}
            >
              <p className={cn("text-2xl font-light leading-none tabular-nums text-[#ff4582]")}>
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
  );
}

const LandingPage = ({ onOpenInvitation }) => {
  const config = useConfig(); // Use hook to get config from API or fallback to static
  const ceremonyTime = config.agenda?.[0]?.startTime || "20:00";
  const fade = useMotionPreset("fade");
  const fadeUp = useMotionPreset("fadeUp");

  return (
    <motion.div
      variants={fade}
      initial="hidden"
      animate="visible"
      className={cn("min-h-screen relative overflow-hidden bg-[#f8eee9]")}
    >
      <img
        src="/images/lucas-andressa-background.webp"
        alt=""
        className={cn("absolute inset-0 h-full w-full object-cover")}
      />
      <div className={cn("absolute inset-0 bg-white/10")} />

      <div
        className={cn(
          "relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-10",
        )}
      >
        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          animate="visible"
          className={cn(
            "flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col items-center justify-start pt-[4vh] text-center sm:pt-[6vh]",
          )}
        >
          <motion.img
            variants={fadeUp}
            src="/images/hero-logo.webp"
            alt="Lucas e Andressa"
            className={cn(
              "w-[68%] max-w-[300px] drop-shadow-[0_10px_24px_rgba(120,50,70,0.20)]",
            )}
          />

          <motion.div
            variants={fadeUp}
            className={cn("mt-4 flex w-full flex-col items-center")}
          >
            <motion.a
              href="#convite"
              role="button"
              onClick={onOpenInvitation}
              animate={{
                scale: [1, 1.035, 1],
                boxShadow: [
                  "0 12px 30px rgba(255,69,130,0.30)",
                  "0 16px 42px rgba(255,69,130,0.42)",
                  "0 12px 30px rgba(255,69,130,0.30)",
                ],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={cn(
                "group mx-auto flex cursor-pointer items-center rounded-full border border-transparent bg-[#ff4582] px-6 py-2 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-[#f73576] active:scale-95",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center",
                )}
              >
                <span>Abrir convite</span>
                <ArrowRight
                  className={cn(
                    "ml-2 h-[30px] w-[30px] stroke-[1.5] transition-transform duration-300 ease-in-out group-hover:translate-x-[5px]",
                  )}
                />
              </span>
            </motion.a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className={cn("mt-auto flex w-full justify-center pb-7 pt-10")}
          >
            <Countdown date={config.date} time={ceremonyTime} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LandingPage;
