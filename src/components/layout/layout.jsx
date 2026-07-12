import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, PauseCircle, PlayCircle } from "lucide-react";
import { useConfig } from "@/features/invitation/hooks/use-config";
import BottomBar from "@/components/layout/bottom-bar";
import InvitationFooter from "@/components/layout/invitation-footer";
import SoundCloudPlayer from "@/components/layout/soundcloud-player";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Layout component that wraps the main invitation content.
 * Handles music playback controls and navigation.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {Object} props.audioControls - Audio controls from useAudio hook
 * @param {boolean} props.audioControls.isPlaying - Whether audio is playing
 * @param {Function} props.audioControls.toggle - Toggle audio play/pause
 */
const Layout = ({ children, audioControls }) => {
  const config = useConfig();
  const [showToast, setShowToast] = useState(false);
  const fade = useMotionPreset("fade");
  const fadeUp = useMotionPreset("fadeUp");
  const scaleIn = useMotionPreset("scaleIn");

  const { isPlaying, toggle } = audioControls || {};
  const soundCloudUrl = config.audio?.soundcloudUrl;

  // Show toast when audio starts playing
  useEffect(() => {
    if (isPlaying) {
      setShowToast(true);
      const timer = setTimeout(
        () => setShowToast(false),
        config.audio?.toastDuration || 3000,
      );
      return () => clearTimeout(timer);
    } else {
      setShowToast(false);
    }
  }, [isPlaying, config.audio?.toastDuration]);

  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full items-center justify-center bg-[#f5f0eb]",
      )}
    >
      <motion.div
        className={cn(
          "relative mx-auto min-h-screen w-full max-w-[430px] overflow-hidden border-x border-[#262626]/5 shadow-[0_24px_80px_rgba(38,38,38,0.14)]",
        )}
        style={{
          backgroundImage:
            "linear-gradient(rgba(253,248,243,0.94), rgba(253,248,243,0.98)), url('/images/lucas-andressa-background.webp')",
          backgroundPosition: "center top",
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
        }}
        variants={fade}
        initial="hidden"
        animate="visible"
      >
        {/* Music Control Button with Status Indicator */}
        {soundCloudUrl && <SoundCloudPlayer url={soundCloudUrl} />}

        {!soundCloudUrl && toggle && (
          <motion.button
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggle}
            className={cn(
              "super-glass fixed right-4 top-4 z-50 rounded-full p-3 shadow-lg",
            )}
          >
            {isPlaying ? (
              <div className={cn("relative")}>
                <PauseCircle className={cn("h-6 w-6 text-[#262626]")} />
                <span
                  className={cn(
                    "absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse",
                  )}
                />
              </div>
            ) : (
              <PlayCircle className={cn("h-6 w-6 text-[#262626]")} />
            )}
          </motion.button>
        )}

        <main className={cn("relative h-full w-full pb-[100px]")}>
          {children}
          <InvitationFooter />
        </main>
        <BottomBar />

        {/* Music Info Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                "fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50",
              )}
            >
              <div
                className={cn(
                  "bg-black/80 text-white transform -translate-x-1/2 px-4 py-2 rounded-full backdrop-blur-sm flex items-center space-x-2",
                )}
              >
                <Music className={cn("w-4 h-4 animate-pulse")} />
                <span className={cn("text-sm whitespace-nowrap")}>
                  {config.audio?.title || "Background Music"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Layout;
