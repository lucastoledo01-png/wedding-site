import { useEffect, useMemo, useRef, useState } from "react";
import {
  Gift,
  Loader2,
  MessageCircleHeart,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminActivateTwoFactor, adminLogin, adminRequest } from "@/services/api";
import { cn } from "@/lib/utils";

const DEFAULT_UID = import.meta.env.VITE_INVITATION_UID || "lucas-andressa";

const ADMIN_PAGES = [
  { id: "presencas", label: "Presencas", icon: Users },
  { id: "presentes", label: "Presentes", icon: Gift },
  { id: "comentarios", label: "Comentarios", icon: MessageCircleHeart },
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
  const [setup, setSetup] = useState(null);
  const [setupCode, setSetupCode] = useState("");
  const uid = DEFAULT_UID;
  const [guestNames, setGuestNames] = useState("");
  const [giftForm, setGiftForm] = useState({
    url: "",
    name: "",
    imageUrl: "",
    price: "",
  });

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

      setSession(nextSession);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      setLoginForm({ username: "", password: "", code: "" });
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
      setSetup(null);
      setSetupCode("");
    },
  });

  function logout() {
    setSession(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    queryClient.clear();
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
    mutationFn: () =>
      adminRequest(`/api/admin/${uid}/gifts`, token, {
        method: "POST",
        body: JSON.stringify(giftForm),
      }),
    onSuccess: () => {
      setGiftForm({ url: "", name: "", imageUrl: "", price: "" });
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
              <p className={cn("mt-2 text-sm leading-relaxed text-black/50")}>
                Use seu usuario e senha. Se for seu primeiro acesso, vamos ativar
                o app autenticador antes de abrir o painel.
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
                    setLoginForm((current) => ({ ...current, username: event.target.value }))
                  }
                  className={cn("rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                  placeholder="Usuario"
                  autoComplete="username"
                />
                <input
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  className={cn("rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                  placeholder="Senha"
                  type="password"
                  autoComplete="current-password"
                />
                <input
                  value={loginForm.code}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      code: event.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  className={cn("rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff4582]")}
                  placeholder="Codigo 2FA, se ja ativou"
                  inputMode="numeric"
                  autoComplete="one-time-code"
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
                Primeiro acesso detectado. Adicione este codigo no Google
                Authenticator, 1Password, Authy ou iCloud Passwords e informe o
                codigo de 6 digitos gerado.
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
                  placeholder="Codigo 2FA"
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
    <main className={cn("min-h-screen bg-[#fdf8f3] text-[#262626]")}>
      <div className={cn("mx-auto max-w-7xl px-4 py-8")}>
        <header className={cn("rounded-[28px] border border-black/5 bg-white/80 p-5 shadow-sm backdrop-blur md:p-6")}>
          <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between")}>
            <div>
              <p className={cn("text-[10px] font-black uppercase tracking-[0.4em] text-[#ff4582]")}>
                Lucas & Andressa
              </p>
              <h1 className={cn("mt-2 text-3xl font-semibold tracking-tight md:text-4xl")}>
                Painel do casamento
              </h1>
            </div>
            {enabled ? (
              <button
                type="button"
                onClick={logout}
                className={cn("rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/55 transition hover:border-[#ff4582]/40 hover:text-[#ff4582]")}
              >
                Sair
              </button>
            ) : null}
          </div>

          <nav className={cn("mt-5 grid gap-2 rounded-full border border-black/5 bg-[#f5f0eb] p-1 sm:grid-cols-3")}>
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
          <section className={cn("mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]")}>
            <div className={cn("space-y-4")}>
              <div className={cn("grid gap-3 sm:grid-cols-2")}>
                {[
                  ["Convidados", stats.total],
                  ["Confirmados", stats.attending],
                  ["Pessoas", stats.people],
                  ["Nao vao", stats.notAttending],
                  ["Pendentes", stats.pending],
                ].map(([label, value]) => (
                  <div key={label} className={cn("rounded-2xl border border-black/5 bg-white p-5 shadow-sm")}>
                    <p className={cn("text-xs font-bold uppercase tracking-[0.24em] text-black/35")}>{label}</p>
                    <p className={cn("mt-2 text-3xl font-semibold text-[#ff4582]")}>{value}</p>
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

              <div className={cn("mt-5 max-h-[680px] overflow-auto rounded-2xl border border-black/5")}>
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
                      </p>
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
          <section className={cn("mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]")}>
            <div className={cn("rounded-3xl border border-black/5 bg-white p-5 shadow-sm")}>
              <div className={cn("flex items-center gap-2")}>
                <Gift className={cn("h-5 w-5 text-[#ff4582]")} />
                <h2 className={cn("text-xl font-semibold")}>Cadastrar presente</h2>
              </div>
              <div className={cn("mt-4 grid gap-3")}>
                <input value={giftForm.url} onChange={(event) => setGiftForm({ ...giftForm, url: event.target.value })} className={cn("rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")} placeholder="Link do produto" />
                <input value={giftForm.name} onChange={(event) => setGiftForm({ ...giftForm, name: event.target.value })} className={cn("rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")} placeholder="Nome, se quiser preencher manualmente" />
                <div className={cn("rounded-2xl border border-dashed border-black/10 bg-[#fdf8f3] p-3")}>
                  {giftForm.imageUrl ? (
                    <div className={cn("mb-3 grid grid-cols-[72px_1fr] gap-3")}>
                      <div className={cn("aspect-square overflow-hidden rounded-2xl bg-white")}>
                        <img src={giftForm.imageUrl} alt="" className={cn("h-full w-full object-cover")} />
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
                <input value={giftForm.price} onChange={(event) => setGiftForm({ ...giftForm, price: event.target.value })} className={cn("rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#ff4582]")} placeholder="Preco, opcional" />
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
                  Salvar presente
                </button>
              </div>
            </div>

            <div className={cn("rounded-3xl border border-black/5 bg-white p-5 shadow-sm")}>
              <h2 className={cn("text-xl font-semibold")}>Lista de presentes</h2>
              <div className={cn("mt-5 grid gap-3")}>
                {giftsQuery.isLoading && <EmptyState>Carregando presentes...</EmptyState>}
                {!giftsQuery.isLoading && (giftsQuery.data || []).length === 0 && (
                  <EmptyState>Nenhum presente cadastrado ainda.</EmptyState>
                )}
                {(giftsQuery.data || []).map((gift) => (
                  <div key={gift.id} className={cn("grid gap-3 rounded-2xl border border-black/5 p-3 sm:grid-cols-[92px_1fr]")}>
                    <div className={cn("aspect-square overflow-hidden rounded-2xl bg-[#f5f0eb]")}>
                      {gift.image_url && <img src={gift.image_url} alt="" className={cn("h-full w-full object-cover")} />}
                    </div>
                    <div>
                      <p className={cn("font-semibold")}>{gift.name}</p>
                      <p className={cn("mt-1 text-sm text-black/50")}>{gift.price || "Sem preco"}</p>
                      <div className={cn("mt-3 flex flex-wrap gap-2")}>
                        <button type="button" onClick={() => patchGift.mutate({ id: gift.id, payload: { ...gift, isReceived: !gift.is_received } })} className={cn("rounded-full border border-black/10 px-3 py-2 text-xs font-semibold")}>
                          {gift.is_received ? "Desmarcar ganho" : "Marcar ganho"}
                        </button>
                        <button type="button" onClick={() => patchGift.mutate({ id: gift.id, payload: { ...gift, isActive: !gift.is_active } })} className={cn("rounded-full border border-black/10 px-3 py-2 text-xs font-semibold")}>
                          {gift.is_active ? "Ocultar" : "Mostrar"}
                        </button>
                        <button type="button" onClick={() => deleteGift.mutate(gift.id)} className={cn("rounded-full border border-rose-100 px-3 py-2 text-xs font-semibold text-[#ff4582]")}>
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {enabled && activePage === "comentarios" && (
          <section className={cn("mt-8 rounded-3xl border border-black/5 bg-white p-5 shadow-sm")}>
            <div className={cn("flex items-center gap-2")}>
              <MessageCircleHeart className={cn("h-5 w-5 text-[#ff4582]")} />
              <h2 className={cn("text-xl font-semibold")}>Comentarios publicados</h2>
            </div>
            <p className={cn("mt-2 max-w-2xl text-sm text-black/55")}>
              As mensagens entram automaticamente no site. Use esta pagina quando precisar remover algo do mural.
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
                    </div>
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
                  <p className={cn("mt-3 text-sm leading-relaxed text-black/70")}>{comment.message}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
