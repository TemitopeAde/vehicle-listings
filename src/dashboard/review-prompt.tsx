import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import config from "../../wix.config.json";
import { api } from "./api";
import { useI18n } from "../shared/i18n-react";
import type { PlanKey } from "../shared/plans";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./components/ui/dialog";

/** Wix's App Market review form for this app, opened in a new tab as Wix recommends. */
const reviewUrl = `https://www.wix.com/app-market/add-review/${config.appId}`;
const storageKey = "vehicle-listings:review-prompt";
const day = 24 * 60 * 60 * 1000;
/** Ask only once the paid plan has been in use for a while, and never more than monthly. */
const askAfter = 3 * day;
const askAgainAfter = 30 * day;
const delayMs = 8000;

type PromptState = {
  firstPaidAt?: number;
  snoozedUntil?: number;
  done?: boolean;
};

// Browser storage can be blocked in the dashboard frame; the prompt then simply never shows.
function read(): PromptState | null {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "{}") as PromptState;
  } catch {
    return null;
  }
}
function write(state: PromptState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Without storage the prompt can't remember a dismissal, so it stays closed.
  }
}

/**
 * Invites Pro and Business owners to review the app. Wix's review policy forbids pressure, so it
 * waits a few days after an upgrade, never blocks the page, and a dismissal is respected.
 */
export function ReviewPrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    api<{ current: PlanKey }>("plans")
      .then(({ current }) => {
        const state = read();
        if (!active || !state || state.done) return;
        if (current !== "pro" && current !== "business") return;
        const now = Date.now();
        if (!state.firstPaidAt) {
          write({ ...state, firstPaidAt: now });
          return;
        }
        if (now - state.firstPaidAt < askAfter) return;
        if (state.snoozedUntil && now < state.snoozedUntil) return;
        timer = setTimeout(() => active && setOpen(true), delayMs);
      })
      .catch(() => {});
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  function later() {
    write({ ...read(), snoozedUntil: Date.now() + askAgainAfter });
    setOpen(false);
  }
  function reviewed() {
    write({ ...read(), done: true });
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={(next) => !next && later()}>
      <DialogContent className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <Star size={24} fill="currentColor" />
        </div>
        <DialogTitle className="section-heading">
          {t("Enjoying your dealer workspace?")}
        </DialogTitle>
        <DialogDescription className="hint mt-2 mb-6">
          {t(
            "A quick review on the Wix App Market helps other dealerships find us and tells us what to build next. It takes about a minute.",
          )}
        </DialogDescription>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={later}>
            {t("Maybe later")}
          </Button>
          <Button asChild>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={reviewed}
            >
              <Star size={16} />
              {t("Leave a review")}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
