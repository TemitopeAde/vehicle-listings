import type { z } from "zod";
import { vehicleInput, type VehicleInput } from "../shared/schemas";
import { samplePhotoPath, samplePhotos } from "../shared/sample-photos";

export function createTestVehicle(
  context: Pick<z.input<typeof vehicleInput>, "dealerId" | "location" | "currency" | "media" | "videos">,
): VehicleInput {
  const photo = samplePhotos["Toyota Camry"];
  return vehicleInput.parse({
    ...context,
    title: "2022 Toyota Camry SE",
    stockId: `TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    make: "Toyota",
    model: "Camry",
    trim: "SE",
    year: 2022,
    condition: "used",
    firstRegistration: "2022-06-15",
    mileage: 32000,
    mileageUnit: "km",
    category: "car",
    price: 25000,
    originalPrice: 27000,
    negotiable: true,
    bodyStyle: "Sedan",
    transmission: "Automatic",
    fuel: "Petrol",
    drivetrain: "FWD",
    engineSize: "2.5L",
    horsepower: 203,
    doors: 4,
    seats: 5,
    exteriorColor: "Silver",
    interiorColor: "Black",
    emissionClass: "Euro 6",
    features: ["Rear-view camera", "Bluetooth", "Cruise control", "Alloy wheels", "ABS", "Airbags"],
    description: "Sample vehicle for testing. A 2022 Toyota Camry SE with automatic transmission, rear-view camera, Bluetooth and alloy wheels. Replace these details before publishing a real listing.",
    seoTitle: "2022 Toyota Camry SE",
    seoDescription: "Test listing: 2022 Toyota Camry SE, automatic, 32,000 km, with rear-view camera and Bluetooth.",
    media: context.media?.length || !photo
      ? context.media
      : [{
          url: samplePhotoPath(photo.file),
          alt: "Sample Toyota Camry photo",
          caption: "Sample photo for testing",
          credit: photo.credit,
          creditUrl: photo.creditUrl,
        }],
  });
}
