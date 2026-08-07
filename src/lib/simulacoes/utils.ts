export interface ProcedureItem {
  id: string;
  label: string;
}

export const procedures: ProcedureItem[] = [
  { id: "Facetas", label: "Facetas" },
  { id: "Implante total", label: "Implante total" },
  { id: "Implante parcial", label: "Implante parcial" }
];

export interface ToothColorItem {
  id: string;
  label: string;
  hex: string;
}

export const toothColors: ToothColorItem[] = [
  { id: "BL1", label: "BL1", hex: "#F7F5EC" },
  { id: "BL2", label: "BL2", hex: "#F3EFE0" },
  { id: "BL3", label: "BL3", hex: "#EFEBD8" },
  { id: "BL4", label: "BL4", hex: "#EAE6D0" },
  { id: "A1", label: "A1", hex: "#ECE4C5" },
  { id: "A2", label: "A2", hex: "#E7DCB9" },
  { id: "A3", label: "A3", hex: "#E2D3AD" },
  { id: "B1", label: "B1", hex: "#EDE7CD" },
  { id: "B2", label: "B2", hex: "#E9DFBF" },
  { id: "B3", label: "B3", hex: "#E4D6B1" }
];

