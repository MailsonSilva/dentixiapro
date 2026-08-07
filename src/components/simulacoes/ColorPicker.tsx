"use client";

import { cn } from "@/lib/utils";
import { toothColors } from "@/lib/simulacoes/utils";
import { Check } from "lucide-react";

// Cores muito claras que precisam de borda mais forte e check escuro
const LIGHT_COLOR_IDS = ["BL1"];

export function ColorPicker({ selectedId, onSelect }: { selectedId: string, onSelect: (id: string) => void }) {
  const allowedIds = ["BL1", "BL2", "BL3", "BL4", "A1"];
  const filteredColors = toothColors.filter((item) => allowedIds.includes(item.id));

  return (
    <div className="flex justify-center gap-3">
      {filteredColors.map((item) => {
        const isLight = LIGHT_COLOR_IDS.includes(item.id);
        const isSelected = selectedId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all relative shrink-0",
              isSelected
                ? "ring-2 ring-primary ring-offset-2 scale-105 border-2 border-primary/40"
                : isLight
                  ? "border-2 border-gray-300"
                  : "border-2 border-gray-200 opacity-80"
            )}
            style={{ backgroundColor: item.hex }}
            title={item.label}
          >
            {isSelected && (
              <Check
                className={isLight ? "text-gray-600" : "text-primary"}
                size={16}
                strokeWidth={3}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
