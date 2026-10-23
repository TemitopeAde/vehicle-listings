import type { Context } from "../context";
import { saveRow } from "../repositories/repository";
export async function audit(
  ctx: Context,
  entity: string,
  entityId: string,
  action: string,
  elevated = false,
) {
  await saveRow(
    ctx,
    "audit-logs",
    {
      _id: crypto.randomUUID(),
      actorId: ctx.actorId,
      siteId: ctx.siteId,
      entity,
      entityId,
      action,
      createdAt: new Date().toISOString(),
    },
    true,
    elevated,
  );
}
