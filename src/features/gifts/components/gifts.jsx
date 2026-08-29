import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCircle,
  Copy,
  ExternalLink,
  Gift,
  Heart,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGiftProducts } from "@/services/api";
import { useInvitation } from "@/features/invitation";
import { cn } from "@/lib/utils";

const PIX_HOLDER = {
  name: "Lucas Toledo Casaloti",
  bank: "260 - Nu Pagamentos S.A.",
  document: "***.800.986-**",
};

function isPixGift(gift) {
  return String(gift?.url || "").startsWith("pix://");
}

function getPixKey(gift) {
  return String(gift?.url || "").replace("pix://", "");
}

function getGiftCategory(gift) {
  return String(gift?.category || "Presentes").trim() || "Presentes";
}

function PixModal({ gift, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!gift || typeof document === "undefined") return null;

  const pixKey = getPixKey(gift);
  // Only a real QR belongs in the QR frame — falling back to the product photo
  // showed the pink Pix logo as if it were scannable.
  const qrImage = gift.pix_qr_image_url || "";
  // The full Pix payload already carries the exact amount, so copying it
  // spares the guest from typing the value by hand. Fall back to the bare
  // key for gifts that don't have a payload yet.
  const pixPayload = gift.pix_payload || "";
  // The open "carinho" card carries a code with no amount, so the guest picks
  // how much to send; every other code already has its value baked in.
  const hasFixedAmount = Boolean(gift.price_cents);

  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(pixPayload || pixKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-[#262626]/40 px-5 py-6 backdrop-blur-sm",
      )}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "max-h-[92svh] w-full max-w-md overflow-y-auto rounded-[30px] border border-white/70 bg-[#fdf8f3] shadow-[0_24px_90px_rgba(38,38,38,0.24)]",
        )}
      >
        <div
          className={cn(
            "relative bg-[#ff4582] px-5 pb-5 pt-5 text-center text-[#fdf8f3]",
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#262626]/55 transition hover:text-[#ff4582]",
            )}
            aria-label="Fechar Pix"
          >
            <X className={cn("h-5 w-5")} />
          </button>
          <Heart className={cn("mx-auto h-7 w-7 fill-current")} />
          <h3 className={cn("mt-3 text-2xl font-semibold leading-none")}>
            {gift.name}
          </h3>
          <p
            className={cn(
              "mx-auto mt-3 max-w-xs text-[13px] font-medium leading-relaxed text-white/90",
            )}
          >
            {gift.price ||
              "Presenteie via Pix - qualquer contribuição será recebida com muito carinho."}
          </p>

          {qrImage && (
            <div
              className={cn(
                "mx-auto mt-5 w-40 rounded-2xl bg-white p-3 shadow-lg",
              )}
            >
              <img
                src={qrImage}
                alt={`QR Code Pix - ${gift.name}`}
                className={cn("h-full w-full")}
              />
            </div>
          )}

          <button
            type="button"
            onClick={copyPixCode}
            className={cn(
              "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-[#ff4582] transition hover:bg-[#fdf8f3]",
            )}
          >
            {copied ? (
              <Check className={cn("h-4 w-4")} />
            ) : (
              <Copy className={cn("h-4 w-4")} />
            )}
            {copied
              ? "Código copiado"
              : pixPayload
                ? "Copiar código Pix"
                : "Copiar chave Pix"}
          </button>
          {/* Nubank sends us no payment notification, so the guest has to be
              told plainly that finishing the payment is up to them. */}
          <p
            className={cn(
              "mx-auto mt-3 max-w-xs text-[11px] font-medium leading-relaxed text-white/85",
            )}
          >
            {`Copie ${pixPayload ? "o código" : "a chave"}${qrImage ? " ou escaneie o QR Code acima" : ""} no app do seu banco para concluir o pagamento.`}
            {hasFixedAmount
              ? " O valor já vem preenchido."
              : " Você escolhe o valor."}
          </p>
        </div>

        <div className={cn("px-5 py-4 text-[#262626]")}>
          <div
            className={cn(
              "grid gap-3 border-t border-[#262626]/10 pt-4 text-sm",
            )}
          >
            <div className={cn("grid grid-cols-[92px_1fr] gap-3")}>
              <span className={cn("font-semibold")}>Nome</span>
              <span>{PIX_HOLDER.name}</span>
            </div>
            <div className={cn("grid grid-cols-[92px_1fr] gap-3")}>
              <span className={cn("font-semibold")}>CPF</span>
              <span>{PIX_HOLDER.document}</span>
            </div>
            <div className={cn("grid grid-cols-[92px_1fr] gap-3")}>
              <span className={cn("font-semibold")}>Banco</span>
              <span>{PIX_HOLDER.bank}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function GiftCardVisual({ gift }) {
  return (
    <div
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#f5f0eb]",
      )}
    >
      <div className={cn("absolute inset-0 flex items-center justify-center")}>
        <Gift className={cn("h-16 w-16 text-[#ff4582]")} />
      </div>
      {gift.image_url ? (
        <img
          src={gift.image_url}
          alt={gift.name}
          className={cn("super-image relative h-full w-full object-cover")}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.remove();
          }}
        />
      ) : null}

      {!gift.is_received && (
        <div
          className={cn(
            "super-transition absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-[#262626] text-center text-[8px] font-medium uppercase tracking-[0.14em] text-white opacity-0 group-hover:scale-100 group-hover:opacity-100",
          )}
        >
          {gift.price_cents ? "Presentear" : "Ver"}
        </div>
      )}

      {gift.is_received && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-[#fdf8f3]/80",
          )}
        >
          <span
            className={cn(
              "flex items-center gap-1 rounded-full bg-[#ff4582] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white",
            )}
          >
            <CheckCircle className={cn("h-3 w-3")} />
            Ganhamos
          </span>
        </div>
      )}
    </div>
  );
}

function PixCardVisual({ gift }) {
  return (
    <div
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#ff4582] text-[#fdf8f3]",
      )}
    >
      <img
        src={gift.image_url || "/images/pix-icon.jpg"}
        alt="Pix"
        className={cn("h-full w-full object-cover")}
      />
      {gift.is_received ? (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-[#fdf8f3]/80",
          )}
        >
          <span
            className={cn(
              "flex items-center gap-1 rounded-full bg-[#ff4582] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white",
            )}
          >
            <CheckCircle className={cn("h-3 w-3")} />
            Ganhamos
          </span>
        </div>
      ) : (
        <div className={cn("absolute inset-x-3 bottom-3 flex justify-center")}>
          <span
            className={cn(
              "rounded-full bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff4582] shadow-lg",
            )}
          >
            Presentear
          </span>
        </div>
      )}
    </div>
  );
}

export default function Gifts() {
  const { uid } = useInvitation();
  const [pixModalGift, setPixModalGift] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [visibleCount, setVisibleCount] = useState(8);
  const { data: gifts = [], isLoading } = useQuery({
    queryKey: ["gift-products", uid],
    queryFn: async () => (await fetchGiftProducts(uid)).data,
    enabled: !!uid,
    staleTime: 60 * 1000,
  });

  const categories = useMemo(() => {
    const unique = [...new Set(gifts.map(getGiftCategory))].filter(Boolean);
    return unique.sort((a, b) => {
      if (a === "Pix") return -1;
      if (b === "Pix") return 1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [gifts]);
  const filteredGifts = useMemo(() => {
    if (activeCategory === "Todos") return gifts;
    return gifts.filter((gift) => getGiftCategory(gift) === activeCategory);
  }, [activeCategory, gifts]);
  const visibleGifts = filteredGifts.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredGifts.length;

  useEffect(() => {
    setVisibleCount(8);
  }, [activeCategory]);

  return (
    <section id="gifts" className={cn("relative overflow-hidden bg-[#fdf8f3]")}>
      <PixModal gift={pixModalGift} onClose={() => setPixModalGift(null)} />
      <img
        src="/images/flowers.png"
        alt=""
        className={cn(
          "pointer-events-none absolute -right-24 top-20 w-56 rotate-12 opacity-30",
        )}
      />
      <div className={cn("mx-auto px-5 py-20")}>
        <div className={cn("mb-12 space-y-5")}>
          <p className={cn("super-label")}>Lista de presentes</p>
          <h2 className={cn("super-heading text-5xl")}>
            Nosso próximo capítulo
          </h2>
          <p className={cn("super-copy max-w-sm text-[1.125rem] font-medium")}>
            Se desejar nos presentear, reunimos algumas sugestões que farão
            parte da nossa nova etapa.
          </p>
        </div>

        {!isLoading && gifts.length > 0 && (
          <div className={cn("mb-8 space-y-5")}>
            <div>
              <div className={cn("mb-3 flex items-center gap-3")}>
                <span className={cn("h-px flex-1 bg-[#262626]/10")} />
                <span
                  className={cn(
                    "text-[9px] font-black uppercase tracking-[0.32em] text-[#ff4582]",
                  )}
                >
                  Categorias
                </span>
                <span className={cn("h-px flex-1 bg-[#262626]/10")} />
              </div>
              <div className={cn("flex flex-wrap justify-center gap-2")}>
                {["Todos", ...categories].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "rounded-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
                      activeCategory === category
                        ? "border-[#262626] bg-[#262626] text-[#fdf8f3]"
                        : "border-[#262626]/10 bg-white/55 text-[#262626]/55 hover:border-[#ff4582]/40 hover:text-[#ff4582]",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className={cn("h-px w-20 animate-pulse bg-[#ff4582]")} />
        )}

        {!isLoading && filteredGifts.length === 0 && (
          <div
            className={cn(
              "rounded-[24px] border border-[#262626]/10 bg-[#f5f0eb] p-8 text-center",
            )}
          >
            <Gift className={cn("mx-auto h-12 w-12 text-[#ff4582]")} />
            <p className={cn("mt-4 text-xl font-medium text-[#262626]")}>
              A lista de presentes sera publicada em breve.
            </p>
          </div>
        )}

        <div className={cn("grid grid-cols-2 gap-4")}>
          {visibleGifts.map((gift) => (
            <article key={gift.id} className={cn("group min-w-0")}>
              {/* A won gift is informational only — no navigation, no Pix
                  modal — so the guest is never nudged toward a gift that is
                  already taken. */}
              {gift.is_received ? (
                <div className={cn("block w-full cursor-default")}>
                  {isPixGift(gift) ? (
                    <PixCardVisual gift={gift} />
                  ) : (
                    <GiftCardVisual gift={gift} />
                  )}
                </div>
              ) : isPixGift(gift) ? (
                <button
                  type="button"
                  onClick={() => setPixModalGift(gift)}
                  className={cn("block w-full text-left")}
                >
                  <PixCardVisual gift={gift} />
                </button>
              ) : (
                <a
                  href={gift.url || "#gifts"}
                  target={gift.url ? "_blank" : undefined}
                  rel={gift.url ? "noreferrer" : undefined}
                  className={cn("block")}
                >
                  <GiftCardVisual gift={gift} />
                </a>
              )}

              <div className={cn("mt-3")}>
                <p
                  className={cn(
                    "text-[8px] font-black uppercase tracking-[0.24em] text-[#ff4582]",
                  )}
                >
                  {isPixGift(gift) && !gift.is_received
                    ? "Presenteie com Pix"
                    : getGiftCategory(gift)}
                </p>
                <h3
                  className={cn(
                    "mt-1 text-xl font-semibold leading-none tracking-tight text-[#262626]",
                  )}
                >
                  {gift.name}
                </h3>
                {/* Once a gift is won there is nothing left to consult, so the
                    "valor a consultar" fallback is dropped for received ones. */}
                {/* "Valor a consultar" only makes sense for a product still
                    waiting on a price — not for a won gift, and not for the
                    open Pix card where the guest picks the amount. */}
                {(gift.price || (!gift.is_received && !isPixGift(gift))) && (
                  <p
                    className={cn(
                      "mt-2 flex flex-wrap items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#262626]/45",
                    )}
                  >
                    {gift.price || "Valor a consultar"}
                    {gift.url && !isPixGift(gift) && (
                      <>
                        <span>•</span>
                        <ExternalLink className={cn("h-4 w-4")} />
                      </>
                    )}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        {canLoadMore && (
          <div className={cn("mt-8 flex justify-center")}>
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + 8)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[#262626]/10 bg-white/55 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#262626]/70 backdrop-blur transition hover:border-[#ff4582]/40 hover:text-[#ff4582]",
              )}
            >
              <Gift className={cn("h-4 w-4")} />
              Ver mais Produtos
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
