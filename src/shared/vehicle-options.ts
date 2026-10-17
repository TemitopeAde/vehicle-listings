export const carMakes = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "BYD",
  "Cadillac",
  "Changan",
  "Chery",
  "Chevrolet",
  "Chrysler",
  "Citroën",
  "Dodge",
  "Ferrari",
  "Fiat",
  "Ford",
  "GAC",
  "Geely",
  "Genesis",
  "GMC",
  "Great Wall",
  "Haval",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Innoson",
  "Isuzu",
  "JAC",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "MG",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Opel",
  "Peugeot",
  "Porsche",
  "Ram",
  "Renault",
  "Rolls-Royce",
  "Skoda",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
];
export const vehicleCategories = ["car", "lorry", "trailer"] as const;
export type VehicleCategory = (typeof vehicleCategories)[number];
export const categoryLabels: Record<VehicleCategory, string> = {
  car: "Car",
  lorry: "Heavy duty lorry",
  trailer: "Trailer",
};
export const bodyStylesByCategory = {
  car: [
    "Sedan",
    "SUV",
    "Hatchback",
    "Coupe",
    "Truck",
    "Van",
    "Convertible",
    "Wagon",
  ],
  lorry: [
    "Tractor unit",
    "Tipper",
    "Box truck",
    "Flatbed truck",
    "Curtainsider truck",
    "Refrigerated truck",
    "Tanker truck",
    "Crane truck",
    "Concrete mixer",
    "Recovery truck",
  ],
  trailer: [
    "Flatbed trailer",
    "Curtainsider trailer",
    "Box trailer",
    "Refrigerated trailer",
    "Tanker trailer",
    "Tipper trailer",
    "Lowboy trailer",
    "Car transporter",
    "Container chassis",
    "Livestock trailer",
  ],
} as const satisfies Record<VehicleCategory, readonly string[]>;
export const bodyStyles = Object.values(bodyStylesByCategory).flat() as [
  string,
  ...string[],
];
export const lorryMakes = [
  "DAF",
  "FAW",
  "Foton",
  "Freightliner",
  "Hino",
  "Howo",
  "Isuzu",
  "Iveco",
  "Kenworth",
  "Mack",
  "MAN",
  "Mercedes-Benz",
  "Mitsubishi Fuso",
  "Peterbilt",
  "Renault Trucks",
  "Scania",
  "Shacman",
  "Sinotruk",
  "UD Trucks",
  "Volvo",
];
export const trailerMakes = [
  "CIMC",
  "Fruehauf",
  "Great Dane",
  "Kässbohrer",
  "Kögel",
  "Krone",
  "Schmitz Cargobull",
  "Schwarzmüller",
  "Utility",
  "Wabash",
  "Wielton",
];
const makesByCategory: Record<VehicleCategory, readonly string[]> = {
  car: carMakes,
  lorry: lorryMakes,
  trailer: trailerMakes,
};
/** Trailers have no engine, cab or odometer-style drivetrain specs. */
export const isTrailer = (category: string) => category === "trailer";
/** Lorries and trailers list axles, weights and length. */
export const isCommercial = (category: string) =>
  category === "lorry" || category === "trailer";
/** Why a body type can't be used for a category, if it can't. */
export function bodyStyleError(category: VehicleCategory, bodyStyle: string) {
  const styles: readonly string[] = bodyStylesByCategory[category];
  return styles.includes(bodyStyle)
    ? undefined
    : `"${bodyStyle}" is not a ${categoryLabels[category].toLowerCase()} body type.`;
}
/** Model years from next year back to 1960, newest first. */
export function modelYears(oldest = 1960) {
  const newest = new Date().getUTCFullYear() + 1;
  return Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i);
}

/** Suggested makes for a category (all categories when empty) plus the given values. */
export function makeOptions(values: readonly string[] = [], category = "") {
  const suggested =
    category in makesByCategory
      ? makesByCategory[category as VehicleCategory]
      : Object.values(makesByCategory).flat();
  return [
    ...new Set(
      [...suggested, ...values].map((value) => value.trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "en"));
}
