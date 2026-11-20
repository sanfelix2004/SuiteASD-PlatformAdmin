"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    router.replace("/profiles");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
      <form onSubmit={onSubmit} className="panel rise w-full space-y-5 p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
            SuiteASD
          </p>
          <h1 className="display mt-2 text-3xl font-semibold">Login</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Accedi al tuo account, poi scegli chi entra.
          </p>
        </div>
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
          <span className="font-semibold">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
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
        <p className="text-center text-sm text-[var(--muted)]">
          Non hai un account?{" "}
          <Link className="font-semibold text-[var(--brand)]" href="/register">
            Registrati
          </Link>
        </p>
      </form>
    </div>
  );
}
