import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Gift,
  Loader2,
  MessageCircleHeart,
  Pencil,
  Plus,
  Save,
  ShieldOff,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminActivateTwoFactor, adminLogin, adminRequest } from "@/services/api";
import { cn } from "@/lib/utils";

const DEFAULT_UID = import.meta.env.VITE_INVITATION_UID || "lucas-andressa";

const ADMIN_PAGES = [
  { id: "presencas", label: "Presenças", icon: Users },
  { id: "presentes", label: "Presentes", icon: Gift },
  { id: "comentarios", label: "Comentários", icon: MessageCircleHeart },
];
const SESSION_STORAGE_KEY = "wedding_admin_session";

function getPageFromPath() {
  const page = window.location.pathname.split("/").filter(Boolean)[1];
  return ADMIN_PAGES.some((item) => item.id === page) ? page : null;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isPixGift(gift) {
  return gift?.gift_type === "pix" || gift?.url === "pix://lucas-andressa";
}

function EmptyState({ children }) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-gray-200 bg-white/70 p-8 text-center text-sm text-gray-500")}>
      {children}
    </div>
  );
}

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const giftImageInputRef = useRef(null);
  const [activePage, setActivePage] = useState(
    getPageFromPath() || localStorage.getItem("wedding_admin_page") || "presencas",
  );
  const [session, setSession] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
      if (stored?.token && new Date(stored.expiresAt).getTime() > Date.now()) return stored;
    } catch {
      return null;
    }
    return null;
  });
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
    code: "",
  });
  const [loginStep, setLoginStep] = useState("credentials");
  const [setup, setSetup] = useState(null);
  const [setupCode, setSetupCode] = useState("");
  const uid = DEFAULT_UID;
  const [guestNames, setGuestNames] = useState("");
  const [giftForm, setGiftForm] = useState({
    url: "",
    name: "",
    imageUrl: "",
    price: "",
    category: "",
    sortOrder: "",
  });
  const [editingGiftId, setEditingGiftId] = useState(null);

  useEffect(() => {
    document.title = "Painel Lucas & Andressa";
    localStorage.setItem("wedding_admin_page", activePage);
  }, [activePage]);

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(getPageFromPath() || "presencas");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function changePage(page) {
    setActivePage(page);
    window.history.pushState({}, "", `/admin/${page}`);
  }

  const token = session?.token || "";
  const enabled = Boolean(token);

  const loginMutation = useMutation({
    mutationFn: () =>
      adminLogin({
        username: loginForm.username.trim(),
        password: loginForm.password,
        code: loginForm.code,
      }),
    onSuccess: (response) => {
      const nextSession = response.data;
      if (nextSession.requires2faSetup) {
        setSetup(nextSession);
        setSetupCode("");
        return;
      }

      if (nextSession.requires2fa) {
        setLoginStep("twoFactor");
        setLoginForm((current) => ({ ...current, code: "" }));
        return;
      }

      setSession(nextSession);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      setLoginForm({ username: "", password: "", code: "" });
      setLoginStep("credentials");
    },
  });

  const activateTwoFactor = useMutation({
    mutationFn: () =>
      adminActivateTwoFactor({
        setupToken: setup?.setupToken,
        code: setupCode,
      }),
    onSuccess: (response) => {
      const nextSession = response.data;
      setSession(nextSession);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      setLoginForm({ username: "", password: "", code: "" });
      setLoginStep("credentials");
      setSetup(null);
      setSetupCode("");
    },
  });

  function logout() {
    setSession(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    queryClient.clear();
  }

  function resetGiftForm() {
    setEditingGiftId(null);
    setGiftForm({
      url: "",
      name: "",
      imageUrl: "",
      price: "",
      category: "",
      sortOrder: "",
    });
  }

  function editGift(gift) {
    setEditingGiftId(gift.id);
    setGiftForm({
      url: gift.url || "",
      name: gift.name || "",
      imageUrl: gift.image_url || "",
      price: gift.price || "",
      category: gift.category || "",
      sortOrder: String(gift.sort_order ?? ""),
    });
  }

  function moveGift(giftId, direction) {
    const gifts = giftsQuery.data || [];
    const currentIndex = gifts.findIndex((gift) => gift.id === giftId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= gifts.length) return;

    const reordered = [...gifts];
    [reordered[currentIndex], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[currentIndex],
    ];
    reorderGiftsMutation.mutate(reordered.map((gift) => gift.id));
  }

  const guestsQuery = useQuery({
    queryKey: ["admin-guests", uid, token],
    queryFn: async () => (await adminRequest(`/api/admin/${uid}/guests`, token)).data,
    enabled: enabled && activePage === "presencas",
  });

  const giftsQuery = useQuery({
    queryKey: ["admin-gifts", uid, token],
    queryFn: async () => (await adminRequest(`/api/admin/${uid}/gifts`, token)).data,
    enabled: enabled && activePage === "presentes",
  });

  const commentsQuery = useQuery({
    queryKey: ["admin-comments", uid, token],
    queryFn: async () => (await adminRequest(`/api/admin/${uid}/comments`, token)).data,
    enabled: enabled && activePage === "comentarios",
  });

  const blockedIpsQuery = useQuery({
    queryKey: ["admin-blocked-ips", uid, token],
    queryFn: async () => (await adminRequest(`/api/admin/${uid}/blocked-ips`, token)).data,
    enabled: enabled && activePage === "comentarios",
  });

  const stats = useMemo(() => {
    const guests = guestsQuery.data || [];
    return {
      total: guests.length,
      attending: guests.filter((guest) => guest.attendance === "ATTENDING").length,
      notAttending: guests.filter((guest) => guest.attendance === "NOT_ATTENDING").length,
      pending: guests.filter((guest) => guest.attendance === "PENDING").length,
      people: guests
        .filter((guest) => guest.attendance === "ATTENDING")
        .reduce((sum, guest) => sum + Number(guest.party_size || 1), 0),
    };
  }, [guestsQuery.data]);

  const importGuests = useMutation({
    mutationFn: () =>
      adminRequest(`/api/admin/${uid}/guests/import`, token, {
        method: "POST",
        body: JSON.stringify({ text: guestNames }),
      }),
    onSuccess: () => {
      setGuestNames("");
      queryClient.invalidateQueries({ queryKey: ["admin-guests"] });
    },
  });

  const saveGift = useMutation({
    mutationFn: () => {
      const payload = {
        ...giftForm,
        sortOrder:
          giftForm.sortOrder === "" || giftForm.sortOrder === null
            ? undefined
            : Number(giftForm.sortOrder),
      };

      return adminRequest(
        editingGiftId
          ? `/api/admin/${uid}/gifts/${editingGiftId}`
          : `/api/admin/${uid}/gifts`,
        token,
        {
          method: editingGiftId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      resetGiftForm();
      queryClient.invalidateQueries({ queryKey: ["admin-gifts"] });
    },
  });

  const uploadGiftImage = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append("image", file);
      return adminRequest(`/api/admin/${uid}/gifts/upload`, token, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (response) => {
      setGiftForm((current) => ({
        ...current,
        imageUrl: response.data.imageUrl,
      }));
    },
  });

  const patchGift = useMutation({
    mutationFn: ({ id, payload }) =>
      adminRequest(`/api/admin/${uid}/gifts/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-gifts"] }),
  });

  const reorderGiftsMutation = useMutation({
    mutationFn: (giftIds) =>
      adminRequest(`/api/admin/${uid}/gifts/reorder`, token, {
        method: "POST",
        body: JSON.stringify({ giftIds }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-gifts"] }),
  });

  const deleteGift = useMutation({
    mutationFn: (id) =>
      adminRequest(`/api/admin/${uid}/gifts/${id}`, token, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-gifts"] }),
  });

  const deleteGuest = useMutation({
    mutationFn: (id) =>
      adminRequest(`/api/admin/${uid}/guests/${id}`, token, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-guests"] }),
  });

  const deleteComment = useMutation({
    mutationFn: (id) =>
      adminRequest(`/api/admin/${uid}/comments/${id}`, token, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-comments"] }),
  });

  const blockIp = useMutation({
    mutationFn: ({ ipAddress, reason }) =>
      adminRequest(`/api/admin/${uid}/blocked-ips`, token, {
        method: "POST",
        body: JSON.stringify({ ipAddress, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-ips"] });
    },
  });

  const unblockIp = useMutation({
    mutationFn: (id) =>
      adminRequest(`/api/admin/${uid}/blocked-ips/${id}`, token, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-ips"] });
    },
  });

  if (!enabled) {
    return (
      <main className={cn("grid min-h-screen place-items-center bg-[#fdf8f3] px-4 py-10 text-[#262626]")}>
        <section className={cn("w-full max-w-md rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(38,38,38,0.12)]")}>
          <p className={cn("text-[10px] font-black uppercase tracking-[0.4em] text-[#ff4582]")}>
            Acesso seguro
          </p>
          <h1 className={cn("mt-2 text-3xl font-semibold tracking-tight")}>
            Entrar no painel
          </h1>

          {!setup ? (
            <>
              {loginStep === "credentials" ? (
                <>
                  <p className={cn("mt-2 text-sm leading-relaxed text-black/50")}>
                    Use seu usuário e senha. Se for seu primeiro acesso, vamos
                    ativar o app autenticador antes de abrir o painel.
                  </p>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      loginMutation.mutate();
                    }}
                    className={cn("mt-5 grid gap-3")}
                  >
                    <input
                      value={loginForm.username}
                      onChange={(event) =>
                        setLoginForm((current) => ({
                          ...current,
                          username: event.target.value,
                        }))
                      }
                      className={cn("rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                      placeholder="Usuário"
                      autoComplete="username"
                    />
                    <input
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      className={cn("rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                      placeholder="Senha"
                      type="password"
                      autoComplete="current-password"
                    />
                    {loginMutation.isError ? (
                      <p className={cn("rounded-2xl bg-[#ff4582]/10 px-4 py-3 text-sm font-medium text-[#b91853]")}>
                        {loginMutation.error.message}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={
                        loginMutation.isPending ||
                        !loginForm.username.trim() ||
                        !loginForm.password
                      }
                      className={cn("inline-flex items-center justify-center gap-2 rounded-full bg-[#ff4582] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#f62b71] disabled:opacity-50")}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className={cn("h-4 w-4 animate-spin")} />
                      ) : null}
                      Continuar
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p className={cn("mt-2 text-sm leading-relaxed text-black/50")}>
                    Agora informe o código de 6 dígitos do seu app autenticador.
                  </p>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      loginMutation.mutate();
                    }}
                    className={cn("mt-5 grid gap-3")}
                  >
                    <input
                      value={loginForm.code}
                      onChange={(event) =>
                        setLoginForm((current) => ({
                          ...current,
                          code: event.target.value.replace(/\D/g, "").slice(0, 6),
                        }))
                      }
                      className={cn("rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                      placeholder="Código 2FA"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                    />
                    {loginMutation.isError ? (
                      <p className={cn("rounded-2xl bg-[#ff4582]/10 px-4 py-3 text-sm font-medium text-[#b91853]")}>
                        {loginMutation.error.message}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={loginMutation.isPending || loginForm.code.length !== 6}
                      className={cn("inline-flex items-center justify-center gap-2 rounded-full bg-[#ff4582] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#f62b71] disabled:opacity-50")}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className={cn("h-4 w-4 animate-spin")} />
                      ) : null}
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep("credentials");
                        setLoginForm((current) => ({ ...current, code: "" }));
                        loginMutation.reset();
                      }}
                      className={cn("rounded-full px-5 py-3 text-sm font-semibold text-black/45 transition hover:text-[#ff4582]")}
                    >
                      Voltar
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              <p className={cn("mt-2 text-sm leading-relaxed text-black/50")}>
                Primeiro acesso detectado. Adicione este código no Google
                Authenticator, 1Password, Authy ou iCloud Passwords e informe o
                código de 6 dígitos gerado.
              </p>
              <div className={cn("mt-5 rounded-3xl border border-dashed border-[#ff4582]/35 bg-[#ff4582]/5 p-4")}>
                <p className={cn("text-[10px] font-black uppercase tracking-[0.28em] text-[#ff4582]")}>
                  Segredo 2FA
                </p>
                <p className={cn("mt-2 break-all font-mono text-sm font-semibold text-[#262626]")}>
                  {setup.secret}
                </p>
                <a
                  href={setup.otpauthUrl}
                  className={cn("mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#ff4582]")}
                >
                  Abrir no app autenticador
                </a>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  activateTwoFactor.mutate();
                }}
                className={cn("mt-5 grid gap-3")}
              >
                <input
                  value={setupCode}
                  onChange={(event) =>
                    setSetupCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className={cn("rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                  placeholder="Código 2FA"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                {activateTwoFactor.isError ? (
                  <p className={cn("rounded-2xl bg-[#ff4582]/10 px-4 py-3 text-sm font-medium text-[#b91853]")}>
                    {activateTwoFactor.error.message}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={activateTwoFactor.isPending || setupCode.length !== 6}
                  className={cn("inline-flex items-center justify-center gap-2 rounded-full bg-[#ff4582] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#f62b71] disabled:opacity-50")}
                >
                  {activateTwoFactor.isPending ? (
                    <Loader2 className={cn("h-4 w-4 animate-spin")} />
                  ) : null}
                  Ativar e entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSetup(null);
                    setSetupCode("");
                  }}
                  className={cn("rounded-full px-5 py-3 text-sm font-semibold text-black/45 transition hover:text-[#ff4582]")}
                >
                  Voltar
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className={cn("min-h-screen bg-[#fdf8f3] pb-28 text-[#262626] md:pb-0")}>
      <div className={cn("mx-auto max-w-7xl px-4 pb-4 pt-4 md:py-8")}>
        <header className={cn("rounded-[24px] border border-black/5 bg-white/85 p-4 shadow-sm backdrop-blur md:rounded-[28px] md:p-6")}>
          <div className={cn("flex items-end justify-between gap-4")}>
            <div>
              <p className={cn("text-[10px] font-black uppercase tracking-[0.4em] text-[#ff4582]")}>
                Lucas & Andressa
              </p>
              <h1 className={cn("mt-2 text-2xl font-semibold tracking-tight md:text-4xl")}>
                Painel do casamento
              </h1>
            </div>
            {enabled ? (
              <button
                type="button"
                onClick={logout}
                className={cn("rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black/55 transition hover:border-[#ff4582]/40 hover:text-[#ff4582] md:px-5 md:py-3")}
              >
                Sair
              </button>
            ) : null}
          </div>

          <nav className={cn("mt-5 hidden gap-2 rounded-full border border-black/5 bg-[#f5f0eb] p-1 md:grid md:grid-cols-3")}>
            {ADMIN_PAGES.map((page) => {
              const Icon = page.icon;
              const active = activePage === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => changePage(page.id)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-[#ff4582] text-white shadow-sm"
                      : "text-black/55 hover:bg-white hover:text-[#262626]",
                  )}
                >
                  <Icon className={cn("h-4 w-4")} />
                  {page.label}
                </button>
              );
            })}
          </nav>
        </header>

        {enabled && activePage === "presencas" && (
          <section className={cn("mt-5 grid gap-5 md:mt-8 md:gap-8 lg:grid-cols-[0.95fr_1.05fr]")}>
            <div className={cn("space-y-4")}>
              <div className={cn("grid grid-cols-2 gap-3")}>
                {[
                  ["Convidados", stats.total],
                  ["Confirmados", stats.attending],
                  ["Pessoas", stats.people],
                  ["Não vão", stats.notAttending],
                  ["Pendentes", stats.pending],
                ].map(([label, value]) => (
                  <div key={label} className={cn("rounded-2xl border border-black/5 bg-white p-4 shadow-sm md:p-5")}>
                    <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] text-black/35 md:text-xs md:tracking-[0.24em]")}>{label}</p>
                    <p className={cn("mt-2 text-2xl font-semibold text-[#ff4582] md:text-3xl")}>{value}</p>
                  </div>
                ))}
              </div>

              <div className={cn("rounded-3xl border border-black/5 bg-white p-5 shadow-sm")}>
                <div className={cn("flex items-center gap-2")}>
                  <Plus className={cn("h-5 w-5 text-[#ff4582]")} />
                  <h2 className={cn("text-xl font-semibold")}>Importar convidados</h2>
                </div>
                <textarea
                  value={guestNames}
                  onChange={(event) => setGuestNames(event.target.value)}
                  rows={8}
                  className={cn("mt-4 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                  placeholder={"Cole os nomes aqui, um por linha\nLucas Toledo\nAndressa Silva"}
                />
                <button
                  type="button"
                  onClick={() => importGuests.mutate()}
                  disabled={!enabled || importGuests.isPending || !guestNames.trim()}
                  className={cn("mt-3 inline-flex items-center gap-2 rounded-full bg-[#262626] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50")}
                >
                  {importGuests.isPending ? (
                    <Loader2 className={cn("h-4 w-4 animate-spin")} />
                  ) : (
                    <Plus className={cn("h-4 w-4")} />
                  )}
                  Importar nomes
                </button>
              </div>
            </div>

            <div className={cn("rounded-3xl border border-black/5 bg-white p-5 shadow-sm")}>
              <div className={cn("flex items-center gap-2")}>
                <Users className={cn("h-5 w-5 text-[#ff4582]")} />
                <h2 className={cn("text-xl font-semibold")}>Lista de presencas</h2>
              </div>

              <div className={cn("mt-5 rounded-2xl border border-black/5 md:max-h-[680px] md:overflow-auto")}>
                {guestsQuery.isLoading && <EmptyState>Carregando convidados...</EmptyState>}
                {!guestsQuery.isLoading && (guestsQuery.data || []).length === 0 && (
                  <EmptyState>Nenhum convidado cadastrado ainda.</EmptyState>
                )}
                {(guestsQuery.data || []).map((guest) => (
                  <div key={guest.id} className={cn("grid grid-cols-[1fr_auto] gap-3 border-b border-black/5 p-4 last:border-b-0")}>
                    <div>
                      <p className={cn("font-semibold")}>{guest.full_name}</p>
                      <p className={cn("mt-1 text-sm text-black/50")}>
                        {guest.attendance} · {guest.party_size || 1} pessoa(s)
                        {guest.confirmed_at ? ` · ${formatDate(guest.confirmed_at)}` : ""}
                      </p>
                      {guest.confirmed_ip || guest.confirmed_device ? (
                        <p className={cn("mt-1 break-all text-xs text-black/35")}>
                          {guest.confirmed_ip ? `IP: ${guest.confirmed_ip}` : ""}
                          {guest.confirmed_ip && guest.confirmed_device ? " · " : ""}
                          {guest.confirmed_device ? `Dispositivo: ${guest.confirmed_device}` : ""}
                        </p>
                      ) : null}
                      {guest.message && <p className={cn("mt-2 text-sm text-black/65")}>{guest.message}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteGuest.mutate(guest.id)}
                      className={cn("h-10 w-10 rounded-full text-black/35 transition hover:bg-rose-50 hover:text-[#ff4582]")}
                      aria-label="Remover convidado"
                    >
                      <Trash2 className={cn("mx-auto h-4 w-4")} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {enabled && activePage === "presentes" && (
          <section className={cn("mt-5 grid gap-5 md:mt-8 md:gap-8 lg:grid-cols-[0.85fr_1.15fr]")}>
            <div className={cn("rounded-3xl border border-black/5 bg-white p-5 shadow-sm")}>
              <div className={cn("flex items-center justify-between gap-3")}>
                <div className={cn("flex items-center gap-2")}>
                  <Gift className={cn("h-5 w-5 text-[#ff4582]")} />
                  <h2 className={cn("text-xl font-semibold")}>
                    {editingGiftId ? "Editar presente" : "Cadastrar presente"}
                  </h2>
                </div>
                {editingGiftId ? (
                  <button
                    type="button"
                    onClick={resetGiftForm}
                    className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-black/45 transition hover:border-[#ff4582]/40 hover:text-[#ff4582]")}
                    aria-label="Cancelar edição"
                  >
                    <X className={cn("h-4 w-4")} />
                  </button>
                ) : null}
              </div>
              <div className={cn("mt-4 grid gap-3")}>
                <input value={giftForm.url} onChange={(event) => setGiftForm({ ...giftForm, url: event.target.value })} className={cn("rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")} placeholder="Link do produto" />
                <input value={giftForm.name} onChange={(event) => setGiftForm({ ...giftForm, name: event.target.value })} className={cn("rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")} placeholder="Nome do presente" />
                <div className={cn("rounded-2xl border border-dashed border-black/10 bg-[#fdf8f3] p-3")}>
                  {giftForm.imageUrl ? (
                    <div className={cn("mb-3 grid grid-cols-[72px_1fr] gap-3")}>
                      <div className={cn("relative aspect-square overflow-hidden rounded-2xl bg-white")}>
                        <Gift className={cn("absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#ff4582]/50")} />
                        <img
                          src={giftForm.imageUrl}
                          alt=""
                          className={cn("relative h-full w-full object-cover")}
                          onError={(event) => {
                            event.currentTarget.remove();
                          }}
                        />
                      </div>
                      <div className={cn("min-w-0 self-center")}>
                        <p className={cn("text-xs font-bold uppercase tracking-[0.18em] text-[#ff4582]")}>
                          Imagem selecionada
                        </p>
                        <p className={cn("mt-1 truncate text-sm text-black/45")}>{giftForm.imageUrl}</p>
                      </div>
                    </div>
                  ) : null}
                  <input
                    ref={giftImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className={cn("hidden")}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadGiftImage.mutate(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => giftImageInputRef.current?.click()}
                    disabled={uploadGiftImage.isPending}
                    className={cn("inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/60 transition hover:border-[#ff4582]/40 hover:text-[#ff4582] disabled:opacity-50")}
                  >
                    {uploadGiftImage.isPending ? (
                      <Loader2 className={cn("h-4 w-4 animate-spin")} />
                    ) : (
                      <Upload className={cn("h-4 w-4")} />
                    )}
                    {uploadGiftImage.isPending ? "Enviando imagem..." : "Fazer upload da imagem"}
                  </button>
                  {uploadGiftImage.isError ? (
                    <p className={cn("mt-3 rounded-2xl bg-[#ff4582]/10 px-4 py-3 text-sm font-medium text-[#b91853]")}>
                      {uploadGiftImage.error.message}
                    </p>
                  ) : null}
                </div>
                <input value={giftForm.imageUrl} onChange={(event) => setGiftForm({ ...giftForm, imageUrl: event.target.value })} className={cn("rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")} placeholder="URL da foto, opcional" />
                <input value={giftForm.price} onChange={(event) => setGiftForm({ ...giftForm, price: event.target.value })} className={cn("rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")} placeholder="Preço, opcional" />
                <input
                  value={giftForm.category}
                  onChange={(event) => setGiftForm({ ...giftForm, category: event.target.value })}
                  className={cn("rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                  placeholder="Categoria, ex.: Cozinha, Quarto, Sala"
                  disabled={editingGiftId && giftForm.url === "pix://lucas-andressa"}
                />
                <input
                  value={giftForm.sortOrder}
                  onChange={(event) => setGiftForm({ ...giftForm, sortOrder: event.target.value })}
                  className={cn("rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                  placeholder="Ordem na lista, opcional"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => saveGift.mutate()}
                  disabled={!enabled || saveGift.isPending || (!giftForm.url && !giftForm.name)}
                  className={cn("inline-flex items-center justify-center gap-2 rounded-full bg-[#ff4582] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#f62b71] disabled:opacity-50")}
                >
                  {saveGift.isPending ? (
                    <Loader2 className={cn("h-4 w-4 animate-spin")} />
                  ) : (
                    <Save className={cn("h-4 w-4")} />
                  )}
                  {editingGiftId ? "Salvar alterações" : "Salvar presente"}
                </button>
                {editingGiftId ? (
                  <button
                    type="button"
                    onClick={resetGiftForm}
                    className={cn("inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/55 transition hover:border-[#ff4582]/40 hover:text-[#ff4582]")}
                  >
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </div>

            <div className={cn("rounded-3xl border border-black/5 bg-white p-5 shadow-sm")}>
              <h2 className={cn("text-xl font-semibold")}>Lista de presentes</h2>
              <div className={cn("mt-5 grid gap-3")}>
                {giftsQuery.isLoading && <EmptyState>Carregando presentes...</EmptyState>}
                {!giftsQuery.isLoading && (giftsQuery.data || []).length === 0 && (
                  <EmptyState>Nenhum presente cadastrado ainda.</EmptyState>
                )}
                {(giftsQuery.data || []).map((gift, index) => (
                  <div key={gift.id} className={cn("grid grid-cols-[84px_1fr] gap-3 rounded-2xl border border-black/5 p-3 sm:grid-cols-[92px_1fr]")}>
                    <div className={cn("relative aspect-square overflow-hidden rounded-2xl bg-[#f5f0eb]")}>
                      <Gift className={cn("absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#ff4582]/50")} />
                      {gift.image_url && (
                        <img
                          src={gift.image_url}
                          alt=""
                          className={cn("relative h-full w-full object-cover")}
                          onError={(event) => {
                            event.currentTarget.remove();
                          }}
                        />
                      )}
                    </div>
                    <div className={cn("min-w-0")}>
                      <div className={cn("grid gap-3")}>
                        <div className={cn("min-w-0")}>
                          <p className={cn("text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff4582]")}>
                            {isPixGift(gift) ? "Pix dos noivos" : `Ordem ${index + 1}`}
                          </p>
                          <p className={cn("mt-1 font-semibold")}>{gift.name}</p>
                        </div>
                        <div className={cn("grid grid-cols-2 gap-2")}>
                          <button
                            type="button"
                            onClick={() => moveGift(gift.id, -1)}
                            disabled={index === 0 || reorderGiftsMutation.isPending}
                            className={cn("inline-flex h-10 items-center justify-center gap-1 rounded-full border border-black/10 text-xs font-semibold text-black/50 transition hover:border-[#ff4582]/40 hover:text-[#ff4582] disabled:opacity-30")}
                            aria-label="Mover presente para cima"
                          >
                            <ArrowUp className={cn("h-4 w-4")} />
                            <span className={cn("hidden min-[380px]:inline")}>Subir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveGift(gift.id, 1)}
                            disabled={index === (giftsQuery.data || []).length - 1 || reorderGiftsMutation.isPending}
                            className={cn("inline-flex h-10 items-center justify-center gap-1 rounded-full border border-black/10 text-xs font-semibold text-black/50 transition hover:border-[#ff4582]/40 hover:text-[#ff4582] disabled:opacity-30")}
                            aria-label="Mover presente para baixo"
                          >
                            <ArrowDown className={cn("h-4 w-4")} />
                            <span className={cn("hidden min-[380px]:inline")}>Descer</span>
                          </button>
                        </div>
                      </div>
                      <p className={cn("mt-1 text-sm text-black/50")}>{gift.price || "Sem preço"}</p>
                      <p className={cn("mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff4582]/80")}>
                        {gift.category || (isPixGift(gift) ? "Pix" : "Presentes")}
                      </p>
                      {gift.url ? (
                        <p className={cn("mt-1 truncate text-xs text-black/35")}>{gift.url}</p>
                      ) : null}
                      <div className={cn("mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap")}>
                        <button type="button" onClick={() => editGift(gift)} className={cn("inline-flex min-h-10 items-center justify-center gap-1 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold")}>
                          <Pencil className={cn("h-3.5 w-3.5")} />
                          Editar
                        </button>
                        <button type="button" onClick={() => patchGift.mutate({ id: gift.id, payload: { ...gift, isReceived: !gift.is_received } })} className={cn("min-h-10 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold")}>
                          {gift.is_received ? "Desmarcar ganho" : "Marcar ganho"}
                        </button>
                        <button type="button" onClick={() => patchGift.mutate({ id: gift.id, payload: { ...gift, isActive: !gift.is_active } })} className={cn("min-h-10 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold")}>
                          {gift.is_active ? "Ocultar" : "Mostrar"}
                        </button>
                        {!isPixGift(gift) ? (
                          <button type="button" onClick={() => deleteGift.mutate(gift.id)} className={cn("min-h-10 rounded-full border border-rose-100 px-3 py-2 text-xs font-semibold text-[#ff4582]")}>
                            Remover
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {enabled && activePage === "comentarios" && (
          <section className={cn("mt-5 grid gap-5 md:mt-8 md:gap-6 lg:grid-cols-[1fr_0.45fr]")}>
            <div className={cn("rounded-3xl border border-black/5 bg-white p-5 shadow-sm")}>
              <div className={cn("flex items-center gap-2")}>
                <MessageCircleHeart className={cn("h-5 w-5 text-[#ff4582]")} />
                <h2 className={cn("text-xl font-semibold")}>Comentários publicados</h2>
              </div>
              <p className={cn("mt-2 max-w-2xl text-sm text-black/55")}>
                As mensagens entram automaticamente no site. Use esta página quando precisar remover algo do mural ou bloquear o IP de origem.
              </p>

              <div className={cn("mt-5 grid gap-3")}>
                {commentsQuery.isLoading && <EmptyState>Carregando comentarios...</EmptyState>}
                {!commentsQuery.isLoading && (commentsQuery.data || []).length === 0 && (
                  <EmptyState>Nenhuma mensagem publicada ainda.</EmptyState>
                )}
                {(commentsQuery.data || []).map((comment) => (
                  <article key={comment.id} className={cn("rounded-2xl border border-black/5 bg-[#fdf8f3] p-4")}>
                    <div className={cn("flex items-start justify-between gap-4")}>
                      <div>
                        <p className={cn("font-semibold")}>{comment.name}</p>
                        <p className={cn("mt-1 text-xs font-bold uppercase tracking-[0.22em] text-[#ff4582]")}>
                          {comment.attendance || "Mensagem"} {comment.created_at ? `· ${formatDate(comment.created_at)}` : ""}
                        </p>
                        {comment.ip_address || comment.device ? (
                          <p className={cn("mt-2 break-all text-xs text-black/35")}>
                            {comment.ip_address ? `IP: ${comment.ip_address}` : ""}
                            {comment.ip_address && comment.device ? " · " : ""}
                            {comment.device ? `Dispositivo: ${comment.device}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <div className={cn("flex shrink-0 gap-1")}>
                        {comment.ip_address ? (
                          <button
                            type="button"
                            onClick={() =>
                              blockIp.mutate({
                                ipAddress: comment.ip_address,
                                reason: `Bloqueado a partir do comentário de ${comment.name}`,
                              })
                            }
                            disabled={blockIp.isPending}
                            className={cn("h-10 w-10 rounded-full text-black/35 transition hover:bg-white hover:text-[#ff4582] disabled:opacity-50")}
                            aria-label="Bloquear IP"
                          >
                            <Ban className={cn("mx-auto h-4 w-4")} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => deleteComment.mutate(comment.id)}
                          disabled={deleteComment.isPending}
                          className={cn("h-10 w-10 rounded-full text-black/35 transition hover:bg-white hover:text-[#ff4582] disabled:opacity-50")}
                          aria-label="Apagar comentario"
                        >
                          <Trash2 className={cn("mx-auto h-4 w-4")} />
                        </button>
                      </div>
                    </div>
                    <p className={cn("mt-3 text-sm leading-relaxed text-black/70")}>{comment.message}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className={cn("rounded-3xl border border-black/5 bg-white p-5 shadow-sm")}>
              <div className={cn("flex items-center gap-2")}>
                <ShieldOff className={cn("h-5 w-5 text-[#ff4582]")} />
                <h2 className={cn("text-xl font-semibold")}>IPs bloqueados</h2>
              </div>
              <p className={cn("mt-2 text-sm text-black/55")}>
                IPs nesta lista não conseguem enviar novos recados. A confirmação de presença continua liberada.
              </p>
              <div className={cn("mt-5 grid gap-3")}>
                {blockedIpsQuery.isLoading && <EmptyState>Carregando bloqueios...</EmptyState>}
                {!blockedIpsQuery.isLoading && (blockedIpsQuery.data || []).length === 0 && (
                  <EmptyState>Nenhum IP bloqueado.</EmptyState>
                )}
                {(blockedIpsQuery.data || []).map((blocked) => (
                  <div key={blocked.id} className={cn("rounded-2xl border border-black/5 bg-[#fdf8f3] p-4")}>
                    <div className={cn("flex items-start justify-between gap-3")}>
                      <div className={cn("min-w-0")}>
                        <p className={cn("break-all font-semibold")}>{blocked.ip_address}</p>
                        {blocked.reason ? (
                          <p className={cn("mt-1 text-xs text-black/45")}>{blocked.reason}</p>
                        ) : null}
                        <p className={cn("mt-1 text-xs text-black/35")}>{formatDate(blocked.created_at)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => unblockIp.mutate(blocked.id)}
                        disabled={unblockIp.isPending}
                        className={cn("h-10 w-10 rounded-full text-black/35 transition hover:bg-white hover:text-[#ff4582] disabled:opacity-50")}
                        aria-label="Desbloquear IP"
                      >
                        <Trash2 className={cn("mx-auto h-4 w-4")} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        )}
      </div>
      {enabled ? (
        <nav
          className={cn(
            "fixed inset-x-4 bottom-4 z-50 grid grid-cols-3 gap-1 rounded-[28px] border border-black/10 bg-white/90 p-1.5 shadow-[0_18px_60px_rgba(38,38,38,0.20)] backdrop-blur-xl md:hidden",
          )}
        >
          {ADMIN_PAGES.map((page) => {
            const Icon = page.icon;
            const active = activePage === page.id;

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => changePage(page.id)}
                className={cn(
                  "grid min-h-[64px] place-items-center rounded-[22px] px-2 py-2 text-[11px] font-semibold transition",
                  active
                    ? "bg-[#ff4582]/20 text-[#262626]"
                    : "text-black/50 hover:bg-[#f5f0eb] hover:text-[#262626]",
                )}
              >
                <Icon className={cn("h-5 w-5")} />
                <span>{page.label}</span>
              </button>
            );
          })}
        </nav>
      ) : null}
    </main>
  );
}
