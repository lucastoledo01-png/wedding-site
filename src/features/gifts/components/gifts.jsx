import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CheckCircle, Copy, ExternalLink, Gift, Heart, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGiftProducts } from "@/services/api";
import { useInvitation } from "@/features/invitation";
import { cn } from "@/lib/utils";

const PIX_KEY = "08080098697";
const PIX_INFO = {
  name: "Lucas Toledo Casaloti",
  bank: "260 - Nu Pagamentos S.A.",
  document: "***.800.986-**",
  qrCode: "/images/pix-qr-code.png",
};

function isPixGift(gift) {
  return gift?.gift_type === "pix" || gift?.url === "pix://lucas-andressa";
}

function getGiftCategory(gift) {
  if (isPixGift(gift)) return "Pix";
  return String(gift?.category || "Presentes").trim() || "Presentes";
}

function parseGiftPrice(price) {
  const raw = String(price || "");
  const match = raw.match(/(\d[\d.,]*)/);
  if (!match) return null;

  const normalized = match[1].replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function PixModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!open || typeof document === "undefined") return null;

  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
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
        <div className={cn("relative bg-[#ff4582] px-5 pb-5 pt-5 text-center text-[#fdf8f3]")}>
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
            Presente em Pix
          </h3>
          <p className={cn("mx-auto mt-3 max-w-xs text-[13px] font-medium leading-relaxed text-white/90")}>
            Se quiser nos presentear de uma forma prática, qualquer contribuição
            será recebida com muito carinho para o início da nossa nova fase.
          </p>

          <div className={cn("mx-auto mt-5 w-40 rounded-2xl bg-white p-3 shadow-lg")}>
            <img
              src={PIX_INFO.qrCode}
              alt="QR Code Pix Lucas e Andressa"
              className={cn("h-full w-full")}
            />
          </div>

          <button
            type="button"
            onClick={copyPixKey}
            className={cn(
              "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-[#ff4582] transition hover:bg-[#fdf8f3]",
            )}
          >
            {copied ? <Check className={cn("h-4 w-4")} /> : <Copy className={cn("h-4 w-4")} />}
            {copied ? "Chave copiada" : "Copiar chave Pix"}
          </button>
        </div>

        <div className={cn("px-5 py-4 text-[#262626]")}>
          <div className={cn("grid gap-3 border-t border-[#262626]/10 pt-4 text-sm")}>
            <div className={cn("grid grid-cols-[92px_1fr_auto] items-center gap-3")}>
              <span className={cn("font-semibold")}>Chave Pix</span>
              <span className={cn("break-all font-semibold text-[#ff4582]")}>{PIX_KEY}</span>
              <button
                type="button"
                onClick={copyPixKey}
                className={cn("grid h-9 w-9 place-items-center rounded-full border border-[#262626]/10 text-[#ff4582]")}
                aria-label="Copiar chave Pix"
              >
                {copied ? <Check className={cn("h-4 w-4")} /> : <Copy className={cn("h-4 w-4")} />}
              </button>
            </div>
            <div className={cn("grid grid-cols-[92px_1fr] gap-3")}>
              <span className={cn("font-semibold")}>Nome</span>
              <span>{PIX_INFO.name}</span>
            </div>
            <div className={cn("grid grid-cols-[92px_1fr] gap-3")}>
              <span className={cn("font-semibold")}>CPF</span>
              <span>{PIX_INFO.document}</span>
            </div>
            <div className={cn("grid grid-cols-[92px_1fr] gap-3")}>
              <span className={cn("font-semibold")}>Banco</span>
              <span>{PIX_INFO.bank}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function Gifts() {
  const { uid } = useInvitation();
  const [pixOpen, setPixOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [sortMode, setSortMode] = useState("manual");
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
    const byCategory =
      activeCategory === "Todos"
        ? gifts
        : gifts.filter((gift) => getGiftCategory(gift) === activeCategory);
    const ordered = [...byCategory];

    if (sortMode === "price-desc" || sortMode === "price-asc") {
      ordered.sort((a, b) => {
        const aPrice = parseGiftPrice(a.price);
        const bPrice = parseGiftPrice(b.price);

        if (aPrice === null && bPrice === null) {
          return Number(a.sort_order || 0) - Number(b.sort_order || 0);
        }
        if (aPrice === null) return 1;
        if (bPrice === null) return -1;
        return sortMode === "price-desc" ? bPrice - aPrice : aPrice - bPrice;
      });
    }

    return ordered;
  }, [activeCategory, gifts, sortMode]);
  const visibleGifts = filteredGifts.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredGifts.length;

  useEffect(() => {
    setVisibleCount(8);
  }, [activeCategory, sortMode]);

  return (
    <section id="gifts" className={cn("relative overflow-hidden bg-[#fdf8f3]")}>
      <PixModal open={pixOpen} onClose={() => setPixOpen(false)} />
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
            Para celebrar o que vem pela frente
          </h2>
          <p className={cn("super-copy max-w-sm text-[1.125rem] font-medium")}>
            Se quiser fazer parte deste momento com um presente, preparamos
            algumas sugestões que vão acompanhar o início deste novo ciclo.
          </p>
        </div>

        {!isLoading && gifts.length > 0 && (
          <div className={cn("mb-8 space-y-5")}>
            <div className={cn("grid grid-cols-2 gap-2")}>
              {[
                ["price-desc", "Maior preço"],
                ["price-asc", "Menor preço"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setSortMode((current) => (current === mode ? "manual" : mode))
                  }
                  className={cn(
                    "rounded-full border px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition",
                    sortMode === mode
                      ? "border-[#ff4582] bg-[#ff4582] text-white"
                      : "border-[#262626]/10 bg-white/60 text-[#262626]/60 hover:border-[#ff4582]/40 hover:text-[#ff4582]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <div className={cn("mb-3 flex items-center gap-3")}>
                <span className={cn("h-px flex-1 bg-[#262626]/10")} />
                <span className={cn("text-[9px] font-black uppercase tracking-[0.32em] text-[#ff4582]")}>
                  Categorias
                </span>
                <span className={cn("h-px flex-1 bg-[#262626]/10")} />
              </div>
              <div className={cn("-mx-5 flex gap-2 overflow-x-auto px-5 pb-1")}>
                {["Todos", ...categories].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
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
              {isPixGift(gift) ? (
                <button
                  type="button"
                  onClick={() => setPixOpen(true)}
                  className={cn("block w-full text-left")}
                >
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
                    <div className={cn("absolute inset-x-3 bottom-3 flex justify-center")}>
                      <span
                        className={cn(
                          "rounded-full bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff4582] shadow-lg",
                        )}
                      >
                        Ver QR Code
                      </span>
                    </div>
                  </div>
                </button>
              ) : (
                <a
                  href={gift.url || "#gifts"}
                  target={gift.url ? "_blank" : undefined}
                  rel={gift.url ? "noreferrer" : undefined}
                  className={cn("block")}
                >
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

                  <div
                    className={cn(
                      "super-transition absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-[#262626] text-center text-[8px] font-medium uppercase tracking-[0.14em] text-white opacity-0 group-hover:scale-100 group-hover:opacity-100",
                    )}
                  >
                    Ver
                  </div>

                  {gift.is_received && (
                    <div
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-[#fdf8f3]/80",
                      )}
                    >
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full bg-[#262626] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white",
                        )}
                      >
                        <CheckCircle className={cn("h-3 w-3")} />
                        Ganhamos
                      </span>
                    </div>
                  )}
                </div>
                </a>
              )}

              <div className={cn("mt-3")}>
                <p className={cn("text-[8px] font-black uppercase tracking-[0.24em] text-[#ff4582]")}>
                  {isPixGift(gift) ? "Presenteie com Pix" : getGiftCategory(gift)}
                </p>
                <h3
                  className={cn(
                    "mt-1 text-xl font-semibold leading-none tracking-tight text-[#262626]",
                  )}
                >
                  {gift.name}
                </h3>
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
