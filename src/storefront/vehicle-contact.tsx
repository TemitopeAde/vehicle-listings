import { useState } from "react";
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
import { VehicleQuoteRequest } from "./vehicle-quote-request";
import { VehicleInquiryForm } from "./vehicle-inquiry-form";
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
  const [mode, setMode] = useState<"message" | "quote">("message");
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
            {t("This vehicle has been sold. Explore similar vehicles below.")}
          </Alert>
        ) : (
          <>
            {/* Hidden, not unmounted, so switching tabs keeps what was typed. */}
            <div hidden={mode !== "quote"}>
              <VehicleQuoteRequest vehicle={vehicle} />
            </div>
            <div hidden={mode !== "message"}>
              <VehicleInquiryForm key={vehicle._id} vehicle={vehicle} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
