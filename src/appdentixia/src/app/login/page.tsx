"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { useNotification } from "@/lib/NotificationContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { notify } = useNotification();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      notify("Erro ao entrar", error.message, "error");
    } else {
      notify("Seja bem-vindo!", "Login realizado com sucesso.", "success");
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-secondary-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Orbes de fundo para profundidade visual */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -ml-24 -mt-24 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl -mr-20 -mb-20"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-6 sm:p-8 border-white/40 shadow-2xl rounded-3xl bg-white/90 backdrop-blur-md">
          <CardHeader className="flex flex-col items-center mb-6 space-y-2">
            <Image src="/logo.png" alt="DentixIA" width={180} height={48} className="h-10 w-auto mb-2" priority />
            <h1 className="text-2xl font-black font-poppins text-gray-800 tracking-tight text-center">Bem-vindo de volta!</h1>
            <p className="text-gray-500 text-sm text-center">Acesse sua plataforma inteligente</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Input
                  label="E-mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  icon={<Mail size={20} />}
                />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Input
                  label="Senha"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={<Lock size={20} />}
                />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="flex justify-end mt-1 mb-6"
              >
                <Link 
                  href="/forgot" 
                  className="text-xs font-bold text-gray-500 hover:text-primary transition-colors cursor-pointer p-1"
                >
                  Esqueceu sua senha?
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full h-12 text-base"
                  rightIcon={<ArrowRight size={18} />}
                >
                  Acessar Plataforma
                </Button>
              </motion.div>
            </form>
          </CardContent>

          <CardFooter className="mt-4">
            <p className="text-center text-sm text-gray-500 w-full">
              Ainda não tem uma conta?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Criar agora
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
