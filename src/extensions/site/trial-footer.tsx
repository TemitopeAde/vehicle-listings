import { useEffect, useState } from "react";
import { Box, Button, SidePanel, Text } from "@wix/design-system";
import { api } from "../../shared/client";
import { useI18n } from "../../shared/i18n-react";

/**
 * Settings-panel footer that offers the app's free trial. Wix runs the trial, so the button opens
 * Wix's upgrade page in a new tab; it only shows while the site can still start a trial.
 */
export function TrialFooter() {
  const { t } = useI18n();
  const [trialUrl, setTrialUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api<{ trialUrl: string | null }>("plans")
      .then((status) => {
        if (active) setTrialUrl(status.trialUrl);
      })
      // Without plan details the panel still works; it just doesn't offer the trial.
      .catch((error) => console.error("Could not load plan status", error));
    return () => {
      active = false;
    };
  }, []);
  if (!trialUrl) return null;
  return (
    <SidePanel.Footer>
      <Box direction="vertical" gap="SP2">
        <Text size="small" secondary>
          {t("Try paid features like more vehicles and invoices.")}
        </Text>
        <Button
          as="a"
          href={trialUrl}
          target="_blank"
          rel="noopener noreferrer"
          skin="premium"
          size="small"
          fullWidth
        >
          {t("Start free trial")}
        </Button>
      </Box>
    </SidePanel.Footer>
  );
}
