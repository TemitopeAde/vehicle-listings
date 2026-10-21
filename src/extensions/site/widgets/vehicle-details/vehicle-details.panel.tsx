import { useEffect, useRef, useState } from "react";
import { widget } from "@wix/editor";
import {
  Accordion,
  FormField,
  Input,
  SectionHelper,
  SidePanel,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import {
  selectedFonts,
  styleKeys,
  surfaceSettings,
  textSections,
} from "../../../../storefront/widget-style";
import { ColorField, FontField } from "../vehicle-marketplace/style-fields";
import { LocaleProvider, useI18n } from "../../../../shared/i18n-react";

const defaults: Record<string, string> = {
  radius: "12",
  ...Object.fromEntries(styleKeys.map((key) => [key, ""])),
};

export default function Panel() {
  return (
    <LocaleProvider>
      <PanelContent />
    </LocaleProvider>
  );
}

function PanelContent() {
  const { t } = useI18n();
  const [props, setProps] = useState(defaults);
  const current = useRef(defaults);
  const queue = useRef(Promise.resolve());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all(
      Object.keys(defaults).map(
        async (key) => [key, await widget.getProp(key)] as const,
      ),
    )
      .then(async (values) => {
        if (!active) return;
        const settings = {
          ...defaults,
          ...Object.fromEntries(values.filter(([, value]) => value != null)),
        };
        current.current = settings;
        setProps(settings);
        try {
          await widget.setPreloadFonts(selectedFonts(settings));
        } catch (error) {
          console.error(error);
        }
        if (active) setLoaded(true);
      })
      .catch((error) => {
        console.error(error);
        if (active)
          setError("Could not load settings. Reopen the panel to retry.");
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
  return (
    <WixDesignSystemProvider>
      <SidePanel width="100%" height="100vh">
        <SidePanel.Header title={t("Vehicle details")} />
        <SidePanel.Content>
          {error && <SectionHelper skin="danger">{t(error)}</SectionHelper>}
          {!loaded ? (
            <SectionHelper>{t("Loading widget settings…")}</SectionHelper>
          ) : (
            <Accordion
              skin="light"
              hideShadow
              contentPadding="none"
              items={[
                {
                  title: t("Layout"),
                  initiallyOpen: true,
                  children: (
                    <SidePanel.Field>
                      <FormField id="radius" label={t("Corner radius")}>
                        <Input
                          id="radius"
                          type="number"
                          min={0}
                          max={32}
                          value={props.radius}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (
                              event.target.value !== "" &&
                              Number.isInteger(value) &&
                              value >= 0 &&
                              value <= 32
                            )
                              set("radius", String(value));
                          }}
                        />
                      </FormField>
                    </SidePanel.Field>
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
              ]}
            />
          )}
        </SidePanel.Content>
      </SidePanel>
    </WixDesignSystemProvider>
  );
}
