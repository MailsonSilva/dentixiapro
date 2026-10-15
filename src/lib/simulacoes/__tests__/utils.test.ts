import { describe, it, expect } from "vitest";
import { toothColors, procedures } from "../utils";

describe("Simulações Utils", () => {
  it("deve conter todos os procedimentos estéticos suportados", () => {
    const ids = procedures.map(p => p.id);
    expect(ids).toContain("Facetas");
    expect(ids).toContain("Implante total");
    expect(ids).toContain("Implante parcial");
  });

  it("deve possuir lista de cores de dente com BL1 como padrão branco", () => {
    const bl1 = toothColors.find(c => c.id === "BL1");
    expect(bl1).toBeDefined();
    expect(bl1?.hex.toUpperCase()).toBe("#FFFFFF");
  });

  it("todas as cores devem ter formato hexadecimal válido", () => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    toothColors.forEach(color => {
      expect(color.hex).toMatch(hexRegex);
    });
  });
});
