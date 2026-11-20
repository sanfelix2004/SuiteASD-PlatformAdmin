"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Dashboard = {
  totals: {
    societies: number;
    active: number;
    suspended: number;
    pending: number;
    billingExempt: number;
    potentialRevenueCents: number;
    members: number;
    teams: number;
  };
  recent: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    billingExempt: boolean;
    membersCount: number;
    city: string | null;
    source?: string;
    updatedAt: string;
  }>;
  suiteasd: { mode: string; detail: string; count: number };
};

function euro(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "badge-active",
    PENDING: "badge-pending",
    SUSPENDED: "badge-suspended",
    CHURNED: "badge-churned",
  };
  return map[status] ?? "badge-churned";
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/dashboard");
    if (!response.ok) throw new Error("Caricamento fallito");
    setData(await response.json());
  }

  useEffect(() => {
    load().catch(() => setError("Impossibile caricare la dashboard"));
  }, []);

  async function sync() {
    setSyncing(true);
    setSyncMsg(null);
    const response = await fetch("/api/suiteasd/sync", { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setSyncing(false);
    if (!response.ok) {
      setSyncMsg(payload.error ?? "Sync fallita");
      return;
    }
    setSyncMsg(`Sync OK · ${payload.mode} · ${payload.upserted} società`);
    await load();
  }

  if (error) {
    return <p className="panel p-6 text-[var(--danger)]">{error}</p>;
  }
  if (!data) {
    return <p className="panel p-6 text-[var(--muted)]">Caricamento dashboard…</p>;
  }

  const cards = [
    { label: "Società iscritte", value: data.totals.societies },
    { label: "Attive", value: data.totals.active },
    { label: "In attesa", value: data.totals.pending },
    { label: "Sospese", value: data.totals.suspended },
    { label: "Esenzione pagamento", value: data.totals.billingExempt },
    { label: "Tesserati (aggregati)", value: data.totals.members },
    { label: "Squadre (aggregate)", value: data.totals.teams },
    {
      label: "Ricavi potenziali (non esenti)",
      value: euro(data.totals.potentialRevenueCents),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel rise flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="display text-xl font-semibold">Fonte SuiteASD</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {data.suiteasd.mode === "database"
              ? "Collegata al database di Mikirucci/SuiteASD"
              : data.suiteasd.mode === "snapshot"
                ? "Snapshot dal seed della repo SuiteASD"
                : "Fonte non disponibile"}
            {" · "}
            {data.suiteasd.detail}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {syncMsg ? <span className="text-sm text-[var(--mint)]">{syncMsg}</span> : null}
          <button type="button" className="btn btn-primary" disabled={syncing} onClick={sync}>
            {syncing ? "Sincronizzo…" : "Sincronizza da SuiteASD"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <article
            key={card.label}
            className={`panel rise rise-delay-${Math.min(index, 3)} p-5`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              {card.label}
            </p>
            <p className="display mt-3 text-3xl font-semibold">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="panel rise p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="display text-2xl font-semibold">Ultime società</h2>
            <p className="text-sm text-[var(--muted)]">
              Dati societari da SuiteASD + overlay billing piattaforma.
            </p>
          </div>
          <Link href="/societies" className="btn btn-primary">
            Tutte le società
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Società</th>
                <th>Fonte</th>
                <th>Stato</th>
                <th>Billing</th>
                <th>Tesserati</th>
                <th>Città</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="font-semibold text-[var(--brand-deep)]" href={`/societies/${row.id}`}>
                      {row.name}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">{row.slug}</div>
                  </td>
                  <td>
                    <span className="badge badge-exempt">{row.source ?? "LOCAL"}</span>
                  </td>
                  <td>
                    <span className={`badge ${statusBadge(row.status)}`}>{row.status}</span>
                  </td>
                  <td>
                    {row.billingExempt ? (
                      <span className="badge badge-exempt">Non paga</span>
                    ) : (
                      "A pagamento"
                    )}
                  </td>
                  <td>{row.membersCount}</td>
                  <td>{row.city ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
