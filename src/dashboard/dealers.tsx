import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { Dealer } from "../shared/schemas";
import { applicationPhone, dealerInput } from "../shared/schemas";
import { phoneCodes } from "../shared/phone-codes";
import { api } from "./api";
import { useResource } from "./hooks";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import { Badge, Empty, LoadState } from "./components/common";
import { statusLabel } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
export function Dealers() {
  const { t } = useI18n();
  const [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Dealer | null>(null),
    [open, setOpen] = useState(false),
    [confirming, setConfirming] = useState(false),
    [busy, setBusy] = useState(false),
    [approval, setApproval] = useState("");
  const resource = useResource<{ items: Dealer[]; total: number }>(
    `dealers?search=${encodeURIComponent(search)}`,
  );
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (!data.approvalState) {
      toast.error(t("Select state."));
      return;
    }
    if (typeof data.phoneNumber === "string") {
      data.phone = applicationPhone(String(data.phoneCode ?? ""), data.phoneNumber);
      delete data.phoneCode;
      delete data.phoneNumber;
    }
    const result = dealerInput.safeParse(data);
    if (!result.success) {
      toast.error(
        t(result.error.issues[0]?.message ?? "Check dealer details"),
      );
      return;
    }
    setBusy(true);
    try {
      await api("dealers", { id: editing?._id, payload: result.data });
      toast.success(
        result.data.approvalState === "approved"
          ? t("Dealer approved")
          : t("Dealership saved"),
      );
      setOpen(false);
      await resource.reload();
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  function openDealer(dealer: Dealer | null) {
    setEditing(dealer);
    setApproval(dealer ? dealer.approvalState : "");
    setConfirming(false);
    setOpen(true);
  }
  function confirmRemove(dealer: Dealer) {
    setEditing(dealer);
    setConfirming(true);
    setOpen(true);
  }
  async function remove() {
    if (!editing) return;
    setBusy(true);
    try {
      await api("dealers", { action: "delete", id: editing._id });
      toast.success(t("Application deleted"));
      setOpen(false);
      setConfirming(false);
      await resource.reload();
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="section-heading">{t("Your dealer network")}</h2>
          <p className="hint mt-1">
            {t("Manage sellers and route buyers to the right team.")}
          </p>
        </div>
        <Button onClick={() => openDealer(null)}>
          <Plus size={16} />
            {t("Add dealership")}
          </Button>
      </div>
      <p className="hint">
        {t(
          "Add the Dealer application and Add a vehicle widgets, or the matching Editor components, to your site. Dealers log in and apply in the first widget. After you approve them, they log in on Add a vehicle with the same account.",
        )}
      </p>
      <input
        className="field max-w-sm"
        aria-label={t("Search dealerships")}
        placeholder={t("Search dealerships…")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <LoadState {...resource} retry={() => void resource.reload()} />
      {resource.data && resource.data.items.length > 0 && (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                {["Dealership", "Email", "Phone", "Location", "Status", "Actions"].map(
                  (heading) => (
                    <th key={heading} className="p-4 text-left font-medium">
                      {t(heading)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {resource.data.items.map((dealer) => (
                <tr key={dealer._id} className="border-t hover:bg-muted/40">
                  <td className="p-4 font-semibold whitespace-nowrap">
                    {dealer.businessName}
                  </td>
                  <td className="p-4">{dealer.email || t("—")}</td>
                  <td className="p-4 whitespace-nowrap">
                    {dealer.phone || t("—")}
                  </td>
                  <td className="p-4">{dealer.location || t("—")}</td>
                  <td className="p-4">
                    <Badge status={dealer.approvalState}>
                      {t(
                        statusLabel[dealer.approvalState] ??
                          dealer.approvalState,
                      )}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openDealer(dealer)}
                      >
                        {t("Edit")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => confirmRemove(dealer)}
                      >
                        {t("Delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {resource.data?.items.length === 0 && (
        <Empty
          title="No dealerships yet"
          description="Add your dealership, complete its contact details and approve it before publishing vehicles."
        />
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirming(false);
        }}
      >
        <DialogContent>
          <DialogTitle className="section-heading">
            {confirming
              ? t("Delete application")
              : editing
                ? t("Edit dealership")
                : t("Add dealership")}
          </DialogTitle>
          <DialogDescription className="hint mt-1 mb-5">
            {confirming
              ? t(
                  "{name} is removed. The same account can apply again. Listings that are for sale are archived.",
                  {
                    name: editing?.businessName ?? t("This dealership"),
                  },
                )
              : t("These contact details appear beside public listings.")}
          </DialogDescription>
          {confirming ? (
            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                {t("Back")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                pending={busy}
                onClick={() => void remove()}
              >
                {t("Delete application")}
              </Button>
            </div>
          ) : (
          <>
          <form onSubmit={save} className="space-y-4">
            {editing ? (
              (
                [
                  "businessName",
                  "location",
                  "address",
                  "email",
                  "phone",
                  "whatsapp",
                  "website",
                  "hours",
                ] as const
              ).map((k) => (
                <div key={k}>
                  <label className="label capitalize" htmlFor={`d-${k}`}>
                  {t(
                    k === "businessName"
                      ? "Business name"
                      : k === "whatsapp"
                        ? "WhatsApp (international number)"
                        : k,
                  )}
                  </label>
                  <input
                    id={`d-${k}`}
                    name={k}
                    className="field"
                    type={k === "email" ? "email" : "text"}
                    defaultValue={editing[k] ?? ""}
                    required={k === "businessName"}
                  />
                </div>
              ))
            ) : (
              <>
                <div>
                  <label className="label" htmlFor="d-businessName">
                    {t("Business name")}
                  </label>
                  <input
                    id="d-businessName"
                    name="businessName"
                    className="field"
                    type="text"
                    autoComplete="organization"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="d-email">
                    {t("Email")}
                  </label>
                  <input
                    id="d-email"
                    name="email"
                    className="field"
                    type="email"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="d-phoneNumber">
                    {t("Phone")}
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="d-phoneCode"
                      name="phoneCode"
                      className="field w-40 shrink-0"
                      aria-label={t("Country code")}
                      autoComplete="tel-country-code"
                      defaultValue=""
                    >
                      <option value="">{t("Select code")}</option>
                      {phoneCodes.map((code) => (
                        <option key={code.id} value={code.id}>
                          {code.dial} {t(code.name)}
                        </option>
                      ))}
                    </select>
                    <input
                      id="d-phoneNumber"
                      name="phoneNumber"
                      className="field"
                      type="text"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder={t("Phone number")}
                    />
                  </div>
                </div>
                {(
                  [
                    ["location", "Location", "address-level2"],
                    ["address", "Address", "street-address"],
                    ["website", "Website", "url"],
                  ] as const
                ).map(([name, label, autoComplete]) => (
                  <div key={name}>
                    <label className="label" htmlFor={`d-${name}`}>
                      {t(label)}
                    </label>
                    <input
                      id={`d-${name}`}
                      name={name}
                      className="field"
                      type="text"
                      autoComplete={autoComplete}
                      placeholder={name === "website" ? "https://" : undefined}
                    />
                  </div>
                ))}
              </>
            )}
            {editing && (
              <div>
                <label className="label" htmlFor="d-description">
                {t("Description")}
              </label>
                <textarea
                  id="d-description"
                  name="description"
                  className="field h-20"
                  defaultValue={editing.description ?? ""}
                />
              </div>
            )}
            <label className="label" htmlFor="d-approval">
              {t("Approval state")}
            </label>
            <select
              id="d-approval"
              name="approvalState"
              className="field"
              value={approval}
              onChange={(event) => setApproval(event.target.value)}
            >
              <option value="">{t("Select state")}</option>
              {["pending", "approved", "suspended", "rejected"].map((s) => (
                <option key={s} value={s}>
                  {t(statusLabel[s] ?? s)}
                </option>
              ))}
            </select>
            <div className="flex justify-between gap-2 pt-3">
              {editing ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                >
                  {t("Delete application")}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t("Cancel")}
                </Button>
                <Button disabled={busy} pending={busy}>
                  {approval === "approved"
                    ? t("Approve dealer")
                    : t("Save dealership")}
                </Button>
              </div>
            </div>
          </form>
          </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
