import { useState } from "react";
import { toast } from "sonner";
import { Phone, MessageSquare, Download } from "lucide-react";
import { api, download } from "./api";
import type { Inquiry } from "../shared/schemas";
import { csvCell } from "../shared/utils";
import { useResource } from "./hooks";
import { Button, cn } from "./components/ui/button";
import { Badge, LoadState, Empty } from "./components/common";
import { InquiryEmail } from "./inquiry-email";
import { statusLabel } from "../shared/i18n";
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
  const { t } = useI18n();
  const [status, setStatus] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
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
      <LoadState {...resource} retry={() => void resource.reload()} />
      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        <section className="surface overflow-hidden">
          {resource.data?.items.length === 0 && (
            <Empty
              title="No inquiries yet"
              description="Buyer inquiries will arrive here when your inventory is live."
            />
          )}
          {resource.data?.items.map((i) => (
            <button
              key={i._id}
              className={cn(
                "w-full text-start p-5 border-b hover:bg-muted",
                selected === i._id && "bg-green-50",
              )}
              onClick={() => {
                setSelected(i._id);
                setNotes(i.notes);
              }}
            >
              <div className="flex justify-between">
                <p className="font-semibold text-sm">{i.name}</p>
                <Badge status={i.status}>{t(inquiryStatus(i.status))}</Badge>
              </div>
              <p className="hint text-xs mt-2 line-clamp-2">{i.message}</p>
              <p className="text-xs text-muted-foreground mt-3">
                {i.createdAt.slice(0, 10)} · {t(inquiryKind[i.kind] ?? i.kind)}
              </p>
            </button>
          ))}
          <div className="p-3 flex justify-between">
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
              disabled={resource.data?.nextCursor == null}
              onClick={() => setCursor(resource.data?.nextCursor ?? 0)}
            >
              {t("Next")}
            </Button>
          </div>
        </section>
        <section className="surface p-6">
          {inquiry ? (
            <>
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h3 className="text-xl font-semibold">{inquiry.name}</h3>
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
              <div className="flex flex-wrap gap-3 my-5">
                {inquiry.phone && (
                  <Button asChild variant="outline">
                    <a href={`tel:${inquiry.phone.replace(/[^+\d]/g, "")}`}>
                      <Phone size={16} />
                      {t("Call buyer")}
                    </a>
                  </Button>
                )}
              </div>
              <InquiryEmail
                key={inquiry._id}
                inquiry={inquiry}
                reload={resource.reload}
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
            </>
          ) : (
            <div className="flex items-center justify-center min-h-72 flex-col gap-3">
              <MessageSquare className="text-muted-foreground" size={32} />
              <p className="hint">
                {t("Select an inquiry to view the conversation.")}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
