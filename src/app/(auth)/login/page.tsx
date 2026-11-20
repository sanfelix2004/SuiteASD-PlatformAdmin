"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup-status")
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { needsSetup?: boolean };
        setNeedsSetup(Boolean(data.needsSetup));
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const endpoint = needsSetup ? "/api/auth/setup" : "/api/auth/login";
    const body = needsSetup
      ? { email, password, name: name || undefined }
      : { email, password };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? (needsSetup ? "Setup non riuscito" : "Accesso non riuscito"));
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
        <p className="panel w-full p-8 text-[var(--muted)]">Caricamento…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
      <form onSubmit={onSubmit} className="panel rise w-full space-y-5 p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
            SuiteASD
          </p>
          <h1 className="display mt-2 text-3xl font-semibold">
            {needsSetup ? "Setup iniziale" : "Platform Admin"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {needsSetup
              ? "Crea il primo operatore piattaforma. La password resta solo sul server."
              : "Accedi al back-office per gestire le società iscritte."}
          </p>
        </div>
        {needsSetup ? (
          <label className="block space-y-1 text-sm">
            <span className="font-semibold">Nome</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Operatore piattaforma"
            />
          </label>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">
            Password{needsSetup ? " (min. 12 caratteri)" : ""}
          </span>
          <input
            className="input"
            type="password"
            autoComplete={needsSetup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={needsSetup ? 12 : 8}
            required
          />
        </label>
        {error ? (
          <p className="rounded-xl bg-[#fdeceb] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary w-full" disabled={loading} type="submit">
          {loading ? "Attendi..." : needsSetup ? "Crea operatore" : "Entra"}
        </button>
      </form>
    </div>
  );
}
