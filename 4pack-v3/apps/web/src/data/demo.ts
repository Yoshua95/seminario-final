import type { CargoRequest, LogisticsOffer } from "@4pack/domain";

export const opportunities: CargoRequest[] = [
  {
    id: "CG-0241",
    title: "Marroquinería — Guangzhou",
    origin: "Guangzhou, China",
    destination: "CABA, Argentina",
    category: "Marroquinería",
    weightKg: 18.4,
    volumeM3: 0.31,
    fobUsd: 1280,
    status: "open",
    hazmatReviewRequired: false,
    offersCount: 4,
    createdAt: "2026-11-12T18:00:00-03:00"
  },
  {
    id: "CG-0242",
    title: "Accesorios electrónicos — Shenzhen",
    origin: "Shenzhen, China",
    destination: "Rosario, Argentina",
    category: "Electrónica",
    weightKg: 12.8,
    volumeM3: 0.18,
    fobUsd: 940,
    status: "open",
    hazmatReviewRequired: true,
    offersCount: 2,
    createdAt: "2026-11-12T19:30:00-03:00"
  }
];

export const offers: LogisticsOffer[] = [
  {
    id: "OF-0318",
    cargoId: "CG-0241",
    mode: "air",
    totalUsd: 565,
    estimatedDays: 12,
    includesCustoms: true,
    validUntil: "2026-11-16T18:00:00-03:00",
    operatorRating: 4.8
  },
  {
    id: "OF-0319",
    cargoId: "CG-0242",
    mode: "consolidated",
    totalUsd: 438,
    estimatedDays: 18,
    includesCustoms: false,
    validUntil: "2026-11-18T18:00:00-03:00",
    operatorRating: 4.8
  }
];

export const operations = [
  { id: "OP-0108", cargo: "Marroquinería — Guangzhou", route: "Guangzhou → CABA", status: "En tránsito", progress: 72 },
  { id: "OP-0102", cargo: "Textiles — Yiwu", route: "Yiwu → Córdoba", status: "Aduana", progress: 88 },
  { id: "OP-0096", cargo: "Repuestos — Ningbo", route: "Ningbo → Rosario", status: "Entregada", progress: 100 }
];

export const documents = [
  { name: "Factura comercial CG-0241.pdf", kind: "Factura", operation: "OP-0108", status: "Validado" },
  { name: "Packing list CG-0241.pdf", kind: "Packing list", operation: "OP-0108", status: "Validado" },
  { name: "MSDS baterías CG-0242.pdf", kind: "MSDS", operation: "CG-0242", status: "Pendiente" }
];
