import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { LoaderCircle } from "lucide-react";
import type { Vehicle } from "../shared/schemas";
import { api } from "../shared/client";
import { localeFor, localizeDefault, statusLabel, type Vars } from "../shared/i18n";
import { LocaleProvider, localeProps, useI18n } from "../shared/i18n-react";
import type { DealerClient } from "./client";
import { VehicleEditor } from "../dashboard/vehicle-editor";
import { dealerMediaUpload } from "./media-upload";
import { Button } from "../dashboard/components/ui/button";
import { Badge } from "../dashboard/components/common";
import { DealerInventory } from "./dealer-inventory";
import { readLoginEmail } from "../shared/wix-member";
import "../dashboard/styles.css";

type Stats = Record<string, { views: number; clicks: number }>;

type Session = {
  _id: string;
  businessName: string;
  location: string;
  approvalState: "pending" | "approved" | "suspended" | "rejected";
  createdAt?: string;
};

function alreadyApplied(
  createdAt: string,
  t: (key: string, vars?: Vars) => string,
  language: ReturnType<typeof useI18n>["language"],
) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return t("You already applied.");
  const formatted = new Intl.DateTimeFormat(localeFor(language), {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  return t("You already applied on {date}.", { date: formatted });
}

export default function SellPage({
  title = "Add a vehicle for sale",
}: {
  title?: string;
}) {
  return (
    <LocaleProvider>
      <SellPageInner title={title} />
    </LocaleProvider>
  );
}

function SellPageInner({
  title = "Add a vehicle for sale",
}: {
  title?: string;
}) {
  const { t, language } = useI18n();
  const heading = localizeDefault(language, title, "Add a vehicle for sale");
  const [email, setEmail] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined);
  const signedIn = Boolean(email);

  useEffect(() => {
    let active = true;
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
        if (next?.approvalState === "approved")
          return api<{ items: Vehicle[]; stats: Stats }>("vehicles?limit=50").then((page) => {
            if (!active) return;
            setVehicles(page.items);
            setStats(page.stats);
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
        toast.error(t("Log in before adding a vehicle."));
        return;
      }
      setEmail(value);
      setSessionError("");
      setSession(null);
      setError("");
    } catch (reason) {
      console.error("Member login was not completed", reason);
      toast.error(t("Log in before adding a vehicle."));
    } finally {
      setLoggingIn(false);
    }
  }

  const approved = session?.approvalState === "approved";
  const checking = (email === null && !sessionError) || (signedIn && loading);
  useEffect(() => {
    console.info("[Vehicle test data] Add Vehicle page state (debug v3)", {
      signedIn,
      checking,
      loading,
      hasSession: Boolean(session),
      approvalState: session?.approvalState ?? null,
      editorExpected: Boolean(
        (approved && editing !== undefined) ||
        (session?.approvalState === "pending" && !loading) ||
        (signedIn && !checking && !session && !error),
      ),
      view: editing === undefined ? "inventory" : editing === null ? "new vehicle" : "existing vehicle",
      hasSessionError: Boolean(sessionError),
      hasError: Boolean(error),
    });
  }, [signedIn, checking, loading, session, approved, editing, sessionError, error]);
  return (
    <div className="mx-auto max-w-5xl px-5 py-12" {...localeProps(language)}>
      <Toaster richColors position="bottom-right" />
      {!approved && (
        <>
          <p className="text-xs uppercase tracking-[.15em] text-muted-foreground">
            {t("Dealer listings")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {session ? session.businessName : heading}
          </h1>
          <p className="hint mt-3">
            {t("Only an approved dealership can add a vehicle.")}
          </p>
        </>
      )}
      {approved && session && editing !== undefined && (
        <p className="text-xs uppercase tracking-[.15em] text-muted-foreground">
          {session.businessName}
        </p>
      )}
      {checking ? (
        <div className="mt-8 flex justify-center" role="status">
          <LoaderCircle
            className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="sr-only">{t("Checking your account")}</span>
        </div>
      ) : !signedIn ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="hint">
            {sessionError
              ? t(sessionError)
              : t(
                  "Log in with the account you used to apply to add a vehicle.",
                )}
          </p>
          {!sessionError && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loggingIn}
              pending={loggingIn}
              onClick={() => void login()}
            >
              {t("Log in")}
            </Button>
          )}
        </div>
      ) : null}
      {signedIn && error && !loading && (
        <div role="alert" className="surface mt-8 max-w-xl p-6">
          <p>{t(error)}</p>
        </div>
      )}
      {session && !approved && !loading && (
        <section className="surface mt-8 max-w-xl p-6">
          <Badge status={session.approvalState}>
            {t(statusLabel[session.approvalState] ?? session.approvalState)}
          </Badge>
          <p className="mt-4">
            {session.approvalState === "pending"
              ? t("Your application is waiting for approval.")
              : session.approvalState === "suspended"
                ? t(
                    "This dealership is suspended, so vehicles can't be added until it is approved again.",
                  )
                : t(
                    "This application was not approved, so vehicles can't be added.",
                  )}
          </p>
          <p className="hint mt-4">
            {session.createdAt
              ? alreadyApplied(session.createdAt, t, language)
              : t("You already applied.")}
          </p>
        </section>
      )}
      {approved && session && editing === undefined && !loading && (
        <DealerInventory
          businessName={session.businessName}
          location={session.location}
          vehicles={vehicles}
          stats={stats}
          onAdd={() => setEditing(null)}
          onEdit={setEditing}
        />
      )}
      {session?.approvalState === "pending" && !loading && (
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
              void api<{ items: Vehicle[]; stats: Stats }>("vehicles?limit=50").then(
                (page) => {
                  setVehicles(page.items);
                  setStats(page.stats);
                },
              );
            }}
          />
        </div>
      )}
      {!checking && !session && !error && (
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
  const { t } = useI18n();
  return (
          <VehicleEditor
            key={vehicle?._id ?? "new"}
            vehicle={vehicle}
            onBack={onBack}
            backLabel={t("Back to your vehicles")}
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
