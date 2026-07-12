import EventCards from "@/features/events/components/events-card";
import { useConfig } from "@/features/invitation/hooks/use-config";
import { motion } from "framer-motion";
import { useMotionPreset, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function Events() {
  const config = useConfig(); // Use hook to get config from API or fallback to static
  const fade = useMotionPreset("fade");
  const fadeUp = useMotionPreset("fadeUp");
  return (
    <>
      {/* Event Section */}
      <section
        id="event"
        className={cn("relative overflow-hidden bg-[#f5f0eb]")}
      >
        <img
          src="/images/flowers.png"
          alt=""
          className={cn(
            "pointer-events-none absolute -right-28 top-8 w-56 rotate-12 opacity-25",
          )}
        />
        <motion.div
          variants={fade}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className={cn("relative z-10 mx-auto px-5 py-20")}
        >
          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className={cn("mb-14 space-y-5")}
          >
            <motion.span
              variants={fadeUp}
              className={cn("super-label inline-block")}
            >
              Agenda
            </motion.span>

            <motion.h2
              variants={fadeUp}
              className={cn("super-heading text-6xl")}
            >
              O nosso dia
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className={cn("super-copy max-w-sm text-[1.125rem] font-medium")}
            >
              Queremos celebrar esse dia especial ao lado das pessoas que fazem
              parte da nossa história.
            </motion.p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className={cn("mx-auto max-w-2xl")}
          >
            <EventCards events={config.agenda} />
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
