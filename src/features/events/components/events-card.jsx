import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Apple,
  Calendar,
  Calendar as CalendarIcon,
  CalendarPlus,
  Chrome,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEventDate } from "@/lib/format-event-date";
import { useMotionPreset } from "@/lib/motion";

const CalendarButton = ({ icon: Icon, label, onClick }) => (
  <motion.button
    onClick={onClick}
    className={cn(
      "super-transition flex w-full items-center gap-3 rounded-2xl border border-[#262626]/10 p-4 font-medium text-[#262626] hover:bg-[#ff4582]",
    )}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <Icon className={cn("h-5 w-5")} />
    <span>{label}</span>
  </motion.button>
);

const Modal = ({ isOpen, onClose, children }) => {
  const fade = useMotionPreset("fade");
  const fadeUp = useMotionPreset("fadeUp");

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 z-[9999] flex items-center justify-center px-5 py-6",
          )}
        >
          <motion.div
            variants={fade}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className={cn("absolute inset-0 bg-black/50 backdrop-blur-sm")}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "relative z-10 w-full max-w-sm",
            )}
          >
            <div
              className={cn(
                "rounded-3xl border border-[#262626]/10 bg-[#fdf8f3] p-6 shadow-2xl",
              )}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

const SingleEventCard = ({ eventData }) => {
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const fadeUp = useMotionPreset("fadeUp");
  const calendarTitle = `${eventData.title} Casamento Lucas e Andressa`;

  const googleCalendarLink = () => {
    const startDate = new Date(`${eventData.date}T${eventData.startTime}:00`);
    const endDate = new Date(`${eventData.date}T${eventData.endTime}:00`);
    const formatDate = (date) => date.toISOString().replace(/-|:|\.\d+/g, "");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(eventData.description || "")}&location=${encodeURIComponent(eventData.location)}&ctz=America/Sao_Paulo`;
  };

  const downloadICSFile = () => {
    const startDate = new Date(`${eventData.date}T${eventData.startTime}:00`);
    const endDate = new Date(`${eventData.date}T${eventData.endTime}:00`);
    const formatICSDate = (date) =>
      date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${window.location.href}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${calendarTitle}
LOCATION:${eventData.location}
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${calendarTitle.toLowerCase().replace(/ /g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("relative")}>
      <motion.article
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className={cn(
          "super-transition group border-t border-[#262626]/10 bg-[#fdf8f3] p-7 hover:bg-[#ff4582]",
        )}
      >
        <div className={cn("flex items-start justify-between gap-4")}>
          <div>
            <p className={cn("super-label text-[#262626]/50")}>Evento</p>
            <h3
              className={cn(
                "mt-2 text-3xl font-bold uppercase leading-none tracking-tight text-[#262626]",
              )}
            >
              {eventData.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowCalendarModal(true)}
            className={cn(
              "super-transition rounded-full bg-[#262626] p-3 text-[#fdf8f3] group-hover:bg-[#fdf8f3] group-hover:text-[#262626]",
            )}
            aria-label="Adicionar ao calendario"
          >
            <CalendarPlus className={cn("h-5 w-5")} />
          </button>
        </div>

        <div
          className={cn(
            "mt-7 grid gap-3 text-lg font-semibold text-[#262626]/75",
          )}
        >
          <p className={cn("flex items-center gap-3")}>
            <Calendar
              className={cn(
                "h-6 w-6 text-[#ff4582] group-hover:text-[#262626]",
              )}
            />
            {formatEventDate(eventData.date)}
          </p>
          <p className={cn("flex items-center gap-3")}>
            <Clock
              className={cn(
                "h-6 w-6 text-[#ff4582] group-hover:text-[#262626]",
              )}
            />
            {eventData.startTime?.substring(0, 5)} -{" "}
            {eventData.endTime?.substring(0, 5)}
          </p>
          <p className={cn("flex items-center gap-3")}>
            <MapPin
              className={cn(
                "h-6 w-6 text-[#ff4582] group-hover:text-[#262626]",
              )}
            />
            {eventData.location}
          </p>
        </div>
      </motion.article>

      <Modal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
      >
        <div className={cn("space-y-6")}>
          <div className={cn("flex items-center justify-between gap-4")}>
            <h3
              className={cn(
                "text-2xl font-medium uppercase tracking-tight text-[#262626]",
              )}
            >
              Adicionar ao calendario
            </h3>
            <button
              type="button"
              onClick={() => setShowCalendarModal(false)}
              className={cn("text-[#262626]/60 hover:text-[#262626]")}
              aria-label="Fechar"
            >
              <X className={cn("h-5 w-5")} />
            </button>
          </div>
          <div className={cn("space-y-3")}>
            <CalendarButton
              icon={Chrome}
              label="Google Calendar"
              onClick={() => window.open(googleCalendarLink(), "_blank")}
            />
            <CalendarButton
              icon={Apple}
              label="Apple Calendar"
              onClick={downloadICSFile}
            />
            <CalendarButton
              icon={CalendarIcon}
              label="Outlook Calendar"
              onClick={downloadICSFile}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default function EventCards({ events }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-[#262626]/10",
      )}
    >
      {events.map((event, index) => (
        <SingleEventCard key={index} eventData={event} />
      ))}
    </div>
  );
}
