import { Calendar, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/features/invitation/hooks/use-config";
import { formatEventDate } from "@/lib/format-event-date";
import { getGuestName } from "@/lib/invitation-storage";
import { useMotionPreset, staggerContainer } from "@/lib/motion";

export default function Hero() {
  const config = useConfig();
  const [guestName, setGuestName] = useState("");
  const fadeUp = useMotionPreset("fadeUp");

  useEffect(() => {
    const storedGuestName = getGuestName();
    if (storedGuestName) setGuestName(storedGuestName);
  }, []);

  return (
    <section
      id="home"
      className={cn("relative min-h-screen overflow-hidden bg-[#fdf8f3] px-5 py-16")}
    >
      <img
        src="/images/flowers.png"
        alt=""
        className={cn("pointer-events-none absolute -right-24 top-20 w-56 rotate-12 opacity-30")}
      />
      <motion.div
        variants={staggerContainer(0.16)}
        initial="hidden"
        animate="visible"
        className={cn("relative z-10 mx-auto grid min-h-[calc(100vh-8rem)] max-w-sm content-center gap-8")}
      >
        <motion.div variants={fadeUp} className={cn("space-y-5")}>
          <p className={cn("super-label")}>Convite oficial</p>
          <h1 className={cn("super-heading text-[4.55rem]")}>
            <span className={cn("whitespace-nowrap")}>
              LUCAS{" "}
              <span className={cn("italic text-[#ff4582]")}>
                &
              </span>
            </span>
            <span className={cn("block")}>ANDRESSA</span>
          </h1>
          <p className={cn("super-copy text-2xl font-medium")}>
            Nossa historia foi construida entre encontros, escolhas e muitos
            momentos que nos trouxeram ate aqui. Agora chegou a hora de
            celebrar este ciclo ao lado de quem faz parte dele.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className={cn("group relative")}>
          <div className={cn("overflow-hidden rounded-[24px] bg-[#f5f0eb] shadow-[0_24px_70px_rgba(38,38,38,0.16)]")}>
            <img
              src="/images/lucas-andressa-background.png"
              alt="Lucas e Andressa"
              className={cn("super-image aspect-[3/4] w-full object-cover object-center")}
            />
          </div>
          <div
            className={cn(
              "super-badge absolute -right-4 top-8 flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#ff4582] text-[#262626] shadow-[0_18px_48px_rgba(255,69,130,0.45)]",
            )}
          >
            <span className={cn("text-3xl font-semibold italic")}>01</span>
            <span className={cn("mt-1 text-[8px] font-medium uppercase tracking-[0.35em]")}>
              Save date
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className={cn("grid gap-3 border-y border-[#262626]/10 py-5")}
        >
          <div className={cn("flex items-center gap-3 text-[#262626]")}>
            <Calendar className={cn("h-5 w-5 text-[#ff4582]")} />
            <span className={cn("text-lg font-medium")}>
              {formatEventDate(config.date, "full")}
            </span>
          </div>
          <div className={cn("flex items-center gap-3 text-[#262626]")}>
            <MapPin className={cn("h-5 w-5 text-[#ff4582]")} />
            <span className={cn("text-lg font-medium")}>{config.location}</span>
          </div>
          <div className={cn("mt-2")}>
            <p className={cn("super-label")}>Para</p>
            <p className={cn("mt-1 text-3xl font-medium uppercase tracking-tight text-[#262626]")}>
              {guestName || "nosso convidado"}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
