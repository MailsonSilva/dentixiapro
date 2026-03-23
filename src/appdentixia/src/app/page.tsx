"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Sparkles } from "lucide-react";
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
    <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] px-6">
      {/* Hero Section Premium Centralizada */}
      <section className="w-full max-w-4xl flex flex-col items-center text-center relative overflow-hidden py-20">
        {/* Luz de fundo decorativa */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-primary/5 blur-[120px] rounded-full"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-12 w-full flex justify-center md:hidden"
        >
          <Image 
            src="/logo.png" 
            alt="DentixIA" 
            width={180} 
            height={48} 
            className="h-10 w-auto object-contain" 
            priority
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            <Sparkles size={16} />
            <span>Inteligência Artificial de Ponta</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black font-poppins text-gray-800 tracking-tight leading-tight">
            Olá, <span className="text-gradient">{userName}</span>
          </h1>
          
          <p className="text-gray-500 text-base md:text-xl max-w-xl mx-auto font-medium leading-relaxed">
            Sua central inteligente para análise e simular sorrisos com precisão clínica em tempo real.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/simulacoes">
              <Button size="lg" className="px-8 h-16 text-lg shadow-2xl shadow-primary/30 group" leftIcon={<Camera className="transition-transform group-hover:scale-110" size={24} />}>
                Nova Simulação
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Background Decorativo Suave */}
      <div className="fixed bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-white to-transparent pointer-events-none z-0"></div>
    </div>
  );
}
