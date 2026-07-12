import { useMemo, useState } from "react";
import Confetti from "react-confetti";
import { CheckCircle, Loader2, Search, UserCheck, XCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { confirmPresence, searchGuest } from "@/services/api";
import { useInvitation } from "@/features/invitation";
import { cn } from "@/lib/utils";

export default function Rsvp() {
  const { uid } = useInvitation();
  const [name, setName] = useState("");
  const [attendance, setAttendance] = useState("ATTENDING");
  const [showConfetti, setShowConfetti] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const canSearch = name.trim().length >= 3 && !!uid;
  const { data, isFetching } = useQuery({
    queryKey: ["guest-search", uid, name],
    queryFn: async () => (await searchGuest(uid, name)).data,
    enabled: canSearch,
    staleTime: 5 * 1000,
  });

  const match = data?.match;
  const confidence = useMemo(() => {
    if (!match?.matchScore) return "";
    return `${Math.round(match.matchScore * 100)}%`;
  }, [match]);

  const mutation = useMutation({
    mutationFn: () =>
      confirmPresence(uid, {
        name,
        attendance,
        message: "",
        partySize: 1,
      }),
    onSuccess: () => {
      setSuggestions([]);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3200);
    },
    onError: (error) => setSuggestions(error.suggestions || []),
  });

  return (
    <section id="rsvp" className={cn("relative overflow-hidden bg-[#f5f0eb]")}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={220} />}
      <img
        src="/images/flowers.png"
        alt=""
        className={cn(
          "pointer-events-none absolute -left-24 top-14 w-52 -rotate-12 opacity-25",
        )}
      />
      <div className={cn("mx-auto px-5 py-20")}>
        <div className={cn("space-y-5")}>
          <p className={cn("super-label")}>RSVP</p>
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
            Nome Completo (Presente no Convite)
            <div className={cn("relative")}>
              <Search
                className={cn(
                  "absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ff4582]",
                )}
              />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
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

          {match && (
            <div
              className={cn(
                "flex items-center justify-between rounded-2xl bg-[#f5f0eb] p-4 text-left",
              )}
            >
              <div>
                <p className={cn("super-label text-[#262626]/45")}>
                  Encontramos
                </p>
                <p className={cn("mt-1 text-xl font-semibold text-[#262626]")}>
                  {match.full_name}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full bg-[#ff4582] px-3 py-1 text-sm font-semibold text-[#262626]",
                )}
              >
                {confidence}
              </span>
            </div>
          )}

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

          {mutation.isSuccess && (
            <div
              className={cn(
                "rounded-2xl bg-[#ff4582] p-4 text-sm font-semibold text-[#262626]",
              )}
            >
              Presenca registrada com sucesso. Obrigado!
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending || !name.trim()}
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
