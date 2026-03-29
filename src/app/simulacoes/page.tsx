"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  ChevronLeft,
  Check,
  Sparkles,
  Loader2,
  X,
  Camera,
  ImageIcon,
  RotateCcw,
  Plus,
  Save,
} from "lucide-react";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";
import { useRouter } from "next/navigation";

// ── Vita Shade Guide colors ──────────────────────────────────────────────────
const toothColors = [
  { id: "BL1", hex: "#FFFFFF", label: "BL1" },
  { id: "BL2", hex: "#F8F4EE", label: "BL2" },
  { id: "BL3", hex: "#F0E8D6", label: "BL3" },
  { id: "BL4", hex: "#E8DCBE", label: "BL4" },
  { id: "A1",  hex: "#E8D5A0", label: "A1"  },
];

const procedures = [
  { id: "Facetas",  label: "Facetas",  icon: "/icons/facetas.svg" },
  { id: "implante", label: "Implante", icon: "/icons/implante.svg" },
];

type Step = "tips" | "procedure" | "upload" | "result";

// ── Before/After slider component ────────────────────────────────────────────
function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
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

  const onTouchMove = (e: React.TouchEvent) => {
    updateSlider(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden cursor-col-resize select-none shadow-2xl"
      onMouseDown={onMouseDown}
      onTouchMove={onTouchMove}
    >
      {/* After (full width base) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-cover" />

      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Antes" className="absolute inset-0 w-full h-full object-cover" style={{ width: `${10000 / sliderPos}%`, maxWidth: "none" }} />
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.6)]"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-primary overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="DentixIA" className="w-full h-full object-contain p-1" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-gray-900/80 text-white text-xs font-bold rounded-full backdrop-blur-sm">Antes</div>
      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-full">Depois</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SimulationPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [step, setStep] = useState<Step>("tips");
  const [procedure, setProcedure] = useState<string>("Facetas");
  const [selectedColor, setSelectedColor] = useState<string>("BL1");

  const [imageBase64Full, setImageBase64Full] = useState<string | null>(null); // data:image/...;base64,XXX
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ── file handling ──────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64Full(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  // ── send to N8N ────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!imageBase64Full) return;
    setIsProcessing(true);

    try {
      const hex = toothColors.find(c => c.id === selectedColor)?.hex ?? "#FFFFFF";
      // Strip the data:image/...;base64, prefix
      const base64Pure = imageBase64Full.split(",")[1];

      const res = await fetch("https://webhook.vps.webartemodelos.com/webhook/dentixiapro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: base64Pure,
          vitacor: hex,
          procedure: procedure,
        }),
      });

      const json = await res.json();

      if (json.status === "error" || !json.data) {
        throw new Error(json.message || "Erro ao gerar simulação");
      }

      setResultBase64(`data:image/jpeg;base64,${json.data}`);
      setStep("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      notify("Erro na simulação", msg, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── save to Supabase (multi-tenant) ───────────────────────────────────────
  const handleSave = async () => {
    if (!imageBase64Full || !resultBase64) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar company_id do tenant do usuário
      const { data: ucData, error: ucError } = await supabase
        .from("user_company")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single();

      if (ucError || !ucData) throw new Error("Empresa não encontrada para este usuário");
      const companyId = ucData.company_id;

      // Helper: base64 data URL → Blob
      const b64ToBlob = (b64: string, type = "image/jpeg") => {
        const raw = b64.includes(",") ? b64.split(",")[1] : b64;
        const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
        return new Blob([bytes], { type });
      };

      const ts = Date.now();

      // Upload imagem original → simulacoes/{companyId}/original/{ts}.jpg
      const origBlob = b64ToBlob(imageBase64Full);
      const origPath = `${companyId}/original/${ts}.jpg`;
      await supabase.storage.from("simulacoes").upload(origPath, origBlob, { contentType: "image/jpeg" });
      const { data: { publicUrl: origUrl } } = supabase.storage.from("simulacoes").getPublicUrl(origPath);

      // Upload imagem simulada → simulacoes/{companyId}/simulada/{ts}.jpg
      const simBlob = b64ToBlob(resultBase64);
      const simPath = `${companyId}/simulada/${ts}.jpg`;
      await supabase.storage.from("simulacoes").upload(simPath, simBlob, { contentType: "image/jpeg" });
      const { data: { publicUrl: simUrl } } = supabase.storage.from("simulacoes").getPublicUrl(simPath);

      // Inserir no novo schema multi-tenant
      const { error: dbError } = await supabase.from("simulacoes").insert({
        company_id: companyId,
        created_by: user.id,
        procedimento: procedure,
        img_original_url: origUrl,
        img_simulada_url: simUrl,
      });

      if (dbError) throw dbError;

      notify("Simulação salva!", "Disponível em Minhas Simulações.", "success");
      router.push("/simulacoes/resultados");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      notify("Erro ao salvar", msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen pb-24 md:pb-8 bg-secondary-bg">

      {/* ── TIPS MODAL ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {step === "tips" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-center relative">
                <h2 className="text-xl font-black text-gray-800 tracking-widest uppercase">Dicas</h2>
                <Link href="/" className="absolute left-6 p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={24} className="text-gray-400" />
                </Link>
              </div>

              <div className="p-8 overflow-y-auto scrollbar-hide flex flex-col items-center">
                <p className="text-gray-500 text-center mb-8 max-w-md mx-auto leading-relaxed">
                  Para obter o melhor desempenho da tecnologia, capture suas fotos conforme o protocolo abaixo.
                </p>

                <div className="flex gap-4 mb-8">
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden shadow-lg">
                    <Image src="/wrong_tip.png" alt="Incorreto" fill className="object-cover" unoptimized />
                    <div className="absolute top-2 left-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                      <span className="text-white font-bold">✕</span>
                    </div>
                  </div>
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden shadow-lg">
                    <Image src="/correct_tip.png" alt="Correto" fill className="object-cover" unoptimized />
                    <div className="absolute top-2 left-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                      <Check size={18} className="text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>

                <ul className="space-y-4 text-gray-600 w-full max-w-md text-sm md:text-base mb-8">
                  {[
                    ["Iluminação:", "Garanta boa iluminação."],
                    ["Posição:", "O paciente deve estar sentado com a postura ereta, de costas para uma parede."],
                    ["Sorriso:", "Peça para o paciente sorrir."],
                    ["Ângulo:", "A câmera deve estar perpendicular ao rosto."],
                    ["Formatos:", "Use arquivos .jpeg ou .png."],
                  ].map(([key, val]) => (
                    <li key={key} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                      <span><strong>{key}</strong> {val}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setStep("procedure")}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-95"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto w-full px-6 py-8 md:pt-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => {
              if (step === "procedure") setStep("tips");
              else if (step === "upload") setStep("procedure");
              else if (step === "result") { setStep("upload"); setResultBase64(null); }
              else router.push("/");
            }}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold font-poppins text-gray-800">Nova Simulação</h1>

          {/* Step indicators */}
          {step !== "tips" && (
            <div className="ml-auto flex gap-2">
              {(["procedure", "upload", "result"] as Step[]).map((s, i) => (
                <div key={s} className={cn("w-2.5 h-2.5 rounded-full transition-colors", step === s ? "bg-primary" : i < ["procedure","upload","result"].indexOf(step) ? "bg-primary/40" : "bg-gray-200")} />
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP: PROCEDURE ──────────────────────────────────────────────── */}
          {step === "procedure" && (
            <motion.div key="procedure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-center text-gray-500 mb-8">Escolha um dos procedimentos abaixo para iniciar a simulação.</p>
              <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto mb-10">
                {procedures.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProcedure(p.id)}
                    className={cn(
                      "flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all duration-200",
                      procedure === p.id
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-gray-200 bg-white hover:border-primary/30"
                    )}
                  >
                    <div className="w-16 h-16 flex items-center justify-center">
                      <Image
                        src={p.id === "Facetas" ? "/facetas.svg" : "/implante.svg"}
                        alt={p.label}
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className={cn("font-bold text-sm", procedure === p.id ? "text-primary" : "text-gray-600")}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep("upload")}
                className="w-full max-w-sm mx-auto block bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-95"
              >
                Avançar
              </button>
            </motion.div>
          )}

          {/* ── STEP: UPLOAD ─────────────────────────────────────────────────── */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left: image area */}
                <section>
                  <div
                    className="glass-card p-6 rounded-3xl h-full flex flex-col items-center justify-center min-h-[380px] border-dashed border-2 border-primary/20 relative group overflow-hidden"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <AnimatePresence mode="wait">
                      {!imageBase64Full ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 text-center">
                          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="text-blue-500" size={32} />
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Arraste ou escolha uma foto</p>
                            <p className="text-gray-400 text-sm mt-1">PNG, JPG — sorriso frontal</p>
                          </div>
                          {/* Hidden inputs */}
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                          <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                          <div className="flex gap-3">
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                              <ImageIcon size={18} /> Galeria
                            </button>
                            <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-white border border-blue-200 text-blue-600 rounded-2xl font-bold text-sm hover:bg-blue-50 transition-all">
                              <Camera size={18} /> Câmera
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="preview" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full h-full flex items-center justify-center p-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageBase64Full} alt="Preview" className="max-w-full max-h-[320px] rounded-2xl object-cover shadow-xl" />
                          <button onClick={() => setImageBase64Full(null)} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors">
                            <X size={16} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>

                {/* Right: controls */}
                <section className="space-y-6 flex flex-col justify-center">
                  {/* Info procedimento */}
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <h2 className="text-sm font-bold text-primary mb-1">Procedimento selecionado</h2>
                    <p className="text-gray-700 font-semibold capitalize">{procedure}</p>
                  </div>

                  {/* Color picker */}
                  <div className="space-y-3">
                    <h2 className="text-base font-bold text-gray-700">Tom de Dente</h2>
                    <div className="grid grid-cols-5 gap-3">
                      {toothColors.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedColor(item.id)}
                          className={cn("flex flex-col items-center gap-2 transition-all duration-200", selectedColor === item.id ? "scale-105" : "opacity-70 hover:opacity-100")}
                        >
                          <div
                            className={cn("w-full aspect-square rounded-xl border-2 flex items-center justify-center shadow-sm transition-all", selectedColor === item.id ? "border-primary shadow-blue-200" : "border-gray-200")}
                            style={{ backgroundColor: item.hex }}
                          >
                            {selectedColor === item.id && <Check className="text-primary" size={18} strokeWidth={3} />}
                          </div>
                          <span className={cn("text-xs font-bold", selectedColor === item.id ? "text-primary" : "text-gray-400")}>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                    <h3 className="font-semibold text-primary mb-1 text-sm">Dica Pro</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Para melhores resultados, utilize fotos frontais com boa iluminação e afastadores labiais.
                    </p>
                  </div>

                  {/* Generate button */}
                  <button
                    disabled={!imageBase64Full || isProcessing}
                    onClick={handleGenerate}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-3.5 text-base font-semibold rounded-2xl text-white transition-all shadow-xl shadow-primary/20 active:scale-95",
                      !imageBase64Full || isProcessing
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {isProcessing ? (
                      <><Loader2 className="animate-spin text-white" size={24} /> Processando Sorriso...</>
                    ) : (
                      <><Sparkles size={24} className="text-white" /> Gerar Simulação IA</>
                    )}
                  </button>
                </section>
              </div>
            </motion.div>
          )}

          {/* ── STEP: RESULT ─────────────────────────────────────────────────── */}
          {step === "result" && resultBase64 && imageBase64Full && (
            <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="glass-card rounded-3xl p-4 md:p-6 space-y-4">
                <p className="text-center text-xs text-gray-400 italic">⚕️ O resultado real depende de fatores clínicos individuais.</p>
                <BeforeAfterSlider before={imageBase64Full} after={resultBase64} />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setStep("upload"); setResultBase64(null); }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-primary text-primary font-semibold hover:bg-primary/5 transition-all"
                >
                  <RotateCcw size={20} /> Refazer
                </button>
                <button
                  onClick={() => { setStep("procedure"); setResultBase64(null); setImageBase64Full(null); }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                >
                  <Plus size={20} /> Nova
                </button>
              </div>
              <button
                disabled={isSaving}
                onClick={handleSave}
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-3 text-base font-semibold rounded-2xl text-white transition-all shadow-xl shadow-primary/20 active:scale-95",
                  isSaving ? "bg-gray-300 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
                )}
              >
                {isSaving ? <><Loader2 className="animate-spin" size={22} /> Salvando...</> : <><Save size={22} /> Salvar Simulação</>}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
