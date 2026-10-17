import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { LoaderCircle, Plus } from "lucide-react";
import type { Vehicle } from "../shared/schemas";
import { api } from "../shared/client";
import type { DealerClient } from "./client";
import { VehicleEditor } from "../dashboard/vehicle-editor";
import { dealerMediaUpload } from "./media-upload";
import { Button } from "../dashboard/components/ui/button";
import { Badge } from "../dashboard/components/common";
import { money } from "../shared/utils";
import "../dashboard/styles.css";

type Session = {
  _id: string;
  businessName: string;
  location: string;
  approvalState: "pending" | "approved" | "suspended" | "rejected";
  demo: boolean;
  createdAt?: string;
};

function alreadyApplied(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "You already applied.";
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  return `You already applied on ${formatted}.`;
}

function isLocalDemo() {
  return (
    import.meta.env.DEV &&
    import.meta.env.PUBLIC_CAR_LISTING_DEMO === "1" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  );
}

/** Login email from the current site member. Empty when nobody is logged in. */
async function readLoginEmail() {
  if (isLocalDemo()) return "";
  const { currentMember } = await import("@wix/site-members");
  const member = await currentMember.getMember({ fieldsets: ["FULL"] });
  return member?.loginEmail?.trim() ?? "";
}

export default function SellPage({
  title = "Add a vehicle for sale",
}: {
  title?: string;
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [demo, setDemo] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined);
  const signedIn = demo || Boolean(email);

  useEffect(() => {
    let active = true;
    const local = isLocalDemo();
    setDemo(local);
    if (local) {
      setEmail("");
      return () => {
        active = false;
      };
    }
    readLoginEmail()
      .then((value) => {
        if (active) setEmail(value);
      })
      .catch((reason) => {
        console.error("Could not read the logged-in member", reason);
        if (active)
          setSessionError(
            "Could not check your account. Refresh the page and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    setLoading(true);
    setError("");
    api<Session | null>("dealers?session=1")
      .then((next) => {
        if (!active) return;
        setSession(next);
        if (next?.approvalState === "approved" && !next.demo)
          return api<{ items: Vehicle[] }>("vehicles?limit=50").then((page) => {
            if (active) setVehicles(page.items);
          });
        setVehicles([]);
        setEditing(undefined);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [signedIn]);

  async function login() {
    setLoggingIn(true);
    try {
      const { authentication } = await import("@wix/site-members");
      await authentication.promptLogin({ mode: "login", modal: true });
      const value = await readLoginEmail();
      if (!value) {
        toast.error("Log in before adding a vehicle.");
        return;
      }
      setEmail(value);
      setSessionError("");
      setSession(null);
      setError("");
    } catch (reason) {
      console.error("Member login was not completed", reason);
      toast.error("Log in before adding a vehicle.");
    } finally {
      setLoggingIn(false);
    }
  }

  const approved = session?.approvalState === "approved" && !session.demo;
  const checking = (email === null && !sessionError) || (signedIn && loading);
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Toaster richColors position="bottom-right" />
      <p className="text-xs uppercase tracking-[.15em] text-muted-foreground">
        Dealer listings
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {session ? session.businessName : title}
      </h1>
      <p className="hint mt-3">
        {approved
          ? "Use the same vehicle form as the showroom workspace. Listings you publish appear on the site."
          : "Only an approved dealership can add a vehicle."}
      </p>
      {checking ? (
        <div className="mt-8 flex justify-center" role="status">
          <LoaderCircle
            className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="sr-only">Checking your account</span>
        </div>
      ) : !signedIn ? (
        <section className="surface mt-8 max-w-xl space-y-4 p-6">
          <h2 className="section-heading">Log in to add a vehicle</h2>
          <p className="hint">
            {sessionError ||
              "Use the same site account you used to apply. After approval, your vehicles open here."}
          </p>
          <Button
            type="button"
            disabled={loggingIn}
            pending={loggingIn}
            onClick={() => void login()}
          >
            Log in
          </Button>
        </section>
      ) : null}
      {signedIn && error && !loading && (
        <div role="alert" className="surface mt-8 max-w-xl p-6">
          <p>{error}</p>
        </div>
      )}
      {session && !approved && !loading && (
        <section className="surface mt-8 max-w-xl p-6">
          <Badge status={session.approvalState}>{session.approvalState}</Badge>
          <p className="mt-4">
            {session.demo
              ? "Sample dealerships stay private. Apply with your own business to add vehicles."
              : session.approvalState === "pending"
                ? "Your application is waiting for approval."
                : session.approvalState === "suspended"
                  ? "This dealership is suspended, so vehicles can't be added until it is approved again."
                  : "This application was not approved, so vehicles can't be added."}
          </p>
          <p className="hint mt-4">
            {session.createdAt
              ? alreadyApplied(session.createdAt)
              : "You already applied."}
          </p>
        </section>
      )}
      {approved && editing === undefined && (
        <section className="mt-8 space-y-4">
          <div className="flex justify-end">
            <Button type="button" onClick={() => setEditing(null)}>
              <Plus size={16} />
              Add vehicle
            </Button>
          </div>
          {vehicles.length === 0 ? (
            <div className="surface p-8 text-center">
              <h2 className="section-heading">No vehicles yet</h2>
              <p className="hint mt-2">
                Add your first vehicle with the same form used in the workspace.
              </p>
            </div>
          ) : (
            <ul className="surface divide-y">
              {vehicles.map((vehicle) => (
                <li key={vehicle._id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/50"
                    onClick={() => setEditing(vehicle)}
                  >
                    <span className="flex-1">
                      <span className="block font-medium">{vehicle.title}</span>
                      <span className="hint">
                        {money(vehicle.price, vehicle.currency)}
                      </span>
                    </span>
                    <Badge status={vehicle.status}>
                      {vehicle.status === "published" ? "For sale" : vehicle.status}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {session?.approvalState === "pending" && !session.demo && !loading && (
        <div className="mt-8">
          <VehicleEditor
            vehicle={null}
            client={api}
            submitDisabled
            showFeatured={false}
            uploadDependencies={dealerMediaUpload}
            lockedDealer={{
              _id: session._id,
              businessName: session.businessName,
              approvalState: session.approvalState,
              location: session.location,
            }}
          />
        </div>
      )}
      {approved && session && editing !== undefined && (
        <div className="mt-8">
          <ListingEditor
            client={api}
            session={session}
            vehicle={editing}
            uploadDependencies={dealerMediaUpload}
            onBack={() => {
              setEditing(undefined);
              void api<{ items: Vehicle[] }>("vehicles?limit=50").then((page) =>
                setVehicles(page.items),
              );
            }}
          />
        </div>
      )}
      {signedIn && !checking && !session && !error && (
        <div className="mt-8">
          <VehicleEditor
            vehicle={null}
            client={api}
            submitDisabled
            showFeatured={false}
            uploadDependencies={dealerMediaUpload}
          />
        </div>
      )}
    </div>
  );
}

function ListingEditor({
  client,
  session,
  vehicle,
  onBack,
  uploadDependencies,
}: {
  client: DealerClient;
  session: Session;
  vehicle: Vehicle | null;
  onBack: () => void;
  uploadDependencies: typeof dealerMediaUpload;
}) {
  return (
          <VehicleEditor
            key={vehicle?._id ?? "new"}
            vehicle={vehicle}
            onBack={onBack}
            backLabel="Back to your vehicles"
            client={client}
            uploadDependencies={uploadDependencies}
            showFeatured={false}
            lockedDealer={{
        _id: session._id,
        businessName: session.businessName,
        approvalState: session.approvalState,
        location: session.location,
      }}
    />
  );
}
