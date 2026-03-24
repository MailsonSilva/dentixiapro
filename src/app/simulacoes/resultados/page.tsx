"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  User, 
  Trash2, 
  Search, 
  X,
  RefreshCcw,
  Sparkles,
  Info
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { useNotification } from "@/lib/NotificationContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Simulacao {
  id: number;
  created_at: string;
  img_original_url: string;
  img_simulada_url: string;
  procedimento: string;
  nome_paciente: string;
}

export default function ResultadosPage() {
  const [simulacoes, setSimulacoes] = useState<Simulacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSim, setSelectedSim] = useState<Simulacao | null>(null);
  const { notify } = useNotification();

  const fetchSimulacoes = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('simulacoes')
      .select('*')
      .eq('usuario_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) setSimulacoes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSimulacoes();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta simulação?")) return;

    const { error } = await supabase
      .from('simulacoes')
      .delete()
      .eq('id', id);

    if (error) {
      notify("Erro ao excluir", error.message, "error");
    } else {
      notify("Excluído!", "Simulação removida com sucesso.", "success");
      setSimulacoes(simulacoes.filter(s => s.id !== id));
    }
  };

  const filteredSimulacoes = simulacoes.filter(s => 
    s.nome_paciente.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen pb-24 md:pb-0 md:pt-20 bg-secondary-bg">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-6 py-8">
        {/* Header e Busca */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-black font-poppins text-gray-800 tracking-tight">Minhas Simulações</h1>
            <p className="text-gray-400 font-medium">Histórico de transformações realizadas</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por paciente..."
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold animate-pulse">Carregando galeria...</p>
          </div>
        ) : filteredSimulacoes.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 glass-card rounded-[40px] border-dashed border-2 border-gray-100"
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
                  "glass-card rounded-[32px] overflow-hidden border border-white/40 shadow-xl transition-all group flex flex-col",
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
                        <h3 className="font-extrabold text-gray-800 leading-tight">{item.nome_paciente}</h3>
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Criado em: {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                   </div>
                   <button 
                     onClick={(e) => handleDelete(e, item.id)}
                     className="p-2.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                   >
                     <Trash2 size={20} />
                   </button>
                </div>

                {/* Área de Visualização Antes/Depois */}
                <div className="p-4 grid grid-cols-2 gap-4 relative">
                  {!item.img_simulada_url && (
                    <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                       <Sparkles className="text-primary animate-bounce mb-3" size={32} />
                       <p className="text-gray-800 font-black text-sm">IA Processando...</p>
                       <p className="text-gray-500 text-[10px] max-w-[150px] mt-1 font-medium">Isso pode levar até 2 minutos. Atualize em instantes.</p>
                    </div>
                  )}

                  <div className="space-y-2 text-center">
                    <span className="text-[11px] font-black uppercase tracking-tighter text-gray-400">Antes</span>
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-inner bg-gray-100">
                       <Image src={item.img_original_url} alt="Antes" width={400} height={300} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="space-y-2 text-center">
                    <span className="text-[11px] font-black uppercase tracking-tighter text-primary">Depois</span>
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-inner bg-gray-100">
                       {item.img_simulada_url ? (
                         <Image src={item.img_simulada_url} alt="Depois" width={400} height={300} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
                            <RefreshCcw className="animate-spin text-gray-200" size={24} />
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50/30 flex items-center justify-center group-hover:bg-primary transition-colors mt-auto">
                   <p className="text-[11px] font-black uppercase text-gray-400 group-hover:text-white transition-colors">Clique para ver comparação detalhada</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

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
              className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
            >
              {/* Top Bar Modal */}
              <div className="p-6 md:px-10 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-800 tracking-tight">{selectedSim.nome_paciente}</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Simulação Finalizada</p>
                </div>
                <button 
                  onClick={() => setSelectedSim(null)}
                  className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Slider Area */}
              <div className="flex-1 overflow-hidden p-4 md:p-8 flex flex-col items-center">
                 <div className="bg-blue-50/50 rounded-2xl p-4 mb-6 flex items-center gap-3 w-full max-w-2xl border border-blue-100">
                    <Info className="text-primary flex-shrink-0" size={20} />
                    <p className="text-[11px] md:text-sm text-gray-600 font-medium leading-relaxed italic">
                       O resultado real depende de fatores clínicos individuais. Esta é uma projeção baseada em IA.
                    </p>
                 </div>

                 <div className="relative w-full aspect-video md:aspect-[16/10] rounded-[32px] overflow-hidden shadow-2xl border-4 border-white">
                   <ReactCompareSlider
                      itemOne={<ReactCompareSliderImage src={selectedSim.img_original_url} alt="Antes" />}
                      itemTwo={<ReactCompareSliderImage src={selectedSim.img_simulada_url} alt="Depois" />}
                      style={{ width: '100%', height: '100%' }}
                   />
                 </div>

                 <div className="mt-8 flex items-center gap-6 w-full max-w-2xl">
                    <div className="flex-1 h-12 md:h-14 bg-gray-800 rounded-2xl flex items-center justify-center text-white font-black uppercase text-sm shadow-xl">
                      Antes
                    </div>
                    <div className="w-12 h-1 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 h-12 md:h-14 bg-primary rounded-2xl flex items-center justify-center text-white font-black uppercase text-sm shadow-xl shadow-primary/20">
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
