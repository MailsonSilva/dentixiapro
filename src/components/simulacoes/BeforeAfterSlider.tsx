"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { IMAGES } from "@/lib/images";

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

  // Mouse drag
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    updateSlider(e.clientX);
    const onMove = (ev: MouseEvent) => { if (isDragging.current) updateSlider(ev.clientX); };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [updateSlider]);

  // Touch drag — passive:false para preventDefault funcionar no PWA Mobile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      isDragging.current = true;
      updateSlider(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault(); // impede scroll conflitante
      updateSlider(e.touches[0].clientX);
    };
    const onTouchEnd = () => { isDragging.current = false; };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [updateSlider]);

  // clipPath corta a imagem "before" sem divisão — sem risco de Infinity
  const clipRight = 100 - sliderPos;

  return (
    <div
      ref={containerRef}
      // h-[60dvh]: ocupa 60% da viewport dinâmica — grande parte da tela no mobile
      // max-h-[700px]: limita em desktops grandes para não distorcer
      className="relative w-full h-[60dvh] max-h-[700px] rounded-2xl overflow-hidden cursor-col-resize select-none shadow-2xl bg-slate-100"
      onMouseDown={onMouseDown}
    >
      {/* Camada DEPOIS — fundo completo — priority: carrega imediatamente sem lazy-load */}
      <Image
        src={after}
        alt="Depois"
        fill
        unoptimized
        priority
        sizes="100vw"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Camada ANTES — clipada pela direita via clipPath — priority: sem delay */}
      <Image
        src={before}
        alt="Antes"
        fill
        unoptimized
        priority
        sizes="100vw"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ clipPath: `inset(0 ${clipRight}% 0 0)` }}
        draggable={false}
      />

      {/* Linha divisória */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary overflow-hidden p-1 pointer-events-none">
          <Image
            src={IMAGES.logoIcon}
            alt="Drag"
            width={20}
            height={20}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 text-white text-xs font-semibold capitalize rounded-full pointer-events-none backdrop-blur-sm">Antes</div>
      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-primary text-white text-xs font-semibold capitalize rounded-full pointer-events-none backdrop-blur-sm">Depois</div>
    </div>
  );
}

