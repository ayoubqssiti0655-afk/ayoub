import { db } from "@/server/db";

export type AuditInput = {
  actorId?: string | null;
  actorName: string;
  actorType?: "ADMIN" | "MERCHANT" | "COURIER" | "SYSTEM" | "API";
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: string;
  ip?: string;
};

/** Fire-and-forget audit trail for sensitive mutations. */
export async function audit(input: AuditInput) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorName: input.actorName,
        actorType: input.actorType ?? "SYSTEM",
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: input.meta,
        ip: input.ip,
      },
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}
