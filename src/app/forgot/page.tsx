"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { useNotification } from "@/lib/NotificationContext";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { notify } = useNotification();

  useEffect(() => {
    console.log("Forgot Password Page Loaded");
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        notify("Erro na recuperação", error.message, "error");
      } else {
        notify("E-mail enviado!", "Verifique sua caixa de entrada para redefinir a senha.", "success");
        setSent(true);
      }
    } catch (err) {
      const error = err as Error;
      notify("Erro inesperado", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -ml-24 -mt-24 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl -mr-20 -mb-20"></div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[340px] relative z-10"
      >
        <Card className="p-6 border-white/40 shadow-2xl rounded-3xl">
          <CardHeader className="flex flex-col items-center mb-6">
            <Image src="/logo.png" alt="DentixIA" width={180} height={48} className="h-10 w-auto mb-4" priority />
            <h1 className="text-xl md:text-2xl font-black font-poppins text-gray-800 tracking-tight text-center">Recuperar Senha</h1>
            <p className="text-gray-400 text-sm mt-1 text-center font-medium">
              {sent 
                ? "Enviamos as instruções para o seu e-mail" 
                : "Informe seu e-mail cadastrado"}
            </p>
          </CardHeader>

          <CardContent>
            {!sent ? (
              <form onSubmit={handleReset} className="space-y-6">
                <Input
                  label="E-Mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  icon={<Mail size={20} />}
                />

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full mt-2"
                  rightIcon={<ArrowRight size={18} />}
                >
                  Enviar Instruções
                </Button>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="text-primary" size={32} />
                </div>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  Se este e-mail estiver cadastrado, você receberá um link de recuperação em instantes. 
                  Verifique também sua pasta de spam.
                </p>
                <Button 
                  onClick={() => setSent(false)}
                  variant="outline"
                  className="w-full py-4 rounded-2xl"
                >
                  Tentar outro e-mail
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-4">
            <Link 
              href="/login" 
              className="flex items-center justify-center gap-2 text-primary font-bold hover:underline w-full py-2"
            >
              <ArrowLeft size={16} /> Voltar para o Login
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
