"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, PlayCircle } from "lucide-react";
import { getUserProfileAction } from "@/lib/perfil/actions";
import { getPublicWelcomeVideoUrlAction } from "@/lib/admin/actions";
import { WelcomeVideoModal } from "@/components/WelcomeVideoModal";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const [userName, setUserName] = useState("Dentista");
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState("");
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      // 1. Carregar perfil do usuário
      const res = await getUserProfileAction();
      if (res.data?.profile) {
        const profile = res.data.profile;
        const rawName = profile.nome_completo || profile.email?.split('@')[0] || "Dentista";
        const cleanName = rawName.replace(/^(dr\(a\)\.?|dr\.?|dra\.?|doctor\.?)\s+/i, "").trim();
        const firstName = cleanName.split(' ')[0];
        const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        setUserName(formattedName);
      }

      // 2. Carregar URL do vídeo de boas-vindas do sistema
      const videoRes = await getPublicWelcomeVideoUrlAction();
      if (videoRes.url && videoRes.url.trim()) {
        setWelcomeVideoUrl(videoRes.url.trim());
        // Abrir modal automaticamente se houver URL definida
        setIsVideoModalOpen(true);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full px-4 relative overflow-hidden">
      {/* Modal do Vídeo de Boas-Vindas Vertical (1080x1920 / ~80% da tela) */}
      <WelcomeVideoModal
        isOpen={isVideoModalOpen}
        videoUrl={welcomeVideoUrl}
        onClose={() => setIsVideoModalOpen(false)}
      />

      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-glow/5 blur-[120px] rounded-full animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary-cyan/5 blur-[100px] rounded-full animate-float" style={{ animationDelay: '-3s' }}></div>

      {/* Hero Section */}
      <section className="w-full max-w-5xl flex flex-col items-center text-center relative z-10 py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 w-full flex justify-center"
        >
          <Image
            src="/logo.png"
            alt="DentixIA"
            width={240}
            height={60}
            className="h-14 w-auto object-contain"
            priority
          />
        </motion.div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-2"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-[1.1]">
              Olá Dr(a). <span className="text-gradient">{userName}</span>.
            </h1>

            <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto font-semibold leading-relaxed">
              Pronto para transformar sorrisos?
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/simulacoes">
              <Button size="md" className="px-6 h-9 text-xs font-semibold bg-primary hover:bg-primary-glow group relative overflow-hidden" leftIcon={<Camera className="transition-transform group-hover:rotate-12" size={16} />}>
                Nova Simulação
              </Button>
            </Link>

            {/* Botão para rever vídeo caso haja URL */}
            {welcomeVideoUrl && (
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all border border-slate-200 shadow-sm active:scale-95"
              >
                <PlayCircle size={16} className="text-cyan-600" />
                <span>Assistir Apresentação</span>
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Grid Pattern Decorativo */}
      <div className="absolute inset-0 z-[-1] opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[grid-line:rgba(0,0,0,0.05)] bg-[grid-size:40px_40px]"></div>
    </div>
  );
}
