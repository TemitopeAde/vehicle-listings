import { extensions } from "@wix/astro/builders";
import { z } from "zod";
import {
  toolSchemas,
  type ToolName,
} from "../../../../backend/services/tool-service";
export const descriptions: Record<ToolName, string> = {
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
    "List buyer inquiries for the current site with the buyer's name, message, request type, status and team notes. Buyer email and phone are never returned. Use to review or summarise leads.",
  updateInquiry:
    "Change an inquiry's status (new, contacted, qualified, closed) or replace its team notes. Requires the inquiry ID.",
  emailInquiryBuyer:
    "Email the buyer behind an inquiry from the showroom. The server addresses it from the inquiry ID. Draft the subject and HTML body, show them to the user, and pass confirmed true only after they approve sending.",
  retryInquiryConfirmation:
    "Resend the automatic confirmation email for an inquiry whose confirmation was not queued. Requires the inquiry ID.",
  listQuoteRequests:
    "List quote requests with the requester's name and message, vehicle, quantity, payment method, timeline, trade-in, listed and quoted price, invoice and status. Contact details and address are never returned. Status is new, in-progress or quoted and updates automatically.",
  getQuoteRequest:
    "Get one quote request by ID with the requester's name, message, vehicle and pricing. Contact details and address are never returned.",
  updateQuoteRequest:
    "Save a quoted price or replace the team notes on a quote request. Saving moves a new request to In progress. Pass quotedPrice null to clear the price.",
  emailQuoteRequester:
    "Email the person who requested a quote. The server addresses it from the request ID. Draft the subject and HTML body, show them to the user, and pass confirmed true only after they approve sending. Sending with a saved quoted price marks the request Quote sent.",
  createQuoteInvoice:
    "Create a draft Wix invoice for a quote request using its quoted price, or the listed price if none is saved. Business plan only. The dealer reviews and sends the draft in Wix Invoices. Pass confirmed true after the user approves.",
  deleteQuoteRequest:
    "Permanently delete a quote request. Its Wix contact and any invoice stay in Wix. Pass confirmed true only after the user explicitly approves.",
  retryQuoteFollowUp:
    "Retry the automatic follow-up for a quote request: add the requester to Wix contacts and resend the owner and buyer emails that failed.",
  getSettings:
    "Get the showroom settings: brand name, accent colour, corner radius, columns, font, vehicle page path, currency and language.",
  updateSettings:
    "Change showroom settings used by every widget, such as brand name, accent colour, currency or language. Only the fields in patch change. Pass confirmed true after the user approves.",
  getPlan:
    "Get the site's current app plan, what each plan includes, and the free-trial link when a trial is still available.",
  getUpgradeLink:
    "Get the Wix checkout link to upgrade to the Pro or Business plan. Give the link to the user to open; never purchase on their behalf.",
  duplicateVehicle:
    "Copy an existing vehicle into a new unpublished draft. Requires the vehicle ID and a unique idempotency key.",
  getPriceHistory:
    "Get the price changes recorded for a vehicle. Requires the vehicle ID.",
  importVehiclesCsv:
    "Import vehicles from CSV text. Call first with execute false to preview the rows and column mapping. Then call with execute true and confirmed true after the user approves the preview.",
  loadDemoInventory:
    "Add or restore the sample demo vehicles so the showroom has content to preview. Pass confirmed true after the user approves.",
  clearDemoInventory:
    "Remove the sample demo vehicles. Real inventory is untouched. Pass confirmed true after the user approves.",
  deleteDealer:
    "Delete a dealership profile. Pass confirmed true only after the user explicitly approves.",
  getWidgetSettings:
    "Get a site widget's shared settings and every setting it accepts, with its kind and allowed values. Widgets: marketplace (vehicle listings: heading, description, layout, columns, filters shown, colours, fonts), details (vehicle page colours and fonts), add-vehicle and dealer-application (headings). Call before changing a widget.",
  updateWidgetSettings:
    "Change a site widget's text, layout, filters, colours or fonts. Keys and values are strings, e.g. {\"display-name\": \"Our cars\", \"show-fuel\": \"false\", \"accent\": \"#196947\"}. Applies to every copy of that widget on the live site within about a minute. Pass confirmed true after the user approves.",
  resetWidgetSettings:
    "Clear shared widget settings so the widget uses the values set in the Editor again. Pass keys to reset only those, or omit them to reset all. Pass confirmed true after the user approves.",
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
