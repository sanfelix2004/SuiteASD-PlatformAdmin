"use client";

import { useEffect, useState } from "react";

type Log = {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
  admin: { name: string; email: string } | null;
  society: { name: string; slug: string } | null;
};

export default function AuditPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/audit")
      .then(async (response) => {
        if (!response.ok) throw new Error("fail");
        const data = await response.json();
        setRows(data.data);
      })
      .catch(() => setError("Impossibile caricare l'audit"));
  }, []);

  if (error) return <p className="panel p-6 text-[var(--danger)]">{error}</p>;

  return (
    <section className="panel rise overflow-x-auto p-5">
      <h2 className="display text-2xl font-semibold">Registro audit</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Ultimi 100 eventi degli operatori piattaforma.
      </p>
      <table className="table mt-4">
        <thead>
          <tr>
            <th>Quando</th>
            <th>Azione</th>
            <th>Operatore</th>
            <th>Società</th>
            <th>Dettaglio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap text-sm">
                {new Date(row.createdAt).toLocaleString("it-IT")}
              </td>
              <td className="font-semibold">{row.action}</td>
              <td className="text-sm">
                {row.admin ? (
                  <>
                    {row.admin.name}
                    <div className="text-xs text-[var(--muted)]">{row.admin.email}</div>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="text-sm">
                {row.society ? (
                  <>
                    {row.society.name}
                    <div className="text-xs text-[var(--muted)]">{row.society.slug}</div>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="max-w-md break-words text-sm text-[var(--muted)]">
                {row.detail ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
