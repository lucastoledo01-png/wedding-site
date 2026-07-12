import { Calendar, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/features/invitation/hooks/use-config";
import { formatEventDate } from "@/lib/format-event-date";
import { getGuestName } from "@/lib/invitation-storage";
import { useMotionPreset, staggerContainer } from "@/lib/motion";

const heroSlides = [
  "/images/hero-slide-1.jpg",
  "/images/hero-slide-2.jpg",
  "/images/hero-slide-3.jpg",
  "/images/hero-slide-4.jpg",
  "/images/hero-slide-5.jpg",
  "/images/hero-slide-6.jpg",
];

export default function Hero() {
  const config = useConfig();
  const [guestName, setGuestName] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const fadeUp = useMotionPreset("fadeUp");

  useEffect(() => {
    const storedGuestName = getGuestName();
    if (storedGuestName) setGuestName(storedGuestName);
  }, []);

  const showNextSlide = () => {
    setActiveSlide((current) => (current + 1) % heroSlides.length);
  };

  const showPreviousSlide = () => {
    setActiveSlide(
      (current) => (current - 1 + heroSlides.length) % heroSlides.length,
    );
  };

  useEffect(() => {
    if (isCarouselPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [isCarouselPaused]);

  const getSlideOffset = (index) => {
    const rawOffset = index - activeSlide;
    if (rawOffset > heroSlides.length / 2) return rawOffset - heroSlides.length;
    if (rawOffset < -heroSlides.length / 2) return rawOffset + heroSlides.length;
    return rawOffset;
  };

  return (
    <section
      id="home"
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-[#fdf8f3] px-5 py-14",
      )}
    >
      <motion.div
        variants={staggerContainer(0.16)}
        initial="hidden"
        animate="visible"
        className={cn(
          "relative z-10 mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-sm content-center gap-8 overflow-hidden",
        )}
      >
        <motion.div
          variants={fadeUp}
          className={cn("w-full space-y-5 text-center")}
        >
          <p className={cn("super-label text-center")}>Convite oficial</p>
          <img
            src="/images/hero-logo.png"
            alt="Lucas & Andressa"
            className={cn(
              "mx-auto block w-full max-w-[310px] object-contain",
            )}
          />
          <p
            className={cn(
              "super-copy mx-auto max-w-[330px] text-center text-[1.18rem] font-medium leading-[1.5]",
            )}
          >
            Nossa historia foi construida entre encontros, escolhas e muitos
            momentos que nos trouxeram ate aqui. Agora chegou a hora de celebrar
            este ciclo ao lado de quem faz parte dele.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className={cn("relative w-full")}>
          <div
            role="button"
            tabIndex={0}
            aria-label="Avancar foto"
            onClick={showNextSlide}
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
            onPointerDown={() => setIsCarouselPaused(true)}
            onPointerUp={() => setIsCarouselPaused(false)}
            onPointerCancel={() => setIsCarouselPaused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                showNextSlide();
              }
              if (event.key === "ArrowLeft") showPreviousSlide();
              if (event.key === "ArrowRight") showNextSlide();
            }}
            onTouchStart={(event) => {
              setIsCarouselPaused(true);
              setTouchStart(event.touches[0]?.clientX ?? null);
            }}
            onTouchEnd={(event) => {
              if (touchStart === null) {
                setIsCarouselPaused(false);
                return;
              }
              const endX = event.changedTouches[0]?.clientX ?? touchStart;
              const delta = endX - touchStart;
              if (Math.abs(delta) > 36) {
                if (delta < 0) showNextSlide();
                else showPreviousSlide();
              } else {
                showNextSlide();
              }
              setTouchStart(null);
              setIsCarouselPaused(false);
            }}
            className={cn(
              "relative left-1/2 aspect-[3/4] w-[112%] -translate-x-1/2 cursor-pointer overflow-hidden outline-none",
            )}
          >
            {heroSlides.map((slide, index) => {
              const offset = getSlideOffset(index);
              const isVisible = Math.abs(offset) <= 1;

              return (
                <div
                  key={slide}
                  className={cn(
                    "absolute left-1/2 top-0 h-full w-[82%] overflow-hidden rounded-[24px] transition-all duration-700",
                    isVisible ? "opacity-100" : "pointer-events-none opacity-0",
                    offset === 0 && "z-20 scale-100",
                    offset !== 0 && "z-10 scale-[0.92]",
                  )}
                  style={{
                    transform: `translateX(calc(-50% + ${offset * 88}%)) scale(${offset === 0 ? 1 : 0.92})`,
                    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  aria-hidden={offset !== 0}
                >
                  <img
                    src={slide}
                    alt={`Lucas e Andressa ${index + 1}`}
                    className={cn(
                      "block h-full w-full object-cover object-center",
                    )}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              );
            })}
            <div
              className={cn(
                "super-badge absolute right-8 top-3 z-30 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#ff4582] text-[#262626] shadow-[0_18px_48px_rgba(255,69,130,0.45)]",
              )}
            >
              <span className={cn("text-[0.92rem] font-semibold italic")}>
                14/11
              </span>
              <span className={cn("text-[0.78rem] font-semibold italic")}>
                2026
              </span>
              <span
                className={cn(
                  "mt-1 text-[7px] font-medium uppercase tracking-[0.22em]",
                )}
              >
                Save the date
              </span>
            </div>
          </div>
          <div
            className={cn(
              "mt-4 flex items-center justify-center gap-1.5",
            )}
            aria-hidden="true"
          >
            {heroSlides.map((slide, index) => (
              <span
                key={`${slide}-dot`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  index === activeSlide
                    ? "w-6 bg-[#ff4582]"
                    : "w-1.5 bg-[#262626]/18",
                )}
              />
            ))}
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
            <p
              className={cn(
                "mt-1 text-3xl font-medium uppercase tracking-tight text-[#262626]",
              )}
            >
              {guestName || "nosso convidado"}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
