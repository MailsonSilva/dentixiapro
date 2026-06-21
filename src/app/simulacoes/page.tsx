"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Sparkles, Loader2, Save, RotateCcw, Plus, X,
  Upload, ImageIcon, Camera, Check
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNotification } from "@/lib/NotificationContext";

// SSD Layers
import { procedures, toothColors } from "@/lib/simulacoes/utils";
import {
  saveSimulationAction
} from "@/lib/simulacoes/actions";

// UI Components
import { BeforeAfterSlider } from "@/components/simulacoes/BeforeAfterSlider";
import { ColorPicker } from "@/components/simulacoes/ColorPicker";

// ─── Constants ───────────────────────────────────────────────────────────────
const LOADING_MESSAGES = [
  "Analisando imagens...",
  "Fazendo melhorias...",
];

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!;

type Step = "tips" | "procedure" | "upload" | "result";

// ─── Utilities ───────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractPureBase64(dataUri: string): string {
  return dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
}

function getColorHex(colorId: string): string {
  return toothColors.find((c) => c.id === colorId)?.hex ?? "#F7F5EC";
}

// ─── Loading Tracker ─────────────────────────────────────────────────────────
function LoadingTracker() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={28} className="text-primary animate-pulse" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="text-sm font-semibold text-gray-600 tracking-wide text-center px-4"
        >
          {LOADING_MESSAGES[msgIndex]}
        </motion.p>
      </AnimatePresence>

      <div className="flex gap-1.5">
        {LOADING_MESSAGES.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-500",
              i === msgIndex ? "bg-primary scale-125" : "bg-gray-300"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SimulationPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [step, setStep] = useState<Step>("tips");
  const [procedure, setProcedure] = useState<string>("Facetas");
  const [selectedColor, setSelectedColor] = useState<string>("BL1");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [patientName, setPatientName] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const b64 = await fileToBase64(file);
    setImageBase64(b64);
  };

  // ── Webhook pipeline ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!imageBase64) return;
    setIsProcessing(true);
    try {
      const colorHex = getColorHex(selectedColor);
      const pureBase64 = extractPureBase64(imageBase64);

      // Normaliza casing: API espera "Facetas" ou "implante"
      const procedureValue = procedure === "Implante" ? "implante" : procedure;

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: pureBase64,
          vitacor: colorHex,
          procedure: procedureValue,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro no servidor de IA: ${response.status}`);
      }

      const json = await response.json();

      // n8n retorna array: [{ data: "base64...", status, message }]
      // Normaliza: aceita array ou objeto direto
      const payload = Array.isArray(json) ? json[0] : json;

      if (!payload) throw new Error("Resposta vazia do servidor de IA.");

      // Tenta campos conhecidos em ordem de prioridade
      const rawResult: string | null =
        payload?.imagemBase64 ??
        payload?.output_image ??
        payload?.imagem_depois ??
        payload?.data ??
        (typeof payload === "string" ? payload : null);

      if (!rawResult || typeof rawResult !== "string") {
        throw new Error("Imagem não encontrada na resposta do servidor de IA.");
      }

      // Remove prefixo duplicado se vier "data:image/png;base64,data:image/png;base64,..."
      const cleanBase64 = rawResult.replace(/^(data:image\/[^;]+;base64,)+/, "");

      // Garante Data URI válida e limpa
      const resultDataUri = `data:image/png;base64,${cleanBase64}`;

      setResultBase64(resultDataUri);
      setStep("result");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha na simulação.";
      notify("Erro", msg, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Refazer: reutiliza estados em memória, re-chama webhook ───────────────
  const handleRetry = async () => {
    setResultBase64(null);
    setStep("upload"); // mostra loading overlay durante o re-fetch
    await handleGenerate();
  };

  // ── Nova Simulação: reset total de todos os estados ───────────────────────
  const handleNewSimulation = () => {
    setImageBase64(null);
    setResultBase64(null);
    setPatientName("");
    setSelectedColor("BL1");
    setProcedure("Facetas");
    setIsProcessing(false);
    setStep("procedure");
  };

  // ── Save to Storage + DB ──────────────────────────────────────────────────
  const handleSave = async () => {
    console.log("handleSave debug info:", {
      hasImageBase64: !!imageBase64,
      hasResultBase64: !!resultBase64,
      patientName,
    });
    
    if (!imageBase64 || !resultBase64) {
      notify("Erro", "Imagens original ou simulada ausentes.", "error");
      return;
    }
    
    setIsSaving(true);
    try {
      if (typeof imageBase64 !== "string") {
        throw new Error("Imagem original inválida.");
      }
      if (typeof resultBase64 !== "string") {
        throw new Error("Imagem simulada inválida.");
      }
      if (!patientName || !patientName.trim()) {
        throw new Error("Nome do paciente é obrigatório.");
      }

      const base64Antes = extractPureBase64(imageBase64);
      const base64Depois = extractPureBase64(resultBase64);

      const formData = new FormData();
      formData.append("nome_paciente", patientName.trim());
      formData.append("procedimento", procedure);
      formData.append("imagem_original", base64Antes);
      formData.append("imagem_simulada", base64Depois);
      formData.append("cor", getColorHex(selectedColor));

      await saveSimulationAction(formData);

      notify("Sucesso", "Simulação salva!", "success");
      router.push("/simulacoes/resultados");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar simulação.";
      notify("Erro", msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen pb-24 md:pb-8 bg-secondary-bg">
      <AnimatePresence>
        {step === "tips" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1" />
                <h2 className="text-lg font-bold text-gray-800 tracking-wide uppercase text-center flex-1">Dicas</h2>
                <div className="flex-1 flex justify-end">
                  <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <p className="text-center text-gray-600 mb-8 font-medium text-sm leading-relaxed px-4">
                Para obter o melhor desempenho da tecnologia, capture suas fotos conforme o protocolo abaixo.
              </p>

              <div className="flex justify-center gap-6 mb-8">
                <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-md">
                  <div className="absolute -top-1 -left-1 z-10 bg-[#EF4444] rounded-full p-1 border-2 border-white m-2">
                    <X size={16} className="text-white" strokeWidth={3} />
                  </div>
                  <Image src="/wrong_tip.png" alt="Exemplo Incorreto" fill className="object-cover" />
                </div>
                <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-md">
                  <div className="absolute -top-1 -left-1 z-10 bg-[#10B981] rounded-full p-1 border-2 border-white m-2">
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </div>
                  <Image src="/correct_tip.png" alt="Exemplo Correta" fill className="object-cover" />
                </div>
              </div>

              <ul className="space-y-4 mb-8 text-sm text-gray-600 px-2">
                <li className="flex items-start gap-2"><span className="font-bold text-gray-800 mt-[2px]">•</span> <span><strong className="text-gray-800">Iluminação:</strong> Garanta boa iluminação.</span></li>
                <li className="flex items-start gap-2"><span className="font-bold text-gray-800 mt-[2px]">•</span> <span><strong className="text-gray-800">Posição:</strong> O paciente deve estar sentado com a postura ereta, de costas para uma parede.</span></li>
                <li className="flex items-start gap-2"><span className="font-bold text-gray-800 mt-[2px]">•</span> <span><strong className="text-gray-800">Sorriso:</strong> Peça para o paciente sorrir.</span></li>
                <li className="flex items-start gap-2"><span className="font-bold text-gray-800 mt-[2px]">•</span> <span><strong className="text-gray-800">Ângulo:</strong> A câmera deve estar perpendicular ao rosto.</span></li>
                <li className="flex items-start gap-2"><span className="font-bold text-gray-800 mt-[2px]">•</span> <span><strong className="text-gray-800">Formatos:</strong> Use arquivos .jpeg ou .png.</span></li>
              </ul>

              <button onClick={() => setStep("procedure")} className="w-full bg-[#0f50a6] py-3.5 rounded-xl text-white font-semibold hover:bg-[#0f50a6]/90 transition-all shadow-md cursor-pointer text-sm">
                Continuar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 md:pt-20">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => {
              if (step === "procedure") setStep("tips");
              else if (step === "upload") setStep("procedure");
              else if (step === "result") { setStep("upload"); setResultBase64(null); }
            }}
            className="p-2 bg-white rounded-full cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-800 capitalize tracking-tight">Simulação IA</h1>
        </div>

        <AnimatePresence mode="wait">
          {step === "procedure" && (
            <motion.div key="proc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6 max-w-sm mx-auto">
              <div className="grid grid-cols-2 gap-6">
                {procedures.map((p) => (
                  <button key={p.id} onClick={() => setProcedure(p.id)} className={cn("flex flex-col items-center gap-4 p-8 rounded-[32px] border-2 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer font-['Poppins']", procedure === p.id ? "border-[#0f50a6] bg-[#0f50a6]/5 shadow-xl" : "border-gray-200 bg-white")}>
                    <div className="w-16 h-16 relative">
                      <Image src={p.id === "Facetas" ? "/facetas.svg" : "/implante.svg"} alt={p.label} fill className="object-contain" style={{ filter: "invert(24%) sepia(35%) saturate(3019%) hue-rotate(199deg) brightness(98%) contrast(97%)" }} />
                    </div>
                    <span className="font-semibold text-sm capitalize text-[#0f50a6]">{p.label}</span>
                  </button>
                ))}
              </div>
              <button disabled={!procedure} onClick={() => setStep("upload")} className="w-full py-4 bg-primary text-white rounded-2xl font-semibold shadow-xl hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer">
                Avançar
              </button>
            </motion.div>
          )}

          {step === "upload" && (
            <motion.div key="up" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold capitalize text-gray-400 tracking-wider font-['Poppins']">Paciente</h3>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nome do paciente"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50/55 outline-none text-base font-medium text-gray-700 placeholder-gray-400 font-['Poppins'] focus:border-[#0f50a6]/50 focus:bg-white transition-all"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Image Upload / Preview */}
                <div className="bg-white p-6 rounded-[32px] border-2 border-dashed border-primary/20 min-h-[380px] flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Loading overlay while processing */}
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div
                        key="loading-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-[28px]"
                      >
                        <LoadingTracker />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!imageBase64 ? (
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Upload size={32} />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => fileRef.current?.click()} className="px-5 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 cursor-pointer">
                          <ImageIcon size={18} /> Galeria
                        </button>
                        <button onClick={() => camRef.current?.click()} className="px-5 py-3 border border-primary/20 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer">
                          <Camera size={18} /> Câmera
                        </button>
                      </div>
                      <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                      <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageBase64} alt="Preview" className="max-h-[300px] rounded-2xl shadow-xl" />
                      <button onClick={() => setImageBase64(null)} className="absolute top-0 right-0 p-2 bg-red-500 text-white rounded-full shadow-lg cursor-pointer">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Config Panel */}
                <div className="space-y-8">
                  <div className="p-5 bg-primary/5 rounded-3xl border border-primary/10">
                    <h3 className="text-[10px] font-semibold capitalize text-primary mb-1 tracking-wider">Procedimento Selecionado</h3>
                    <p className="font-semibold text-gray-800 capitalize">{procedure}</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold capitalize text-gray-400 tracking-wider font-['Poppins']">Tom desejado</h3>
                    <ColorPicker selectedId={selectedColor} onSelect={setSelectedColor} />
                  </div>
                  <button
                    disabled={!imageBase64 || !patientName.trim() || isProcessing}
                    onClick={handleGenerate}
                    className={cn(
                      "w-full py-4 rounded-2xl text-white font-semibold transition-all shadow-xl flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                      !imageBase64 || !patientName.trim() || isProcessing ? "bg-gray-300" : "bg-primary"
                    )}
                  >
                    {isProcessing ? <><Loader2 className="animate-spin" /> Processando...</> : <><Sparkles size={20} /> Gerar Simulação</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "result" && resultBase64 && imageBase64 && (
            <motion.div key="res" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="bg-white p-6 rounded-[40px] shadow-2xl overflow-hidden [&_img]:object-contain">
                <BeforeAfterSlider before={imageBase64} after={resultBase64} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleRetry}
                  disabled={isProcessing}
                  className="py-4 border-2 border-primary/20 rounded-2xl font-semibold text-primary capitalize text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                  {isProcessing ? "Gerando..." : "Refazer"}
                </button>
                <button
                  onClick={handleNewSimulation}
                  className="py-4 border-2 border-[#FB923C] bg-[#FB923C] rounded-2xl font-semibold text-white capitalize text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-[#FB923C]/90 shadow-lg transition-all"
                >
                  <Plus size={18} /> Nova
                </button>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={cn("w-full py-4 rounded-2xl text-white font-semibold shadow-xl flex items-center justify-center gap-3 cursor-pointer", isSaving ? "bg-gray-300" : "bg-primary")}
              >
                {isSaving ? <><Loader2 className="animate-spin" /> Salvando...</> : <><Save size={20} /> Salvar Simulação</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
