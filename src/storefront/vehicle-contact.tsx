import { useRef, useState } from "react";
import { api } from "../shared/client";
import { useI18n } from "../shared/i18n-react";
import type { Vehicle, Dealer } from "../shared/schemas";
import { Button } from "./ui/button";
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Checkbox, Input, Label, NativeSelect, Textarea } from "./ui/input";
import { VehicleQuoteRequest } from "./vehicle-quote-request";
export type PublicDealer = Pick<
  Dealer,
  | "_id"
  | "businessName"
  | "phone"
  | "whatsapp"
  | "email"
  | "address"
  | "location"
  | "website"
  | "description"
  | "hours"
>;
export function VehicleContact({
  vehicle,
  dealer,
  track,
}: {
  vehicle: Vehicle;
  dealer: PublicDealer | null;
  track: (channel: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [formError, setFormError] = useState(""),
    [mode, setMode] = useState<"message" | "quote">("message");
  const key = useRef("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vehicle) return;
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (!key.current) key.current = crypto.randomUUID();
    setBusy(true);
    setFormError("");
    try {
      await api("inquiries", {
        vehicleId: vehicle._id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        consent: data.consent === "on",
        kind: data.kind,
        preferredDate: data.preferredDate ?? "",
        honeypot: data.company ?? "",
        idempotencyKey: key.current,
      });
      setSent(true);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>
          {dealer?.businessName ?? t("Contact the dealership")}
        </CardTitle>
        {dealer?.address && <CardDescription>{dealer.address}</CardDescription>}
        {dealer?.hours && <CardDescription>{dealer.hours}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-5">
        {(dealer?.whatsapp || dealer?.phone || dealer?.email) && (
          <div className="flex flex-wrap gap-2">
            {dealer.whatsapp && (
              <Button asChild>
                <a
                  href={`https://wa.me/${dealer.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(t("Hello, I’m interested in {title}.", { title: vehicle.title }))}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track("whatsapp")}
                >
                  {t("WhatsApp")}
                </a>
              </Button>
            )}
            {dealer.phone && (
              <Button variant="outline" asChild>
                <a
                  href={`tel:${dealer.phone.replace(/[^+\d]/g, "")}`}
                  onClick={() => track("phone")}
                >
                  {t("Call")}
                </a>
              </Button>
            )}
            {dealer.email && (
              <Button variant="outline" asChild>
                <a
                  href={`mailto:${dealer.email}?subject=${encodeURIComponent(vehicle.title)}`}
                  onClick={() => track("email")}
                >
                  {t("Email")}
                </a>
              </Button>
            )}
          </div>
        )}
        {!vehicle.demo && vehicle.status !== "sold" && (
          <div
            role="group"
            aria-label={t("Contact options")}
            className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
          >
            {(
              [
                ["message", t("Ask a question")],
                ["quote", t("Request a quote")],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={mode === value ? "default" : "ghost"}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
        {vehicle.demo ? (
          <Alert>
            {t(
              "This is a sample listing, so inquiries are turned off. Browse the showroom again once real vehicles are published.",
            )}
          </Alert>
        ) : vehicle.status === "sold" ? (
          <Alert>
            {t(
              "This vehicle has been sold. Explore similar vehicles below.",
            )}
          </Alert>
        ) : (
          <>
            {/* Hidden, not unmounted, so switching tabs keeps what was typed. */}
            <div hidden={mode !== "quote"}>
              <VehicleQuoteRequest vehicle={vehicle} />
            </div>
            {mode === "message" &&
              (sent ? (
                <Alert role="status">
                  {t(
                    "Your request has been received. The dealership can follow up using your contact details.",
                  )}
                </Alert>
              ) : (
                <form onSubmit={submit} className="grid gap-4">
                  <h4 className="font-semibold">{t("Ask about this vehicle")}</h4>
                  <Label>
                    {t("Name")}
                    <Input
                      name="name"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </Label>
                  <Label>
                    {t("Email")}
                    <Input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </Label>
                  <Label>
                    {t("Phone (optional)")}
                    <Input
                      name="phone"
                      type="tel"
                      maxLength={40}
                      autoComplete="tel"
                    />
                  </Label>
                  <Label>
                    {t("Request type")}
                    <NativeSelect name="kind" required>
                      <option value="">{t("Select request type")}</option>
                      <option value="inquiry">{t("General inquiry")}</option>
                      <option value="test-drive">{t("Test drive")}</option>
                      <option value="trade-in">{t("Trade-in")}</option>
                    </NativeSelect>
                  </Label>
                  <Label>
                    {t("Preferred date (optional)")}
                    <Input type="date" name="preferredDate" />
                  </Label>
                  <Label>
                    {t("Message")}
                    <Textarea
                      name="message"
                      required
                      minLength={10}
                      maxLength={3000}
                      rows={4}
                      defaultValue={t(
                        "I’m interested in {title}. Please share more details.",
                        { title: vehicle.title },
                      )}
                    />
                  </Label>
                  <input
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    hidden
                  />
                  <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <Checkbox name="consent" required />
                    {t(
                      "I agree that the dealership may store my contact details and contact me about this vehicle.",
                    )}
                  </label>
                  {formError && (
                    <Alert variant="destructive" role="alert">
                      {t(formError)}
                    </Alert>
                  )}
                  <Button disabled={busy} pending={busy}>
                    {t("Send request")}
                  </Button>
                </form>
              ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
