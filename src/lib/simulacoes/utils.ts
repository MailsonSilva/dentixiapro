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
  { id: "BL1", label: "BL1", hex: "#FFFFFF" },
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

/**
 * Inverte horizontalmente (espelhamento) uma imagem (File ou Base64) via Canvas
 * e retorna o novo objeto File e a nova string Base64 com preservação de qualidade.
 */
export async function flipImageHorizontal(
  source: File | string,
  fileName = "imagem_corrigida.jpg"
): Promise<{ file: File; base64: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Não foi possível inicializar contexto 2D"));
        }
        // Inversão horizontal anatômica
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);

        const newBase64 = canvas.toDataURL("image/jpeg", 0.95);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Falha ao gerar blob da imagem invertida"));
            }
            const newFile = new File([blob], fileName, { type: "image/jpeg" });
            resolve({ file: newFile, base64: newBase64 });
          },
          "image/jpeg",
          0.95
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Erro ao carregar imagem para espelhamento"));
    if (typeof source === "string") {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    }
  });
}

