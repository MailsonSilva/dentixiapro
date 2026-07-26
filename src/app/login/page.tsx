"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithPasswordAction, signInWithGoogleAction } from "@/lib/auth/actions";
import { Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { useNotification } from "../../lib/NotificationContext";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { notify } = useNotification();

  const translateAuthError = (message: string) => {
    const msg = message.toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
      return "Credenciais de login inválidas. Verifique seu e-mail e senha.";
    }
    if (msg.includes("email not confirmed")) {
      return "E-mail não confirmado. Verifique sua caixa de entrada para confirmar seu cadastro.";
    }
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return "Muitas tentativas de login. Por favor, tente novamente mais tarde.";
    }
    if (msg.includes("network") || msg.includes("fetch")) {
      return "Erro de conexão. Verifique sua internet.";
    }
    if (msg.includes("user not found")) {
      return "Usuário não encontrado.";
    }
    if (msg.includes("invalid email")) {
      return "E-mail inválido.";
    }
    return message;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      notify("Senha inválida", "A senha deve ter no mínimo 6 caracteres.", "warning");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signInWithPasswordAction(email, password);

      if (error) {
        notify("Erro ao entrar", translateAuthError(error), "error");
      } else if (data?.user) {
        notify("Seja bem-vindo!", "Login realizado com sucesso.", "success");
        router.push('/');
        router.refresh();
      }
    } catch {
      notify("Erro ao entrar", "Ocorreu um erro inesperado ao realizar login.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const origin = window.location.origin;
      const { data, error } = await signInWithGoogleAction(origin);
      if (error) {
        notify("Erro ao entrar", "Falha ao iniciar autenticação com o Google: " + translateAuthError(error), "error");
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      notify("Erro ao entrar", "Não foi possível conectar com o Google.", "error");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-secondary-bg flex items-center justify-center p-4 sm:p-6 relative overflow-y-auto py-8">
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
            <Image src={IMAGES.logo} alt="DentixIA" width={300} height={120} className="h-14 w-auto mb-6" priority />
            <h1 className="text-2xl font-semibold font-poppins text-gray-800 tracking-tight text-center">Bem-vindo!</h1>
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

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full h-12 text-base"
                  rightIcon={<ArrowRight size={18} />}
                >
                  Acessar Plataforma
                </Button>

                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <span className="relative bg-white/90 px-3 text-xs text-gray-400 font-bold uppercase tracking-wider">ou</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-2xl transition-all shadow-sm text-sm active:scale-[0.98]"
                >
                  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Entrar com o Google
                </button>
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
