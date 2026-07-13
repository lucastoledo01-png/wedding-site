import { useMemo, useState } from "react";
import Confetti from "react-confetti";
import { CheckCircle, Loader2, Search, UserCheck, XCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { confirmPresence, searchGuest } from "@/services/api";
import { useInvitation } from "@/features/invitation";
import { cn } from "@/lib/utils";

const attendanceLabels = {
  ATTENDING: "Nome já confirmou presença.",
  NOT_ATTENDING: "Nome já confirmou ausência.",
  PENDING: "Nome encontrado. Você pode confirmar abaixo.",
};

function FeedbackModal({ feedback, onClose }) {
  if (!feedback || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-[#262626]/35 px-5 backdrop-blur-sm",
      )}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-[28px] border border-white/70 bg-[#fdf8f3] p-6 text-center shadow-[0_24px_80px_rgba(38,38,38,0.22)]",
        )}
      >
        <div
          className={cn(
            "mx-auto grid h-14 w-14 place-items-center rounded-full",
            feedback.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-[#ff4582] text-white",
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle className={cn("h-7 w-7")} />
          ) : (
            <XCircle className={cn("h-7 w-7")} />
          )}
        </div>
        <h3 className={cn("mt-5 text-2xl font-medium text-[#262626]")}>
          {feedback.title}
        </h3>
        <p className={cn("mt-3 text-base leading-relaxed text-[#262626]/65")}>
          {feedback.message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "mt-6 w-full rounded-full bg-[#262626] px-5 py-4 text-sm font-medium uppercase tracking-[0.16em] text-white transition hover:bg-[#ff4582]",
          )}
        >
          Fechar
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default function Rsvp() {
  const { uid } = useInvitation();
  const [name, setName] = useState("");
  const [attendance, setAttendance] = useState("ATTENDING");
  const [showConfetti, setShowConfetti] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const canSearch = name.trim().length >= 3 && !!uid;
  const { data, isFetching, error: searchError } = useQuery({
    queryKey: ["guest-search", uid, name],
    queryFn: async () => (await searchGuest(uid, name)).data,
    enabled: canSearch,
    staleTime: 5 * 1000,
    retry: false,
  });

  const match = data?.match;
  const hasSearchResult = canSearch && !isFetching && Boolean(data);
  const attendanceStatus = match?.attendance || "PENDING";
  const hasAlreadyAnswered =
    attendanceStatus === "ATTENDING" || attendanceStatus === "NOT_ATTENDING";
  const canConfirm = Boolean(match) && !hasAlreadyAnswered;
  const confidence = useMemo(() => {
    if (!match?.matchScore) return "";
    return `${Math.round(match.matchScore * 100)}%`;
  }, [match]);

  const mutation = useMutation({
    mutationFn: () =>
      confirmPresence(uid, {
        name: match?.full_name || name,
        attendance,
        message: "",
        partySize: 1,
      }),
    onSuccess: (response) => {
      setSuggestions([]);
      setShowConfetti(true);
      setFeedback({
        type: "success",
        title: "Presença confirmada!",
        message:
          response.data?.attendance === "NOT_ATTENDING"
            ? "Registramos que você não poderá ir. Obrigado por avisar."
            : "Sua presença foi confirmada com sucesso. Esperamos você!",
      });
      setTimeout(() => setShowConfetti(false), 3200);
    },
    onError: (error) => {
      setSuggestions(error.suggestions || []);
      setFeedback({
        type: "error",
        title: "Não foi possível confirmar",
        message:
          error.message ||
          "Tente novamente em alguns instantes ou confira se o nome está igual ao convite.",
      });
    },
  });

  return (
    <section
      id="rsvp"
      className={cn("relative min-h-[106svh] overflow-hidden bg-[#f5f0eb]")}
    >
      {showConfetti && <Confetti recycle={false} numberOfPieces={220} />}
      <FeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
      <img
        src="/images/flowers.png"
        alt=""
        className={cn(
          "pointer-events-none absolute -left-24 top-14 w-52 -rotate-12 opacity-25",
        )}
      />
      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-[106svh] flex-col justify-center px-5 py-24",
        )}
      >
        <div className={cn("space-y-5 text-center")}>
          <p className={cn("super-label")}>Confirmação</p>
          <h2 className={cn("super-heading text-5xl")}>
            Confirmação de Presença
          </h2>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
          className={cn(
            "mt-12 grid gap-5 rounded-[24px] border border-[#262626]/10 bg-[#fdf8f3] p-5 shadow-[0_24px_70px_rgba(38,38,38,0.10)]",
          )}
        >
          <label
            className={cn(
              "grid gap-2 text-sm font-medium uppercase tracking-[0.16em] text-[#262626]",
            )}
          >
            <span>
              Digite abaixo o nome completo{" "}
              <em className={cn("font-light normal-case tracking-normal text-[#262626]/55")}>
                (conforme está no convite)
              </em>
            </span>
            <div className={cn("relative")}>
              <Search
                className={cn(
                  "absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ff4582]",
                )}
              />
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSuggestions([]);
                  mutation.reset();
                }}
                className={cn(
                  "super-transition w-full rounded-full border border-[#262626]/10 bg-white py-4 pl-11 pr-4 text-base normal-case tracking-normal outline-none focus:border-[#ff4582]",
                )}
                placeholder="Ex.: Lucas Toledo"
                required
              />
            </div>
          </label>

          {isFetching && (
            <p
              className={cn(
                "flex items-center gap-2 text-sm font-medium text-[#262626]/50",
              )}
            >
              <Loader2 className={cn("h-4 w-4 animate-spin")} />
              Procurando na lista...
            </p>
          )}

          {searchError && (
            <div
              className={cn(
                "rounded-2xl bg-[#ff4582]/10 p-4 text-sm font-medium text-[#b91853]",
              )}
            >
              Não foi possível buscar o nome agora. Tente novamente em alguns
              instantes.
            </div>
          )}

          {hasSearchResult && !match && (
            <div
              className={cn(
                "rounded-2xl border border-[#ff4582]/20 bg-white p-4 text-sm font-medium text-[#262626]",
              )}
            >
              Nome não existe na lista.
              {data?.suggestions?.length > 0 && (
                <p className={cn("mt-2 text-[#262626]/55")}>
                  Talvez seja:{" "}
                  {data.suggestions
                    .map((suggestion) => suggestion.fullName)
                    .join(", ")}
                </p>
              )}
            </div>
          )}

          {match && (
            <div
              className={cn(
                "rounded-2xl bg-[#f5f0eb] p-4 text-left",
              )}
            >
              <div className={cn("flex items-center justify-between gap-3")}>
                <div>
                  <p className={cn("super-label text-[#262626]/45")}>
                    Encontramos
                  </p>
                  <p
                    className={cn("mt-1 text-xl font-semibold text-[#262626]")}
                  >
                    {match.full_name}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full bg-[#ff4582] px-3 py-1 text-sm font-semibold text-white",
                  )}
                >
                  {confidence}
                </span>
              </div>
              <p
                className={cn(
                  "mt-3 rounded-2xl px-4 py-3 text-sm font-semibold",
                  attendanceStatus === "ATTENDING" &&
                    "bg-emerald-500/10 text-emerald-700",
                  attendanceStatus === "NOT_ATTENDING" &&
                    "bg-[#ff4582]/10 text-[#b91853]",
                  !hasAlreadyAnswered && "bg-white text-[#262626]/65",
                )}
              >
                {attendanceLabels[attendanceStatus] ||
                  "Nome encontrado. Você pode confirmar abaixo."}
              </p>
            </div>
          )}

          {canConfirm && (
            <div className={cn("grid gap-3 sm:grid-cols-2")}>
            <button
              type="button"
              onClick={() => setAttendance("ATTENDING")}
              className={cn(
                "super-transition flex items-center justify-center gap-2 rounded-full border px-4 py-3 font-semibold",
                attendance === "ATTENDING"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-[#262626]/10 bg-white text-[#262626]",
              )}
            >
              <CheckCircle className={cn("h-4 w-4")} />
              Vou Comparecer
            </button>
            <button
              type="button"
              onClick={() => setAttendance("NOT_ATTENDING")}
              className={cn(
                "super-transition flex items-center justify-center gap-2 rounded-full border px-4 py-3 font-semibold",
                attendance === "NOT_ATTENDING"
                  ? "border-[#ff4582] bg-[#ff4582] text-[#262626]"
                  : "border-[#262626]/10 bg-white text-[#262626]",
              )}
            >
              <XCircle className={cn("h-4 w-4")} />
              Não poderei ir
            </button>
            </div>
          )}

          {mutation.error && (
            <div
              className={cn(
                "rounded-2xl bg-white p-4 text-sm font-medium text-[#262626]",
              )}
            >
              <p>{mutation.error.message}</p>
              {suggestions.length > 0 && (
                <p className={cn("mt-2 text-gray-600")}>
                  Talvez seja: {suggestions.join(", ")}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending || !canConfirm}
            className={cn(
              "super-transition flex items-center justify-center gap-2 rounded-full bg-[#262626] px-5 py-4 font-medium uppercase tracking-[0.18em] text-white shadow-lg hover:bg-[#ff4582] hover:text-[#262626] disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {mutation.isPending ? (
              <Loader2 className={cn("h-4 w-4 animate-spin")} />
            ) : (
              <UserCheck className={cn("h-4 w-4")} />
            )}
            Confirmar!
          </button>
        </form>
      </div>
    </section>
  );
}
