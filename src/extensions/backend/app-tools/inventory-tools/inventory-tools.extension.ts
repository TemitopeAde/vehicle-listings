import { extensions } from "@wix/astro/builders";
import { z } from "zod";
import {
  toolSchemas,
  type ToolName,
} from "../../../../backend/services/tool-service";
const descriptions: Record<ToolName, string> = {
  listVehicles:
    "Search the current site inventory by title, make, status, price or specifications. Use when a collaborator asks to find or list cars. Returns paginated vehicle records.",
  getVehicle:
    "Get the full details of a vehicle on the current site. Use when a collaborator asks about a specific inventory record. Requires a vehicle ID.",
  createVehicleDraft:
    "Create a validated vehicle draft on the current site. Use to add verified car inventory, never fabricated vehicle facts. Requires a unique idempotency key and vehicle data.",
  updateVehicle:
    "Update an existing vehicle using a validated field patch. Use to correct inventory facts or change a price. Requires a vehicle ID; an optional version guards stale updates.",
  publishVehicle:
    "Publish a verified vehicle after explicit user confirmation. Requires an approved dealership, image, description and positive price. The caller must pass confirmed true after obtaining confirmation.",
  setVehicleStatus:
    "Change vehicle availability after explicit user confirmation. Use to reserve, sell, archive or restore a listing. Legal lifecycle transitions are enforced.",
  bulkUpdateVehicles:
    "Change the availability of up to 100 vehicles after explicit user confirmation. Returns individual successes and errors for each listing. Only a safe status patch is accepted.",
  listDealers:
    "Search and list dealership profiles on the current site. Use when a collaborator wants to find a seller or review dealer approval status.",
  createDealer:
    "Create a new dealership profile with verified contact details. New dealers are pending unless explicitly approved by the collaborator.",
  updateDealer:
    "Update a dealership profile or approval state. Use to correct contact details, approve or suspend a seller. Requires the dealer ID and validated patch.",
  getInventorySummary:
    "Return counts of real vehicles by availability for the current site. Demo records are excluded. Use to understand current stock.",
  getVehicleAnalytics:
    "Get consent-aware daily vehicle views, contact clicks and inquiry totals for a specified number of days. Use to report showroom performance.",
  getInquiries:
    "List redacted buyer inquiry summaries for the current site. Returns IDs, listing references and status only; buyer names, contact details, messages and notes are excluded.",
};
export default extensions.appTools({
  id: "74faf50e-41c0-4365-b2fc-1a2ab4777eab",
  name: "inventory-tools",
  tools: (Object.keys(toolSchemas) as ToolName[]).map((methodName) => ({
    methodName,
    displayName: methodName.replace(/([A-Z])/g, " $1"),
    description: descriptions[methodName],
    requestSchema: z.toJSONSchema(toolSchemas[methodName], { io: "input" }),
    responseSchema: { type: "object", additionalProperties: true },
    activated: true,
  })),
});
