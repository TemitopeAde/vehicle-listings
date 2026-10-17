import type { Context } from "../context";
import { queryRows } from "../repositories/repository";
import { dealerSchema } from "../../shared/schemas";
export async function dealerDirectory(ctx: Context, search = "", cursor = 0) {
  const r = await queryRows(
    ctx,
    "dealers",
    {
      eq: { approvalState: "approved", demo: false },
      search,
      offset: cursor,
      limit: 30,
      sort: "businessName",
    },
    true,
  );
  return {
    items: r.rows.map((row) => {
      const d = dealerSchema.parse(row);
      return {
        _id: d._id,
        businessName: d.businessName,
        location: d.location,
        address: d.address,
        description: d.description,
        website: d.website,
        phone: d.phone,
        email: d.email,
        whatsapp: d.whatsapp,
        hours: d.hours,
      };
    }),
    total: r.total,
    nextCursor: cursor + 30 < r.total ? cursor + 30 : null,
  };
}
