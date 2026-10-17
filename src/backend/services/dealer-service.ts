import { randomBytes, randomUUID } from "node:crypto";
import { members } from "@wix/members";
import { z } from "zod";
import {
  dealerApplicationInput,
  dealerInput,
  dealerSchema,
} from "../../shared/schemas";
import type { Context } from "../context";
import { AppError } from "../errors";
import { saveRow, getRow, queryRows, removeRow } from "../repositories/repository";
import { audit } from "./audit-service";
import { setStatus } from "./vehicle-service";
export async function listDealers(ctx: Context, search = "", cursor = 0) {
  const result = await queryRows(ctx, "dealers", {
    search,
    offset: cursor,
    limit: 100,
    sort: "businessName",
  });
  return {
    items: result.rows.map((r) => dealerSchema.parse(r)),
    total: result.total,
  };
}
export async function saveDealer(ctx: Context, raw: unknown, id?: string) {
  if (!ctx.manager)
    throw new AppError(
      "FORBIDDEN",
      "Dealer management permission is required.",
      403,
    );
  const parsed = id ? dealerInput.partial().parse(raw) : dealerInput.parse(raw);
  // Partial parses still fill defaults. Keep only fields the caller sent.
  const input =
    id && raw && typeof raw === "object"
      ? Object.fromEntries(
          Object.entries(parsed).filter(([key]) => key in raw),
        )
      : parsed;
  const existing = id ? await getRow(ctx, "dealers", id) : null;
  if (id && !existing)
    throw new AppError("NOT_FOUND", "Dealer not found.", 404);
  const now = new Date().toISOString();
  const demo = existing?.demo ?? false;
  const currentToken =
    typeof existing?.accessToken === "string" ? existing.accessToken : "";
  const dealer = dealerSchema.parse({
    ...existing,
    ...input,
    _id: id ?? randomUUID(),
    accessToken: demo
      ? ""
      : /^[a-f0-9]{64}$/.test(currentToken)
        ? currentToken
        : randomBytes(32).toString("hex"),
    demo,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  await saveRow(ctx, "dealers", dealer, !id);
  if (id && dealer.approvalState !== "approved")
    await archivePublicVehicles(ctx, id);
  await audit(ctx, "dealer", dealer._id, id ? "update" : "create");
  return dealer;
}
async function archivePublicVehicles(ctx: Context, dealerId: string) {
  let offset = 0;
  while (true) {
    const page = await queryRows(ctx, "vehicles", {
      eq: { dealerId },
      offset,
      limit: 100,
      sort: "_id",
    });
    for (const vehicle of page.rows)
      if (["published", "reserved"].includes(String(vehicle.status)))
        await setStatus(ctx, vehicle._id, "archived");
    offset += page.rows.length;
    if (offset >= page.total || !page.rows.length) break;
  }
}
export async function deleteDealer(ctx: Context, id: string) {
  if (!ctx.manager)
    throw new AppError(
      "FORBIDDEN",
      "Dealer management permission is required.",
      403,
    );
  const existing = await getRow(ctx, "dealers", id);
  if (!existing) throw new AppError("NOT_FOUND", "Dealer not found.", 404);
  const dealer = dealerSchema.parse(existing);
  if (dealer.demo)
    throw new AppError(
      "DEMO",
      "Sample dealerships stay in the showroom.",
    );
  await archivePublicVehicles(ctx, dealer._id);
  await removeRow(ctx, "dealers", dealer._id);
  await audit(ctx, "dealer", dealer._id, "delete");
  return { _id: dealer._id };
}
const accessTokenPattern = /^[a-f0-9]{64}$/;
const zApply = z
  .object({
    action: z.literal("apply"),
    payload: dealerApplicationInput,
    honeypot: z.string().max(0).default(""),
  })
  .strict();
export async function dealerFromAccess(ctx: Context, token: string) {
  if (!accessTokenPattern.test(token)) return null;
  const { rows } = await queryRows(
    ctx,
    "dealers",
    { eq: { accessToken: token }, limit: 1 },
    true,
  );
  const row = rows[0];
  if (!row) return null;
  const dealer = dealerSchema.parse(row);
  return dealer.accessToken === token ? dealer : null;
}
const loginRequired = "Log in before applying to sell vehicles.";
/** The application email is the logged-in member's login email, not the submitted value. */
async function memberLoginEmail(ctx: Context) {
  if (ctx.demo) return null;
  if (ctx.subjectType !== "MEMBER")
    throw new AppError("UNAUTHENTICATED", loginRequired, 401);
  // EXTENDED is the fieldset that includes loginEmail. Do not elevate: this must be the caller.
  const response = await members.getCurrentMember({ fieldsets: ["EXTENDED"] });
  const email = response.member?.loginEmail?.trim();
  if (!email) throw new AppError("UNAUTHENTICATED", loginRequired, 401);
  return email;
}
export async function applyDealer(ctx: Context, raw: unknown) {
  const command = zApply.parse(raw);
  if (command.honeypot)
    throw new AppError("VALIDATION", "Check the application and try again.");
  const loginEmail = await memberLoginEmail(ctx);
  const input = loginEmail
    ? { ...command.payload, email: loginEmail }
    : command.payload;
  const existing = await existingDealerApplication(ctx, input.email);
  if (existing)
    throw new AppError(
      "CONFLICT",
      "This email already has an application.",
      409,
    );
  const now = new Date().toISOString();
  const dealer = dealerSchema.parse({
    ...input,
    approvalState: "pending",
    accessToken: randomBytes(32).toString("hex"),
    memberId: ctx.subjectType === "MEMBER" ? ctx.actorId : "",
    _id: randomUUID(),
    demo: false,
    createdAt: now,
    updatedAt: now,
  });
  await saveRow(ctx, "dealers", dealer, true, true);
  await audit(ctx, "dealer", dealer._id, "apply", true);
  return {
    _id: dealer._id,
    businessName: dealer.businessName,
    approvalState: dealer.approvalState,
    accessToken: dealer.accessToken,
  };
}
const accountRank = {
  approved: 0,
  pending: 1,
  suspended: 2,
  rejected: 3,
} as const;

/** The dealership for this login. Member id wins; older applications match the account email. */
export async function dealerMatchingLogin(
  ctx: Context,
  login: { email: string; memberId?: string },
) {
  const email = login.email.trim().toLowerCase();
  const memberId = login.memberId?.trim() ?? "";
  const rows = [];
  if (memberId) {
    const byMember = await queryRows(
      ctx,
      "dealers",
      { eq: { memberId }, limit: 20 },
      true,
    );
    rows.push(...byMember.rows);
  }
  if (email) {
    const byEmail = await queryRows(
      ctx,
      "dealers",
      { eq: { email: login.email.trim() }, limit: 20 },
      true,
    );
    rows.push(...byEmail.rows);
  }
  const seen = new Set<string>();
  const dealers = rows
    .map((row) => dealerSchema.parse(row))
    .filter((dealer) => {
      if (dealer.demo || seen.has(dealer._id)) return false;
      seen.add(dealer._id);
      const sameMember = Boolean(memberId) && dealer.memberId === memberId;
      const legacyEmail =
        !dealer.memberId && dealer.email.trim().toLowerCase() === email;
      return sameMember || legacyEmail;
    })
    .sort(
      (a, b) =>
        accountRank[a.approvalState] - accountRank[b.approvalState] ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  const owned = memberId
    ? dealers.filter((dealer) => dealer.memberId === memberId)
    : [];
  return (owned.length ? owned : dealers)[0] ?? null;
}

/** Any non-demo application for this email, including one tied to a member account. */
async function existingDealerApplication(ctx: Context, email: string) {
  const trimmed = email.trim();
  const normalized = trimmed.toLowerCase();
  if (!normalized) return null;
  const memberId = ctx.subjectType === "MEMBER" ? ctx.actorId : "";
  const byAccount = await dealerMatchingLogin(ctx, { email: trimmed, memberId });
  if (byAccount) return byAccount;
  const { rows } = await queryRows(
    ctx,
    "dealers",
    { eq: { email: trimmed }, limit: 20 },
    true,
  );
  return (
    rows
      .map((row) => dealerSchema.parse(row))
      .find(
        (dealer) =>
          !dealer.demo && dealer.email.trim().toLowerCase() === normalized,
      ) ?? null
  );
}

export async function dealerForCurrentMember(ctx: Context) {
  if (ctx.demo || ctx.subjectType !== "MEMBER") return null;
  const email = await memberLoginEmail(ctx);
  if (!email) return null;
  return dealerMatchingLogin(ctx, { email, memberId: ctx.actorId });
}

export async function dealerSession(ctx: Context) {
  if (!ctx.dealer) return null;
  const row = await getRow(ctx, "dealers", ctx.dealer.id, true);
  if (!row) throw new AppError("NOT_FOUND", "Dealership not found.", 404);
  const dealer = dealerSchema.parse(row);
  return {
    _id: dealer._id,
    businessName: dealer.businessName,
    location: dealer.location,
    approvalState: dealer.approvalState,
    demo: dealer.demo,
    createdAt: dealer.createdAt,
  };
}
export async function publicDealer(ctx: Context, id: string) {
  const r = await getRow(ctx, "dealers", id, true);
  if (!r || r.approvalState !== "approved" || r.demo) return null;
  const d = dealerSchema.parse(r);
  return {
    _id: d._id,
    businessName: d.businessName,
    phone: d.phone,
    whatsapp: d.whatsapp,
    email: d.email,
    address: d.address,
    location: d.location,
    website: d.website,
    description: d.description,
    hours: d.hours,
  };
}
