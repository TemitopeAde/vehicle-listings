import { assetUrl } from "../shared/client";
import {
  CarFront,
  Users,
  ArrowUpRight,
  Eye,
  MessageSquare,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useResource } from "./hooks";
import { Button } from "./components/ui/button";
import { LoadState, Badge } from "./components/common";
import type { Vehicle } from "../shared/schemas";
import { statusLabel } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
export type Analytics = {
  counts: { status: string; count: number }[];
  trend: { date: string; views: number; clicks: number; leads: number }[];
  views: number;
  leads: number;
  clicks: number;
  conversion: number;
  recent: {
    _id: string;
    name: string;
    vehicleId: string;
    status: string;
    createdAt: string;
  }[];
  demo: boolean;
};
export function Overview({
  navigate,
  edit,
}: {
  navigate: (s: string) => void;
  edit: (v: Vehicle | null) => void;
}) {
  const { t, money, number } = useI18n();
  const stats = useResource<Analytics>("analytics"),
    vehicles = useResource<{ items: Vehicle[]; total: number }>(
      "vehicles?limit=4",
    );
  const active =
    stats.data?.counts
      .filter((c) => ["published", "reserved"].includes(c.status))
      .reduce((a, c) => a + c.count, 0) ?? 0;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-200 bg-[#edf4ef] p-6 flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-[.16em] text-primary font-semibold">
            {t("Your showroom, connected")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {t("A good day to find someone’s next car.")}
          </h2>
          <p className="hint mt-2">
            {t(
              "Keep your inventory current and turn interest into conversations.",
            )}
          </p>
        </div>
        <Button onClick={() => edit(null)}>
          <Plus size={17} />
          {t("Add a vehicle")}
        </Button>
      </div>
      <LoadState {...stats} retry={() => void stats.reload()} />
      {stats.data && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                label: "Active listings",
                value: number(active),
                icon: CarFront,
                note: "Published and reserved vehicles",
              },
              {
                label: "Vehicle views",
                value: number(stats.data.views),
                icon: Eye,
                note: "Unique daily views · last 14 days",
              },
              {
                label: "New inquiries",
                value: number(stats.data.leads),
                icon: MessageSquare,
                note: "Buyer inquiries · last 14 days",
              },
              {
                label: "Lead conversion",
                value: `${number(stats.data.conversion)}%`,
                icon: Users,
                note: "Inquiries ÷ vehicle views",
              },
            ].map((c) => (
              <div key={c.label} className="surface p-5">
                <div className="flex justify-between items-center">
                  <p className="hint">{t(c.label)}</p>
                  <c.icon size={18} className="text-primary" />
                </div>
                <p className="text-3xl mt-3 font-semibold tracking-tight">
                  {c.value}
                </p>
                <p className="text-xs text-muted-foreground mt-3">{t(c.note)}</p>
              </div>
            ))}
          </div>
          <div className="grid xl:grid-cols-[1.6fr_1fr] gap-6">
            <section className="surface p-6 min-w-0">
              <div className="flex justify-between mb-6">
                <div>
                  <h3 className="section-heading">{t("Showroom activity")}</h3>
                  <p className="hint mt-1">
                    {t("Vehicle views and buyer inquiries")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("Analytics")}
                >
                  {t("View report")}
                  <ArrowUpRight size={14} />
                </Button>
              </div>
              <div
                className="h-64"
                role="img"
                aria-label={t(
                  "{views} vehicle views and {leads} inquiries in the last 14 days",
                  {
                    views: number(stats.data.views),
                    leads: number(stats.data.leads),
                  },
                )}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.data.trend}>
                    <defs>
                      <linearGradient
                        id="viewsFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#196947"
                          stopOpacity={0.18}
                        />
                        <stop
                          offset="100%"
                          stopColor="#196947"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e8ece8"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(s) => s.slice(5)}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      fontSize={11}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      name={t("views")}
                      dataKey="views"
                      stroke="#196947"
                      fill="url(#viewsFill)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      name={t("leads")}
                      dataKey="leads"
                      stroke="#c08a32"
                      fill="transparent"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="surface p-6">
              <h3 className="section-heading">
                {t("Getting your showroom ready")}
              </h3>
              <p className="hint mt-1 mb-5">
                {t("A few steps before your first buyer arrives.")}
              </p>
              {[
                ["01", "Set up your dealership", "Dealers"],
                ["02", "Add your real inventory", "Vehicles"],
                ["03", "Place your site widget", "Settings"],
              ].map(([n, title, section]) => (
                <button
                  key={n}
                  onClick={() => navigate(section ?? "Settings")}
                  className="flex items-center gap-3 border-t py-4 text-left w-full text-sm"
                >
                  <span className="rounded-full h-8 w-8 flex items-center justify-center bg-muted text-xs text-primary">
                    {n}
                  </span>
                  <span className="flex-1">{t(title ?? "")}</span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </section>
          </div>
        </>
      )}
      <section className="surface overflow-hidden">
        <div className="p-5 flex justify-between items-center">
          <div>
            <h3 className="section-heading">{t("Recently added")}</h3>
            <p className="hint">{t("The latest additions to your inventory")}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("Vehicles")}
          >
            {t("All vehicles")}
            <ArrowRight size={15} />
          </Button>
        </div>
        <LoadState {...vehicles} retry={() => void vehicles.reload()} />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 border-t">
          {vehicles.data?.items.map((v) => (
            <button
              key={v._id}
              onClick={() => edit(v)}
              className="p-4 text-left border-r hover:bg-muted/50"
            >
              <img
                src={assetUrl(v.media[0]?.url ?? "/media/demo-car.svg")}
                title={v.media[0]?.credit}
                alt={v.media[0]?.alt ?? v.title}
                className="w-full aspect-[16/9] object-cover rounded-lg mb-3"
              />
              <div className="flex justify-between gap-2">
                <p className="text-sm font-semibold">
                  {v.make} {v.model}
                </p>
                <Badge status={v.status}>
                  {v.demo ? t("Demo") : t(statusLabel[v.status] ?? v.status)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {v.year} · {number(v.mileage)} {t(v.mileageUnit)}
              </p>
              <p className="font-semibold text-sm mt-3">
                {money(v.price, v.currency)}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
