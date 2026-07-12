// src/components/bottom-bar/BottomBar.jsx
import React, { useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Home,
  MapPin,
  Gift,
  MessageCircleHeart,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATION, useReducedMotionFlag } from "@/lib/motion";

const baseMenuItems = [
  { icon: Home, label: "Início", href: "#home", id: "home" },
  { icon: UserCheck, label: "Presença", href: "#rsvp", id: "rsvp" },
  { icon: MapPin, label: "Local", href: "#location", id: "location" },
  {
    icon: Gift,
    label: "Presentes",
    href: "#gifts",
    id: "gifts",
  },
  { icon: MessageCircleHeart, label: "Mensagens", href: "#wishes", id: "wishes" },
];

/**
 * BottomBar is a React functional component that renders a fixed bottom navigation bar
 * with automatic section detection based on scroll position.
 *
 * This component uses Framer Motion to animate its entrance and the Intersection Observer API
 * to automatically detect which section is currently in view. It provides smooth transitions
 * for opacity and vertical movement, and highlights the active section based on scroll position.
 * The component also supports manual navigation by clicking on menu items.
 *
 * @component
 * @example
 * // Basic usage:
 * <BottomBar />
 *
 * @returns {JSX.Element} A JSX element containing the animated bottom navigation bar with auto-detection.
 */
const BottomBar = () => {
  const [active, setActive] = React.useState("home");
  const reduceMotion = useReducedMotionFlag();
  const menuItems = baseMenuItems;

  // Function to handle smooth scrolling when clicking menu items
  const handleMenuClick = useCallback((e, href, id) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      // Temporarily set active state for immediate feedback
      setActive(id);

      // Smooth scroll to element
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  // Set up Intersection Observer for automatic section detection
  useEffect(() => {
    const observerOptions = {
      root: null, // Use viewport as root
      rootMargin: "-20% 0px -80% 0px", // Trigger when section is 20% visible from top
      threshold: 0,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;

          // Only update if it's a valid menu section
          const validSection = menuItems.find((item) => item.id === sectionId);
          if (validSection) {
            setActive(sectionId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
    );

    // Observe all sections that correspond to menu items
    menuItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    // Cleanup observer on component unmount
    return () => {
      observer.disconnect();
    };
  }, [menuItems]);

  return (
    <div
      className={cn(
        "fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4",
      )}
    >
      <motion.div
        className={cn("w-auto")}
        initial={reduceMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
        animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
        transition={
          reduceMotion
            ? { duration: DURATION.base }
            : { duration: DURATION.base, type: "spring", stiffness: 100 }
        }
      >
        <div
          className={cn(
            "super-glass rounded-full px-3 py-2 shadow-[0_18px_50px_rgba(38,38,38,0.12)]",
          )}
        >
          <nav className={cn("flex items-center gap-1")}>
            {menuItems.map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-300 ease-in-out",
                  "min-w-[60px] cursor-pointer hover:bg-[#ff4582]/20",
                  active === item.id
                    ? "bg-[#ff4582]/25 text-[#262626]"
                    : "text-[#262626]/60",
                )}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleMenuClick(e, item.href, item.id)}
              >
                <motion.div
                  animate={{
                    scale: active === item.id ? 1.1 : 1,
                  }}
                  transition={{ duration: DURATION.fast }}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] sm:h-5 sm:w-5 mb-0.5 sm:mb-1 transition-all duration-300",
                      active === item.id
                        ? "stroke-[#262626] stroke-[2.5px]"
                        : "stroke-[#262626]/60 stroke-2",
                    )}
                  />
                </motion.div>
                <motion.span
                  className={cn(
                    "text-[10px] sm:text-xs font-medium transition-all duration-300 line-clamp-1",
                    active === item.id
                      ? "text-[#262626] font-medium"
                      : "text-[#262626]/60",
                  )}
                  animate={{
                    scale: active === item.id ? 1.05 : 1,
                  }}
                  transition={{ duration: DURATION.fast }}
                >
                  {item.label}
                </motion.span>
              </motion.a>
            ))}
          </nav>
        </div>
      </motion.div>
    </div>
  );
};

export default BottomBar;
