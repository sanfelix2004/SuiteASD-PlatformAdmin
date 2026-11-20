"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  name: string;
  avatarColor: string;
};

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#2f4bff");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/profiles");
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (!response.ok) {
      setError("Impossibile caricare i profili");
      return;
    }
    const data = await response.json();
    setProfiles(data.data);
    setColors(data.colors ?? []);
    setAccountName(data.accountName ?? "");
    if (data.colors?.[0]) setNewColor(data.colors[0]);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(profileId: string) {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/profiles/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    setBusy(false);
    if (!response.ok) {
      setError("Selezione profilo non riuscita");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function addProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName, avatarColor: newColor }),
    });
    setBusy(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Creazione profilo non riuscita");
      return;
    }
    setNewName("");
    setAdding(false);
    await load();
  }

  async function removeProfile(profileId: string) {
    if (!confirm("Rimuovere questo profilo?")) return;
    const response = await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Eliminazione non riuscita");
      return;
    }
    await load();
  }

  return (
    <div className="profiles-screen mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
        SuiteASD
      </p>
      <h1 className="display mt-3 text-center text-4xl font-semibold md:text-5xl">
        Chi sta usando la piattaforma?
      </h1>
      <p className="mt-3 max-w-xl text-center text-[var(--muted)]">
        Account di {accountName || "…"}. Scegli un profilo per entrare nel back-office.
      </p>

      <div className="mt-12 flex flex-wrap items-start justify-center gap-8">
        {profiles.map((profile) => (
          <div key={profile.id} className="group flex w-28 flex-col items-center gap-3 md:w-32">
            <button
              type="button"
              disabled={busy}
              onClick={() => void pick(profile.id)}
              className="profile-avatar rise"
              style={{ background: profile.avatarColor }}
              aria-label={`Entra come ${profile.name}`}
            >
              <span>{profile.name.slice(0, 1).toUpperCase()}</span>
            </button>
            <p className="text-center text-sm font-semibold">{profile.name}</p>
            <button
              type="button"
              className="text-xs text-[var(--muted)] opacity-0 transition group-hover:opacity-100"
              onClick={() => void removeProfile(profile.id)}
            >
              Rimuovi
            </button>
          </div>
        ))}

        {profiles.length < 8 ? (
          <button
            type="button"
            className="flex w-28 flex-col items-center gap-3 md:w-32"
            onClick={() => setAdding(true)}
          >
            <span className="profile-avatar profile-avatar-add">+</span>
            <span className="text-sm font-semibold text-[var(--muted)]">Aggiungi</span>
          </button>
        ) : null}
      </div>

      {adding ? (
        <form onSubmit={addProfile} className="panel mt-10 w-full max-w-md space-y-3 p-5">
          <h2 className="display text-xl font-semibold">Nuovo profilo</h2>
          <input
            className="input"
            placeholder="Nome persona"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            minLength={2}
            maxLength={40}
          />
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className="h-8 w-8 rounded-full border-2"
                style={{
                  background: color,
                  borderColor: newColor === color ? "#0f1b2d" : "transparent",
                }}
                onClick={() => setNewColor(color)}
                aria-label={`Colore ${color}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy} type="submit">
              Salva profilo
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setAdding(false)}
            >
              Annulla
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-xl bg-[#fdeceb] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
