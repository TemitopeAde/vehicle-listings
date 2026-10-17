/**
 * Real photos for the sample inventory, bundled in `public/media/samples/` and sourced from
 * Wikimedia Commons. Every licence except CC0 requires the visible credit shown on the photo.
 */
export type SamplePhoto = { file: string; credit?: string; creditUrl?: string };
export const samplePhotos: Record<string, SamplePhoto> = {
  "Toyota Camry": {
    file: "toyota-camry",
    credit: "Photo: Dinkun Chen · CC BY-SA 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:TOYOTA_CAMRY_(XV70)_China_(146).jpg",
  },
  "Mercedes-Benz GLC 300": {
    file: "mercedes-glc",
    credit: "Photo: Matti Blume · CC BY-SA 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_GLC_300,_GIMS_2019,_Le_Grand-Saconnex_(GIMS1260).jpg",
  },
  "Lexus RX 350": {
    file: "lexus-rx",
    credit: "Photo: SsmIntrigue · CC BY-SA 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:2018_Lexus_RX350,_Front_Right,_10-22-2020.jpg",
  },
  "Honda Accord": {
    file: "honda-accord",
    credit: "Photo: User3204 · CC BY-SA 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:2023_GAC-Honda_Accord_e%EA%9E%89PHEV.jpg",
  },
  "BMW 320i": {
    file: "bmw-320i",
    credit: "Photo: Damian B Oh · CC BY-SA 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:BMW_G20_320i_Black_Sapphire_Metallic_(3).jpg",
  },
  "Toyota Land Cruiser": { file: "toyota-land-cruiser" },
  "Kia Picanto": {
    file: "kia-picanto",
    credit: "Photo: Bindydad123 · CC BY-SA 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:2019_Kia_Picanto_1.2_EX_(7).jpg",
  },
  "Toyota Hilux": {
    file: "toyota-hilux",
    credit: "Photo: الدعوة السلفية في السعودية 2025 · CC BY-SA 4.0",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Toyota_Hilux_2022.jpg",
  },
  "Tesla Model 3": {
    file: "tesla-model-3",
    credit: "Photo: AuHaidhausen · CC BY 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:Tesla_Model_3_in_M%C3%BCnchen_geparkt.jpg",
  },
  "Hyundai Tucson": {
    file: "hyundai-tucson",
    credit: "Photo: Alexander Migl · CC BY-SA 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:Hyundai_Tucson_(NX4)_1X7A0424.jpg",
  },
  "Ford Transit": {
    file: "ford-transit",
    credit: "Photo: Elise240SX · CC BY-SA 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:2020_Ford_Transit_350_XLT_Passenger_Van_in_Oxford_White,_Front_Right,_05-21-2022.jpg",
  },
  "Ford Mustang": {
    file: "ford-mustang",
    credit: "Photo: Calreyn88 · CC BY-SA 4.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:2018_Ford_Mustang_GT_2.jpg",
  },
  "Scania R 450": {
    file: "scania-r450",
    credit: "Photo: Lav Ulv · CC BY 2.0",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:Scania_R_450_Highline_Euro6_6X2_4_(R-Series_6).jpg",
  },
  "Schmitz Cargobull S.CS Universal": {
    file: "schmitz-cargobull",
    credit: "Photo: High Contrast · CC BY 3.0 de",
    creditUrl:
      "https://commons.wikimedia.org/wiki/File:Schmitz_LKW-Anh%C3%A4nger.JPG",
  },
};
export const samplePhotoPath = (file: string) => `/media/samples/${file}.jpg`;
export const isSamplePhotoPath = (url: string) =>
  /^\/media\/samples\/[a-z0-9-]+\.jpg$/.test(url);
