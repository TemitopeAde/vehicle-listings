import { context, type Context, type DealerActor } from "./context";
import { AppError } from "./errors";
import {
  dealerForCurrentMember,
  dealerFromAccess,
} from "./services/dealer-service";

export const dealerAccessHeader = "x-dealer-access";

function dealerActor(dealer: {
  _id: string;
  approvalState: DealerActor["approvalState"];
  demo: boolean;
}): DealerActor {
  return {
    id: dealer._id,
    approvalState: dealer.approvalState,
    demo: dealer.demo,
  };
}

/**
 * A dealer listing link or the logged-in member identifies the dealership.
 * Neither path grants site-owner access. Public reads skip the member lookup.
 */
export async function contextForRequest(
  request: Request,
  manager: boolean,
  dealerAccount = manager,
): Promise<Context> {
  const token = request.headers.get(dealerAccessHeader)?.trim() ?? "";
  if (token) {
    const ctx = await context(false);
    const dealer = await dealerFromAccess(ctx, token);
    if (!dealer)
      throw new AppError(
        "UNAUTHENTICATED",
        "This dealer link is not valid.",
        401,
      );
    return { ...ctx, manager: false, dealer: dealerActor(dealer) };
  }
  if (!dealerAccount) return context(manager);
  const ctx = await context(false);
  if (ctx.subjectType === "MEMBER") {
    const dealer = await dealerForCurrentMember(ctx);
    if (dealer) return { ...ctx, manager: false, dealer: dealerActor(dealer) };
    return ctx;
  }
  return manager ? context(true) : ctx;
}
