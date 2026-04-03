import { useState, useEffect, useRef, useCallback } from "react";

interface UseConfirmActionOptions {
  timeout?: number; // ms, padrão 4000
}

interface UseConfirmActionReturn {
  isConfirming: boolean;
  progress: number; // 0-100, para barra de progresso
  trigger: () => void;
  cancel: () => void;
}

/**
 * Hook para ações destrutivas com confirmação de dois cliques.
 * Primeiro clique: entra em modo "confirming" com timer visual.
 * Segundo clique: executa a ação.
 * Timeout: volta ao idle automaticamente.
 */
export function useConfirmAction(
  action: () => Promise<void> | void,
  options?: UseConfirmActionOptions
): UseConfirmActionReturn {
  const timeout = options?.timeout ?? 4000;
  const [isConfirming, setIsConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cancel = useCallback(() => {
    setIsConfirming(false);
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setProgress(0);

    timerRef.current = setTimeout(() => {
      cancel();
    }, timeout);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / timeout) * 100, 100);
      setProgress(pct);
    }, 50);
  }, [timeout, cancel]);

  const trigger = useCallback(() => {
    if (!isConfirming) {
      setIsConfirming(true);
      startTimer();
    } else {
      cancel();
      // Executa a ação
      Promise.resolve(action()).catch(console.error);
    }
  }, [isConfirming, action, startTimer, cancel]);

  // Limpa timers ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isConfirming, progress, trigger, cancel };
}
