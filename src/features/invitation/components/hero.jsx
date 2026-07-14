import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useMotionPreset, staggerContainer } from "@/lib/motion";
import { useInvitation } from "@/features/invitation/hooks/use-invitation";

const fallbackHeroSlides = [
  { imageUrl: "/images/hero-slide-1.jpg", altText: "Lucas e Andressa" },
  { imageUrl: "/images/hero-slide-2.jpg", altText: "Lucas e Andressa" },
  { imageUrl: "/images/hero-slide-3.jpg", altText: "Lucas e Andressa" },
  { imageUrl: "/images/hero-slide-6.jpg", altText: "Lucas e Andressa" },
  { imageUrl: "/images/hero-slide-7.jpg", altText: "Lucas e Andressa" },
  { imageUrl: "/images/hero-slide-8.jpg", altText: "Lucas e Andressa" },
  { imageUrl: "/images/hero-slide-9.jpg", altText: "Lucas e Andressa" },
  { imageUrl: "/images/hero-slide-10.webp", altText: "Lucas e Andressa" },
  { imageUrl: "/images/hero-slide-11.webp", altText: "Lucas e Andressa" },
  { imageUrl: "/images/hero-slide-12.webp", altText: "Lucas e Andressa" },
];

export default function Hero() {
  const { config } = useInvitation();
  const heroSlides =
    config?.heroSlides?.length > 0 ? config.heroSlides : fallbackHeroSlides;
  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const fadeUp = useMotionPreset("fadeUp");

  const showNextSlide = () => {
    setActiveSlide((current) => (current + 1) % heroSlides.length);
  };

  const showPreviousSlide = () => {
    setActiveSlide(
      (current) => (current - 1 + heroSlides.length) % heroSlides.length,
    );
  };

  useEffect(() => {
    if (activeSlide >= heroSlides.length) setActiveSlide(0);
  }, [activeSlide, heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return undefined;
    if (isCarouselPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [heroSlides.length, isCarouselPaused]);

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
            src="/images/hero-logo.webp"
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
            Nossa história foi construída entre encontros, escolhas e muitos
            momentos que nos trouxeram até aqui. Agora chegou a hora de celebrar
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
              "relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-[24px] outline-none",
            )}
          >
            {heroSlides.map((slide, index) => (
              <img
                key={slide.imageUrl}
                src={slide.imageUrl}
                alt={slide.altText || `Lucas e Andressa ${index + 1}`}
                className={cn(
                  "absolute inset-0 block h-full w-full object-cover object-center transition-opacity duration-1000",
                  index === activeSlide
                    ? "z-10 opacity-100"
                    : "pointer-events-none z-0 opacity-0",
                )}
                style={{
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                loading={index === 0 ? "eager" : "lazy"}
                aria-hidden={index !== activeSlide}
              />
            ))}
            <div
              className={cn(
                "super-badge absolute right-8 top-3 z-30 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#ff4582] text-[#fdf8f3] shadow-[0_18px_48px_rgba(255,69,130,0.45)]",
              )}
            >
              <span
                className={cn(
                  "max-w-[70px] text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.22em]",
                )}
              >
                Save the Date
              </span>
              <span className={cn("mt-1 text-[10px] font-semibold tracking-[0.08em]")}>
                14/11/26
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
                key={`${slide.imageUrl}-dot`}
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
      </motion.div>
    </section>
  );
}
