"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Society = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  status: string;
  billingExempt: boolean;
  billingPlan: string;
  membersCount: number;
  teamsCount: number;
  email: string | null;
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "badge-active",
    PENDING: "badge-pending",
    SUSPENDED: "badge-suspended",
    CHURNED: "badge-churned",
  };
  return map[status] ?? "badge-churned";
}

export default function SocietiesPage() {
  const [rows, setRows] = useState<Society[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [exempt, setExempt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    city: "",
    email: "",
    billingExempt: true,
    billingExemptReason: "Esenzione operatore piattaforma",
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (exempt) params.set("exempt", exempt);
    return params.toString();
  }, [q, status, exempt]);

  async function load() {
    const response = await fetch(`/api/societies${query ? `?${query}` : ""}`);
    if (!response.ok) {
      setError("Impossibile caricare le società");
      return;
    }
    const data = await response.json();
    setRows(data.data);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when filters change
  }, [query]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    const response = await fetch("/api/societies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        city: form.city || null,
        email: form.email || null,
        billingExempt: form.billingExempt,
        billingExemptReason: form.billingExempt ? form.billingExemptReason : null,
        status: "PENDING",
        billingPlan: "PILOTA",
      }),
    });
    setCreating(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Creazione non riuscita");
      return;
    }
    setForm({
      name: "",
      slug: "",
      city: "",
      email: "",
      billingExempt: true,
      billingExemptReason: "Esenzione operatore piattaforma",
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <section className="panel rise p-5">
        <h2 className="display text-2xl font-semibold">Società iscritte</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Elenco completo, filtri e creazione. Puoi esentare dal pagamento in qualsiasi momento.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="input"
            placeholder="Cerca nome, slug, città, email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tutti gli stati</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="CHURNED">CHURNED</option>
          </select>
          <select className="select" value={exempt} onChange={(e) => setExempt(e.target.value)}>
            <option value="">Billing: tutti</option>
            <option value="true">Solo esenti (non pagano)</option>
            <option value="false">Solo a pagamento</option>
          </select>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      </section>

      <section className="panel rise rise-delay-1 overflow-x-auto p-5">
        <table className="table">
          <thead>
            <tr>
              <th>Società</th>
              <th>Stato</th>
              <th>Piano</th>
              <th>Pagamento</th>
              <th>Tesserati</th>
              <th>Squadre</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-[var(--muted)]">
                  Nessuna società con questi filtri.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/societies/${row.id}`} className="font-semibold text-[var(--brand-deep)]">
                      {row.name}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">
                      {row.slug}
                      {row.city ? ` · ${row.city}` : ""}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${statusBadge(row.status)}`}>{row.status}</span>
                  </td>
                  <td>{row.billingPlan}</td>
                  <td>
                    {row.billingExempt ? (
                      <span className="badge badge-exempt">Non paga</span>
                    ) : (
                      "A pagamento"
                    )}
                  </td>
                  <td>{row.membersCount}</td>
                  <td>{row.teamsCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="panel rise rise-delay-2 p-5">
        <h3 className="display text-xl font-semibold">Registra una società</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Nome</span>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  name: e.target.value,
                  slug:
                    current.slug ||
                    e.target.value
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                }))
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Slug</span>
            <input
              className="input"
              required
              pattern="[a-z0-9-]+"
              value={form.slug}
              onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Città</span>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm((current) => ({ ...current, city: e.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Email</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.billingExempt}
              onChange={(e) =>
                setForm((current) => ({ ...current, billingExempt: e.target.checked }))
              }
            />
            <span className="font-semibold">Non far pagare questa società</span>
          </label>
          {form.billingExempt ? (
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-semibold">Motivo esenzione</span>
              <input
                className="input"
                value={form.billingExemptReason}
                onChange={(e) =>
                  setForm((current) => ({ ...current, billingExemptReason: e.target.value }))
                }
              />
            </label>
          ) : null}
          <div className="md:col-span-2">
            <button className="btn btn-primary" disabled={creating} type="submit">
              {creating ? "Salvataggio..." : "Crea società"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
