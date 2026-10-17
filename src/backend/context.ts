import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { AppError } from "./errors";
export type DealerActor = {
  id: string;
  approvalState: "pending" | "approved" | "suspended" | "rejected";
  demo: boolean;
};
export type Context = {
  siteId: string;
  actorId: string;
  manager: boolean;
  demo: boolean;
  subjectType?: "APP" | "USER" | "MEMBER" | "VISITOR" | "UNKNOWN";
  /** Set for a dealer listing link or the logged-in member who owns the dealership. Never grants site-owner access. */
  dealer?: DealerActor | null;
};
export const isLocalDemo = () =>
  import.meta.env.DEV && process.env.CAR_LISTING_DEMO === "1";
export async function context(manager = false): Promise<Context> {
  if (isLocalDemo())
    return {
      siteId: "local-demo",
      actorId: "local-owner",
      manager,
      demo: true,
    };
  const token = await auth.getTokenInfo().catch(() => {
    throw new AppError(
      "UNAUTHENTICATED",
      "A valid Wix session is required.",
      401,
    );
  });
  if (!token.active || !token.siteId)
    throw new AppError(
      "UNAUTHENTICATED",
      "A valid Wix session is required.",
      401,
    );
  if (manager) {
    if (token.subjectType !== "USER")
      throw new AppError(
        "FORBIDDEN",
        "Only authorized site collaborators can manage inventory.",
        403,
      );
    // Do not elevate this probe: Wix must confirm this caller has CMS editor access.
    await items
      .query("@admin14744/vehicle-listings/dealers")
      .limit(1)
      .find()
      .catch(() => {
        throw new AppError(
          "FORBIDDEN",
          "CMS access to this app is required. Verify site permissions and collection setup.",
          403,
        );
      });
  }
  return {
    siteId: token.siteId,
    actorId: token.subjectId,
    subjectType: token.subjectType,
    manager,
    demo: false,
  };
}
