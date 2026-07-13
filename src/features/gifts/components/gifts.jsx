import { CheckCircle, ExternalLink, Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGiftProducts } from "@/services/api";
import { useInvitation } from "@/features/invitation";
import { cn } from "@/lib/utils";

export default function Gifts() {
  const { uid } = useInvitation();
  const { data: gifts = [], isLoading } = useQuery({
    queryKey: ["gift-products", uid],
    queryFn: async () => (await fetchGiftProducts(uid)).data,
    enabled: !!uid,
    staleTime: 60 * 1000,
  });

  return (
    <section id="gifts" className={cn("relative overflow-hidden bg-[#fdf8f3]")}>
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

        {isLoading && (
          <div className={cn("h-px w-20 animate-pulse bg-[#ff4582]")} />
        )}

        {!isLoading && gifts.length === 0 && (
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

        <div className={cn("grid gap-10")}>
          {gifts.map((gift, index) => (
            <article
              key={gift.id}
              className={cn("group", index % 2 === 1 && "mt-12")}
            >
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
                  {gift.image_url ? (
                    <img
                      src={gift.image_url}
                      alt={gift.name}
                      className={cn("super-image h-full w-full object-cover")}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={cn("flex h-full items-center justify-center")}
                    >
                      <Gift className={cn("h-16 w-16 text-[#ff4582]")} />
                    </div>
                  )}

                  <div
                    className={cn(
                      "super-transition absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-[#262626] text-center text-[10px] font-medium uppercase tracking-[0.18em] text-white opacity-0 group-hover:scale-100 group-hover:opacity-100",
                    )}
                  >
                    Ver presente
                  </div>

                  {gift.is_received && (
                    <div
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-[#fdf8f3]/80",
                      )}
                    >
                      <span
                        className={cn(
                          "flex items-center gap-2 rounded-full bg-[#262626] px-4 py-2 text-sm font-medium uppercase tracking-[0.16em] text-white",
                        )}
                      >
                        <CheckCircle className={cn("h-4 w-4")} />
                        Ja ganhamos
                      </span>
                    </div>
                  )}
                </div>
              </a>

              <div className={cn("mt-5")}>
                <p className={cn("super-label")}>Presente</p>
                <h3
                  className={cn(
                    "mt-2 text-3xl font-semibold leading-none tracking-tight text-[#262626]",
                  )}
                >
                  {gift.name}
                </h3>
                <p
                  className={cn(
                    "mt-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-[#262626]/45",
                  )}
                >
                  {gift.price || "Valor a consultar"}
                  {gift.url && (
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
      </div>
    </section>
  );
}
