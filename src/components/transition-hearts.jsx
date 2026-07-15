import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TransitionHearts component renders small, svelte, floating animated hearts.
 * In addition to background hearts, it displays 3 larger central hearts that float
 * up in a staggered, elegant sequence right down the middle of the viewport.
 */
export default function TransitionHearts({ onComplete }) {
  const [backgroundHearts, setBackgroundHearts] = useState([]);
  const [centerHearts, setCenterHearts] = useState([]);

  useEffect(() => {
    // 1. Generate 14 subtle background hearts
    const bg = Array.from({ length: 14 }).map((_, index) => {
      const size = Math.random() * 6 + 6; // 6px to 12px (very small and subtle)
      const left = Math.random() * 100;
      const delay = Math.random() * 0.8;
      const duration = Math.random() * 1.5 + 1.8; // 1.8s to 3.3s
      const sway = Math.random() * 30 - 15;

      return {
        id: `bg-${index}`,
        size,
        left: `${left}%`,
        delay,
        duration,
        sway,
        opacity: [0, 0.35, 0.35, 0], // Svelte background opacity
      };
    });
    setBackgroundHearts(bg);

    // 2. Define 3 larger, main central hearts
    const center = [
      {
        id: "center-1",
        size: 32, // Large central heart
        left: "50%",
        initialX: -25,
        sway: [-25, 0, -40, -25],
        delay: 0.15,
        duration: 2.3,
        opacity: [0, 0.7, 0.7, 0], // More prominent
      },
      {
        id: "center-2",
        size: 20, // Medium central heart
        left: "50%",
        initialX: 0,
        sway: [0, 20, -20, 0],
        delay: 0.45,
        duration: 2.5,
        opacity: [0, 0.65, 0.65, 0],
      },
      {
        id: "center-3",
        size: 26, // Medium-large central heart
        left: "50%",
        initialX: 25,
        sway: [25, 5, 35, 25],
        delay: 0.3,
        duration: 2.2,
        opacity: [0, 0.7, 0.7, 0],
      },
    ];
    setCenterHearts(center);

    // Complete the transition and unmount after 2.8s
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-[10000] overflow-hidden")}>
      {/* Background Hearts */}
      {backgroundHearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ y: "105vh", x: 0, opacity: 0, scale: 0.5 }}
          animate={{
            y: "-115vh",
            x: [0, heart.sway, -heart.sway, heart.sway / 2],
            opacity: heart.opacity,
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

      {/* 3 Prominent Central Hearts */}
      {centerHearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ y: "105vh", x: heart.initialX, opacity: 0, scale: 0.6 }}
          animate={{
            y: "-115vh",
            x: heart.sway,
            opacity: heart.opacity,
            scale: [0.6, 1.1, 1.1, 0.8],
          }}
          transition={{
            duration: heart.duration,
            delay: heart.delay,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            left: heart.left,
            transform: "translateX(-50%)",
            bottom: 0,
            width: heart.size,
            height: heart.size,
          }}
        >
          <Heart
            className={cn("fill-[#ff4582] text-[#ff4582] drop-shadow-sm")}
            style={{ width: "100%", height: "100%" }}
          />
        </motion.div>
      ))}
    </div>
  );
}
