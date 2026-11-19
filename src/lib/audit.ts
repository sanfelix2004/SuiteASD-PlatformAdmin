import { prisma } from "./prisma";

export async function writeAudit(input: {
  adminId?: string | null;
  societyId?: string | null;
  action: string;
  detail?: string;
}) {
  await prisma.auditLog.create({
    data: {
      adminId: input.adminId ?? null,
      societyId: input.societyId ?? null,
      action: input.action,
      detail: input.detail ?? null,
    },
  });
}
