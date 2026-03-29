"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const [userName, setUserName] = useState("Doutor");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('usuarios')
        .select('nome_completo')
        .eq('id', user.id)
        .single();

      if (userData?.nome_completo) {
        setUserName(userData.nome_completo.split(' ')[0]);
      } else if (user.user_metadata?.nome_completo) {
        setUserName(user.user_metadata.nome_completo.split(' ')[0]);
      }
    }
    loadUser();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[90vh] px-6 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-glow/5 blur-[120px] rounded-full animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary-cyan/5 blur-[100px] rounded-full animate-float" style={{ animationDelay: '-3s' }}></div>

      {/* Hero Section */}
      <section className="w-full max-w-5xl flex flex-col items-center text-center relative z-10 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-10 w-full flex justify-center md:hidden"
        >
          <div className="p-4 glass-card shadow-2xl">
            <Image
              src="/logo.png"
              alt="DentixIA"
              width={160}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>
        </motion.div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-4xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Olá Dr(a). <span className="text-gradient">{userName}</span>.
            </h1>

            <p className="text-slate-500 text-lg md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed">
              Pronto para transformar sorrisos?
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link href="/simulacoes">
              <Button size="lg" className="px-10 h-14 text-lg font-black bg-primary hover:bg-primary-glow group relative overflow-hidden ring-4 ring-primary-glow/10" leftIcon={<Camera className="transition-transform group-hover:rotate-12" size={22} />}>
                Iniciar Simulação
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Grid Pattern Decorativo */}
      <div className="absolute inset-0 z-[-1] opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[grid-line:rgba(0,0,0,0.05)] bg-[grid-size:40px_40px]"></div>
    </div>
  );
}
