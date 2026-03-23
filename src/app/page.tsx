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
    <div className="flex-1 flex flex-col items-center justify-center min-h-[90vh] px-6 relative overflow-hidden">
      {/* Decorative Orbs - Pro Max Detail */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-glow/5 blur-[120px] rounded-full animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary-cyan/5 blur-[100px] rounded-full animate-float" style={{ animationDelay: '-3s' }}></div>

      {/* Hero Section Premium Centralizada */}
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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white shadow-xl shadow-blue-500/5 border border-slate-100 text-primary text-sm font-bold"
          >
            <div className="w-2 h-2 rounded-full bg-primary-cyan animate-pulse"></div>
            <Sparkles size={16} className="text-primary-glow" />
            <span className="tracking-wide">TECNOLOGIA IA DE PRÓXIMA GERAÇÃO</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Olá, <span className="text-gradient">{userName}</span>.<br />
              <span className="relative">
                Nível Pro Max
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 318 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 10C55.5 4.5 130.5 1 161 1C215.5 1 292.5 4.5 317 10" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            
            <p className="text-slate-500 text-lg md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed">
              Descubra a fusão perfeita entre estética dental e inteligência artificial para diagnósticos e simulações ultra-realistas.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link href="/simulacoes">
              <Button size="lg" className="px-10 h-20 text-xl font-black bg-primary hover:bg-primary-glow group relative overflow-hidden ring-4 ring-primary-glow/10" leftIcon={<Camera className="transition-transform group-hover:rotate-12" size={28} />}>
                Iniciar Simulação
              </Button>
            </Link>
            
            <Link href="/aulas">
              <Button variant="outline" size="lg" className="px-10 h-20 text-xl glass-card border-none hover:bg-white transition-all shadow-none">
                Ver Tutoriais
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Grid Pattern Decorativo - Pro Max Style */}
      <div className="absolute inset-0 z-[-1] opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[grid-line:rgba(0,0,0,0.05)] bg-[grid-size:40px_40px]"></div>
    </div>
  );
}
