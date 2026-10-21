import { VehicleDetailsPage } from "../storefront/vehicle-details-page";
export default function PromoVehicle() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  return <VehicleDetailsPage slug={slug} />;
}
