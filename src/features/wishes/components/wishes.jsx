import { MessageCircle, Send, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchWishes, createWish } from "@/services/api";
import { useInvitation } from "@/features/invitation";
import { cn } from "@/lib/utils";

function formatWishDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export default function Wishes() {
  const { uid } = useInvitation();
  const queryClient = useQueryClient();
  const recaptchaMode = import.meta.env.VITE_RECAPTCHA_MODE || "checkbox";
  const enterpriseSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
  const classicSiteKey =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
    "6LcPOFAtAAAAAA3OjfyBiOVYv98Dxf10Ey1ehunD";
  const recaptchaSiteKey =
    recaptchaMode === "enterprise" ? enterpriseSiteKey : classicSiteKey;
  const recaptchaAction =
    import.meta.env.VITE_RECAPTCHA_ENTERPRISE_ACTION || "wedding_wish";
  const shouldUseEnterprise =
    recaptchaMode === "enterprise" && Boolean(recaptchaSiteKey);
  const shouldUseCheckbox =
    recaptchaMode !== "enterprise" && Boolean(recaptchaSiteKey);
  const recaptchaRef = useRef(null);
  const recaptchaWidgetRef = useRef(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isFormOpen || !shouldUseCheckbox || !recaptchaRef.current) return;
    recaptchaWidgetRef.current = null;

    window.onWeddingRecaptchaReady = () => {
      if (!window.grecaptcha || recaptchaWidgetRef.current !== null) return;
      recaptchaWidgetRef.current = window.grecaptcha.render(
        recaptchaRef.current,
        {
          sitekey: recaptchaSiteKey,
          callback: (token) => setRecaptchaToken(token),
          "expired-callback": () => setRecaptchaToken(""),
        },
      );
    };

    if (!document.querySelector('script[src*="recaptcha/api.js"]')) {
      const script = document.createElement("script");
      script.src =
        "https://www.google.com/recaptcha/api.js?onload=onWeddingRecaptchaReady&render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      window.onWeddingRecaptchaReady();
    }
  }, [isFormOpen, recaptchaSiteKey, shouldUseCheckbox]);

  useEffect(() => {
    if (!isFormOpen || !shouldUseEnterprise) return;

    if (window.grecaptcha?.enterprise) {
      return;
    }

    if (!document.querySelector('script[src*="recaptcha/enterprise.js"]')) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${recaptchaSiteKey}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [isFormOpen, recaptchaSiteKey, shouldUseEnterprise]);

  useEffect(() => {
    if (!isFormOpen) return;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsFormOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isFormOpen]);

  const { data: wishes = [] } = useQuery({
    queryKey: ["wishes", uid],
    queryFn: async () => (await fetchWishes(uid)).data,
    enabled: !!uid,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      let token = recaptchaToken;

      if (shouldUseEnterprise) {
        token = await new Promise((resolve, reject) => {
          if (!window.grecaptcha?.enterprise) {
            reject(new Error("reCAPTCHA ainda não carregou. Tente novamente."));
            return;
          }

          window.grecaptcha.enterprise.ready(async () => {
            try {
              const enterpriseToken =
                await window.grecaptcha.enterprise.execute(recaptchaSiteKey, {
                  action: recaptchaAction,
                });
              resolve(enterpriseToken);
            } catch (error) {
              reject(error);
            }
          });
        });
      }

      return createWish(uid, {
        name: name.trim(),
        message: message.trim(),
        attendance: "MAYBE",
        recaptchaToken: token,
        recaptchaAction,
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["wishes", uid], (old = []) => [
        response.data,
        ...old,
      ]);
      setName("");
      setMessage("");
      setRecaptchaToken("");
      setIsFormOpen(false);
      if (window.grecaptcha && recaptchaWidgetRef.current !== null) {
        window.grecaptcha.reset(recaptchaWidgetRef.current);
      }
    },
    onError: (error) => {
      setFormError(error.message || "Não foi possível enviar o recado agora.");
      setRecaptchaToken("");
      if (window.grecaptcha && recaptchaWidgetRef.current !== null) {
        window.grecaptcha.reset(recaptchaWidgetRef.current);
      }
    },
  });

  const submit = (event) => {
    event.preventDefault();
    setFormError("");
    if (!name.trim() || !message.trim()) return;
    if (shouldUseCheckbox && !recaptchaToken) {
      setFormError("Confirme o reCAPTCHA antes de enviar.");
      return;
    }
    mutation.mutate();
  };

  const wishDialog =
    isFormOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[9999] flex items-center justify-center bg-[#262626]/35 px-4 py-6 backdrop-blur-sm",
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wish-dialog-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsFormOpen(false);
            }}
          >
            <form
              onSubmit={submit}
              className={cn(
                "max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/70 bg-[#fdf8f3] p-5 shadow-[0_24px_80px_rgba(38,38,38,0.22)]",
              )}
            >
              <div className={cn("flex items-start justify-between gap-4")}>
                <div>
                  <p className={cn("super-label text-[#ff4582]")}>Mensagem</p>
                  <h3
                    id="wish-dialog-title"
                    className={cn(
                      "mt-1 text-3xl font-medium tracking-tight text-[#262626]",
                    )}
                  >
                    Deixar recado
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-full bg-white text-[#262626]/55 transition hover:text-[#ff4582]",
                  )}
                  aria-label="Fechar"
                >
                  <X className={cn("h-4 w-4")} />
                </button>
              </div>

              <div className={cn("mt-5 grid gap-4")}>
                <input
                  value={name}
                  onChange={(event) => {
                    setFormError("");
                    setName(event.target.value);
                  }}
                  placeholder="Seu nome"
                  className={cn(
                    "rounded-full border border-[#262626]/10 bg-white px-5 py-4 text-base outline-none transition focus:border-[#ff4582]",
                  )}
                />
                <textarea
                  value={message}
                  onChange={(event) => {
                    setFormError("");
                    setMessage(event.target.value);
                  }}
                  placeholder="Escreva sua mensagem"
                  rows={4}
                  className={cn(
                    "rounded-3xl border border-[#262626]/10 bg-white px-5 py-4 text-base outline-none transition focus:border-[#ff4582]",
                  )}
                />
                {shouldUseCheckbox ? (
                  <div
                    className={cn("min-h-[78px] overflow-hidden rounded-2xl")}
                  >
                    <div ref={recaptchaRef} />
                  </div>
                ) : null}
                {shouldUseEnterprise ? (
                  <p
                    className={cn(
                      "text-center text-xs leading-relaxed text-[#262626]/45",
                    )}
                  >
                    Protegido por reCAPTCHA.
                  </p>
                ) : null}
                {formError ? (
                  <p
                    className={cn(
                      "rounded-2xl bg-[#ff4582]/10 px-4 py-3 text-sm font-medium text-[#b91853]",
                    )}
                  >
                    {formError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={
                    mutation.isPending || (shouldUseCheckbox && !recaptchaToken)
                  }
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-full bg-[#262626] px-5 py-4 text-sm font-medium uppercase tracking-[0.16em] text-white transition hover:bg-[#ff4582] disabled:opacity-60",
                  )}
                >
                  <Send className={cn("h-4 w-4")} />
                  {mutation.isPending ? "Enviando..." : "Enviar recado"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section
        id="wishes"
        className={cn("relative overflow-hidden bg-[#fdf8f3]")}
      >
        <img
          src="/images/flowers.png"
          alt=""
          className={cn(
            "pointer-events-none absolute -right-24 top-6 w-56 rotate-12 opacity-35",
          )}
        />
        <img
          src="/images/flowers.png"
          alt=""
          className={cn(
            "pointer-events-none absolute -left-28 bottom-10 w-52 -rotate-12 opacity-25",
          )}
        />
        <div className={cn("mx-auto px-5 py-20")}>
          <div className={cn("space-y-5")}>
            <p className={cn("super-label")}>Mensagens</p>
            <h2 className={cn("super-heading text-5xl")}>Deixe sua mensagem</h2>
            <p className={cn("super-copy max-w-sm text-[1.125rem]")}>
              Deixe um recado para nós. Será uma alegria guardar cada mensagem como
              uma lembrança deste dia.
            </p>
          </div>

          <div className={cn("mt-10 grid gap-4")}>
            {wishes.length === 0 ? (
              <div
                className={cn(
                  "rounded-[24px] border border-[#262626]/10 bg-[#f5f0eb] p-7 text-center",
                )}
              >
                <MessageCircle
                  className={cn("mx-auto h-10 w-10 text-[#ff4582]")}
                />
                <p className={cn("mt-4 text-lg font-normal text-[#262626]/70")}>
                  As mensagens aparecerão aqui.
                </p>
              </div>
            ) : (
              wishes.slice(0, 8).map((wish) => (
                <article
                  key={wish.id}
                  className={cn(
                    "rounded-[24px] border border-[#262626]/10 bg-[#f5f0eb] p-5",
                  )}
                >
                  <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1")}>
                    <p className={cn("text-lg font-medium text-[#262626]")}>
                      {wish.name}
                    </p>
                    {formatWishDate(wish.created_at) ? (
                      <span className={cn("text-xs font-normal text-[#262626]/38")}>
                        {formatWishDate(wish.created_at)}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-base leading-relaxed text-[#262626]/65",
                    )}
                  >
                    {wish.message}
                  </p>
                </article>
              ))
            )}
          </div>

          <div className={cn("mt-8 flex justify-center")}>
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setIsFormOpen(true);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[#262626]/10 bg-white/55 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#262626]/70 backdrop-blur transition hover:border-[#ff4582]/40 hover:text-[#ff4582]",
              )}
            >
              <MessageCircle className={cn("h-4 w-4")} />
              Enviar recado
            </button>
          </div>
        </div>
      </section>
      {wishDialog}
    </>
  );
}
