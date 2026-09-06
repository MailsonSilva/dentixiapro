"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RefreshCw,
  Check,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Review state
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

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
        throw new Error("Seu navegador não suporta acesso à câmera.");
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        // Ignora
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

  // Alterna entre câmera dianteira e traseira
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  // Captura o frame exatamente como visto na tela, sem inverter os lados
  const handleTakePhoto = () => {
    if (!videoRef.current || !viewportRef.current) return;
    const video = videoRef.current;
    const viewport = viewportRef.current;

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const videoAspect = vw / vh;

    const vpWidth = viewport.clientWidth || 360;
    const vpHeight = viewport.clientHeight || 540;
    const viewportAspect = vpWidth / vpHeight;

    let cropWidth: number;
    let cropHeight: number;
    let cropX: number;
    let cropY: number;

    if (videoAspect > viewportAspect) {
      cropHeight = vh;
      cropWidth = vh * viewportAspect;
      cropX = (vw - cropWidth) / 2;
      cropY = 0;
    } else {
      cropWidth = vw;
      cropHeight = vw / viewportAspect;
      cropX = 0;
      cropY = (vh - cropHeight) / 2;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropWidth);
    canvas.height = Math.round(cropHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Se câmera frontal estiver espelhada no visor (modo selfie),
    // a captura no canvas aplica a mesma orientação para que a foto NÃO inverta!
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const base64 = canvas.toDataURL("image/jpeg", 0.95);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "foto-paciente.jpg", { type: "image/jpeg" });
          setCapturedFile(file);
          setCapturedBase64(base64);
        }
      },
      "image/jpeg",
      0.95
    );
  };

  // Descarta foto e volta para a câmera
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
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop escuro */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90"
        />

        {/* Modal Limpo em Formato Vertical */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="relative bg-black rounded-2xl w-full max-w-md h-[88vh] max-h-[740px] overflow-hidden shadow-2xl flex flex-col z-10"
        >
          {/* Barra Superior Minimalista: Trocar Câmera (se houver) e Fechar */}
          <div className="absolute top-0 inset-x-0 p-3 flex items-center justify-between z-30 bg-gradient-to-b from-black/70 to-transparent">
            {hasMultipleCameras && !capturedBase64 ? (
              <button
                onClick={handleToggleFacingMode}
                className="p-2 text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-sm cursor-pointer transition-colors"
                title="Alternar entre câmera dianteira e traseira"
              >
                <RefreshCw size={18} />
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={onClose}
              className="p-2 text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-sm cursor-pointer transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Visor 100% Limpo */}
          <div
            ref={viewportRef}
            className="relative flex-1 w-full bg-black overflow-hidden flex items-center justify-center"
          >
            {cameraError ? (
              <div className="p-6 text-center max-w-xs flex flex-col items-center">
                <p className="text-xs text-slate-300 mb-4">
                  Não foi possível acessar a câmera.
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="w-full py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90"
                  >
                    Tentar Novamente
                  </button>
                  {onFallbackFileInput && (
                    <button
                      onClick={() => {
                        onClose();
                        onFallbackFileInput();
                      }}
                      className="w-full py-2.5 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                    >
                      Câmera do Aparelho
                    </button>
                  )}
                </div>
              </div>
            ) : capturedBase64 ? (
              /* Imagem Capturada */
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedBase64}
                  alt="Foto do Paciente"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              /* Vídeo Ao Vivo Limpo */
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover",
                    facingMode === "user" && "scale-x-[-1]"
                  )}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <RefreshCw className="animate-spin text-white" size={24} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra Inferior */}
          <div className="p-4 bg-black/90 flex items-center justify-center z-20">
            {capturedBase64 ? (
              /* Ações Pós-Captura: Apenas Tirar Outra ou Usar Foto */
              <div className="flex items-center justify-between w-full gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw size={15} />
                  Tirar Outra
                </button>

                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg"
                >
                  <Check size={16} />
                  Usar Foto
                </button>
              </div>
            ) : (
              /* Botão de Disparo */
              <button
                onClick={handleTakePhoto}
                disabled={isLoading || !!cameraError}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-90 transition-all cursor-pointer disabled:opacity-40"
                title="Tirar Foto"
              >
                <div className="w-12 h-12 rounded-full bg-white" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
