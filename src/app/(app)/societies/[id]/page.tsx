"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Policy = {
  fieldGroup: string;
  labelIt: string;
  descriptionIt: string;
  sensitive: boolean;
};

type Access = {
  fieldGroup: string;
  canView: boolean;
  canEdit: boolean;
};

type SocietyDetail = {
  society: {
    id: string;
    name: string;
    slug: string;
    sport: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    fiscalCode: string | null;
    status: string;
    billingPlan: string;
    billingExempt: boolean;
    billingExemptReason: string | null;
    billingExemptUntil: string | null;
    annualFeeCents: number;
    membersCount: number;
    teamsCount: number;
    notes: string | null;
    fieldAccess: Access[];
    metrics: Array<{
      id: string;
      capturedAt: string;
      activeUsers7d: number;
      logins7d: number;
      documentsCount: number;
      paymentsCents: number;
      eventsCount: number;
    }>;
    societyNotes: Array<{ id: string; body: string; createdAt: string }>;
    auditLogs: Array<{ id: string; action: string; detail: string | null; createdAt: string }>;
  };
  policies: Policy[];
};

function euro(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function SocietyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<SocietyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    fiscalCode: "",
    status: "ACTIVE",
    billingPlan: "PILOTA",
    billingExempt: true,
    billingExemptReason: "",
    annualFeeCents: 0,
    membersCount: 0,
    teamsCount: 0,
    notes: "",
  });

  async function load() {
    const response = await fetch(`/api/societies/${params.id}`);
    if (!response.ok) {
      setError("Società non trovata");
      return;
    }
    const payload: SocietyDetail = await response.json();
    setData(payload);
    const s = payload.society;
    setForm({
      name: s.name,
      email: s.email ?? "",
      phone: s.phone ?? "",
      city: s.city ?? "",
      fiscalCode: s.fiscalCode ?? "",
      status: s.status,
      billingPlan: s.billingPlan,
      billingExempt: s.billingExempt,
      billingExemptReason: s.billingExemptReason ?? "",
      annualFeeCents: s.annualFeeCents,
      membersCount: s.membersCount,
      teamsCount: s.teamsCount,
      notes: s.notes ?? "",
    });
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when route id changes
  }, [params.id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(`/api/societies/${params.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        city: form.city || null,
        fiscalCode: form.fiscalCode || null,
        status: form.status,
        billingPlan: form.billingPlan,
        billingExempt: form.billingExempt,
        billingExemptReason: form.billingExempt ? form.billingExemptReason || null : null,
        annualFeeCents: form.annualFeeCents,
        membersCount: form.membersCount,
        teamsCount: form.teamsCount,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      setError("Salvataggio non riuscito");
      return;
    }
    await load();
  }

  async function toggleAccess(fieldGroup: string, canView: boolean, canEdit: boolean) {
    await fetch(`/api/societies/${params.id}/access`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fieldGroup, canView, canEdit }),
    });
    await load();
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    await fetch(`/api/societies/${params.id}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: note }),
    });
    setNote("");
    await load();
  }

  async function removeSociety() {
    if (!confirm("Eliminare definitivamente questa società dal back-office?")) return;
    const response = await fetch(`/api/societies/${params.id}`, { method: "DELETE" });
    if (response.ok) router.replace("/societies");
  }

  if (error && !data) return <p className="panel p-6 text-[var(--danger)]">{error}</p>;
  if (!data) return <p className="panel p-6 text-[var(--muted)]">Caricamento scheda…</p>;

  const accessByGroup = Object.fromEntries(
    data.society.fieldAccess.map((row) => [row.fieldGroup, row]),
  );
  const latest = data.society.metrics[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/societies" className="text-sm font-semibold text-[var(--brand)]">
            ← Società
          </Link>
          <h2 className="display mt-2 text-3xl font-semibold">{data.society.name}</h2>
          <p className="text-sm text-[var(--muted)]">{data.society.slug}</p>
        </div>
        <button type="button" className="btn btn-danger" onClick={removeSociety}>
          Elimina
        </button>
      </div>

      <form className="panel rise grid gap-4 p-5 md:grid-cols-2" onSubmit={save}>
        <h3 className="display text-xl font-semibold md:col-span-2">Dati e billing</h3>
        {(
          [
            ["name", "Nome"],
            ["email", "Email"],
            ["phone", "Telefono"],
            ["city", "Città"],
            ["fiscalCode", "Codice fiscale"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="space-y-1 text-sm">
            <span className="font-semibold">{label}</span>
            <input
              className="input"
              value={form[key]}
              onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
            />
          </label>
        ))}
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Stato</span>
          <select
            className="select"
            value={form.status}
            onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
          >
            {["ACTIVE", "PENDING", "SUSPENDED", "CHURNED"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Piano</span>
          <select
            className="select"
            value={form.billingPlan}
            onChange={(e) => setForm((current) => ({ ...current, billingPlan: e.target.value }))}
          >
            {["PILOTA", "SQUADRA", "SOCIETA"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Quota annuale (centesimi)</span>
          <input
            className="input"
            type="number"
            min={0}
            value={form.annualFeeCents}
            onChange={(e) =>
              setForm((current) => ({ ...current, annualFeeCents: Number(e.target.value) }))
            }
          />
          <span className="text-xs text-[var(--muted)]">{euro(form.annualFeeCents)}</span>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Tesserati / Squadre</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              type="number"
              min={0}
              value={form.membersCount}
              onChange={(e) =>
                setForm((current) => ({ ...current, membersCount: Number(e.target.value) }))
              }
            />
            <input
              className="input"
              type="number"
              min={0}
              value={form.teamsCount}
              onChange={(e) =>
                setForm((current) => ({ ...current, teamsCount: Number(e.target.value) }))
              }
            />
          </div>
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
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-semibold">Note interne</span>
          <textarea
            className="textarea min-h-24"
            value={form.notes}
            onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
          />
        </label>
        <div className="md:col-span-2">
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </button>
          {error ? <span className="ml-3 text-sm text-[var(--danger)]">{error}</span> : null}
        </div>
      </form>

      <section className="panel rise rise-delay-1 p-5">
        <h3 className="display text-xl font-semibold">Cosa puoi vedere / modificare</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Matrice per questa società. I gruppi sensibili restano spenti di default.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Gruppo dati</th>
                <th>Vedere</th>
                <th>Modificare</th>
              </tr>
            </thead>
            <tbody>
              {data.policies.map((policy) => {
                const access = accessByGroup[policy.fieldGroup] ?? {
                  canView: false,
                  canEdit: false,
                };
                return (
                  <tr key={policy.fieldGroup}>
                    <td>
                      <div className="font-semibold">
                        {policy.labelIt}
                        {policy.sensitive ? (
                          <span className="badge badge-suspended ml-2">Sensibile</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{policy.descriptionIt}</div>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={access.canView}
                        onChange={(e) =>
                          void toggleAccess(
                            policy.fieldGroup,
                            e.target.checked,
                            e.target.checked ? access.canEdit : false,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={access.canEdit}
                        disabled={!access.canView}
                        onChange={(e) =>
                          void toggleAccess(policy.fieldGroup, access.canView, e.target.checked)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel rise rise-delay-2 p-5">
          <h3 className="display text-xl font-semibold">Raccolta dati (metriche)</h3>
          {latest ? (
            <ul className="mt-4 space-y-2 text-sm">
              <li>Utenti attivi 7g: <strong>{latest.activeUsers7d}</strong></li>
              <li>Login 7g: <strong>{latest.logins7d}</strong></li>
              <li>Documenti: <strong>{latest.documentsCount}</strong></li>
              <li>Eventi: <strong>{latest.eventsCount}</strong></li>
              <li>Pagamenti aggregati: <strong>{euro(latest.paymentsCents)}</strong></li>
              <li className="text-xs text-[var(--muted)]">
                Snapshot: {new Date(latest.capturedAt).toLocaleString("it-IT")}
              </li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">Nessuna metrica ancora.</p>
          )}
        </article>

        <article className="panel rise rise-delay-3 p-5">
          <h3 className="display text-xl font-semibold">Note operative</h3>
          <form className="mt-3 flex gap-2" onSubmit={addNote}>
            <input
              className="input"
              placeholder="Aggiungi nota…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              Aggiungi
            </button>
          </form>
          <ul className="mt-4 space-y-3">
            {data.society.societyNotes.map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
                <p>{item.body}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {new Date(item.createdAt).toLocaleString("it-IT")}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel p-5">
        <h3 className="display text-xl font-semibold">Audit di questa società</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {data.society.auditLogs.map((log) => (
            <li key={log.id} className="border-b border-[var(--line)] py-2">
              <strong>{log.action}</strong>
              {log.detail ? <span className="text-[var(--muted)]"> — {log.detail}</span> : null}
              <div className="text-xs text-[var(--muted)]">
                {new Date(log.createdAt).toLocaleString("it-IT")}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
