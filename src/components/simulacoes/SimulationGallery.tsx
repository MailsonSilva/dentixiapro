"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Trash2,
  Search,
  X,
  Sparkles,
  Info
} from "lucide-react";
import Link from "next/link";
import { BeforeAfterSlider } from "@/components/simulacoes/BeforeAfterSlider";
import { useNotification } from "@/lib/NotificationContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { deleteSimulationAction } from "@/lib/simulacoes/actions";
import { type Simulacao } from "@/lib/simulacoes/queries";
import { IMAGES } from "@/lib/images";

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível excluir a simulação.";
      notify("Erro ao excluir", msg, "error");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-base font-bold font-poppins text-gray-800 tracking-tight leading-tight">Minhas Simulações</h1>
          <p className="text-xs text-gray-400 font-medium leading-tight">Histórico de transformações realizadas</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-gray-100 rounded-xl pl-9 pr-4 h-9 text-base focus:ring-2 focus:ring-primary/20 outline-none w-full md:w-48 transition-all shadow-sm font-medium"
            />
          </div>

          <Link href="/simulacoes">
            <Button size="sm" className="h-9 px-3.5 rounded-xl text-xs font-bold" leftIcon={<Camera size={14} />}>
              Nova
            </Button>
          </Link>
        </div>
      </div>

      {filteredSimulacoes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-2xl border-dashed border-2 border-gray-100 p-6 shadow-sm"
        >
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="text-gray-300" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-700">Nenhuma simulação</h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1 leading-snug">Você ainda não realizou nenhuma simulação ou a busca não retornou resultados.</p>
          <Link href="/simulacoes">
            <Button variant="outline" className="mt-6 h-10 text-sm">Criar primeira</Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3">
          {filteredSimulacoes.map((item) => {
            const date = new Date(item.created_at);
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            const formattedDate = `Criado em: ${day}/${month}/${year} às ${hours}:${minutes}`;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => item.img_simulada_url && setSelectedSim(item)}
                className={cn(
                  "bg-white rounded-2xl shadow-sm border border-slate-100 p-4 transition-all group flex flex-col justify-between",
                  item.img_simulada_url ? "cursor-pointer hover:shadow-md hover:scale-[1.01]" : "cursor-wait"
                )}
              >
                <div>
                  {/* Cabeçalho */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 capitalize leading-tight">{item.nome_paciente || 'Paciente'}</h3>
                      <p className="text-[10px] text-slate-400 font-bold capitalize tracking-wider mt-0.5">
                        {item.procedimento || 'Simulação'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 text-red-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Comparativo de Imagens */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700 text-center mb-2">Antes</span>
                      <div className="aspect-[4/3] rounded-md overflow-hidden bg-slate-50 relative border border-slate-100 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.img_original_url} alt="Antes" className="w-full h-full object-cover rounded-md" />
                      </div>
                    </div>

                    <div className="flex flex-col relative">
                      <span className="text-sm font-medium text-slate-700 text-center mb-2">Depois</span>
                      <div className="aspect-[4/3] rounded-md overflow-hidden bg-slate-50 relative border border-slate-100 flex items-center justify-center">
                        {item.img_simulada_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={item.img_simulada_url} alt="Depois" className="w-full h-full object-cover rounded-md" />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[1px] p-2 text-center">
                            <Sparkles className="text-primary animate-bounce mb-1" size={16} />
                            <span className="text-[9px] text-gray-500 font-semibold">Processando...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {formattedDate}
                  </span>
                  {item.img_simulada_url && (
                    <span className="text-[10px] font-bold text-primary group-hover:underline">
                      Ver Comparação
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
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
              <div className="p-3 md:px-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-800 tracking-tight capitalize">{selectedSim.nome_paciente || 'Paciente'}</h2>
                  <p className="text-[10px] text-gray-400 font-bold capitalize tracking-wider">Procedimento: {selectedSim.procedimento || 'Simulação'} </p>
                </div>
                <button
                  onClick={() => setSelectedSim(null)}
                  className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Slider Area */}
              <div className="flex-1 overflow-hidden p-3 md:p-4 flex flex-col items-center justify-center">
                <div className="bg-blue-50/50 rounded-xl p-3 mb-3 flex items-center gap-2.5 w-full max-w-3xl border border-blue-100">
                  <Info className="text-primary flex-shrink-0" size={16} />
                  <p className="text-[10px] md:text-xs text-gray-600 font-medium leading-relaxed italic">
                    O resultado real depende de fatores clínicos individuais. Esta é uma projeção baseada em IA.
                  </p>
                </div>

                <div className="w-full max-w-3xl bg-white p-0 rounded-2xl shadow-lg overflow-hidden border border-slate-100">
                  <BeforeAfterSlider
                    before={selectedSim.img_original_url}
                    after={selectedSim.img_simulada_url!}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
