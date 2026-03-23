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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[340px] relative z-10"
      >
        <Card className="p-6 border-white/40 shadow-2xl rounded-3xl">
          <CardHeader className="flex flex-col items-center mb-6">
            <Image src="/logo.png" alt="DentixIA" width={180} height={48} className="h-10 w-auto mb-4" priority />
            <h1 className="text-xl md:text-2xl font-black font-poppins text-gray-800 tracking-tight text-center">Bem-vindo de volta!</h1>
            <p className="text-gray-400 text-sm mt-1 text-center">Acesse sua plataforma inteligente</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                label="E-mail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                icon={<Mail size={20} />}
              />

              <Input
                label="Senha"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock size={20} />}
              />

              <div className="flex justify-end mt-[-8px] mb-4">
                <Link 
                  href="/forgot" 
                  className="text-xs font-bold text-gray-400 hover:text-primary transition-colors cursor-pointer p-1"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full mt-2"
                rightIcon={<ArrowRight size={18} />}
              >
                Acessar Plataforma
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <p className="text-center text-sm text-gray-500">
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
