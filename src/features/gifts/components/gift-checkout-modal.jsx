import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Loader2, X } from "lucide-react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { createGiftPayment, fetchGiftPaymentStatus } from "@/services/api";
import { useInvitation } from "@/features/invitation";
import { cn } from "@/lib/utils";

let mpInitialized = false;

function ensureMercadoPagoInitialized() {
  if (mpInitialized) return;
  const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
  if (!publicKey) {
    console.warn("[MercadoPago] VITE_MP_PUBLIC_KEY não configurado.");
    return;
  }
  initMercadoPago(publicKey, { locale: "pt-BR" });
  mpInitialized = true;
}

const STATUS_MESSAGES = {
  approved: {
    title: "Presente confirmado!",
    message: "Muito obrigado pelo carinho — o presente já está marcado como recebido.",
  },
  pending: {
    title: "Pagamento em processamento",
    message: "Assim que for aprovado, o presente é marcado automaticamente. Pode fechar esta janela.",
  },
  in_process: {
    title: "Pagamento em análise",
    message: "Estamos aguardando a confirmação do Mercado Pago.",
  },
  rejected: {
    title: "Pagamento não aprovado",
    message: "Não foi possível concluir o pagamento. Tente outro cartão ou use o Pix.",
  },
};

export default function GiftCheckoutModal({ gift, onClose }) {
  const { uid } = useInvitation();
  const [payerEmail, setPayerEmail] = useState("");
  const [payerName, setPayerName] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    ensureMercadoPagoInitialized();
  }, []);

  // Poll for the final status while a Pix payment is pending.
  useEffect(() => {
    if (!result?.paymentId || result.status === "approved" || result.status === "rejected") return;

    const interval = setInterval(async () => {
      try {
        const response = await fetchGiftPaymentStatus(uid, gift.id, result.paymentId);
        if (response.data.status !== result.status) {
          setResult((current) => ({ ...current, status: response.data.status }));
        }
      } catch {
        // Keep polling silently; the webhook is the source of truth.
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [result, uid, gift.id]);

  const amount = useMemo(() => (gift.price_cents || 0) / 100, [gift.price_cents]);

  async function handleSubmit(formData) {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await createGiftPayment(uid, gift.id, {
        token: formData.formData?.token,
        paymentMethodId: formData.formData?.payment_method_id,
        installments: formData.formData?.installments,
        payerEmail: formData.formData?.payer?.email || payerEmail,
        payerName,
      });
      setResult(response.data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (typeof document === "undefined") return null;

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
          "max-h-[92svh] w-full max-w-md overflow-y-auto rounded-[30px] border border-white/70 bg-[#fdf8f3] p-6 shadow-[0_24px_90px_rgba(38,38,38,0.24)]",
        )}
      >
        <div className={cn("flex items-start justify-between gap-4")}>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-[0.24em] text-[#ff4582]")}>
              Presentear
            </p>
            <h3 className={cn("mt-1 text-xl font-semibold text-[#262626]")}>{gift.name}</h3>
            <p className={cn("mt-1 text-sm font-medium text-[#262626]/60")}>
              {amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#262626]/10 text-[#262626]/55 transition hover:text-[#ff4582]")}
            aria-label="Fechar"
          >
            <X className={cn("h-4 w-4")} />
          </button>
        </div>

        {result ? (
          <div className={cn("mt-6 rounded-2xl border border-[#262626]/10 bg-white p-5 text-center")}>
            {result.status === "approved" ? (
              <CheckCircle className={cn("mx-auto h-10 w-10 text-emerald-500")} />
            ) : (
              <Loader2 className={cn("mx-auto h-10 w-10 animate-spin text-[#ff4582]")} />
            )}
            <p className={cn("mt-3 text-lg font-semibold text-[#262626]")}>
              {STATUS_MESSAGES[result.status]?.title || "Pagamento recebido"}
            </p>
            <p className={cn("mt-2 text-sm text-[#262626]/65")}>
              {STATUS_MESSAGES[result.status]?.message || "Vamos confirmar assim que possível."}
            </p>
            {result.qrCodeBase64 && result.status !== "approved" && (
              <img
                src={`data:image/png;base64,${result.qrCodeBase64}`}
                alt="QR Code Pix"
                className={cn("mx-auto mt-4 w-48 rounded-xl border border-[#262626]/10")}
              />
            )}
          </div>
        ) : (
          <div className={cn("mt-5 space-y-3")}>
            <label className={cn("grid gap-1 text-sm font-medium text-[#262626]")}>
              <span>Seu nome</span>
              <input
                value={payerName}
                onChange={(event) => setPayerName(event.target.value)}
                className={cn("rounded-full border border-[#262626]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                placeholder="Nome completo"
              />
            </label>
            <label className={cn("grid gap-1 text-sm font-medium text-[#262626]")}>
              <span>Seu e-mail</span>
              <input
                type="email"
                value={payerEmail}
                onChange={(event) => setPayerEmail(event.target.value)}
                className={cn("rounded-full border border-[#262626]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                placeholder="voce@email.com"
                required
              />
            </label>

            {error && (
              <p className={cn("rounded-xl bg-[#fff1f6] px-4 py-2 text-sm font-medium text-[#b91853]")}>
                {error}
              </p>
            )}

            {payerEmail && (
              <Payment
                initialization={{ amount, payer: { email: payerEmail } }}
                customization={{
                  paymentMethods: { creditCard: "all", debitCard: "all", bankTransfer: "all" },
                }}
                onSubmit={handleSubmit}
                onError={(brickError) => setError(brickError.message || "Erro no formulário de pagamento.")}
                locale="pt-BR"
              />
            )}

            {isSubmitting && (
              <p className={cn("flex items-center justify-center gap-2 text-sm text-[#262626]/60")}>
                <Loader2 className={cn("h-4 w-4 animate-spin")} /> Processando pagamento...
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
