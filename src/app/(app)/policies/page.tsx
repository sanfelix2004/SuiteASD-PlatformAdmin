"use client";

import { useEffect, useState } from "react";

type Policy = {
  id: string;
  fieldGroup: string;
  labelIt: string;
  descriptionIt: string;
  canViewDefault: boolean;
  canEditDefault: boolean;
  sensitive: boolean;
};

export default function PoliciesPage() {
  const [rows, setRows] = useState<Policy[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/policies");
    if (!response.ok) {
      setError("Impossibile caricare le policy");
      return;
    }
    const data = await response.json();
    setRows(data.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function update(policy: Policy, canViewDefault: boolean, canEditDefault: boolean) {
    await fetch("/api/policies", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fieldGroup: policy.fieldGroup,
        canViewDefault,
        canEditDefault: canViewDefault ? canEditDefault : false,
      }),
    });
    await load();
  }

  if (error) return <p className="panel p-6 text-[var(--danger)]">{error}</p>;

  return (
    <section className="panel rise p-5">
      <h2 className="display text-2xl font-semibold">Visibilità dati di default</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Cosa può vedere o modificare l&apos;operatore piattaforma sulle nuove società. I gruppi
        sensibili restano chiusi salvo override sulla scheda società.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Gruppo</th>
              <th>Vedere</th>
              <th>Modificare</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((policy) => (
              <tr key={policy.id}>
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
                    checked={policy.canViewDefault}
                    onChange={(e) =>
                      void update(
                        policy,
                        e.target.checked,
                        e.target.checked ? policy.canEditDefault : false,
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={policy.canEditDefault}
                    disabled={!policy.canViewDefault}
                    onChange={(e) =>
                      void update(policy, policy.canViewDefault, e.target.checked)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
