import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { assetUrl } from "../shared/client";
import { useI18n } from "../shared/i18n-react";
import { Button, cn } from "./components/ui/button";

type Editor = "harmony" | "studio";

type Screenshot = { src: string; alt: string; caption: string };

type Step = {
  title: string;
  /** Short lines shown as a numbered list. `{name}` is the element's name in the chosen editor. */
  body: string[];
  /** The element to add, as each editor names it. */
  element?: Record<Editor, string>;
  screenshots?: Record<Editor, Screenshot[]> | Screenshot[];
  action?: { label: string; page: string };
  optional?: boolean;
};

const editors: { value: Editor; label: string; hint: string }[] = [
  {
    value: "harmony",
    label: "Wix Harmony",
    hint: "Add the app's components from the Add panel.",
  },
  {
    value: "studio",
    label: "Wix Studio / Classic editor",
    hint: "Add the app's widgets from Add Elements › App widgets.",
  },
];

const steps: Step[] = [
  {
    title: "Add your vehicles",
    body: [
      "Open Vehicles and select Add vehicle.",
      "Fill in the details, add photos and select Publish.",
      "Until your first vehicle is published, your site shows sample cars so you can see the design.",
    ],
    action: { label: "Go to Vehicles", page: "Vehicles" },
  },
  {
    title: "Create the inventory page",
    body: [
      "In the editor, add a page (or open your home page).",
      "Add the {name} element to the page.",
      "Visitors can now search, filter, compare and save vehicles.",
    ],
    element: { harmony: "Vehicle Inventory", studio: "Vehicle Marketplace" },
    screenshots: {
      harmony: [
        {
          src: "/vehicle-inventory-component-thumbnail.png",
          alt: "The Vehicle Inventory component",
          caption: "The Vehicle Inventory component in the Add panel.",
        },
        {
          src: "/media/guide/inventory-preview.png",
          alt: "The inventory page in preview, showing filters and a vehicle card",
          caption: "The inventory page in preview.",
        },
      ],
      studio: [
        {
          src: "/widget-marketplace-thumbnail.png",
          alt: "The Vehicle Marketplace widget",
          caption: "The Vehicle Marketplace widget.",
        },
        {
          src: "/media/guide/inventory-preview.png",
          alt: "The inventory page in preview, showing filters and a vehicle card",
          caption: "The inventory page in preview.",
        },
      ],
    },
  },
  {
    title: "Let other dealers sell on your site",
    optional: true,
    body: [
      "Add a page with the {name} element, where dealers apply with their site member account.",
      "Add another page with the Add a vehicle element, where approved dealers list and manage their cars.",
      "Approve applications in Dealers. Keep each element on its own page.",
    ],
    element: { harmony: "Dealer application", studio: "Dealer application" },
    screenshots: {
      harmony: [
        {
          src: "/dealer-application-component-thumbnail.png",
          alt: "The Dealer application component",
          caption: "Dealer application page.",
        },
        {
          src: "/add-a-vehicle-component-thumbnail.png",
          alt: "The Add a vehicle component",
          caption: "Add a vehicle page.",
        },
      ],
      studio: [
        {
          src: "/widget-dealer-application-thumbnail.png",
          alt: "The Dealer application widget",
          caption: "Dealer application page.",
        },
        {
          src: "/widget-add-a-vehicle-thumbnail.png",
          alt: "The Add a vehicle widget",
          caption: "Add a vehicle page.",
        },
      ],
    },
    action: { label: "Go to Dealers", page: "Dealers" },
  },
  {
    title: "Match your brand",
    body: [
      "Select an element in the editor and open its settings to change the heading, filters, layout, columns and pagination.",
      "Use the design panel to change colors, fonts and corner radius.",
      "In Settings, choose your default currency and saved-cars options.",
    ],
    action: { label: "Go to Settings", page: "Settings" },
  },
  {
    title: "Preview and publish",
    body: [
      "Preview the site, open a vehicle and send a test inquiry.",
      "Publish the site. New inquiries and quote requests appear here in the dashboard.",
    ],
    action: { label: "Go to Inquiries", page: "Inquiries" },
  },
];

export function SetupGuide({ navigate }: { navigate: (page: string) => void }) {
  const { t } = useI18n();
  const [editor, setEditor] = useState<Editor>("harmony");
  const current = editors.find((e) => e.value === editor) ?? editors[0];
  return (
    <div className="space-y-6">
      <section className="surface p-6">
        <h2 className="section-heading">{t("Which editor does your site use?")}</h2>
        <p className="hint mt-1 mb-4">
          {t("The steps are the same; only the element names differ.")}
        </p>
        <div
          role="radiogroup"
          aria-label={t("Editor")}
          className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1"
        >
          {editors.map((e) => (
            <button
              key={e.value}
              type="button"
              role="radio"
              aria-checked={editor === e.value}
              onClick={() => setEditor(e.value)}
              className={cn(
                "rounded-md px-4 py-2 text-sm cursor-pointer",
                editor === e.value
                  ? "bg-white font-semibold text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(e.label)}
            </button>
          ))}
        </div>
        <p className="hint mt-3">{t(current.hint)}</p>
      </section>
      <ol className="space-y-6">
        {steps.map((step, i) => (
          <GuideStep
            key={step.title}
            number={i + 1}
            step={step}
            editor={editor}
            navigate={navigate}
          />
        ))}
      </ol>
      <section className="surface flex items-center gap-4 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f0e9] text-primary">
          <Check size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 className="section-heading">{t("You're ready to sell")}</h2>
          <p className="hint mt-1">
            {t("Come back to this guide any time from the sidebar.")}
          </p>
        </div>
      </section>
    </div>
  );
}

function GuideStep({
  number,
  step,
  editor,
  navigate,
}: {
  number: number;
  step: Step;
  editor: Editor;
  navigate: (page: string) => void;
}) {
  const { t } = useI18n();
  const name = step.element?.[editor] ?? "";
  const shots = Array.isArray(step.screenshots)
    ? step.screenshots
    : (step.screenshots?.[editor] ?? []);
  return (
    <li className="surface p-6 lg:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">
            <span className="sr-only">{t("Step {number}:", { number })} </span>
            {t(step.title)}
            {step.optional && (
              <span className="ms-2 rounded-full border px-2 py-0.5 align-middle text-[11px] font-normal text-muted-foreground">
                {t("Optional")}
              </span>
            )}
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 ps-5 text-sm text-[#45524a]">
            {step.body.map((line) => (
              <li key={line}>{t(line, { name })}</li>
            ))}
          </ul>
          {shots.length > 0 && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {shots.map((shot) => (
                <figure key={shot.src} className="overflow-hidden rounded-lg border bg-white">
                  <img
                    src={assetUrl(shot.src)}
                    alt={t(shot.alt)}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover object-top"
                  />
                  <figcaption className="border-t px-3 py-2 text-xs text-muted-foreground">
                    {t(shot.caption)}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          {step.action && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => navigate(step.action?.page ?? "Overview")}
            >
              {t(step.action.label)}
              <ArrowRight size={14} aria-hidden="true" className="rtl:rotate-180" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
