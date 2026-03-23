"use client";

import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { Play, BookOpen, Clock, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const tracks = [
  {
    title: "Mastering AI Simulations",
    lessons: [
      { id: 1, title: "Introdução ao DentixIA", duration: "5 min", type: "video", locked: false },
      { id: 2, title: "Como tirar as melhores fotos", duration: "12 min", type: "video", locked: false },
      { id: 3, title: "Escolhendo cores com precisão", duration: "8 min", type: "video", locked: true },
    ]
  },
  {
    title: "Vendas e Marketing para Dentistas",
    lessons: [
      { id: 4, title: "Scripts de fechamento com IA", duration: "15 min", type: "pdf", locked: true },
      { id: 5, title: "Postando resultados no Instagram", duration: "10 min", type: "video", locked: true },
    ]
  }
];

export default function AulasPage() {
  return (
    <div className="flex flex-col min-h-screen pb-24 md:pb-0 md:pt-20 bg-secondary-bg">
      <Navbar />

      <main className="max-w-6xl mx-auto w-full px-6 py-8">
        <header className="mb-12">
          <h1 className="text-2xl font-bold font-poppins text-gray-800">Centro de Treinamento</h1>
          <p className="text-gray-500 mt-2">Aprenda a potencializar seus lucros com o DentixIA.</p>
        </header>

        <div className="space-y-12">
          {tracks.map((track, trackIndex) => (
            <section key={track.title}>
              <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <BookOpen size={20} />
                {track.title}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {track.lessons.map((lesson, lessonIndex) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (trackIndex * 0.2) + (lessonIndex * 0.1) }}
                    className={cn(
                      "glass-card rounded-3xl p-6 flex flex-col justify-between group cursor-pointer border-2 transition-all",
                      lesson.locked ? "opacity-60 grayscale border-transparent" : "hover:border-primary active:scale-98 border-transparent"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn(
                          "p-3 rounded-2xl",
                          lesson.locked ? "bg-gray-100 text-gray-400" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors"
                        )}>
                          {lesson.locked ? <Lock size={20} /> : <Play size={20} fill="currentColor" />}
                        </div>
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                          <Clock size={12} />
                          {lesson.duration}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-800 text-lg leading-tight mb-2">
                        {lesson.title}
                      </h3>
                      <p className="text-sm text-gray-400 uppercase font-black">
                        {lesson.type}
                      </p>
                    </div>
                    
                    {!lesson.locked && (
                      <div className="mt-6 flex items-center text-primary font-bold text-sm">
                        Assistir agora
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
