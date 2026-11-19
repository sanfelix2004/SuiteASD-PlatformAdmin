"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/societies", label: "Società" },
  { href: "/policies", label: "Visibilità dati" },
  { href: "/audit", label: "Audit" },
];

export function AppShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
      <header className="panel rise flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
            SuiteASD
          </p>
          <h1 className="display text-2xl font-semibold tracking-tight md:text-3xl">
            Platform Admin
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Back-office società iscritte · {adminName}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`btn ${active ? "btn-primary" : "btn-ghost"}`}
              >
                {link.label}
              </Link>
            );
          })}
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Esci
          </button>
        </nav>
      </header>
      <main className="flex-1 pb-10">{children}</main>
    </div>
  );
}
