import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Mail, Phone } from "lucide-react";
import { api, download } from "./api";
import {
  quotePaymentLabels,
  quoteRequesterName,
  quoteStatusLabels,
  quoteStatuses,
  quoteTimelineLabels,
  type QuoteRequest,
} from "../shared/quote-requests";
import { csvCell } from "../shared/utils";
import { useI18n } from "../shared/i18n-react";
import { useResource } from "./hooks";
import { Button, cn } from "./components/ui/button";
import { Badge, LoadState, Empty } from "./components/common";
import { EmailComposer } from "./inquiry-email";

const emailStatusText: Record<QuoteRequest["ownerEmailStatus"], string> = {
  pending: "Not yet queued",
  queued: "Queued with Wix",
  failed: "Could not be queued",
  "no-recipient": "No site email to send to",
};

export function QuoteRequests() {
  const { t, money } = useI18n();
  const [status, setStatus] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [cursor, setCursor] = useState(0),
    [busy, setBusy] = useState(false),
    [savingQuote, setSavingQuote] = useState(false),
    [retrying, setRetrying] = useState(false),
    [notes, setNotes] = useState(""),
    [quotedPrice, setQuotedPrice] = useState(""),
    [composing, setComposing] = useState(false);
  const resource = useResource<{
    items: QuoteRequest[];
    total: number;
    nextCursor: number | null;
  }>(`quote-requests?status=${status}&cursor=${cursor}`);
  const quote = resource.data?.items.find((q) => q._id === selected);
  function select(q: QuoteRequest) {
    setSelected(q._id);
    setNotes(q.notes);
    setQuotedPrice(q.quotedPrice == null ? "" : String(q.quotedPrice));
    setComposing(false);
  }
  async function update(payload: Record<string, unknown>, message: string) {
    if (!quote) return;
    setBusy(true);
    try {
      await api("quote-requests", { id: quote._id, payload }, "PATCH");
      toast.success(t(message));
      await resource.reload();
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function saveQuote() {
    const price = quotedPrice.trim() === "" ? null : Number(quotedPrice);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      toast.error(t("Enter the quoted price as a positive number."));
      return;
    }
    setSavingQuote(true);
    try {
      await update({ notes, quotedPrice: price }, "Quote details saved");
    } finally {
      setSavingQuote(false);
    }
  }
  async function retryEmails() {
    if (!quote) return;
    setBusy(true);
    setRetrying(true);
    try {
      const r = await api<{
        contactStatus: string;
        ownerEmailStatus: string;
        confirmationEmailStatus: string;
      }>("quote-request-emails", { id: quote._id }, "PATCH");
      if (
        r.ownerEmailStatus === "failed" ||
        r.confirmationEmailStatus === "failed"
      )
        toast.error(
          t(
            "Some emails could not be queued. Check Wix email permissions and sending quota.",
          ),
        );
      else if (r.contactStatus === "failed")
        toast.error(
          t(
            "The requester could not be added to Wix contacts. Check the app's Manage Contacts permission.",
          ),
        );
      else toast.success(t("Follow-up complete"));
      await resource.reload();
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
      setRetrying(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-heading">{t("Turn interest into offers")}</h2>
          <p className="hint mt-1">
            {t("Price each request, email the buyer and track it to a sale.")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            download(
              "quote-requests-current-page.csv",
              [
                [
                  "Date",
                  "Name",
                  "Email",
                  "Phone",
                  "Company",
                  "Vehicle",
                  "Quantity",
                  "Payment",
                  "Timeline",
                  "Trade-in",
                  "Status",
                  "Quoted price",
                ]
                  .map((heading) => csvCell(t(heading)))
                  .join(","),
                ...(resource.data?.items ?? []).map((q) =>
                  [
                    q.createdAt.slice(0, 10),
                    quoteRequesterName(q),
                    q.email,
                    q.phone,
                    q.company,
                    q.vehicleTitle,
                    String(q.quantity),
                    t(quotePaymentLabels[q.paymentMethod]),
                    t(quoteTimelineLabels[q.timeline]),
                    q.tradeIn ? q.tradeInDetails : t("No"),
                    t(quoteStatusLabels[q.status]),
                    q.quotedPrice == null ? "" : String(q.quotedPrice),
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
        {["", ...quoteStatuses].map((s) => (
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
            {s
              ? t(quoteStatusLabels[s as QuoteRequest["status"]])
              : t("All requests")}
          </Button>
        ))}
      </div>
      <LoadState {...resource} retry={() => void resource.reload()} />
      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        <section className="surface overflow-hidden">
          {resource.data?.items.length === 0 && (
            <Empty
              title="No quote requests yet"
              description="Requests from the Request a quote form on your vehicle pages arrive here."
            />
          )}
          {resource.data?.items.map((q) => (
            <button
              key={q._id}
              className={cn(
                "w-full text-start p-5 border-b hover:bg-muted",
                selected === q._id && "bg-green-50",
              )}
              onClick={() => select(q)}
            >
              <div className="flex justify-between gap-2">
                <p className="font-semibold text-sm">{quoteRequesterName(q)}</p>
                <Badge status={q.status}>
                  {t(quoteStatusLabels[q.status])}
                </Badge>
              </div>
              <p className="hint text-xs mt-2 line-clamp-1">
                {q.vehicleTitle}
                {q.quantity > 1
                  ? t(" × {count}", { count: q.quantity })
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                {q.createdAt.slice(0, 10)} ·{" "}
                {t(quotePaymentLabels[q.paymentMethod])} ·{" "}
                {t(quoteTimelineLabels[q.timeline])}
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
          {quote ? (
            <>
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="text-xl font-semibold">
                    {quoteRequesterName(quote)}
                  </h3>
                  {quote.company && <p className="hint">{quote.company}</p>}
                </div>
                <select
                  className="field w-auto"
                  aria-label={t("Quote request status")}
                  disabled={busy}
                  value={quote.status}
                  onChange={(e) =>
                    void update({ status: e.target.value }, "Status updated")
                  }
                >
                  {quoteStatuses.map((s) => (
                    <option key={s} value={s}>
                      {t(quoteStatusLabels[s])}
                    </option>
                  ))}
                </select>
              </div>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 my-5 text-sm">
                {(
                  [
                    [
                      "Vehicle",
                      quote.vehicleTitle,
                    ],
                    [
                      "Listed price",
                      quote.currency
                        ? money(quote.listedPrice, quote.currency)
                        : String(quote.listedPrice),
                    ],
                    ["Quantity", String(quote.quantity)],
                    ["Payment", t(quotePaymentLabels[quote.paymentMethod])],
                    ["Timeline", t(quoteTimelineLabels[quote.timeline])],
                    [
                      "Trade-in",
                      quote.tradeIn ? quote.tradeInDetails : t("No"),
                    ],
                    ["Email", quote.email],
                    ["Phone", quote.phone],
                    [
                      "Billing address",
                      [
                        quote.addressLine,
                        quote.city,
                        quote.subdivision,
                        quote.postalCode,
                        quote.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || t("Not provided"),
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{t(label)}</dt>
                    <dd className="mt-0.5 break-words">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => setComposing(!composing)}
                  aria-expanded={composing}
                >
                  <Mail size={16} />
                  {composing ? t("Close email composer") : t("Email requester")}
                </Button>
                <Button asChild variant="outline">
                  <a href={`tel:${quote.phone.replace(/[^+\d]/g, "")}`}>
                    <Phone size={16} />
                    {t("Call requester")}
                  </a>
                </Button>
              </div>
              {composing && (
                <div className="my-5">
                  <EmailComposer
                    key={quote._id}
                    endpoint="quote-request-emails"
                    recipient={{
                      id: quote._id,
                      name: quoteRequesterName(quote),
                      email: quote.email,
                    }}
                    defaultSubject={t("Your quote for {title}", {
                      title: quote.vehicleTitle,
                    }).slice(0, 150)}
                  />
                </div>
              )}
              <div className="flex items-center flex-wrap gap-3 my-5">
                <span className="hint">
                  {t(
                    "Owner notification: {owner} · Buyer confirmation: {buyer} · Wix contact: {contact}",
                    {
                      owner: t(emailStatusText[quote.ownerEmailStatus]),
                      buyer: t(emailStatusText[quote.confirmationEmailStatus]),
                      contact: quote.contactId
                        ? t("added")
                        : t("not added yet"),
                    },
                  )}
                </span>
                {(quote.ownerEmailStatus === "failed" ||
                  quote.ownerEmailStatus === "pending" ||
                  quote.confirmationEmailStatus === "failed" ||
                  quote.confirmationEmailStatus === "pending" ||
                  !quote.contactId) && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    pending={retrying}
                    onClick={() => void retryEmails()}
                  >
                    {t("Retry follow-up")}
                  </Button>
                )}
              </div>
              {quote.message && (
                <p className="text-sm leading-relaxed bg-muted rounded-lg p-5 whitespace-pre-wrap">
                  {quote.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                {t("Buyer consent recorded · {when} UTC", {
                  when: quote.createdAt.slice(0, 16).replace("T", " "),
                })}
              </p>
              <label className="label mt-7" htmlFor="quote-price">
                {quote.currency
                  ? t("Quoted price ({currency})", {
                      currency: quote.currency,
                    })
                  : t("Quoted price")}
              </label>
              <input
                id="quote-price"
                className="field max-w-xs"
                inputMode="decimal"
                placeholder={t("Price you offered")}
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
              />
              <label className="label mt-5" htmlFor="quote-notes">
                {t("Team notes")}
              </label>
              <textarea
                id="quote-notes"
                className="field h-32"
                placeholder={t("Add follow-up details…")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button
                className="mt-4"
                disabled={busy}
                pending={savingQuote}
                onClick={() => void saveQuote()}
              >
                {t("Save quote details")}
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center min-h-72 flex-col gap-3">
              <FileText className="text-muted-foreground" size={32} />
              <p className="hint">
                {t("Select a quote request to see its details.")}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
