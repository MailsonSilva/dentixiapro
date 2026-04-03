"use client";

import { cn } from "@/lib/utils";
import { toothColors } from "@/lib/simulacoes/utils";
import { Check } from "lucide-react";

export function ColorPicker({ selectedId, onSelect }: { selectedId: string, onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {toothColors.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={cn("flex flex-col items-center gap-2", selectedId === item.id ? "scale-105" : "opacity-70")}
        >
          <div
            className={cn("w-full aspect-square rounded-xl border-2 flex items-center justify-center shadow-sm transition-all", selectedId === item.id ? "border-primary" : "border-gray-200")}
            style={{ backgroundColor: item.hex }}
          >
            {selectedId === item.id && <Check className="text-primary" size={18} strokeWidth={3} />}
          </div>
          <span className={cn("text-[10px] font-semibold", selectedId === item.id ? "text-primary" : "text-gray-400")}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
