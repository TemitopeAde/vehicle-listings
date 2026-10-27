import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Car,
  CircleAlert,
  CircleCheck,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Lock,
  Mail,
  Phone,
  Receipt,
  Search,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
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
import { countryCodes, countryName } from "../shared/countries";
import { localeFor } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
import { useResource } from "./hooks";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  RowActions,
} from "./components/ui/dropdown-menu";
import { Button, cn } from "./components/ui/button";
import { LoadState, Empty } from "./components/common";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./components/ui/dialog";
import { EmailComposer } from "./inquiry-email";

type QuoteStatus = QuoteRequest["status"];

const emailStatusText: Record<QuoteRequest["ownerEmailStatus"], string> = {
  pending: "Not yet queued",
  queued: "Queued with Wix",
  failed: "Could not be queued",
  "no-recipient": "No site email to send to",
};

const statusTone: Record<QuoteStatus, { pill: string; dot: string }> = {
  new: { pill: "bg-sky-50 text-sky-800", dot: "bg-sky-500" },
  "in-progress": { pill: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  quoted: { pill: "bg-violet-50 text-violet-800", dot: "bg-violet-500" },
};

function StatusPill({ status }: { status: QuoteStatus }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        statusTone[status].pill,
      )}
    >
      <span className={cn("size-1.5 rounded-full", statusTone[status].dot)} />
      {t(quoteStatusLabels[status])}
    </span>
  );
}

function Initials({ quote, large }: { quote: QuoteRequest; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary/10 font-semibold uppercase text-primary",
        large ? "size-12 text-base" : "size-9 text-xs",
      )}
    >
      {quote.firstName.charAt(0) + quote.lastName.charAt(0) || "?"}
    </span>
  );
}

function Facts({
  icon,
  title,
  rows,
}: {
  icon: ReactNode;
  title: string;
  rows: [string, ReactNode][];
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {t(title)}
      </h4>
      <dl className="mt-3 space-y-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{t(label)}</dt>
            <dd className="mt-0.5 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FollowUpItem({
  label,
  state,
  detail,
}: {
  label: string;
  state: "done" | "waiting" | "problem";
  detail: string;
}) {
  const { t } = useI18n();
  const Icon =
    state === "done" ? CircleCheck : state === "problem" ? CircleAlert : Clock;
  return (
    <li className="flex items-start gap-2.5">
      <Icon
        size={16}
        className={cn(
          "mt-0.5 shrink-0",
          state === "done"
            ? "text-green-700"
            : state === "problem"
              ? "text-red-700"
              : "text-muted-foreground",
        )}
      />
      <div>
        <p className="text-sm font-medium">{t(label)}</p>
        <p className="text-xs text-muted-foreground">{t(detail)}</p>
      </div>
    </li>
  );
}

const emailState = (status: QuoteRequest["ownerEmailStatus"]) =>
  status === "queued" ? "done" : status === "pending" ? "waiting" : "problem";

export function QuoteRequests() {
  const { t, money, number, language } = useI18n();
  const [status, setStatus] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [cursor, setCursor] = useState(0),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [savingQuote, setSavingQuote] = useState(false),
    [retrying, setRetrying] = useState(false),
    [invoicing, setInvoicing] = useState(false),
    [notes, setNotes] = useState(""),
    [quotedPrice, setQuotedPrice] = useState(""),
    [composing, setComposing] = useState(false),
    [deleting, setDeleting] = useState<QuoteRequest | null>(null),
    [removing, setRemoving] = useState(false);
  const resource = useResource<{
    items: QuoteRequest[];
    total: number;
    nextCursor: number | null;
    invoicesUrl: string;
    invoicesEnabled: boolean;
    counts: Record<QuoteStatus, number> | null;
  }>(`quote-requests?status=${status}&cursor=${cursor}`);
  const quote = resource.data?.items.find((q) => q._id === selected);
  const counts = resource.data?.counts;
  const invoicesEnabled = resource.data?.invoicesEnabled ?? false;
  const term = search.trim().toLowerCase();
  const visible = (resource.data?.items ?? []).filter(
    (q) =>
      !term ||
      [quoteRequesterName(q), q.email, q.company, q.vehicleTitle, q.stockId]
        .join(" ")
        .toLowerCase()
        .includes(term),
  );
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(localeFor(language), {
      dateStyle: "medium",
    });
  const price = (value: number, currency: string) =>
    currency ? money(value, currency) : number(value);
  function select(q: QuoteRequest) {
    setSelected(q._id);
    setNotes(q.notes);
    // Start the offer at the listed price; it's only stored once the dealer saves it.
    const offer = q.quotedPrice ?? (q.listedPrice > 0 ? q.listedPrice : null);
    setQuotedPrice(offer == null ? "" : String(offer));
    setComposing(false);
  }
  function filter(s: string) {
    setStatus(s);
    setCursor(0);
    setSelected(null);
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
  async function remove() {
    if (!deleting) return;
    setRemoving(true);
    try {
      await api("quote-requests", { id: deleting._id }, "DELETE");
      toast.success(t("Quote request deleted"));
      if (selected === deleting._id) setSelected(null);
      setDeleting(null);
      await resource.reload();
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setRemoving(false);
    }
  }
  async function createInvoice() {
    if (!quote) return;
    setBusy(true);
    setInvoicing(true);
    try {
      await api("quote-request-invoices", { id: quote._id }, "POST");
      toast.success(t("Draft invoice created"));
      await resource.reload();
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
      setInvoicing(false);
    }
  }

  const offer = quotedPrice.trim() === "" ? NaN : Number(quotedPrice);
  const offerChange =
    quote && quote.listedPrice > 0 && Number.isFinite(offer) && offer >= 0
      ? (offer - quote.listedPrice) / quote.listedPrice
      : null;
  const needsFollowUp =
    quote &&
    (quote.ownerEmailStatus === "failed" ||
      quote.ownerEmailStatus === "pending" ||
      quote.confirmationEmailStatus === "failed" ||
      quote.confirmationEmailStatus === "pending" ||
      !quote.contactId);

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

      <div
        role="group"
        aria-label={t("Filter by stage")}
        className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2"
      >
        {(["", ...quoteStatuses] as const).map((s) => {
          const count = !counts
            ? null
            : s
              ? counts[s]
              : quoteStatuses.reduce((sum, k) => sum + counts[k], 0);
          return (
            <button
              key={s}
              aria-pressed={s === status}
              onClick={() => filter(s)}
              className={cn(
                "surface px-4 py-3 text-start transition-colors hover:bg-muted",
                s === status &&
                  "border-primary ring-1 ring-primary bg-primary/5 hover:bg-primary/5",
              )}
            >
              <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {s && (
                  <span
                    className={cn("size-2 rounded-full", statusTone[s].dot)}
                  />
                )}
                {s ? t(quoteStatusLabels[s]) : t("All requests")}
              </span>
              <span className="mt-1 block text-2xl font-semibold tabular-nums">
                {count == null ? "–" : number(count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Refreshes keep the current list on screen; the skeleton is only for the first load. */}
      <LoadState
        loading={resource.loading && !resource.data}
        error={resource.error}
        retry={() => void resource.reload()}
      />

      {resource.data && (
        <section className="surface overflow-hidden">
          <div className="p-3 border-b">
            <label className="relative block">
              <span className="sr-only">{t("Search requests")}</span>
              <Search
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                className="field ps-9"
                placeholder={t("Search name, email or vehicle")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          {resource.data?.items.length === 0 && (
            <Empty
              title="No quote requests yet"
              description="Requests from the Request a quote form on your vehicle pages arrive here."
            />
          )}
          {!!resource.data?.items.length && visible.length === 0 && (
            <p className="hint p-8 text-center">
              {t("No requests on this page match your search.")}
            </p>
          )}
          {visible.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Requester",
                      "Vehicle",
                      "Status",
                      "Price",
                      "Received",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className={cn(
                          "p-4 text-start font-medium",
                          heading === "Actions" && "text-end",
                        )}
                      >
                        {t(heading)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((q) => (
                    <tr key={q._id} className="border-t hover:bg-muted/40">
                      <td className="p-4">
                        <button
                          className="flex items-center gap-3 text-start"
                          onClick={() => select(q)}
                        >
                          <Initials quote={q} />
                          <span className="min-w-0">
                            <span className="block whitespace-nowrap font-semibold">
                              {quoteRequesterName(q)}
                            </span>
                            <span className="block max-w-56 truncate text-xs text-muted-foreground">
                              {q.company || q.email}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="p-4">
                        <span className="block max-w-64 truncate">
                          {q.vehicleTitle}
                        </span>
                        {q.quantity > 1 && (
                          <span className="text-xs text-muted-foreground">
                            {t("Quantity")}: {number(q.quantity)}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <StatusPill status={q.status} />
                      </td>
                      <td className="whitespace-nowrap p-4 tabular-nums">
                        <span
                          className={cn(
                            q.quotedPrice == null
                              ? "text-muted-foreground"
                              : "font-semibold",
                          )}
                        >
                          {price(q.quotedPrice ?? q.listedPrice, q.currency)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {q.quotedPrice == null
                            ? t("Listed price")
                            : t("Quoted price")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-4 text-muted-foreground">
                        <time dateTime={q.createdAt}>{date(q.createdAt)}</time>
                      </td>
                      <td className="p-4 text-end">
                        <RowActions
                          label={t("Actions for {name}", {
                            name: quoteRequesterName(q),
                          })}
                        >
                          <DropdownMenuItem onSelect={() => select(q)}>
                            <Eye size={15} />
                            {t("View")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              select(q);
                              setComposing(true);
                            }}
                          >
                            <Mail size={15} />
                            {t("Email requester")}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`tel:${q.phone.replace(/[^+\d]/g, "")}`}>
                              <Phone size={15} />
                              {t("Call")}
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            destructive
                            onSelect={() => setDeleting(q)}
                          >
                            <Trash2 size={15} />
                            {t("Delete")}
                          </DropdownMenuItem>
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
              {t("{total} requests", {
                total: number(resource.data?.total ?? 0),
              })}
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
                disabled={resource.data?.nextCursor == null}
                onClick={() => setCursor(resource.data?.nextCursor ?? 0)}
              >
                {t("Next")}
              </Button>
            </div>
          </div>
        </section>
      )}

      <Dialog
        open={!!quote}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {quote && (
          <DialogContent aria-describedby={undefined} className="max-w-4xl p-0">
            <>
              <header className="border-b p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pe-8">
                  <div className="flex min-w-0 items-center gap-3">
                    <Initials quote={quote} large />
                    <div className="min-w-0">
                      <DialogTitle className="truncate text-xl font-semibold">
                        {quoteRequesterName(quote)}
                      </DialogTitle>
                      <p className="hint">
                        {[
                          quote.company,
                          t("Received {date}", { date: date(quote.createdAt) }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={composing ? "default" : "outline"}
                      onClick={() => setComposing(!composing)}
                      aria-expanded={composing}
                    >
                      <Mail size={16} />
                      {composing
                        ? t("Close email composer")
                        : t("Email requester")}
                    </Button>
                    <Button asChild variant="outline">
                      <a href={`tel:${quote.phone.replace(/[^+\d]/g, "")}`}>
                        <Phone size={16} />
                        {t("Call")}
                      </a>
                    </Button>
                  </div>
                </div>
              </header>

              <div className="space-y-6 p-6">
                {composing && (
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
                    onSent={() => void resource.reload()}
                  />
                )}

                {quote.message && (
                  <figure>
                    <blockquote className="whitespace-pre-wrap rounded-xl border-s-4 border-primary/40 bg-muted p-5 text-sm leading-relaxed">
                      {quote.message}
                    </blockquote>
                    <figcaption className="mt-2 text-xs text-muted-foreground">
                      {t("Buyer consent recorded · {when} UTC", {
                        when: quote.createdAt.slice(0, 16).replace("T", " "),
                      })}
                    </figcaption>
                  </figure>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <Facts
                    icon={<Car size={16} className="text-primary" />}
                    title="Vehicle"
                    rows={[
                      ["Vehicle", quote.vehicleTitle],
                      ...(quote.stockId
                        ? [["Stock ID", quote.stockId] as [string, ReactNode]]
                        : []),
                      ["Quantity", number(quote.quantity)],
                      [
                        "Listed price",
                        price(quote.listedPrice, quote.currency),
                      ],
                    ]}
                  />
                  <Facts
                    icon={<UserRound size={16} className="text-primary" />}
                    title="Buyer"
                    rows={[
                      [
                        "Email",
                        <a
                          className="text-primary underline-offset-2 hover:underline"
                          href={`mailto:${quote.email}`}
                        >
                          {quote.email}
                        </a>,
                      ],
                      [
                        "Phone",
                        <a
                          className="text-primary underline-offset-2 hover:underline"
                          href={`tel:${quote.phone.replace(/[^+\d]/g, "")}`}
                        >
                          {quote.phone}
                        </a>,
                      ],
                      [
                        "Billing address",
                        [
                          quote.addressLine,
                          quote.city,
                          quote.subdivision,
                          quote.postalCode,
                          countryCodes.has(quote.country)
                            ? countryName(quote.country, localeFor(language))
                            : quote.country,
                        ]
                          .filter(Boolean)
                          .join(", ") || t("Not provided"),
                      ],
                    ]}
                  />
                  <Facts
                    icon={<Wallet size={16} className="text-primary" />}
                    title="Purchase plans"
                    rows={[
                      ["Payment", t(quotePaymentLabels[quote.paymentMethod])],
                      ["Timeline", t(quoteTimelineLabels[quote.timeline])],
                      [
                        "Trade-in",
                        quote.tradeIn ? quote.tradeInDetails : t("No"),
                      ],
                    ]}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                  <div className="rounded-xl border bg-muted/50 p-5">
                    <h4 className="text-sm font-semibold">{t("Your offer")}</h4>
                    <label className="label mt-4" htmlFor="quote-price">
                      {quote.currency
                        ? t("Quoted price ({currency})", {
                            currency: quote.currency,
                          })
                        : t("Quoted price")}
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        id="quote-price"
                        className="field max-w-xs tabular-nums"
                        inputMode="decimal"
                        placeholder={t("Price you offered")}
                        value={quotedPrice}
                        onChange={(e) => setQuotedPrice(e.target.value)}
                      />
                      {offerChange != null && (
                        <span
                          className={cn(
                            "text-xs font-medium",
                            offerChange < 0
                              ? "text-amber-800"
                              : "text-muted-foreground",
                          )}
                        >
                          {t("{percent} vs listed price", {
                            percent: number(offerChange, {
                              style: "percent",
                              maximumFractionDigits: 1,
                              signDisplay: "exceptZero",
                            }),
                          })}
                        </span>
                      )}
                    </div>
                    <label className="label mt-5" htmlFor="quote-notes">
                      {t("Team notes")}
                    </label>
                    <textarea
                      id="quote-notes"
                      className="field h-28 bg-white"
                      placeholder={t("Add follow-up details…")}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                      <Button
                        disabled={busy}
                        pending={savingQuote}
                        onClick={() => void saveQuote()}
                      >
                        {t("Save quote details")}
                      </Button>
                      {quote.invoiceId ? (
                        <Button asChild variant="outline">
                          <a
                            href={resource.data?.invoicesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={16} />
                            {t("Open in Wix Invoices")}
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          disabled={busy || !invoicesEnabled}
                          pending={invoicing}
                          aria-describedby="quote-invoice-note"
                          onClick={() => void createInvoice()}
                        >
                          {invoicesEnabled ? (
                            <Receipt size={16} />
                          ) : (
                            <Lock size={16} />
                          )}
                          {t("Create draft invoice")}
                        </Button>
                      )}
                    </div>
                    <p id="quote-invoice-note" className="hint mt-2">
                      {quote.invoiceId ? (
                        t(
                          "A draft invoice was created. Review and send it from Wix Invoices.",
                        )
                      ) : invoicesEnabled ? (
                        t(
                          "Invoices use the quoted price, or the listed price if no quote is saved.",
                        )
                      ) : (
                        <>
                          {t(
                            "Draft invoices are available on the Business plan.",
                          )}{" "}
                          <a
                            href="#Billing"
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            {t("Upgrade to Business")}
                          </a>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-5">
                    <h4 className="text-sm font-semibold">{t("Follow-up")}</h4>
                    <ul className="mt-4 space-y-3">
                      <FollowUpItem
                        label="Owner notification"
                        state={emailState(quote.ownerEmailStatus)}
                        detail={emailStatusText[quote.ownerEmailStatus]}
                      />
                      <FollowUpItem
                        label="Buyer confirmation"
                        state={emailState(quote.confirmationEmailStatus)}
                        detail={emailStatusText[quote.confirmationEmailStatus]}
                      />
                      <FollowUpItem
                        label="Wix contact"
                        state={quote.contactId ? "done" : "waiting"}
                        detail={quote.contactId ? "added" : "not added yet"}
                      />
                    </ul>
                    {needsFollowUp && (
                      <Button
                        className="mt-4 w-full"
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
                </div>
              </div>
            </>
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && !removing && setDeleting(null)}
      >
        <DialogContent>
          <DialogTitle className="section-heading">
            {t("Delete the quote request from {name}?", {
              name: deleting ? quoteRequesterName(deleting) : "",
            })}
          </DialogTitle>
          <DialogDescription className="hint mt-2 mb-6">
            {t(
              "This permanently removes the request, its quoted price and team notes. Any Wix contact or draft invoice created from it stays in Wix.",
            )}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={removing}
              onClick={() => setDeleting(null)}
            >
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              pending={removing}
              onClick={() => void remove()}
            >
              <Trash2 size={16} />
              {t("Delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
