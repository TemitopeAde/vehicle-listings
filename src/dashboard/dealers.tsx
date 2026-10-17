import { useState } from "react";
import { toast } from "sonner";
import { Plus, MapPin, Mail, Phone, Building2, Link2 } from "lucide-react";
import type { Dealer } from "../shared/schemas";
import { dealerInput } from "../shared/schemas";
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
export function Dealers() {
  const [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Dealer | null>(null),
    [open, setOpen] = useState(false),
    [confirming, setConfirming] = useState(false),
    [busy, setBusy] = useState(false);
  const resource = useResource<{ items: Dealer[]; total: number }>(
    `dealers?search=${encodeURIComponent(search)}`,
  );
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const result = dealerInput.safeParse(data);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Check dealer details");
      return;
    }
    setBusy(true);
    try {
      await api("dealers", { id: editing?._id, payload: result.data });
      toast.success("Dealership saved");
      setOpen(false);
      await resource.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!editing) return;
    setBusy(true);
    try {
      await api("dealers", { action: "delete", id: editing._id });
      toast.success("Application deleted");
      setOpen(false);
      setConfirming(false);
      await resource.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="section-heading">Your dealer network</h2>
          <p className="hint mt-1">
            Manage sellers and route buyers to the right team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard
                .writeText(`${window.location.origin}/dealers/apply`)
                .then(
                  () => toast.success("Application page link copied"),
                  () => toast.error("Could not copy the application link"),
                );
            }}
          >
            <Link2 size={16} />
            Copy application link
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setConfirming(false);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Add dealership
          </Button>
        </div>
      </div>
      <p className="hint">
        Add the Dealer application and Add a vehicle widgets, or the matching Editor components, to your site.
        Dealers log in and apply in the first widget. After you approve them,
        they log in on Add a vehicle with the same account.
      </p>
      <input
        className="field max-w-sm"
        aria-label="Search dealerships"
        placeholder="Search dealerships…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <LoadState {...resource} retry={() => void resource.reload()} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {resource.data?.items.map((d) => (
          <article key={d._id} className="surface p-6 text-left">
            <button
              type="button"
              onClick={() => {
                setEditing(d);
                setConfirming(false);
                setOpen(true);
              }}
              className="w-full text-left"
            >
            <div className="flex justify-between">
              <span className="p-3 rounded-lg bg-muted text-primary">
                <Building2 size={22} />
              </span>
              <Badge status={d.approvalState}>
                {d.demo ? "Demo" : d.approvalState}
              </Badge>
            </div>
            <h3 className="font-semibold mt-4">{d.businessName}</h3>
            <p className="hint flex gap-2 mt-3">
              <MapPin size={15} />
              {d.location || "No location added"}
            </p>
            <p className="hint flex gap-2 mt-2">
              <Mail size={15} />
              {d.email || "No email added"}
            </p>
            <p className="hint flex gap-2 mt-2">
              <Phone size={15} />
              {d.phone || "No phone added"}
            </p>
            </button>
          </article>
        ))}
      </div>
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
              ? "Delete application"
              : editing
                ? "Edit dealership"
                : "Add dealership"}
          </DialogTitle>
          <DialogDescription className="hint mt-1 mb-5">
            {confirming
              ? `${editing?.businessName ?? "This dealership"} is removed. The same account can apply again. Listings that are for sale are archived.`
              : "These contact details appear beside public listings."}
          </DialogDescription>
          {confirming ? (
            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                pending={busy}
                onClick={() => void remove()}
              >
                Delete application
              </Button>
            </div>
          ) : (
          <>
          <form onSubmit={save} className="space-y-4">
            {(
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
                  {k === "businessName"
                    ? "Business name"
                    : k === "whatsapp"
                      ? "WhatsApp (international number)"
                      : k}
                </label>
                <input
                  id={`d-${k}`}
                  name={k}
                  className="field"
                  type={k === "email" ? "email" : "text"}
                  defaultValue={editing?.[k] ?? ""}
                  required={k === "businessName"}
                />
              </div>
            ))}
            <div>
              <label className="label" htmlFor="d-description">
                Description
              </label>
              <textarea
                id="d-description"
                name="description"
                className="field h-20"
                defaultValue={editing?.description ?? ""}
              />
            </div>
            <label className="label" htmlFor="d-approval">
              Approval state
            </label>
            <select
              id="d-approval"
              name="approvalState"
              className="field"
              defaultValue={editing?.approvalState ?? "pending"}
            >
              {["pending", "approved", "suspended", "rejected"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <div className="flex justify-between gap-2 pt-3">
              {editing && !editing.demo ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                >
                  Delete application
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
                  Cancel
                </Button>
                <Button disabled={busy} pending={busy}>
                  Save dealership
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
