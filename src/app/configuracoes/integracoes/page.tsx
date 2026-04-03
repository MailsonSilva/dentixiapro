"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, RefreshCw, Check, AlertTriangle, MessageSquare, X, Smartphone, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";

interface EvolutionInstance {
  id: string;          
  instanceName: string;  
  name: string;        
  active: boolean; 
  state: "open" | "close" | "connecting" | "disconnected"; 
  phone?: string; 
  created_at: string;
}

export default function IntegracoesPage() {
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useNotification();
  const [companyId, setCompanyId] = useState<string | null>(null);

  // States: Modal de Criação 
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // 2-cliques para desvincular (sem window.confirm)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // States: Modal de QRCode
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrInstanceName, setQrInstanceName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/evolution/instances");
      if (!res.ok) throw new Error("Falha ao buscar instâncias da Evolution API");
      
      const json = await res.json();
      if (json && json.instances) {
         setInstances(json.instances);
      } else {
         setInstances([]);
      }
    } catch (err: any) {
       console.error(err);
       notify("Erro", "Falha ao carregar as integrações.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ----- INICIAR TRANSAÇÃO CRIAÇÃO -----
  const handleCreateInstance = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!newInstanceName.trim()) {
        notify("Nome Inválido", "Por favor, digite um nome para a instância.", "error");
        return;
     }

     setIsCreating(true);
     try {
       const res = await fetch("/api/evolution/create-instance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newInstanceName.trim() })
       });
       
       const data = await res.json();

       if (!res.ok) {
          throw new Error(data.error || "Erro desconhecido ao tentar criar a instância");
       }

       // Success (Retorna Instancia + QRCode + DataRow nova do Supabase)
       notify("Sucesso", `Instância '${data.instanceName}' gerada com sucesso!`, "success");
       setIsCreateModalOpen(false);
       setNewInstanceName("");
       
       // Incluir na UI Local Otimisticamente (ou refetching)
       await fetchData(); // Fetch real para trazer o channel ID atualizado
       
       // Abrir o Leitor de QR Code se API retornou (depende do config da Evolution)
       if (data.qrcode) {
          setQrCodeBase64(data.qrcode);
          setQrInstanceName(data.instanceName);
       } else {
          notify("Aviso", "A Instância foi criada, mas não retornou QR Code imediato. Utilize os webhooks ou gerencie seu token Evolution para parear.", "info");
       }

     } catch(err: any) {
        console.error(err);
        notify("Falha", err.message, "error");
     } finally {
        setIsCreating(false);
     }
  };

  // ----- EXCLUIR INSTANCIA (sem popup) -----
  const handleRemoveClick = (channelId: string, instanceName: string) => {
    if (removeConfirmId === channelId) {
      // segundo clique — confirmar
      clearTimeout(removeTimerRef.current!);
      setRemoveConfirmId(null);
      removeInstance(channelId, instanceName);
      return;
    }
    // primeiro clique — armar confirmação por 4s
    clearTimeout(removeTimerRef.current!);
    setRemoveConfirmId(channelId);
    removeTimerRef.current = setTimeout(() => setRemoveConfirmId(null), 4000);
  };

  const removeInstance = async (channelId: string, instanceName: string) => {
    const oldState = [...instances];
    setInstances(instances.filter(i => i.id !== channelId));
    try {
      const res = await fetch(`/api/evolution/delete-instance?instanceName=${instanceName}&channelId=${channelId}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      notify("Desconectado", "Sessão finalizada com sucesso.", "success");
    } catch (err: unknown) {
      setInstances(oldState);
      notify("Erro", (err as Error).message || "Problema ao desvincular.", "error");
    }
  };

  // ----- ATIVAR/DESATIVAR INSTÂNCIA -----
  const toggleActivation = async (id: string, currentActive: boolean) => {
     // Modifica state optmisticamente
     const newState = !currentActive;
     setInstances(instances.map(i => i.id === id ? { ...i, active: newState, state: newState ? 'open' : 'disconnected' } : i));
     
     try {
       const { error } = await supabase
         .from('communication_channels')
         .update({ active: newState })
         .eq('id', id);
         
       if(error) throw new Error(error.message);
       notify("Sucesso", newState ? "Instância ativada com sucesso." : "Instância pausada.", "success");
     } catch (err: any) {
       console.error(err);
       // Revert UI Update
       setInstances(instances.map(i => i.id === id ? { ...i, active: currentActive, state: currentActive ? 'open' : 'disconnected' } : i));
       notify("Erro", "Não foi possível mudar o estado.", "error");
     }
  };

  return (
    <div className="w-full bg-transparent flex flex-col relative pb-10">
      <div className="w-full px-6 md:px-12 xl:px-20 pt-8 pb-4 flex flex-col h-full">
         
         {/* Navbar Fluido (100% Espaço) */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 border-b border-slate-100 pb-5">
            <div>
               <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <Smartphone className="text-emerald-500" /> WhatsApp (Evolution API)
               </h1>
               <p className="text-slate-500 text-sm mt-1 font-medium">Controle suas sessões conectadas. Atenda múltiplos canais.</p>
            </div>
            
            <button 
               onClick={() => setIsCreateModalOpen(true)}
               className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
            >
               <Plus size={16} strokeWidth={3} /> Nova Instância
            </button>
         </div>

         {isLoading ? (
            <div className="flex items-center justify-center py-20 flex-1">
               <span className="flex items-center gap-2 text-slate-400 font-bold"><RefreshCw className="animate-spin" size={20} /> Buscando no banco de dados...</span>
            </div>
         ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              <AnimatePresence>
              {instances.map((item) => (
                 <motion.div 
                   key={item.id}
                   layout
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ duration: 0.2 }}
                   className={cn(
                      "bg-white rounded-[20px] border border-slate-100/90 shadow-sm p-6 flex flex-col justify-between min-h-[190px] relative overflow-hidden group hover:shadow transition-shadow",
                      item.state === 'open' && "border-emerald-500/20 bg-emerald-50/[0.03]"
                   )}
                 >
                    <div className={cn(
                       "absolute top-0 right-0 w-28 h-28 rounded-bl-[80px] -z-10 transition-colors pointer-events-none",
                       item.state === 'open' ? "bg-emerald-500/5 group-hover:bg-emerald-500/10" : "bg-slate-50/80"
                    )} />

                    <div className="flex items-start justify-between mb-4 relative z-10 gap-2">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center p-2 shrink-0">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-full h-full object-contain" />
                       </div>

                       <div className="flex flex-col items-end gap-1.5 pt-0.5">
                          {item.state === 'connecting' && (
                             <span className="flex items-center gap-1 bg-[#4361ee] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                <RefreshCw size={10} className="animate-spin" /> Conectando...
                             </span>
                          )}
                          {(item.state === 'close' || item.state === 'disconnected') && (
                             <span className="flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                <AlertTriangle size={10} className="text-amber-500" /> Desconectado
                             </span>
                          )}
                          {item.state === 'open' && (
                             <span className="flex items-center gap-1 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                <Check size={10} className="text-emerald-400" /> Online
                             </span>
                          )}
                          
                          <div className="text-[9px] font-mono text-slate-400 bg-slate-50 border border-dashed border-slate-300 px-1.5 py-0.5 rounded max-w-[120px] truncate" title={item.instanceName}>{item.instanceName}</div>
                       </div>
                    </div>

                    <div className="mb-5 relative z-10 flex-col flex mt-1">
                       <h3 className="font-bold text-slate-800 text-[16px] truncate" title={item.name}>{item.name}</h3>
                       <p className={cn(
                          "text-xs font-semibold mt-1 truncate",
                          item.state === 'open' ? "text-emerald-600" : "text-slate-500"
                       )}>
                          {item.phone ? (item.phone.includes('@') ? item.phone : `+${item.phone.replace(/\D/g, '')}`) : "Aguardando Leitura"}
                       </p>
                    </div>

                    <div className="flex items-center justify-between relative z-10 mt-auto pt-4 border-t border-slate-50 border-dashed">
                       <button 
                         onClick={() => handleRemoveClick(item.id, item.instanceName)}
                         className={cn(
                           "p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold",
                           removeConfirmId === item.id
                             ? "bg-red-500 text-white"
                             : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                         )}
                         title={removeConfirmId === item.id ? "Confirmar exclusão" : "Excluir Instância"}
                       >
                         <Trash2 size={16} />
                         {removeConfirmId === item.id && <span>Confirmar?</span>}
                       </button>

                       <button 
                         onClick={() => toggleActivation(item.id, item.active)}
                         className={cn(
                            "w-8 h-8 rounded-full border flex items-center justify-center transition-colors",
                            item.active ? "border-emerald-200 text-emerald-500 hover:bg-emerald-50" : "border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                         )}
                         title={item.active ? "Desativar / Pausar Instância" : "Ativar Instância"}
                       >
                          <Power size={14} strokeWidth={item.active ? 3 : 2} />
                       </button>
                    </div>
                 </motion.div>
              ))}
              
              {instances.length === 0 && (
                 <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[20px] bg-slate-50/50">
                    <MessageSquare size={48} className="text-slate-300 mb-4" />
                    <h3 className="text-lg text-slate-700 font-bold mb-2">Nenhum Dispositivo Conectado</h3>
                    <p className="text-sm text-slate-500 max-w-md text-center">Inicie o pareamento do WhatsApp com seu servidor Evolution clicando em "Nova Instância" e lendo o QRCode.</p>
                 </div>
              )}
              </AnimatePresence>
           </div>
         )}
      </div>

      {/* MODAL 1: Inserir Nome (Create Request) */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Nova Conexão WhatsApp</h3>
                <button onClick={() => !isCreating && setIsCreateModalOpen(false)} disabled={isCreating} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateInstance} className="p-6">
                 <p className="text-sm text-slate-500 mb-4">
                   Dê um nome para identificar este número (ex: <strong>Atendimento Suporte</strong>). O servidor irá gerar a sessão via Evolution API em seguida.
                 </p>
                 <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 capitalize tracking-wide">Nome da Instância</label>
                    <input 
                      type="text" 
                      value={newInstanceName}
                      onChange={(e) => setNewInstanceName(e.target.value)}
                      placeholder="Minha Clínica SP"
                      disabled={isCreating}
                      autoFocus
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                 </div>
                 <div className="flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsCreateModalOpen(false)} 
                      disabled={isCreating}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      disabled={isCreating}
                      className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-70 flex items-center gap-2"
                    >
                      {isCreating ? <><RefreshCw size={16} className="animate-spin" /> Gerando Token...</> : "Criar Conexão"}
                    </button>
                 </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Exibição do QR CODE Evolution Render */}
      <AnimatePresence>
        {qrCodeBase64 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden flex flex-col items-center p-8 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                 <Smartphone className="text-emerald-500" size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Leia o QR Code</h2>
              <p className="text-sm text-slate-500 mb-6">Instância <strong className="text-slate-800 bg-slate-100 px-1.5 rounded">{qrInstanceName}</strong> criada. Abra o WhatsApp no seu celular, vá em &quot;Aparelhos Conectados&quot; e aponte a câmera para a imagem abaixo.</p>
              
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-inner w-[240px] h-[240px] flex items-center justify-center mb-8 relative">
                 {/* O QRCode no v2 às vezes vem puro ou precisa de prefixo URI */}
                 <img 
                   src={qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} 
                   alt="WhatsApp Evolution QR Code" 
                   className="w-[220px] h-[220px] object-contain rounded-lg"
                 />
                 
                 {/* Escaneie Overlay Decorativo */}
                 <div className="absolute inset-4 border-2 border-emerald-500/30 rounded-lg pointer-events-none animate-pulse"></div>
              </div>

              <button 
                onClick={() => { setQrCodeBase64(null); setQrInstanceName(""); fetchData(); }}
                className="bg-slate-800 hover:bg-slate-900 text-white w-full py-3.5 rounded-xl font-bold transition-all shadow-md"
              >
                Feito, fechar janela
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
