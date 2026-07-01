"use client";

import { cn } from "@/lib/utils";
import { toothColors } from "@/lib/simulacoes/utils";
import { Check } from "lucide-react";

export function ColorPicker({ selectedId, onSelect }: { selectedId: string, onSelect: (id: string) => void }) {
  const allowedIds = ["BL1", "BL2", "BL3", "BL4", "A1"];
  const filteredColors = toothColors.filter((item) => allowedIds.includes(item.id));

  return (
    <div className="flex justify-center gap-3">
      {filteredColors.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={cn(
            "w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-sm transition-all relative shrink-0",
            selectedId === item.id ? "border-primary scale-105" : "border-gray-200 opacity-80"
          )}
          style={{ backgroundColor: item.hex }}
          title={item.label}
        >
          {selectedId === item.id && <Check className="text-primary" size={16} strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
