interface VehicleClassPresentation {
  label: string;
  description: string;
  freightProxy: boolean;
}

const UNKNOWN_CLASS: VehicleClassPresentation = {
  label: "Bilinmeyen araç sınıfı",
  description: "Fintraffic sınıf kataloğunda karşılığı bulunmayan kod.",
  freightProxy: false,
};

const FINTRAFFIC_VEHICLE_CLASSES: Record<number, VehicleClassPresentation> = {
  1: {
    label: "Otomobil / paket araç",
    description: "HA-PA: otomobil veya hafif teslimat aracı.",
    freightProxy: false,
  },
  2: {
    label: "Kamyon",
    description: "KAIP: römorksuz kamyon.",
    freightProxy: true,
  },
  3: {
    label: "Otobüs",
    description: "Toplu yolcu taşımacılığında kullanılan otobüs.",
    freightProxy: false,
  },
  4: {
    label: "Yarı römorklu kamyon",
    description: "KAPP: yarı römorklu ağır araç kombinasyonu.",
    freightProxy: true,
  },
  5: {
    label: "Römorklu kamyon",
    description: "KATP: tam römorklu ağır araç kombinasyonu.",
    freightProxy: true,
  },
  6: {
    label: "Hafif araç + römork",
    description: "HA + PK: otomobil veya paket araç ve römork.",
    freightProxy: false,
  },
  7: {
    label: "Karavan sınıfı",
    description: "HA + AV: hafif araç/karavan kombinasyonu.",
    freightProxy: false,
  },
  8: {
    label: "Motosiklet / moped",
    description: "MP: motosiklet ve mopedler.",
    freightProxy: false,
  },
  9: {
    label: "HCT ağır taşıt",
    description: "HCT: yüksek kapasiteli ağır taşıt kombinasyonu.",
    freightProxy: true,
  },
};

export function getVehicleClassPresentation(
  vehicleClass: number,
): VehicleClassPresentation {
  return FINTRAFFIC_VEHICLE_CLASSES[vehicleClass] ?? UNKNOWN_CLASS;
}
