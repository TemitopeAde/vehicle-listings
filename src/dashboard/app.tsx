import { lazy, Suspense, useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import {
  CarFront,
  LayoutDashboard,
  Building2,
  MessageSquare,
  FileText,
  ChartNoAxesCombined,
  Upload,
  Settings as SettingsIcon,
  CreditCard,
  ChevronDown,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
const Overview = lazy(() =>
  import("./overview").then((m) => ({ default: m.Overview })),
);
const Vehicles = lazy(() =>
  import("./vehicles").then((m) => ({ default: m.Vehicles })),
);
const VehicleEditor = lazy(() =>
  import("./vehicle-editor").then((m) => ({ default: m.VehicleEditor })),
);
const Dealers = lazy(() =>
  import("./dealers").then((m) => ({ default: m.Dealers })),
);
const Inquiries = lazy(() =>
  import("./inquiries").then((m) => ({ default: m.Inquiries })),
);
const QuoteRequests = lazy(() =>
  import("./quote-requests").then((m) => ({ default: m.QuoteRequests })),
);
const Analytics = lazy(() =>
  import("./analytics").then((m) => ({ default: m.Analytics })),
);
const Imports = lazy(() =>
  import("./imports").then((m) => ({ default: m.Imports })),
);
const Settings = lazy(() =>
  import("./settings").then((m) => ({ default: m.Settings })),
);
const Billing = lazy(() =>
  import("./settings").then((m) => ({ default: m.Billing })),
);
import { Button, cn } from "./components/ui/button";
import { api } from "./api";
import { defaultTheme, type Theme, type Vehicle } from "../shared/schemas";
import { languageOptions, type Language } from "../shared/i18n";
import { LocaleProvider, localeProps, useI18n } from "../shared/i18n-react";
import "./styles.css";
const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Vehicles", icon: CarFront },
  { label: "Dealers", icon: Building2 },
  { label: "Inquiries", icon: MessageSquare },
  { label: "Quote requests", icon: FileText },
  { label: "Analytics", icon: ChartNoAxesCombined },
  { label: "Import / Export", icon: Upload },
  { label: "Settings", icon: SettingsIcon },
  { label: "Billing", icon: CreditCard },
];
const descriptions: Record<string, string> = {
  Overview: "A little perspective on your dealership.",
  Vehicles: "Every car. Every detail. One place.",
  Dealers: "Build a trusted network of sellers.",
  Inquiries: "From interest to a new set of keys.",
  "Quote requests": "Price it, send it, close it.",
  Analytics: "The numbers behind your next move.",
  "Import / Export": "Less data entry. More time on the floor.",
  Settings: "The details that keep things running.",
  Billing: "Choose the space your business needs.",
};
export default function App() {
  return (
    <LocaleProvider fresh>
      <Dashboard />
    </LocaleProvider>
  );
}
function Dashboard() {
  const { t, language, setLanguage } = useI18n();
  const [page, setPage] = useState("Overview"),
    [editor, setEditor] = useState<{ vehicle: Vehicle | null } | null>(null),
    [leaveRequest, setLeaveRequest] = useState<{ page: string } | null>(null),
    [mobile, setMobile] = useState(false),
    [savingLanguage, setSavingLanguage] = useState(false);
  async function changeLanguage(next: Language) {
    if (next === language || savingLanguage) return;
    const previous = language;
    setLanguage(next);
    setSavingLanguage(true);
    try {
      const current = await api<Theme>("settings");
      await api<Theme>(
        "settings",
        { ...defaultTheme, ...current, language: next },
        "PATCH",
      );
    } catch (e) {
      setLanguage(previous);
      toast.error(t((e as Error).message));
    } finally {
      setSavingLanguage(false);
    }
  }
  useEffect(() => {
    const props = localeProps(language);
    document.documentElement.lang = props.lang;
    document.documentElement.dir = props.dir;
    document.title = t("Dealer workspace");
  }, [language, t]);
  useEffect(() => {
    const read = () => {
      const p = decodeURIComponent(window.location.hash.slice(1));
      if (navigation.some((n) => n.label === p)) setPage(p);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  function show(s: string) {
    setPage(s);
    window.location.hash = encodeURIComponent(s);
    setMobile(false);
  }
  // While the editor is open, the editor confirms unsaved changes before the page changes.
  function navigate(s: string) {
    if (editor) setLeaveRequest({ page: s });
    else show(s);
  }
  function edit(v: Vehicle | null) {
    setEditor({ vehicle: v });
    setPage("Vehicles");
    setMobile(false);
  }
  return (
    <div className="min-h-screen flex" {...localeProps(language)}>
      <Toaster richColors position="bottom-right" />
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-30 w-60 overflow-hidden bg-[#fbfcfa] border-e flex flex-col md:translate-x-0",
          mobile ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="h-24 flex items-center px-6 gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
            <CarFront size={23} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-muted-foreground mt-1">
              {t("Dealer workspace")}
            </p>
          </div>
        </div>
        <div className="px-4">
          <div className="rounded-lg border bg-white px-3 py-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-md bg-[#eee8d9] text-[#806933] flex items-center justify-center font-semibold text-xs">
              AM
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold">{t("Your dealership")}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {t("Wix app workspace")}
              </p>
            </div>
            <ChevronDown size={14} className="text-muted-foreground" />
          </div>
        </div>
        <p className="text-[10px] tracking-widest text-muted-foreground px-7 mt-8 mb-3">
          {t("WORKSPACE")}
        </p>
        <nav
          className="min-h-0 flex-1 overflow-y-auto px-3 space-y-1"
          aria-label={t("Main navigation")}
        >
          {navigation.map((n) => (
            <button
              key={n.label}
              onClick={() => navigate(n.label)}
              className={cn(
                "flex gap-3 w-full items-center rounded-lg px-4 py-3 text-[13px] cursor-pointer disabled:cursor-default",
                page === n.label
                  ? "bg-[#e8f0e9] font-semibold text-primary"
                  : "text-[#64736a] hover:bg-muted",
                n.label === "Settings" && "!mt-7",
              )}
              aria-current={page === n.label ? "page" : undefined}
            >
              <n.icon size={17} />
              {t(n.label)}
            </button>
          ))}
        </nav>
        <div className="shrink-0 p-4">
          <div>
            <label className="label text-xs" htmlFor="dashboard-language">
              {t("Language")}
            </label>
            <select
              id="dashboard-language"
              className="field"
              value={language}
              disabled={savingLanguage}
              onChange={(e) => void changeLanguage(e.target.value as Language)}
            >
              {languageOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 px-2">
            {t("CAR DEALER LISTINGS · WIX APP")}
          </p>
        </div>
      </aside>
      {mobile && (
        <button
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          aria-label={t("Close navigation")}
          onClick={() => setMobile(false)}
        />
      )}
      <div className="min-w-0 flex-1 md:ms-60">
        <header className="h-16 border-b bg-white/80 px-5 lg:px-9 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("Toggle navigation")}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X size={19} /> : <Menu size={19} />}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("Workspace")} <span className="px-2">/</span>
            <span className="text-foreground">{t(page)}</span>
          </p>
          <div className="ms-auto flex items-center gap-4">
            {!import.meta.env.DEV && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("Settings")}
              >
                {t("Set up storefront")}
                <ArrowUpRight size={14} />
              </Button>
            )}
            <span className="hidden sm:flex rounded-full w-8 h-8 bg-[#e9e4d6] text-[#776334] items-center justify-center text-xs font-semibold">
              AM
            </span>
          </div>
        </header>
        <main className="p-5 lg:p-9 max-w-[1500px] mx-auto">
          {!editor && (
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[.15em] text-muted-foreground mb-2">
                  {t("DEALER WORKSPACE")}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {page === "Overview" ? t("Welcome to your showroom") : t(page)}
                </h1>
                <p className="hint mt-2">{t(descriptions[page] ?? "")}</p>
              </div>
              {page === "Overview" && (
                <span className="hidden lg:block text-xs border rounded-full px-3 py-2 bg-white text-muted-foreground">
                  {t("Inventory, people & possibilities")}
                </span>
              )}
            </div>
          )}
          <Suspense
            fallback={
              <p role="status" className="hint py-12">
                {t("Loading workspace…")}
              </p>
            }
          >
            {editor ? (
              <VehicleEditor
                key={editor.vehicle?._id ?? "new"}
                vehicle={editor.vehicle}
                leaveRequest={leaveRequest}
                onBack={(target = "Vehicles") => {
                  setLeaveRequest(null);
                  setEditor(null);
                  show(target);
                }}
              />
            ) : page === "Overview" ? (
              <Overview navigate={navigate} edit={edit} />
            ) : page === "Vehicles" ? (
              <Vehicles edit={edit} />
            ) : page === "Dealers" ? (
              <Dealers />
            ) : page === "Inquiries" ? (
              <Inquiries />
            ) : page === "Quote requests" ? (
              <QuoteRequests />
            ) : page === "Analytics" ? (
              <Analytics />
            ) : page === "Import / Export" ? (
              <Imports />
            ) : page === "Settings" ? (
              <Settings />
            ) : (
              <Billing />
            )}
          </Suspense>
          <footer className="text-[10px] text-muted-foreground mt-9 flex justify-between border-t pt-5">
            <span>{t("Car Dealer Listings & Marketplace")}</span>
            <span>{t("Made for the road ahead.")}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
