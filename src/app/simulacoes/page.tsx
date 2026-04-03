"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, Sparkles, Loader2, Save, RotateCcw, Plus, X, 
  Upload, ImageIcon, Camera, Check
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";

// SSD Layers
import { procedures } from "@/lib/simulacoes/utils";
import { generateSimulationAction, saveSimulationAction } from "@/lib/simulacoes/actions";
import { upsertContact } from "@/lib/crm/actions";

// UI Components
import { BeforeAfterSlider } from "@/components/simulacoes/BeforeAfterSlider";
import { ColorPicker } from "@/components/simulacoes/ColorPicker";
import { ClientSearchInput, ContactSuggestion } from "@/components/simulacoes/ClientSearchInput";

type Step = "tips" | "procedure" | "upload" | "result";

export default function SimulationPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [step, setStep] = useState<Step>("tips");
  const [procedure, setProcedure] = useState<string>("Facetas");
  const [selectedColor, setSelectedColor] = useState<string>("BL1");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [contacts, setContacts] = useState<ContactSuggestion[]>([]);
  const [patientName, setPatientName] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: uc } = await supabase
        .from("user_company")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single();
      if (uc) {
        setCompanyId(uc.company_id);
        const { data: cData } = await supabase
          .from("contacts")
          .select("id, name")
          .eq("company_id", uc.company_id)
          .order("name");
        if (cData) setContacts(cData as ContactSuggestion[]);
      }
    };
    init();
  }, []);

  const handlePatientSelect = useCallback((contactId: string | null, name: string) => {
    setSelectedContactId(contactId);
    setPatientName(name);
  }, []);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!imageBase64) return;
    setIsProcessing(true);
    try {
      const result = await generateSimulationAction(imageBase64, selectedColor, procedure);
      setResultBase64(result);
      setStep("result");
    } catch (err: any) {
      notify("Erro", err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!imageBase64 || !resultBase64 || !companyId) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let finalContactId = selectedContactId;

      // Auto-cadastro: se não há contato selecionado mas há nome, cria o contato
      if (!finalContactId && patientName.trim()) {
        const newContact = await upsertContact({
          name: patientName.trim(),
          company_id: companyId,
        });
        finalContactId = newContact?.id ?? null;
        // Atualiza lista local para futuras buscas
        if (newContact) {
          setContacts(prev => [...prev, { id: newContact.id, name: newContact.name }]);
        }
      }

      await saveSimulationAction({
        originalBase64: imageBase64,
        resultBase64: resultBase64,
        procedure: procedure,
        patientName: patientName.trim(),
        contactId: finalContactId,
        companyId,
        userId: user?.id || ""
      });
      notify("Sucesso", "Simulação salva!", "success");
      router.push("/simulacoes/resultados");
    } catch (err: any) {
      notify("Erro", err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 md:pb-8 bg-secondary-bg">
      <AnimatePresence>
        {step === "tips" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
               
               <div className="flex items-center justify-between mb-6">
                 <div className="flex-1" />
                 <h2 className="text-lg font-bold text-gray-800 tracking-wide uppercase text-center flex-1">Dicas</h2>
                 <div className="flex-1 flex justify-end">
                    <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer">
                      <X size={24} />
                    </button>
                 </div>
               </div>

               <p className="text-center text-gray-600 mb-8 font-medium text-sm leading-relaxed px-4">
                 Para obter o melhor desempenho da tecnologia, capture suas fotos conforme o protocolo abaixo.
               </p>

               <div className="flex justify-center gap-6 mb-8">
                 {/* Imagem Incorreta */}
                 <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-md">
                   <div className="absolute -top-1 -left-1 z-10 bg-[#EF4444] rounded-full p-1 border-2 border-white m-2">
                     <X size={16} className="text-white" strokeWidth={3} />
                   </div>
                   <img src="/wrong_tip.png" alt="Exemplo Incorreto" className="w-full h-full object-cover" />
                 </div>
                 
                 {/* Imagem Correta */}
                 <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-md">
                   <div className="absolute -top-1 -left-1 z-10 bg-[#10B981] rounded-full p-1 border-2 border-white m-2">
                     <Check size={16} className="text-white" strokeWidth={3} />
                   </div>
                   <img src="/correct_tip.png" alt="Exemplo Correta" className="w-full h-full object-cover" />
                 </div>
               </div>

               <ul className="space-y-4 mb-8 text-sm text-gray-600 px-2">
                 <li className="flex items-start gap-2">
                   <span className="font-bold text-gray-800 mt-[2px]">•</span> 
                   <span><strong className="text-gray-800">Iluminação:</strong> Garanta boa iluminação.</span>
                 </li>
                 <li className="flex items-start gap-2">
                   <span className="font-bold text-gray-800 mt-[2px]">•</span> 
                   <span><strong className="text-gray-800">Posição:</strong> O paciente deve estar sentado com a postura ereta, de costas para uma parede.</span>
                 </li>
                 <li className="flex items-start gap-2">
                   <span className="font-bold text-gray-800 mt-[2px]">•</span> 
                   <span><strong className="text-gray-800">Sorriso:</strong> Peça para o paciente sorrir.</span>
                 </li>
                 <li className="flex items-start gap-2">
                   <span className="font-bold text-gray-800 mt-[2px]">•</span> 
                   <span><strong className="text-gray-800">Ângulo:</strong> A câmera deve estar perpendicular ao rosto.</span>
                 </li>
                 <li className="flex items-start gap-2">
                   <span className="font-bold text-gray-800 mt-[2px]">•</span> 
                   <span><strong className="text-gray-800">Formatos:</strong> Use arquivos .jpeg ou .png.</span>
                 </li>
               </ul>

               <button onClick={() => setStep("procedure")} className="w-full bg-[#0f50a6] py-3.5 rounded-xl text-white font-semibold hover:bg-[#0f50a6]/90 transition-all shadow-md cursor-pointer text-sm">
                 Continuar
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 md:pt-20">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => { if(step === "procedure") setStep("tips"); else if(step === "upload") setStep("procedure"); else if(step === "result") { setStep("upload"); setResultBase64(null); } }} className="p-2 bg-white rounded-full cursor-pointer"><ChevronLeft size={20} /></button>
           <h1 className="text-2xl font-semibold text-gray-800 capitalize tracking-tight">Simulação IA</h1>
        </div>

        <AnimatePresence mode="wait">
          {step === "procedure" && (
            <motion.div key="proc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6 max-w-sm mx-auto">
              <div className="grid grid-cols-2 gap-6">
                {procedures.map(p => (
                  <button key={p.id} onClick={() => setProcedure(p.id)} className={cn("flex flex-col items-center gap-4 p-8 rounded-[32px] border-2 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer font-['Poppins']", procedure === p.id ? "border-[#0f50a6] bg-[#0f50a6]/5 shadow-xl" : "border-gray-200 bg-white")}>
                    <div className="w-16 h-16 relative"><Image src={p.id === "Facetas" ? "/facetas.svg" : "/implante.svg"} alt={p.label} fill className="object-contain filter sepia hue-rotate-[200deg] saturate-[500%] brightness-75" style={{ filter: "invert(24%) sepia(35%) saturate(3019%) hue-rotate(199deg) brightness(98%) contrast(97%)" }} /></div>
                    <span className="font-semibold text-sm capitalize text-[#0f50a6]">{p.label}</span>
                  </button>
                ))}
              </div>
              <button disabled={!procedure} onClick={() => setStep("upload")} className="w-full py-4 bg-primary text-white rounded-2xl font-semibold shadow-xl hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer">
                Avançar
              </button>
            </motion.div>
          )}

          {step === "upload" && (
            <motion.div key="up" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid md:grid-cols-2 gap-8">
               <div className="bg-white p-6 rounded-[32px] border-2 border-dashed border-primary/20 min-h-[380px] flex flex-col items-center justify-center relative">
                  {!imageBase64 ? (
                    <div className="flex flex-col items-center gap-6">
                       <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary"><Upload size={32} /></div>
                       <div className="flex gap-3">
                          <button onClick={() => fileRef.current?.click()} className="px-5 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2"><ImageIcon size={18} /> Galeria</button>
                          <button onClick={() => camRef.current?.click()} className="px-5 py-3 border border-primary/20 rounded-2xl font-bold text-sm flex items-center gap-2"><Camera size={18} /> Câmera</button>
                       </div>
                       <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleFile(f); }} />
                       <input ref={camRef} type="file" hidden capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleFile(f); }} />
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                       <img src={imageBase64} alt="Preview" className="max-h-[300px] rounded-2xl shadow-xl" />
                       <button onClick={() => setImageBase64(null)} className="absolute top-0 right-0 p-2 bg-red-500 text-white rounded-full shadow-lg"><X size={16} /></button>
                    </div>
                  )}
               </div>
               <div className="space-y-8">
                  <div className="space-y-4">
                   <h3 className="text-xs font-semibold capitalize text-gray-400 tracking-wider font-['Poppins']">Paciente</h3>
                      <ClientSearchInput
                        contacts={contacts}
                        onSelect={handlePatientSelect}
                        initialName={patientName}
                      />
                </div>
                  <div className="p-5 bg-primary/5 rounded-3xl border border-primary/10">
                    <h3 className="text-[10px] font-semibold capitalize text-primary mb-1 tracking-wider">Procedimento Selecionado</h3>
                    <p className="font-semibold text-gray-800 capitalize">{procedure}</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold capitalize text-gray-400 tracking-wider">Tom desejado</h3>
                    <ColorPicker selectedId={selectedColor} onSelect={setSelectedColor} />
                  </div>
                  <button disabled={!imageBase64 || !patientName.trim() || isProcessing} onClick={handleGenerate} className={cn("w-full py-4 rounded-2xl text-white font-semibold transition-all shadow-xl flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed", !imageBase64 || !patientName.trim() || isProcessing ? "bg-gray-300" : "bg-primary")}>
                    {isProcessing ? <><Loader2 className="animate-spin" /> Processando...</> : <><Sparkles size={20} /> Gerar Simulação</>}
                  </button>
               </div>
            </motion.div>
          )}

          {step === "result" && resultBase64 && imageBase64 && (
            <motion.div key="res" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <div className="bg-white p-6 rounded-[40px] shadow-2xl overflow-hidden [&_img]:object-contain">
                  <BeforeAfterSlider before={imageBase64} after={resultBase64} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setStep("upload")} className="py-4 border-2 border-primary/20 rounded-2xl font-semibold text-primary capitalize text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 transition-all"><RotateCcw size={18} /> Refazer</button>
                  <button onClick={() => { setImageBase64(null); setResultBase64(null); setStep("procedure"); }} className="py-4 border-2 border-[#FB923C] bg-[#FB923C] rounded-2xl font-semibold text-white capitalize text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-[#FB923C]/90 shadow-lg transition-all"><Plus size={18} /> Outra</button>
               </div>
               <button onClick={handleSave} disabled={isSaving} className={cn("w-full py-4 rounded-2xl text-white font-semibold shadow-xl flex items-center justify-center gap-3 cursor-pointer", isSaving ? "bg-gray-300" : "bg-primary")}>
                  {isSaving ? <><Loader2 className="animate-spin" /> Salvando...</> : <><Save size={20} /> Salvar Simulação</>}
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
