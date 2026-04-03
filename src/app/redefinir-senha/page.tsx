"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isStrong = newPassword.length >= 8;
  const matches = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async () => {
    if (!isStrong) {
      notify("Senha fraca", "A senha deve ter pelo menos 8 caracteres.", "error");
      return;
    }
    if (!matches) {
      notify("Senhas diferentes", "As senhas não conferem.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSuccess(true);
      notify("Senha alterada!", "Sua senha foi atualizada com sucesso.", "success");
      setTimeout(() => router.push("/perfil"), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar senha";
      notify("Erro", msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary-bg items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[340px] bg-white rounded-3xl shadow-xl p-6 relative z-10"
      >
        {success ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="text-emerald-500" size={36} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Sua senha foi redefinida!</h2>
            <p className="text-sm text-gray-500">Redirecionando para o perfil...</p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
                <KeyRound size={32} className="text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-800">Redefinir Senha</h1>
              <p className="text-sm text-gray-400 mt-1 text-center">
                Crie uma nova senha para a sua conta
              </p>
            </div>

            {/* New password */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-500 capitalize tracking-wide block mb-1.5">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={cn(
                      "w-full py-3 px-4 pr-12 rounded-xl border text-sm font-medium outline-none transition-colors",
                      newPassword.length > 0
                        ? isStrong
                          ? "border-emerald-400 focus:border-emerald-500"
                          : "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-primary"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <p className={cn("text-xs mt-1.5", isStrong ? "text-emerald-600" : "text-red-500")}>
                    {isStrong ? "✓ Senha forte" : "✗ Mínimo 8 caracteres"}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 capitalize tracking-wide block mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className={cn(
                      "w-full py-3 px-4 pr-12 rounded-xl border text-sm font-medium outline-none transition-colors",
                      confirmPassword.length > 0
                        ? matches
                          ? "border-emerald-400 focus:border-emerald-500"
                          : "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-primary"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={cn("text-xs mt-1.5", matches ? "text-emerald-600" : "text-red-500")}>
                    {matches ? "✓ Senhas conferem" : "✗ Senhas não conferem"}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || !isStrong || !matches}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white transition-all",
                isLoading || !isStrong || !matches
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              )}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
              {isLoading ? "Salvando..." : "Salvar Nova Senha"}
            </button>

            <button
              onClick={() => router.back()}
              className="w-full mt-3 text-center text-sm text-gray-400 hover:text-gray-600 font-semibold py-2"
            >
              Cancelar
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
