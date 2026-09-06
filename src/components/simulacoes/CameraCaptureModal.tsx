"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Camera,
  RefreshCw,
  Check,
  RotateCcw,
  FlipHorizontal,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { flipImageHorizontal } from "@/lib/simulacoes/utils";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, base64: string) => void;
  onFallbackFileInput?: () => void;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackFileInput
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Review state
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  // Interrompe qualquer stream ativo
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  // Inicia o stream da câmera
  const startCamera = useCallback(async (mode: "user" | "environment") => {
    setIsLoading(true);
    setCameraError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso direto à câmera.");
      }

      // Detecta se existem múltiplos dispositivos de vídeo
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        // Ignora erro de enumeração
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("Erro ao iniciar câmera:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Permissão de câmera negada ou dispositivo indisponível.";
      setCameraError(errMsg);
      setIsLoading(false);
    }
  }, [stopStream]);

  // Inicializa a câmera quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setCapturedBase64(null);
      setCapturedFile(null);
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  // Alterna entre câmera frontal e traseira
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  // Captura o frame atual do vídeo para um Canvas sem inverter os lados reais
  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // IMPORTANTE ANATÔMICO:
    // O vídeo direto do sensor captura a cena física real (como um observador externo vê o paciente).
    // O lado direito do paciente estará estritamente no lado direito correto do arquivo final.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.95);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "captura-camera.jpg", { type: "image/jpeg" });
          setCapturedFile(file);
          setCapturedBase64(base64);
        }
      },
      "image/jpeg",
      0.95
    );
  };

  // Permite inverter os lados (espelhar horizontalmente) na tela de revisão
  const handleFlipCaptured = async () => {
    if (!capturedFile && !capturedBase64) return;
    setIsFlipping(true);
    try {
      const source = capturedFile || capturedBase64!;
      const result = await flipImageHorizontal(source, "captura-camera-espelhada.jpg");
      setCapturedFile(result.file);
      setCapturedBase64(result.base64);
    } catch (e) {
      console.error("Erro ao inverter foto:", e);
    } finally {
      setIsFlipping(false);
    }
  };

  // Descarta foto e volta para o visor ao vivo
  const handleRetake = () => {
    setCapturedBase64(null);
    setCapturedFile(null);
    startCamera(facingMode);
  };

  // Confirma a foto capturada
  const handleConfirm = () => {
    if (capturedFile && capturedBase64) {
      onCapture(capturedFile, capturedBase64);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-slate-900 text-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[95vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 z-20">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-primary-cyan" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                {capturedBase64 ? "Revisar Foto do Paciente" : "Capturar Foto"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body / Viewport */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center max-w-xs flex flex-col items-center">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mb-3">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Câmera Indisponível</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Não conseguimos acessar o visor ao vivo no seu navegador.
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="w-full py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Tentar Novamente
                  </button>
                  {onFallbackFileInput && (
                    <button
                      onClick={() => {
                        onClose();
                        onFallbackFileInput();
                      }}
                      className="w-full py-2 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                      Usar Câmera Nativa do Aparelho
                    </button>
                  )}
                </div>
              </div>
            ) : capturedBase64 ? (
              /* Review Captured Image */
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedBase64}
                  alt="Captura"
                  className={cn(
                    "w-full h-full object-contain transition-all duration-300",
                    isFlipping && "opacity-50 scale-95"
                  )}
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium">
                  <Check size={12} /> Orientação Anatômica Real
                </div>
              </div>
            ) : (
              /* Live Video Feed */
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover",
                    // Espelha no visor apenas quando for frontal para sensação natural de espelho durante o alinhamento
                    facingMode === "user" && "scale-x-[-1]"
                  )}
                />

                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-2">
                    <RefreshCw className="animate-spin text-primary-cyan" size={24} />
                    <span className="text-xs text-slate-300">Iniciando visor...</span>
                  </div>
                )}

                {/* Guia de Enquadramento Odontológico (Linha Média e Arco de Sorriso) */}
                {!isLoading && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    {/* Linha vertical central (Linha média facial) */}
                    <div className="w-[1px] h-3/4 border-r border-dashed border-primary-cyan/40" />

                    {/* Retículo do sorriso */}
                    <div className="absolute w-44 h-24 sm:w-56 sm:h-32 border-2 border-primary-cyan/60 rounded-[40px] shadow-[0_0_15px_rgba(17,180,217,0.25)] flex items-center justify-center">
                      <span className="text-[10px] text-white/80 font-medium bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        Alinhe o Sorriso Aqui
                      </span>
                    </div>

                    {/* Dica de orientação na base do visor */}
                    <div className="absolute bottom-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-slate-200 border border-white/10 flex items-center gap-1.5 font-medium">
                      <Sparkles size={11} className="text-amber-300" />
                      Rosto ereto e perpendicular à câmera
                    </div>

                    {/* Badge da câmera atual */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-slate-300 border border-white/10">
                      {facingMode === "environment" ? "Câmera Traseira" : "Câmera Frontal"}
                    </div>
                  </div>
                )}

                {/* Botão de Alternar Câmera (Frontal / Traseira) */}
                {hasMultipleCameras && !isLoading && (
                  <button
                    onClick={handleToggleFacingMode}
                    className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer"
                    title="Alternar Câmera"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            {capturedBase64 ? (
              /* Review Actions */
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  {/* Botão Inverter Lados (Espelhar) */}
                  <button
                    onClick={handleFlipCaptured}
                    disabled={isFlipping}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <FlipHorizontal size={15} className="text-primary-cyan" />
                    Inverter Lados
                  </button>

                  {/* Botão Tirar Novamente */}
                  <button
                    onClick={handleRetake}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    Tirar Novamente
                  </button>
                </div>

                {/* Botão Confirmar Foto */}
                <button
                  onClick={handleConfirm}
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg cursor-pointer"
                >
                  <Check size={16} />
                  Confirmar e Usar Foto
                </button>
              </div>
            ) : (
              /* Live Capture Shutter Button */
              <div className="flex items-center justify-center py-1">
                <button
                  onClick={handleTakePhoto}
                  disabled={isLoading || !!cameraError}
                  className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-primary hover:bg-primary-glow active:scale-90 transition-all shadow-[0_0_20px_rgba(15,80,166,0.6)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
                  title="Tirar Foto"
                >
                  <div className="w-11 h-11 rounded-full bg-white group-hover:scale-95 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
