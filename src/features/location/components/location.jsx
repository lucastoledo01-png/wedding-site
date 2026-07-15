import { CalendarCheck, Clock, ExternalLink, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { formatEventDate } from "@/lib/format-event-date";
import { useConfig } from "@/features/invitation/hooks/use-config";
import { useMotionPreset, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

const venues = [
  {
    type: "Cerimônia",
    name: "Santuário Nossa Senhora da Medalha Milagrosa",
    address: "Rua Padre Cornélio, 27 - Centro, Monte Sião - MG, 37580-000",
    time: "20h",
    showTime: true,
    image: "/images/igreja-medalha-milagrosa.webp",
    query:
      "Santuário Nossa Senhora da Medalha Milagrosa HC9H+3X Monte Sião Minas Gerais",
  },
  {
    type: "Recepção",
    name: "Restaurante Farol",
    address:
      "Bairro Por do Sol - R. Maria R. C. Silva, 3850 - Por do Sol, Monte Sião - MG, 37580-000",
    time: "21:30h",
    showTime: false,
    image: "/images/restaurante-farol.jpg",
    query: "Restaurante Farol HCCW+76 Monte Sião Minas Gerais",
  },
];

function mapEmbedUrl(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function mapSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function VenueCard({ venue, date }) {
  const fadeUp = useMotionPreset("fadeUp");

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={cn(
        "overflow-hidden rounded-[28px] border border-[#262626]/10 bg-[#fdf8f3] shadow-[0_24px_70px_rgba(38,38,38,0.10)]",
      )}
    >
      <div
        className={cn(
          "group relative aspect-[4/3] overflow-hidden bg-[#f5f0eb]",
        )}
      >
        <img
          src={venue.image}
          alt={venue.name}
          className={cn("super-image h-full w-full object-cover")}
        />
        <div
          className={cn(
            "absolute left-4 top-4 rounded-full bg-[#ff4582] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#fdf8f3] backdrop-blur-xl",
          )}
        >
          {venue.type}
        </div>
      </div>

      <div className={cn("p-5")}>
        <p className={cn("super-label")}>Local</p>
        <h3
          className={cn(
            "mt-2 text-3xl font-normal leading-none tracking-tight text-[#262626]",
          )}
        >
          {venue.name}
        </h3>

        <div className={cn("mt-6 space-y-4 text-base text-[#262626]/70")}>
          <p className={cn("flex items-start gap-3")}>
            <MapPin className={cn("mt-1 h-5 w-5 shrink-0 text-[#ff4582]")} />
            <span>{venue.address}</span>
          </p>
          <p className={cn("flex items-center gap-3")}>
            <CalendarCheck className={cn("h-5 w-5 text-[#ff4582]")} />
            <span>{formatEventDate(date)}</span>
          </p>
          {venue.showTime ? (
            <p className={cn("flex items-center gap-3")}>
              <Clock className={cn("h-5 w-5 text-[#ff4582]")} />
              <span>{venue.time}</span>
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-6 overflow-hidden rounded-[22px] border border-[#262626]/10 bg-[#f5f0eb] p-2",
          )}
        >
          <iframe
            src={mapEmbedUrl(venue.query)}
            width="100%"
            height="260"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className={cn("h-[260px] w-full rounded-[16px]")}
            title={`Mapa - ${venue.name}`}
          />
        </div>

        <a
          href={mapSearchUrl(venue.query)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#262626] px-5 py-4 text-sm font-medium uppercase tracking-[0.18em] text-[#fdf8f3] transition hover:bg-[#ff4582] hover:text-white",
          )}
        >
          <ExternalLink className={cn("h-4 w-4")} />
          Ver rota
        </a>
      </div>
    </motion.article>
  );
}

export default function Location() {
  const config = useConfig();
  const fadeUp = useMotionPreset("fadeUp");

  return (
    <section
      id="location"
      className={cn("relative overflow-hidden bg-[#fdf8f3]")}
    >
      <img
        src="/images/flowers.png"
        alt=""
        className={cn(
          "pointer-events-none absolute -left-28 top-16 w-56 -rotate-12 opacity-25",
        )}
      />
      <div className={cn("relative z-10 mx-auto px-5 py-20")}>
        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className={cn("mb-12 space-y-5")}
        >
          <motion.span
            variants={fadeUp}
            className={cn("super-label inline-block")}
          >
            Agenda
          </motion.span>

          <motion.h2 variants={fadeUp} className={cn("super-heading text-5xl")}>
            O nosso dia
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={cn("super-copy max-w-sm text-[1.125rem]")}
          >
            Nossa história foi construída entre encontros, escolhas e muitos
            momentos que nos trouxeram até aqui. Agora chegou a hora de celebrar
            esse novo ciclo ao lado de quem amamos.
          </motion.p>
        </motion.div>

        <div className={cn("grid gap-8")}>
          {venues.map((venue) => (
            <VenueCard key={venue.name} venue={venue} date={config.date} />
          ))}
        </div>
      </div>
    </section>
  );
}
