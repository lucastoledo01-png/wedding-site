import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TransitionHearts component renders small, svelte, floating animated hearts.
 * In addition to background hearts, it displays 7 larger central hearts that float
 * up in a staggered, elegant sequence right down the middle of the viewport.
 */
export default function TransitionHearts({ onComplete }) {
  const [backgroundHearts, setBackgroundHearts] = useState([]);
  const [centerHearts, setCenterHearts] = useState([]);

  useEffect(() => {
    // 1. Generate 38 subtle background hearts (increased from 14 for richer density)
    const bg = Array.from({ length: 38 }).map((_, index) => {
      const size = Math.random() * 12 + 8; // 8px to 20px (diverse sizes for depth)
      const left = Math.random() * 100;
      const delay = Math.random() * 0.7; // 0s to 0.7s delay
      const duration = Math.random() * 1.2 + 2.2; // 2.2s to 3.4s (slower and smoother)
      const sway = Math.random() * 40 - 20;
      const peakOpacity = Math.random() * 0.3 + 0.15; // 0.15 to 0.45 opacity

      return {
        id: `bg-${index}`,
        size,
        left: `${left}%`,
        delay,
        duration,
        sway,
        opacity: [0, peakOpacity, peakOpacity, 0], // Smooth fade-in, display, fade-out
      };
    });
    setBackgroundHearts(bg);

    // 2. Define 7 larger, main central hearts (increased from 3 for a fuller central column)
    const center = [
      {
        id: "center-1",
        size: 36, // Large central heart
        left: "50%",
        initialX: -40,
        sway: [-40, -10, -50, -40],
        delay: 0.1,
        duration: 2.8,
        opacity: [0, 0.75, 0.75, 0],
      },
      {
        id: "center-2",
        size: 20, // Small central heart
        left: "50%",
        initialX: -10,
        sway: [-10, 15, -15, -10],
        delay: 0.4,
        duration: 3.0,
        opacity: [0, 0.65, 0.65, 0],
      },
      {
        id: "center-3",
        size: 28, // Medium-large central heart
        left: "50%",
        initialX: 25,
        sway: [25, 5, 35, 25],
        delay: 0.25,
        duration: 2.7,
        opacity: [0, 0.75, 0.75, 0],
      },
      {
        id: "center-4",
        size: 24, // Medium central heart
        left: "50%",
        initialX: -25,
        sway: [-25, -5, -35, -25],
        delay: 0.55,
        duration: 2.9,
        opacity: [0, 0.7, 0.7, 0],
      },
      {
        id: "center-5",
        size: 40, // Very large central heart
        left: "50%",
        initialX: 10,
        sway: [10, 35, 0, 10],
        delay: 0.18,
        duration: 2.6,
        opacity: [0, 0.8, 0.8, 0],
      },
      {
        id: "center-6",
        size: 22, // Small-medium central heart
        left: "50%",
        initialX: 40,
        sway: [40, 20, 50, 40],
        delay: 0.48,
        duration: 3.1,
        opacity: [0, 0.65, 0.65, 0],
      },
      {
        id: "center-7",
        size: 32, // Large central heart
        left: "50%",
        initialX: 5,
        sway: [5, -25, 25, 5],
        delay: 0.35,
        duration: 2.8,
        opacity: [0, 0.75, 0.75, 0],
      },
    ];
    setCenterHearts(center);

    // Complete the transition and unmount after 4.1s (longer to allow all animations to finish cleanly)
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4100);

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
            ease: "easeInOut",
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

      {/* 7 Prominent Central Hearts */}
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
            ease: "easeInOut",
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
