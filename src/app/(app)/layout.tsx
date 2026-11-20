import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureBootstrapped();
  const session = await getSession();
  if (!session) redirect("/login");
  return <AppShell adminName={session.name}>{children}</AppShell>;
}
