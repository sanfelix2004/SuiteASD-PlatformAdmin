"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@suiteasd.platform");
  const [password, setPassword] = useState("AdminSuiteASD2026!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Accesso non riuscito");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
      <form onSubmit={onSubmit} className="panel rise w-full space-y-5 p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
            SuiteASD
          </p>
          <h1 className="display mt-2 text-3xl font-semibold">Platform Admin</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Accedi al back-office per gestire le società iscritte.
          </p>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="rounded-xl bg-[#fdeceb] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary w-full" disabled={loading} type="submit">
          {loading ? "Accesso..." : "Entra"}
        </button>
      </form>
    </div>
  );
}
