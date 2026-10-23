import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Download } from "lucide-react";
import { useResource } from "./hooks";
import type { Analytics as Report } from "./overview";
import { Button } from "./components/ui/button";
import { LoadState } from "./components/common";
import { download } from "./api";
import { csvCell } from "../shared/utils";
import { statusLabel } from "../shared/i18n";
import { useI18n } from "../shared/i18n-react";
export function Analytics() {
  const { t, number } = useI18n();
  const [days, setDays] = useState(14);
  const resource = useResource<Report>(`analytics?days=${days}`);
  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-heading">{t("Understand your showroom")}</h2>
          <p className="hint mt-1">
            {t(
              "Actual views, contact clicks and inquiries from your public inventory.",
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <select
            aria-label={t("Analytics date range")}
            className="field w-auto"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 14, 30, 90].map((d) => (
              <option key={d} value={d}>
                {t("Last {days} days", { days: d })}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() =>
              download(
                "showroom-analytics.csv",
                [
                  ["Date", "Views", "Contacts", "Leads"]
                    .map((heading) => csvCell(t(heading)))
                    .join(","),
                  ...(resource.data?.trend ?? []).map((r) =>
                    [r.date, r.views, r.clicks, r.leads].map(csvCell).join(","),
                  ),
                ].join("\r\n"),
              )
            }
          >
            <Download size={16} />
            {t("Export")}
          </Button>
        </div>
      </div>
      <LoadState {...resource} retry={() => void resource.reload()} />
      {resource.data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Vehicle views", number(resource.data.views)],
              ["Contact clicks", number(resource.data.clicks)],
              ["Inquiries", number(resource.data.leads)],
              ["Conversion", `${number(resource.data.conversion)}%`],
            ].map(([label, value]) => (
              <div key={label} className="surface p-6">
                <p className="hint">{t(String(label))}</p>
                <p className="text-3xl font-semibold mt-3">{value}</p>
              </div>
            ))}
          </div>
          <section className="surface p-6">
            <h3 className="section-heading mb-6">{t("Daily activity")}</h3>
            <div
              className="h-80"
              role="img"
              aria-label={t("Daily views, contact clicks and inquiries")}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resource.data.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(5)}
                    fontSize={11}
                  />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar
                    dataKey="views"
                    name={t("views")}
                    fill="#196947"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="clicks"
                    name={t("clicks")}
                    fill="#a1bea9"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="leads"
                    name={t("leads")}
                    fill="#b98339"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="surface p-6">
            <h3 className="section-heading mb-4">
              {t("Inventory by availability")}
            </h3>
            <div className="grid sm:grid-cols-5 gap-4">
              {resource.data.counts.map((c) => (
                <div key={c.status}>
                  <p className="hint">
                    {t(statusLabel[c.status] ?? c.status)}
                  </p>
                  <p className="font-semibold text-2xl mt-2">{number(c.count)}</p>
                </div>
              ))}
            </div>
          </section>
          <p className="hint">
            {t(
              "Contact events are recorded only after analytics consent. Views are deduplicated per visitor, vehicle and day. Editor design traffic is excluded.",
            )}
          </p>
        </>
      )}
    </div>
  );
}
