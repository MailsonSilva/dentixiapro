"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  User,
  Trash2,
  Search,
  X,
  Sparkles,
  Info
} from "lucide-react";
import Link from "next/link";
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { useNotification } from "@/lib/NotificationContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { deleteSimulationAction } from "@/lib/simulacoes/actions";
import { type Simulacao } from "@/lib/simulacoes/queries";

interface SimulationGalleryProps {
  initialSimulations: Simulacao[];
}

export function SimulationGallery({ initialSimulations }: SimulationGalleryProps) {
  const [simulacoes, setSimulacoes] = useState<Simulacao[]>(initialSimulations);
  const [search, setSearch] = useState("");
  const [selectedSim, setSelectedSim] = useState<Simulacao | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { notify } = useNotification();

  // Prevents hydration mismatch from Date and browser-only libs
  useEffect(() => setIsMounted(true), []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta simulação?")) return;

    setDeletingId(id);
    try {
      await deleteSimulationAction(id);
      notify("Excluído!", "Simulação removida com sucesso.", "success");
      setSimulacoes(prev => prev.filter(s => s.id !== id));
      if (selectedSim?.id === id) {
        setSelectedSim(null);
      }
    } catch (err: any) {
      notify("Erro ao excluir", err.message || "Não foi possível excluir a simulação.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSimulacoes = simulacoes.filter(s =>
    (s.procedimento ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.nome_paciente ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-semibold font-poppins text-gray-800 tracking-tight">Minhas Simulações</h1>
          <p className="text-gray-400 font-medium">Histórico de transformações realizadas</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar paciente ou procedimento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-gray-100 rounded-2xl pl-12 pr-6 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none w-full md:w-64 transition-all shadow-sm"
            />
          </div>

          <Link href="/simulacoes">
            <Button size="sm" className="h-12 px-6 rounded-2xl" leftIcon={<Camera size={18} />}>
              Nova
            </Button>
          </Link>
        </div>
      </div>

      {filteredSimulacoes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 glass-card rounded-xl border-dashed border-2 border-gray-100"
        >
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera className="text-gray-300" size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-700">Nenhuma simulação encontrada</h3>
          <p className="text-gray-400 max-w-xs mx-auto mt-2">Você ainda não realizou nenhuma simulação ou a busca não retornou resultados.</p>
          <Link href="/simulacoes">
            <Button variant="outline" className="mt-8">Criar primeira simulação</Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
          {filteredSimulacoes.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => item.img_simulada_url && setSelectedSim(item)}
              className={cn(
                "glass-card rounded-xl overflow-hidden border border-white/40 shadow-xl transition-all group flex flex-col bg-white",
                item.img_simulada_url ? "cursor-pointer hover:shadow-2xl hover:scale-[1.01]" : "cursor-wait"
              )}
            >
              {/* Header do Card */}
              <div className="p-6 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 leading-tight capitalize">{item.nome_paciente || 'Paciente'}</h3>
                    <p className="text-[11px] text-gray-400 font-bold capitalize tracking-wider">
                      {item.procedimento || 'Simulação'} • {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  disabled={deletingId === item.id}
                  className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all disabled:opacity-50"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Área de Visualização Antes/Depois */}
              <div className="p-4 grid grid-cols-2 gap-4 relative flex-1">
                {!item.img_simulada_url && (
                  <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                    <Sparkles className="text-primary animate-bounce mb-3" size={32} />
                    <p className="text-gray-800 font-semibold text-sm">IA Processando...</p>
                    <p className="text-gray-500 text-[10px] max-w-[150px] mt-1 font-medium">Isso pode levar até 2 minutos. Atualize em instantes.</p>
                  </div>
                )}

                <div className="space-y-2 text-center">
                  <span className="text-[11px] font-semibold capitalize tracking-tighter text-gray-400">Antes</span>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-inner bg-slate-100 relative">
                    <img src={item.img_original_url} alt="Antes" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <span className="text-[11px] font-semibold capitalize tracking-tighter text-primary">Depois</span>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-inner bg-slate-100 relative">
                    {item.img_simulada_url ? (
                      <img src={item.img_simulada_url} alt="Depois" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
                        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/30 flex items-center justify-center group-hover:bg-primary transition-colors mt-auto">
                <p className="text-[11px] font-semibold capitalize text-gray-400 group-hover:text-white transition-colors">Clique para ver comparação detalhada</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Compare Slider */}
      <AnimatePresence>
        {selectedSim && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSim(null)}
              className="absolute inset-0 bg-gray-900/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
            >
              {/* Top Bar Modal */}
              <div className="p-6 md:px-10 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 tracking-tight capitalize">{selectedSim.nome_paciente || 'Paciente'}</h2>
                  <p className="text-xs text-gray-400 font-bold capitalize tracking-wider">Procedimento: {selectedSim.procedimento || 'Simulação'} </p>
                </div>
                <button
                  onClick={() => setSelectedSim(null)}
                  className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Slider Area */}
              <div className="flex-1 overflow-hidden p-4 md:p-8 flex flex-col items-center">
                <div className="bg-blue-50/50 rounded-xl p-4 mb-6 flex items-center gap-3 w-full max-w-2xl border border-blue-100">
                  <Info className="text-primary flex-shrink-0" size={20} />
                  <p className="text-[11px] md:text-sm text-gray-600 font-medium leading-relaxed italic">
                    O resultado real depende de fatores clínicos individuais. Esta é uma projeção baseada em IA.
                  </p>
                </div>

                <div className="relative w-full max-h-[58vh] aspect-[4/3] md:aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
                  <ReactCompareSlider
                    handle={
                      <div className="h-full flex flex-col items-center justify-center relative select-none pointer-events-none">
                        <div className="w-0.5 h-full bg-white shadow-xl"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-primary overflow-hidden p-1.5 cursor-col-resize pointer-events-auto">
                          <img src="/logo-icon.png" alt="Dentixia" className="w-5 h-5 object-contain" />
                        </div>
                      </div>
                    }
                    itemOne={
                      <ReactCompareSliderImage
                        src={selectedSim.img_original_url}
                        alt="Antes"
                        style={{ objectFit: "contain", objectPosition: "center" }}
                      />
                    }
                    itemTwo={
                      <ReactCompareSliderImage
                        src={selectedSim.img_simulada_url}
                        alt="Depois"
                        style={{ objectFit: "contain", objectPosition: "center" }}
                      />
                    }
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>

                <div className="mt-8 flex items-center gap-6 w-full max-w-2xl">
                  <div className="flex-1 h-12 md:h-14 bg-gray-800 rounded-lg flex items-center justify-center text-white font-semibold capitalize text-sm shadow-xl">
                    Antes
                  </div>
                  <div className="w-12 h-1 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 h-12 md:h-14 bg-primary rounded-lg flex items-center justify-center text-white font-semibold capitalize text-sm shadow-xl shadow-primary/20">
                    Depois
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
