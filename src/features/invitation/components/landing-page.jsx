import { useConfig } from "@/features/invitation/hooks/use-config";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  useMotionPreset,
  staggerContainer,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

function getTimeLeft(date) {
  const target = new Date(`${date}T16:00:00`).getTime();
  const now = Date.now();
  const difference = Math.max(target - now, 0);

  return {
    dias: Math.floor(difference / (1000 * 60 * 60 * 24)),
    horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutos: Math.floor((difference / (1000 * 60)) % 60),
    segundos: Math.floor((difference / 1000) % 60),
  };
}

function Countdown({ date }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(date));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(date));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [date]);

  return (
    <div className={cn("w-full max-w-[350px] rounded-[30px] border border-white/45 bg-white/22 px-4 py-3 shadow-[0_18px_60px_rgba(80,45,55,0.12)] backdrop-blur-2xl")}>
      <p className={cn("mb-2 text-center text-[9px] font-medium uppercase tracking-[0.36em] text-[#262626]/50")}>
        Faltam
      </p>
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
    </div>
  );
}

const LandingPage = ({ onOpenInvitation }) => {
  const config = useConfig(); // Use hook to get config from API or fallback to static
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
        src="/images/lucas-andressa-background.png"
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
            src="/images/lucas-andressa-logo.png"
            alt="Lucas e Andressa"
            className={cn(
              "w-[68%] max-w-[300px] drop-shadow-[0_10px_24px_rgba(120,50,70,0.20)]",
            )}
          />

          <motion.div
            variants={fadeUp}
            className={cn("mt-4 flex w-full flex-col items-center")}
          >
            <a
              href="#convite"
              role="button"
              onPointerDown={onOpenInvitation}
              onClick={onOpenInvitation}
              className={cn(
                "group mx-auto flex cursor-pointer items-center rounded-full border border-transparent bg-[#ff4582] px-5 py-2 text-[14px] font-medium text-white shadow-[0_12px_30px_rgba(255,69,130,0.30)] transition-all duration-200 hover:bg-[#f73576] active:scale-95",
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
                    "ml-2 h-[30px] w-[30px] transition-transform duration-300 ease-in-out group-hover:translate-x-[5px]",
                  )}
                />
              </span>
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className={cn("mt-auto flex w-full justify-center pb-7 pt-10")}
          >
            <Countdown date={config.date} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LandingPage;
