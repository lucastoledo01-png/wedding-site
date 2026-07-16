import { useEffect, useState } from "react";
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

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

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
              ? feedback.isAbsence
                ? "bg-[#ff4582] text-white"
                : "bg-emerald-500 text-white"
              : "bg-[#ff4582] text-white",
          )}
        >
          {feedback.type === "success" && !feedback.isAbsence ? (
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

function ConfirmDecisionModal({
  attendance,
  guestName,
  isPending,
  phone,
  phoneError,
  onPhoneChange,
  onCancel,
  onConfirm,
}) {
  if (!guestName || typeof document === "undefined") return null;

  const isAbsence = attendance === "NOT_ATTENDING";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-[#262626]/35 px-5 backdrop-blur-sm",
      )}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-[28px] border border-white/70 bg-[#fdf8f3] p-6 text-center shadow-[0_24px_80px_rgba(38,38,38,0.22)]",
        )}
      >
        <div
          className={cn(
            "mx-auto grid h-14 w-14 place-items-center rounded-full text-white",
            isAbsence ? "bg-[#ff4582]" : "bg-emerald-500",
          )}
        >
          {isAbsence ? (
            <XCircle className={cn("h-7 w-7")} />
          ) : (
            <CheckCircle className={cn("h-7 w-7")} />
          )}
        </div>
        <h3 className={cn("mt-5 text-2xl font-medium text-[#262626]")}>
          {guestName}
        </h3>
        <p className={cn("mt-3 text-base leading-relaxed text-[#262626]/65")}>
          {isAbsence
            ? "Você confirma que não irá comparecer?"
            : "Você deseja confirmar sua presença?"}
        </p>
        <label className={cn("mt-5 block text-left")}>
          <span className={cn("text-[10px] font-black uppercase tracking-[0.24em] text-[#ff4582]")}>
            WhatsApp
          </span>
          <div
            className={cn(
              "mt-2 grid grid-cols-[88px_1fr] overflow-hidden rounded-2xl border border-[#262626]/10 bg-white",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center gap-2 border-r border-[#262626]/10 bg-[#f5f0eb] px-3 text-sm font-semibold text-[#262626]/70",
              )}
            >
              <span aria-hidden="true">🇧🇷</span>
              <span>+55</span>
            </div>
            <input
              value={phone}
              onChange={(event) => onPhoneChange(formatPhone(event.target.value))}
              placeholder="(35) 99999-0000"
              inputMode="tel"
              autoComplete="tel-national"
              className={cn(
                "min-w-0 bg-white px-4 py-4 text-base outline-none",
              )}
            />
          </div>
          {phoneError ? (
            <p className={cn("mt-2 text-sm font-medium text-[#b91853]")}>
              {phoneError}
            </p>
          ) : null}
        </label>
        <div className={cn("mt-6 grid gap-3")}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-medium uppercase tracking-[0.16em] text-white transition disabled:opacity-60",
              isAbsence
                ? "bg-[#ff4582] hover:bg-[#f73576]"
                : "bg-emerald-500 hover:bg-emerald-600",
            )}
          >
            {isPending ? <Loader2 className={cn("h-4 w-4 animate-spin")} /> : null}
            {isAbsence ? "Confirmar ausência" : "Sim, confirmar presença"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={cn(
              "w-full rounded-full border border-[#262626]/10 bg-white px-5 py-4 text-sm font-medium uppercase tracking-[0.16em] text-[#262626]/60 transition hover:text-[#262626] disabled:opacity-60",
            )}
          >
            Fechar
          </button>
        </div>
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
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [suggestions, setSuggestions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [confirmDecisionOpen, setConfirmDecisionOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

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

  const mutation = useMutation({
    mutationFn: () => {
      const digits = phoneDigits(phone);
      const normalizedPhone = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
      return confirmPresence(uid, {
        guestId: match?.id,
        name: match?.full_name || name,
        attendance,
        message: "",
        partySize: 1,
        phone: normalizedPhone,
      });
    },
    onSuccess: (response) => {
      setSuggestions([]);
      setConfirmDecisionOpen(false);
      setPhone("");
      setPhoneError("");
      const isAbsence = response.data?.attendance === "NOT_ATTENDING";
      if (!isAbsence) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 8000);
      }
      setFeedback({
        type: "success",
        isAbsence,
        title: isAbsence ? "Ausência Confirmada" : "Presença confirmada!",
        message: isAbsence
          ? "Registramos que você não poderá ir. Obrigado por avisar."
          : "Sua presença foi confirmada com sucesso. Esperamos você!",
      });
    },
    onError: (error) => {
      setSuggestions(error.suggestions || []);
      setConfirmDecisionOpen(false);
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
      className={cn("relative overflow-hidden bg-[#f5f0eb]")}
    >
      {showConfetti &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 100000,
              pointerEvents: "none",
            }}
          >
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={300}
              gravity={0.18}
              initialVelocityY={24}
              confettiSource={{
                x: windowSize.width / 2,
                y: windowSize.height + 10,
                w: 0,
                h: 0,
              }}
            />
          </div>,
          document.body,
        )}
      <FeedbackModal
        feedback={feedback}
        onClose={() => {
          if (feedback?.type === "success") {
            setName("");
            setAttendance("ATTENDING");
          }
          setFeedback(null);
        }}
      />
      <ConfirmDecisionModal
        attendance={attendance}
        guestName={confirmDecisionOpen ? match?.full_name : ""}
        isPending={mutation.isPending}
        phone={phone}
        phoneError={phoneError}
        onPhoneChange={(value) => {
          setPhone(value);
          setPhoneError("");
        }}
        onCancel={() => setConfirmDecisionOpen(false)}
        onConfirm={() => {
          if (phoneDigits(phone).length < 10) {
            setPhoneError("Informe seu WhatsApp para confirmar.");
            return;
          }
          mutation.mutate();
        }}
      />
      <img
        src="/images/flowers.png"
        alt=""
        className={cn(
          "pointer-events-none absolute -left-24 top-14 w-52 -rotate-12 opacity-25",
        )}
      />
      <div
        className={cn(
          "relative z-10 mx-auto px-5 py-20",
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
            if (canConfirm) setConfirmDecisionOpen(true);
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
                  setConfirmDecisionOpen(false);
                  setPhoneError("");
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
            <div
              className={cn(
                "rounded-2xl border border-[#262626]/10 bg-white px-4 py-4",
              )}
            >
              <div className={cn("flex flex-wrap items-center justify-between gap-4")}>
                <p className={cn("text-base font-medium text-[#262626]")}>
                  Você irá ao evento?
                </p>
                <div className={cn("flex items-center gap-5")}>
                  <button
                    type="button"
                    aria-pressed={attendance === "ATTENDING"}
                    onClick={() => setAttendance("ATTENDING")}
                    className={cn(
                      "super-transition inline-flex items-center gap-2 text-base font-medium text-[#262626]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-full border",
                        attendance === "ATTENDING"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-[#262626]/35 bg-white",
                      )}
                    >
                      {attendance === "ATTENDING" ? (
                        <span className={cn("h-2.5 w-2.5 rounded-full bg-emerald-500")} />
                      ) : null}
                    </span>
                    Sim
                  </button>
                  <button
                    type="button"
                    aria-pressed={attendance === "NOT_ATTENDING"}
                    onClick={() => setAttendance("NOT_ATTENDING")}
                    className={cn(
                      "super-transition inline-flex items-center gap-2 text-base font-medium text-[#262626]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-full border",
                        attendance === "NOT_ATTENDING"
                          ? "border-[#ff4582] bg-[#fff1f6]"
                          : "border-[#262626]/35 bg-white",
                      )}
                    >
                      {attendance === "NOT_ATTENDING" ? (
                        <span className={cn("h-2.5 w-2.5 rounded-full bg-[#ff4582]")} />
                      ) : null}
                    </span>
                    Não
                  </button>
                </div>
              </div>
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
            onClick={(event) => {
              event.preventDefault();
              if (canConfirm) setConfirmDecisionOpen(true);
            }}
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
