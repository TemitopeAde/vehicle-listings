import { sha256Hex } from "../web-crypto";
import { z } from "zod";
import type { Context } from "../context";
import { previewCSV } from "../../shared/csv";
import { createVehicle } from "./vehicle-service";
import { AppError } from "../errors";
export async function importCSV(ctx: Context, raw: unknown) {
  const input = z
    .object({
      csv: z.string().max(2_000_000),
      mapping: z.record(z.string(), z.string()).default({}),
      execute: z.boolean().default(false),
    })
    .strict()
    .parse(raw);
  let preview: ReturnType<typeof previewCSV>;
  try {
    preview = previewCSV(input.csv, input.mapping);
  } catch (e) {
    throw new AppError(
      "CSV_INVALID",
      e instanceof Error ? e.message : "Invalid CSV",
    );
  }
  if (!input.execute) return preview;
  const results = [];
  for (const row of preview.rows) {
    if (row.errors.length || !row.data) {
      results.push({ row: row.row, success: false, errors: row.errors });
      continue;
    }
    try {
      const key = (
        await sha256Hex(
          `${input.csv}:${JSON.stringify(input.mapping)}:${row.row}`,
        )
      ).slice(0, 32);
      const v = await createVehicle(ctx, row.data, key);
      results.push({ row: row.row, success: true, id: v._id, errors: [] });
    } catch (e) {
      results.push({
        row: row.row,
        success: false,
        errors: [
          e instanceof AppError ? e.message : "Import failed; retry this row.",
        ],
      });
    }
  }
  return {
    results,
    imported: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  };
}
