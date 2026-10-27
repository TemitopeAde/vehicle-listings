import { useState } from "react";
import { toast } from "sonner";
import { Download, Eye, Mail, Phone } from "lucide-react";
import { api, download } from "./api";
import type { Inquiry } from "../shared/schemas";
import { csvCell } from "../shared/utils";
import { useResource } from "./hooks";
import { Button } from "./components/ui/button";
import { Badge, LoadState, Empty } from "./components/common";
import { Dialog, DialogContent, DialogTitle } from "./components/ui/dialog";
import { DropdownMenuItem, RowActions } from "./components/ui/dropdown-menu";
import { InquiryEmail } from "./inquiry-email";
import { localeFor, statusLabel } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";

const inquiryKind: Record<string, string> = {
  inquiry: "General inquiry",
  "test-drive": "Test drive",
  "trade-in": "Trade-in",
};

function inquiryStatus(status: string) {
  return (
    statusLabel[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
  );
}

export function Inquiries() {
  const { t, language } = useI18n();
  const [status, setStatus] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [emailing, setEmailing] = useState(false),
    [cursor, setCursor] = useState(0),
    [busy, setBusy] = useState(false),
    [savingNotes, setSavingNotes] = useState(false),
    [notes, setNotes] = useState("");
  const resource = useResource<{
    items: Inquiry[];
    total: number;
    nextCursor: number | null;
  }>(`inquiries?status=${status}&cursor=${cursor}`);
  const inquiry = resource.data?.items.find((i) => i._id === selected);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(localeFor(language), {
      dateStyle: "medium",
    });
  function open(i: Inquiry, email = false) {
    setSelected(i._id);
    setNotes(i.notes);
    setEmailing(email);
  }
  async function update(payload: unknown, notesSave = false) {
    if (!inquiry) return;
    setBusy(true);
    if (notesSave) setSavingNotes(true);
    try {
      await api("inquiries", { id: inquiry._id, payload }, "PATCH");
      toast.success(t("Inquiry updated"));
      await resource.reload();
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
      setSavingNotes(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-heading">{t("Conversations start here")}</h2>
          <p className="hint mt-1">
            {t("Follow up with interested buyers and keep every lead moving.")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            download(
              "inquiries-current-page.csv",
              [
                ["Name", "Email", "Phone", "Status", "Message"]
                  .map((heading) => csvCell(t(heading)))
                  .join(","),
                ...(resource.data?.items ?? []).map((i) =>
                  [
                    i.name,
                    i.email,
                    i.phone,
                    t(inquiryStatus(i.status)),
                    i.message,
                  ]
                    .map(csvCell)
                    .join(","),
                ),
              ].join("\r\n"),
            )
          }
        >
          <Download size={16} />
          {t("Export page")}
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["", "new", "contacted", "qualified", "closed"].map((s) => (
          <Button
            key={s}
            variant={s === status ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatus(s);
              setCursor(0);
              setSelected(null);
            }}
          >
            {s ? t(inquiryStatus(s)) : t("All inquiries")}
          </Button>
        ))}
      </div>
      {/* Refreshes keep the current list on screen; the skeleton is only for the first load. */}
      <LoadState
        loading={resource.loading && !resource.data}
        error={resource.error}
        retry={() => void resource.reload()}
      />
      {resource.data && (
        <section className="surface overflow-hidden">
          {resource.data.items.length === 0 ? (
            <Empty
              title="No inquiries yet"
              description="Buyer inquiries will arrive here when your inventory is live."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    {["Buyer", "Message", "Type", "Status", "Received"].map(
                      (heading) => (
                        <th key={heading} className="p-4 text-start font-medium">
                          {t(heading)}
                        </th>
                      ),
                    )}
                    <th className="p-4 text-end font-medium">
                      <span className="sr-only">{t("Actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((i) => (
                    <tr key={i._id} className="border-t hover:bg-muted/40">
                      <td className="p-4">
                        <button
                          className="block text-start"
                          onClick={() => open(i)}
                        >
                          <span className="block whitespace-nowrap font-semibold">
                            {i.name}
                          </span>
                          <span className="block max-w-56 truncate text-xs text-muted-foreground">
                            {i.email}
                          </span>
                        </button>
                      </td>
                      <td className="p-4">
                        <span className="line-clamp-2 max-w-80 text-muted-foreground">
                          {i.message}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-4">
                        {t(inquiryKind[i.kind] ?? i.kind)}
                      </td>
                      <td className="p-4">
                        <Badge status={i.status}>
                          {t(inquiryStatus(i.status))}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap p-4 text-muted-foreground">
                        <time dateTime={i.createdAt}>{date(i.createdAt)}</time>
                      </td>
                      <td className="p-4 text-end">
                        <RowActions
                          label={t("Actions for {name}", { name: i.name })}
                        >
                          <DropdownMenuItem onSelect={() => open(i)}>
                            <Eye size={15} />
                            {t("View")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => open(i, true)}>
                            <Mail size={15} />
                            {t("Email buyer")}
                          </DropdownMenuItem>
                          {i.phone && (
                            <DropdownMenuItem asChild>
                              <a href={`tel:${i.phone.replace(/[^+\d]/g, "")}`}>
                                <Phone size={15} />
                                {t("Call buyer")}
                              </a>
                            </DropdownMenuItem>
                          )}
                        </RowActions>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t p-3">
            <span className="text-xs text-muted-foreground">
              {t("{total} inquiries", { total: resource.data.total })}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={cursor === 0}
                onClick={() => setCursor(Math.max(0, cursor - 50))}
              >
                {t("Previous")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={resource.data.nextCursor == null}
                onClick={() => setCursor(resource.data?.nextCursor ?? 0)}
              >
                {t("Next")}
              </Button>
            </div>
          </div>
        </section>
      )}

      <Dialog
        open={!!inquiry}
        onOpenChange={(isOpen) => !isOpen && setSelected(null)}
      >
        {inquiry && (
          <DialogContent aria-describedby={undefined} className="max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 pe-8">
              <DialogTitle className="text-xl font-semibold">
                {inquiry.name}
              </DialogTitle>
              <select
                className="field w-auto"
                aria-label={t("Inquiry status")}
                disabled={busy}
                value={inquiry.status}
                onChange={(e) => void update({ status: e.target.value })}
              >
                {["new", "contacted", "qualified", "closed"].map((s) => (
                  <option key={s} value={s}>
                    {t(inquiryStatus(s))}
                  </option>
                ))}
              </select>
            </div>
            <p className="hint mt-2">
              {t("Vehicle: {id}", { id: inquiry.vehicleId })}
            </p>
            {inquiry.phone && (
              <div className="mt-5">
                <Button asChild variant="outline">
                  <a href={`tel:${inquiry.phone.replace(/[^+\d]/g, "")}`}>
                    <Phone size={16} />
                    {t("Call buyer")}
                  </a>
                </Button>
              </div>
            )}
            <InquiryEmail
              key={inquiry._id}
              inquiry={inquiry}
              reload={resource.reload}
              defaultOpen={emailing}
            />
            <p className="text-sm leading-relaxed bg-muted rounded-lg p-5 whitespace-pre-wrap">
              {inquiry.message}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              {t("Buyer consent recorded · {when} UTC", {
                when: inquiry.createdAt.slice(0, 16).replace("T", " "),
              })}
            </p>
            <label className="label mt-7" htmlFor="inquiry-notes">
              {t("Team notes")}
            </label>
            <textarea
              id="inquiry-notes"
              className="field h-32"
              placeholder={t("Add follow-up details…")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              className="mt-4"
              disabled={busy}
              pending={savingNotes}
              onClick={() => void update({ notes }, true)}
            >
              {t("Save notes")}
            </Button>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
