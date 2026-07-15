import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TransitionHearts component renders small, svelte, floating animated hearts
 * that rise up from the bottom of the screen during page transitions.
 * Highly-optimized for mobile UX and performance.
 */
export default function TransitionHearts({ onComplete }) {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    // Generate 16 random hearts for a subtle, elegant effect
    const generated = Array.from({ length: 16 }).map((_, index) => {
      const size = Math.random() * 8 + 8; // 8px to 16px (very small and elegant)
      const left = Math.random() * 100; // 0% to 100% horizontal placement
      const delay = Math.random() * 0.8; // Staggered delays
      const duration = Math.random() * 1.4 + 1.6; // Speed variation (1.6s to 3s)
      const sway = Math.random() * 40 - 20; // Subtle horizontal sway (-20px to 20px)

      return {
        id: index,
        size,
        left: `${left}%`,
        delay,
        duration,
        sway,
      };
    });
    setHearts(generated);

    // Stop and unmount the effect after 2.6s (when the last heart has exited)
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-[10000] overflow-hidden")}>
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ y: "105vh", x: 0, opacity: 0, scale: 0.5 }}
          animate={{
            y: "-15vh",
            x: [0, heart.sway, -heart.sway, heart.sway / 2],
            opacity: [0, 0.45, 0.45, 0], // Peak opacity is kept svelte/subtle (45%)
            scale: [0.5, 1, 1, 0.7],
          }}
          transition={{
            duration: heart.duration,
            delay: heart.delay,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            left: heart.left,
            bottom: 0,
            width: heart.size,
            height: heart.size,
          }}
        >
          <Heart
            className={cn("fill-[#ff4582] text-[#ff4582]")}
            style={{ width: "100%", height: "100%" }}
          />
        </motion.div>
      ))}
    </div>
  );
}
