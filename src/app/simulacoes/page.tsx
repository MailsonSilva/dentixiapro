"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Sparkles, Loader2, RotateCcw, Plus, X,
  Upload, ImageIcon, Camera, Check, Save
} from "lucide-react";
import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNotification } from "@/lib/NotificationContext";

// SSD Layers
import { procedures } from "@/lib/simulacoes/utils";
import { gerarSimulacaoNativa, salvarSimulacaoConfirmada } from "@/lib/actions/simulacoes";

// UI Components
import { BeforeAfterSlider } from "@/components/simulacoes/BeforeAfterSlider";
import { ColorPicker } from "@/components/simulacoes/ColorPicker";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CameraCaptureModal } from "@/components/simulacoes/CameraCaptureModal";

// ─── Constants ───────────────────────────────────────────────────────────────
const LOADING_MESSAGES = [
  "Analisando imagens...",
  "Fazendo melhorias...",
];

// n8n removido — pipeline migrado para Server Action nativa (src/lib/actions/simulacoes.ts)

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null); // preview local
  const [urlOriginal, setUrlOriginal] = useState<string | null>(null);
  const [urlSimulada, setUrlSimulada] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [nomePaciente, setNomePaciente] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const handleSaveSimulation = async () => {
    if (!nomePaciente.trim() || !urlOriginal || !urlSimulada) return;
    setIsSaving(true);
    try {
      const res = await salvarSimulacaoConfirmada(
        nomePaciente,
        procedure,
        urlOriginal,
        urlSimulada,
        selectedColor
      );
      if (res.success) {
        notify("Sucesso", "Simulação salva com sucesso!", "success");
        setIsSaved(true);
        setShowSaveModal(false);
      } else {
        notify("Erro ao salvar", res.error || "Tente novamente.", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar.";
      notify("Erro ao salvar", msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const [permissionErrorModal, setPermissionErrorModal] = useState(false);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState("");
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Abertura do modal com visor WebRTC real e enquadramento odontológico
  const handleCameraCapture = () => {
    setIsCameraModalOpen(true);
  };

  // Recebe a foto capturada pelo CameraCaptureModal
  const handleCapturedPhoto = (file: File, base64: string) => {
    setImageFile(file);
    setImageBase64(base64);
  };

  const handleGallerySelect = () => {
    fileRef.current?.click();
  };

  const handleFile = async (file: File) => {
    try {
      setImageFile(file);
      const b64 = await fileToBase64(file);
      setImageBase64(b64);
    } catch (err: unknown) {
      console.error("Erro ao ler imagem:", err);
      setPermissionErrorMessage(
        "Não foi possível ler o arquivo da galeria. Verifique as permissões de armazenamento do seu dispositivo."
      );
      setPermissionErrorModal(true);
    }
  };

  // ── gerarSimulacaoNativa: pipeline completo em single-step ──────────────
  const handleGenerate = async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    try {
      // Mapeia os valores da UI para os aceitos pela Server Action (type TipoTratamento)
      const procedureMap: Record<string, "clareamento" | "faceta" | "implante_total" | "implante_parcial"> = {
        Clareamento: "clareamento",
        Facetas: "faceta",
        "Implante total": "implante_total",
        "Implante parcial": "implante_parcial",
      };
      const tipoTratamento = procedureMap[procedure] ?? "faceta";

      const fd = new FormData();
      fd.append("imagem", imageFile);
      fd.append("tipoTratamento", tipoTratamento);
      fd.append("corSelecionada", selectedColor);

      const resultado = await gerarSimulacaoNativa(fd);

      if (!resultado.success) {
        throw new Error(resultado.error ?? "Falha na simulação.");
      }

      // Pré-carrega a imagem simulada no browser antes de trocar o step.
      // Isso garante que quando o BeforeAfterSlider montar, a imagem já
      // está no cache do browser — zero delay visual na tela de resultado.
      if (resultado.urlSimulada) {
        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // resolve mesmo em erro — não bloqueia UX
          img.src = resultado.urlSimulada!;
        });
      }

      setUrlOriginal(resultado.urlOriginal ?? null);
      setUrlSimulada(resultado.urlSimulada ?? null);
      setStep("result");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha na simulação.";
      notify("Erro", msg, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Refazer: reutiliza o File em memória, re-chama a Server Action ────────────
  const handleRetry = async () => {
    setUrlSimulada(null);
    setUrlOriginal(null);
    setStep("upload");
    await handleGenerate();
  };

  // ── Nova Simulação: reset total ────────────────────────────────────
  const handleNewSimulation = () => {
    setImageFile(null);
    setImageBase64(null);
    setUrlOriginal(null);
    setUrlSimulada(null);
    setSelectedColor("BL1");
    setProcedure("Facetas");
    setIsProcessing(false);
    setIsSaved(false);
    setNomePaciente("");
    setStep("procedure");
  };

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full bg-secondary-bg overflow-hidden">
      <AnimatePresence>
        {step === "tips" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white rounded-xl w-full max-w-sm p-4 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1" />
                <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase text-center flex-1">Dicas</h2>
                <div className="flex-1 flex justify-end">
                  <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <p className="text-center text-gray-500 mb-3 font-medium text-xs leading-snug px-2">
                Para obter o melhor desempenho da tecnologia, capture suas fotos conforme o protocolo abaixo.
              </p>

              <div className="flex justify-center gap-3 mb-3">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden shadow-sm">
                  <div className="absolute -top-1 -left-1 z-10 bg-[#EF4444] rounded-full p-0.5 border border-white m-1">
                    <X className="text-white w-2.5 h-2.5" strokeWidth={3} />
                  </div>
                  <Image src={IMAGES.wrongTip} alt="Exemplo Incorreto" fill className="object-cover" />
                </div>
                <div className="relative w-20 h-20 rounded-lg overflow-hidden shadow-sm">
                  <div className="absolute -top-1 -left-1 z-10 bg-[#10B981] rounded-full p-0.5 border border-white m-1">
                    <Check className="text-white w-2.5 h-2.5" strokeWidth={3} />
                  </div>
                  <Image src={IMAGES.correctTip} alt="Exemplo Correta" fill className="object-cover" />
                </div>
              </div>

              <ul className="space-y-1.5 mb-4 text-xs text-gray-500 leading-snug px-1">
                <li className="flex items-start gap-1.5"><span className="font-bold text-gray-800 mt-[1px]">•</span> <span><strong className="text-gray-700">Iluminação:</strong> Garanta boa iluminação.</span></li>
                <li className="flex items-start gap-1.5"><span className="font-bold text-gray-800 mt-[2px]">•</span> <span><strong className="text-gray-700">Posição:</strong> O paciente deve estar ereto e encostado.</span></li>
                <li className="flex items-start gap-1.5"><span className="font-bold text-gray-800 mt-[2px]">•</span> <span><strong className="text-gray-700">Sorriso:</strong> Peça para o paciente sorrir.</span></li>
                <li className="flex items-start gap-1.5"><span className="font-bold text-gray-800 mt-[2px]">•</span> <span><strong className="text-gray-700">Ângulo:</strong> Câmera perpendicular ao rosto.</span></li>
              </ul>

              <button onClick={() => setStep("procedure")} className="w-full bg-[#0f50a6] h-9 rounded-xl text-white font-semibold hover:bg-[#0f50a6]/90 transition-all shadow-sm cursor-pointer text-xs">
                Continuar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto w-full px-3 py-4 flex flex-col flex-1 overflow-y-auto md:pt-20">
        <div className={cn("flex items-center gap-2 mb-4", step === "result" && "w-full max-w-2xl mx-auto")}>
          <button
            onClick={() => {
              if (step === "procedure") setStep("tips");
              else if (step === "upload") setStep("procedure");
              else if (step === "result") { setStep("upload"); }
            }}
            className="p-1 bg-white rounded-full cursor-pointer shadow-sm border border-gray-100"
          >
            <ChevronLeft size={16} />
          </button>
          <h1 className="text-base font-bold text-gray-800 capitalize tracking-tight">Simulação IA</h1>
        </div>

        <AnimatePresence mode="wait">
          {step === "procedure" && (
            <motion.div
              key="proc"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center justify-center min-h-[50vh] w-full max-w-sm mx-auto px-4 text-center"
            >
              <p className="text-xs text-slate-500 font-medium leading-tight mb-5 max-w-[280px]">
                Escolha um dos procedimentos abaixo para iniciar a simulação.
              </p>

              <div className="flex flex-wrap sm:flex-nowrap gap-3 justify-center w-full mb-6">
                {procedures.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProcedure(p.id)}
                    className={cn(
                      "flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm p-2",
                      procedure === p.id
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-md scale-105"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 relative mb-1.5">
                      <Image
                        src={p.id === "Facetas" ? "/facetas.svg" : "/implante.svg"}
                        alt={p.label}
                        fill
                        className="object-contain"
                        style={{
                          filter: procedure === p.id
                            ? "invert(24%) sepia(35%) saturate(3019%) hue-rotate(199deg) brightness(98%) contrast(97%)"
                            : "invert(40%) sepia(10%) saturate(200%) brightness(90%) contrast(85%)"
                        }}
                      />
                    </div>
                    <span className="font-semibold text-[11px] sm:text-xs text-center leading-tight capitalize">{p.label}</span>
                  </button>
                ))}
              </div>

              <button
                disabled={!procedure}
                onClick={() => setStep("upload")}
                className={cn(
                  "w-40 h-9 rounded-xl text-white font-semibold shadow-sm transition-all text-xs cursor-pointer",
                  procedure ? "bg-primary hover:bg-primary/90" : "bg-blue-400/60 cursor-not-allowed opacity-50"
                )}
              >
                Avançar
              </button>
            </motion.div>
          )}

          {step === "upload" && (
            <motion.div key="up" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <div className="flex flex-col gap-3">
                {/* Selected Procedure on top */}
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <h3 className="text-[9px] font-semibold capitalize text-primary mb-0.5 tracking-wider">Procedimento Selecionado</h3>
                  <p className="font-semibold text-gray-800 text-xs capitalize">{procedure}</p>
                </div>

                {/* Image Upload / Preview (No Topo) */}
                <div className={cn(
                  "bg-white p-3 rounded-xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300",
                  !imageBase64 ? "min-h-[220px]" : "min-h-[380px] sm:min-h-[440px]"
                )}>
                  {/* Loading overlay while processing */}
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div
                        key="loading-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl"
                      >
                        <LoadingTracker />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!imageBase64 ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Upload size={20} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleGallerySelect} className="px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer">
                          <ImageIcon size={14} /> Galeria
                        </button>
                        <button onClick={handleCameraCapture} className="px-3 py-1.5 border border-primary/20 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer">
                          <Camera size={14} /> Câmera
                        </button>
                      </div>
                      <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                      <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    </div>
                  ) : (
                    <div className="relative w-full h-full min-h-[360px] sm:min-h-[420px] flex items-center justify-center py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageBase64}
                        alt="Preview"
                        className="max-h-[360px] sm:max-h-[420px] w-auto rounded-xl shadow-md object-contain"
                      />
                      
                      {/* Botão de Remover Foto */}
                      <button
                        type="button"
                        onClick={() => {
                          setImageBase64(null);
                          setImageFile(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center w-7 h-7 p-0 shadow-lg cursor-pointer transition-all z-10"
                        title="Remover Foto"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Desired Color (ColorPicker - Logo Abaixo) */}
                <div className="my-4 py-2">
                  <h3 className="text-sm font-medium text-slate-500 leading-tight mb-3 text-center">Escolha o tom desejado:</h3>
                  <ColorPicker selectedId={selectedColor} onSelect={setSelectedColor} />
                </div>

                {/* Submit button */}
                <button
                  disabled={!imageFile || isProcessing}
                  onClick={handleGenerate}
                  className={cn(
                    "w-full h-9 rounded-xl text-white font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs",
                    !imageFile || isProcessing ? "bg-gray-300" : "bg-primary"
                  )}
                >
                  {isProcessing ? <><Loader2 className="animate-spin" size={14} /> Processando...</> : <><Sparkles size={14} /> Gerar Simulação</>}
                </button>
              </div>
            </motion.div>
          )}

          {step === "result" && (urlSimulada || urlOriginal) && (
            <motion.div 
              key="res" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center w-full gap-4 py-2"
            >
              {/* Slider: w-full sem max-width restritiva — ocupa toda a tela disponível */}
              <div className="w-full max-w-3xl bg-white p-0 rounded-2xl shadow-lg overflow-hidden border border-slate-100">
                <BeforeAfterSlider
                  before={urlOriginal ?? imageBase64!}
                  after={urlSimulada ?? ""}
                />
              </div>

              {/* Container de Botões */}
              <div className="w-full max-w-md space-y-3 mt-2">
                {/* Linha 1: + Nova | Refazer */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleNewSimulation}
                    className="h-10 rounded-xl font-semibold text-white capitalize text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: "#3C83F6" }}
                  >
                    <Plus size={14} /> Nova
                  </button>
                  <button
                    onClick={handleRetry}
                    disabled={isProcessing}
                    className="h-10 border-2 border-primary/20 rounded-xl font-semibold text-primary capitalize text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                    {isProcessing ? "Gerando..." : "Refazer"}
                  </button>
                </div>

                {/* Linha 2: Salvar Simulação */}
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={isSaved}
                  className={cn(
                    "w-full h-10 rounded-xl text-white font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all text-xs",
                    isSaved ? "bg-[#10B981] cursor-not-allowed opacity-90" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isSaved ? <><Check size={14} /> Salva com Sucesso</> : <><Save size={14} /> Salvar Simulação</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal para digitar o nome do paciente */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-sm">Salvar Simulação</h3>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="Nome do Paciente"
                  placeholder="Digite o nome..."
                  value={nomePaciente}
                  onChange={(e) => setNomePaciente(e.target.value)}
                  autoFocus
                />

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 h-9 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveSimulation}
                    loading={isSaving}
                    disabled={!nomePaciente.trim() || isSaving}
                    className="flex-1 h-9 text-xs font-semibold rounded-xl"
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Erro de Permissão de Câmera/Galeria */}
      <AnimatePresence>
        {permissionErrorModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPermissionErrorModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 text-center"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600">
                <Camera size={24} />
              </div>
              <h3 className="font-bold text-gray-800 text-base mb-2">Permissão Necessária</h3>
              <p className="text-gray-500 text-xs leading-relaxed mb-6">
                {permissionErrorMessage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPermissionErrorModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  Entendi
                </button>
                <button
                  onClick={() => {
                    setPermissionErrorModal(false);
                    handleCameraCapture();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-md"
                >
                  Tentar Novamente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Captura Profissional com Câmera WebRTC e Alinhamento Odontológico */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCapturedPhoto}
        onFallbackFileInput={() => camRef.current?.click()}
      />
    </div>
  );
}
