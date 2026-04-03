"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const isDragging = useRef(false);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
    setSliderPos(pct);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateSlider(e.clientX);
    const onMove = (ev: MouseEvent) => { if (isDragging.current) updateSlider(ev.clientX); };
    const onUp = () => { isDragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden cursor-col-resize select-none shadow-2xl"
      onMouseDown={onMouseDown}
      onTouchMove={(e) => updateSlider(e.touches[0].clientX)}
    >
      <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img 
          src={before} 
          alt="Antes" 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ width: `${10000 / sliderPos}%`, maxWidth: "none" }} 
        />
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl" style={{ left: `${sliderPos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-primary">
          <div className="w-1 h-4 bg-primary/20 rounded-full mx-0.5" />
          <div className="w-1 h-6 bg-primary rounded-full mx-0.5" />
          <div className="w-1 h-4 bg-primary/20 rounded-full mx-0.5" />
        </div>
      </div>
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 text-white text-[10px] font-semibold capitalize rounded-full">Antes</div>
      <div className="absolute bottom-4 right-4 px-3 py-1 bg-primary text-white text-[10px] font-semibold capitalize rounded-full">Depois</div>
    </div>
  );
}
