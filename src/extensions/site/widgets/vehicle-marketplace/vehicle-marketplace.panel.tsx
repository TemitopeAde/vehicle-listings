import { useEffect, useRef, useState } from "react";
import { widget } from "@wix/editor";
import {
  Accordion,
  Button,
  Checkbox,
  Dropdown,
  FormField,
  Input,
  SectionHelper,
  SidePanel,
  Tabs,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import {
  panelDefaults,
  selectedFonts,
  surfaceSettings,
  textSections,
} from "../../../../storefront/widget-style";
import { ColorField, FontField } from "./style-fields";
import {
  IndividualFilterStyles,
  IndividualListingStyles,
} from "./element-style-fields";
import { filterSettings } from "../../../../storefront/filter-visibility";
import { LocaleProvider, useI18n } from "../../../../shared/i18n-react";
import { TrialFooter } from "../../trial-footer";

const textKeys = ["display-name", "description"];

export default function Panel() {
  return (
    <LocaleProvider>
      <PanelContent />
    </LocaleProvider>
  );
}

function PanelContent() {
  const { t } = useI18n();
  const [props, setProps] = useState(panelDefaults);
  const current = useRef(panelDefaults);
  const queue = useRef(Promise.resolve());
  const [tab, setTab] = useState("content");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all(
      Object.keys(panelDefaults).map(
        async (key) => [key, await widget.getProp(key)] as const,
      ),
    )
      .then(async (values) => {
        if (!active) return;
        const settings = {
          ...panelDefaults,
          ...Object.fromEntries(values.filter(([, value]) => value != null)),
        };
        current.current = settings;
        setProps(settings);
        try {
          await widget.setPreloadFonts(selectedFonts(settings));
        } catch (error) {
          console.error(error);
          if (active)
            setError(
              "Could not preload fonts. Select the font again to retry.",
            );
        }
        if (active) setLoaded(true);
      })
      .catch((error) => {
        console.error(error);
        if (active)
          setError(
            "Could not load settings or preload fonts. Reopen the panel to retry.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  function set(key: string, value: string) {
    const previous = current.current[key] ?? "";
    const settings = { ...current.current, [key]: value };
    current.current = settings;
    setProps(settings);
    queue.current = queue.current.then(async () => {
      try {
        if (key.endsWith("-font"))
          await widget.setPreloadFonts(selectedFonts(settings));
        await widget.setProp(key, value);
        setError("");
      } catch (error) {
        console.error(error);
        if (current.current[key] === value) {
          current.current = { ...current.current, [key]: previous };
          setProps(current.current);
        }
        setError("Could not save this setting. Please try again.");
      }
    });
  }
  const text = (key: string, label: string) => (
    <SidePanel.Field>
      <FormField id={key} label={label}>
        <Input
          id={key}
          value={props[key]}
          onChange={(event) => set(key, event.target.value)}
        />
      </FormField>
    </SidePanel.Field>
  );
  const number = (key: string, label: string, min: number, max: number) => (
    <SidePanel.Field>
      <FormField id={key} label={label}>
        <Input
          id={key}
          type="number"
          min={min}
          max={max}
          value={props[key]}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (
              event.target.value !== "" &&
              Number.isInteger(value) &&
              value >= min &&
              value <= max
            )
              set(key, String(value));
          }}
        />
      </FormField>
    </SidePanel.Field>
  );
  return (
    <WixDesignSystemProvider>
      <SidePanel width="100%" height="100vh">
        <SidePanel.Header title={t("Vehicle marketplace")} />
        <Tabs
          activeId={tab}
          items={[
            { id: "content", title: t("Content") },
            { id: "style", title: t("Style") },
          ]}
          onClick={(item) => setTab(String(item.id))}
          type="uniformFull"
          // WDS Tabs default to a 628px min-width, wider than the editor's settings panel.
          minWidth={0}
        />
        <SidePanel.Content>
          {error && <SectionHelper skin="danger">{t(error)}</SectionHelper>}
          {!loaded ? (
            <SectionHelper>{t("Loading widget settings…")}</SectionHelper>
          ) : tab === "content" ? (
            <Accordion
              key="content"
              skin="light"
              hideShadow
              contentPadding="none"
              items={[
                {
                  title: t("Heading"),
                  initiallyOpen: true,
                  children: (
                    <>
                      {text("display-name", t("Heading"))}
                      {text("description", t("Description"))}
                      <SidePanel.Field>
                        <Button
                          size="small"
                          priority="secondary"
                          disabled={textKeys.every(
                            (key) => props[key] === panelDefaults[key],
                          )}
                          onClick={() =>
                            textKeys.forEach((key) =>
                              set(key, panelDefaults[key] ?? ""),
                            )
                          }
                        >
                          {t("Reset to default")}
                        </Button>
                      </SidePanel.Field>
                    </>
                  ),
                },
                {
                  title: t("Filters"),
                  children: filterSettings.map(([, label, key]) => (
                    <SidePanel.Field key={key}>
                      <Checkbox
                        checked={props[key] !== "false"}
                        onChange={(event) =>
                          set(key, String(event.target.checked))
                        }
                      >
                        {t(label)}
                      </Checkbox>
                    </SidePanel.Field>
                  )),
                },
                {
                  title: t("Inventory"),
                  children: (
                    <>
                      <SidePanel.Field>
                        <FormField label={t("Pagination")}>
                          <Dropdown
                            ariaLabel={t("Pagination")}
                            selectedId={props.pagination}
                            options={[
                              { id: "pages", value: t("Numbered pages") },
                              { id: "infinite", value: t("Infinite scroll") },
                            ]}
                            onSelect={(option) =>
                              set("pagination", String(option.id))
                            }
                          />
                        </FormField>
                      </SidePanel.Field>
                      {number(
                        "item-limit",
                        props.pagination === "infinite"
                          ? t("Vehicles per load")
                          : t("Vehicles per page"),
                        1,
                        100,
                      )}
                      <SidePanel.Field>
                        <Checkbox
                          checked={props["featured-only"] === "true"}
                          onChange={(event) =>
                            set("featured-only", String(event.target.checked))
                          }
                        >
                          {t("Featured vehicles only")}
                        </Checkbox>
                      </SidePanel.Field>
                    </>
                  ),
                },
              ]}
            />
          ) : (
            <Accordion
              key="style"
              skin="light"
              hideShadow
              contentPadding="none"
              items={[
                {
                  title: t("Layout"),
                  children: (
                    <>
                      {number("columns", t("Columns"), 1, 4)}
                      {number("radius", t("Corner radius"), 0, 32)}
                      <SidePanel.Field>
                        <FormField label={t("Layout")}>
                          <Dropdown
                            ariaLabel={t("Layout")}
                            selectedId={props.layout}
                            options={[
                              { id: "grid", value: t("Grid") },
                              { id: "list", value: t("List") },
                            ]}
                            onSelect={(option) =>
                              set("layout", String(option.id))
                            }
                          />
                        </FormField>
                      </SidePanel.Field>
                    </>
                  ),
                },
                {
                  title: t("Colors"),
                  children: (
                    <>
                      {surfaceSettings.map(([key, label, fallback]) => (
                        <ColorField
                          key={key}
                          name={key}
                          label={label}
                          value={props[key] ?? ""}
                          fallback={fallback}
                          onChange={set}
                        />
                      ))}
                    </>
                  ),
                },
                ...textSections.map(([key, label, size]) => ({
                  title: t(label),
                  initiallyOpen: key === "body",
                  children: (
                    <>
                      <FontField
                        name={`${key}-font`}
                        label={label}
                        size={size}
                        value={props[`${key}-font`] ?? ""}
                        onChange={set}
                      />
                      <ColorField
                        name={`${key}-color`}
                        label={`${label} color`}
                        value={props[`${key}-color`] ?? ""}
                        fallback={key === "button" ? "#ffffff" : "#243b2e"}
                        onChange={set}
                      />
                    </>
                  ),
                })),
                {
                  title: t("Individual filters"),
                  children: (
                    <IndividualFilterStyles settings={props} onChange={set} />
                  ),
                },
                {
                  title: t("Individual listing elements"),
                  children: (
                    <IndividualListingStyles settings={props} onChange={set} />
                  ),
                },
              ]}
            />
          )}
        </SidePanel.Content>
        <TrialFooter />
      </SidePanel>
    </WixDesignSystemProvider>
  );
}
