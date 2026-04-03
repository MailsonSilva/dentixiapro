/**
 * Helper: dataURL (Base64) to Blob
 */
export const base64ToBlob = (b64: string, type = "image/jpeg") => {
  const raw = b64.includes(",") ? b64.split(",")[1] : b64;
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
};

export const toothColors = [
  { id: "BL1", hex: "#FFFFFF", label: "BL1" },
  { id: "BL2", hex: "#F8F4EE", label: "BL2" },
  { id: "BL3", hex: "#F0E8D6", label: "BL3" },
  { id: "BL4", hex: "#E8DCBE", label: "BL4" },
  { id: "A1",  hex: "#E8D5A0", label: "A1"  },
];

export const procedures = [
  { id: "Facetas",  label: "Facetas",  icon: "/icons/facetas.svg" },
  { id: "implante", label: "Implante", icon: "/icons/implante.svg" },
];
