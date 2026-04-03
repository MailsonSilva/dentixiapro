"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";

// Camada de Dados (SSD Pattern)
import { getCrmStages, getCrmContacts, Contact, Stage } from "@/lib/crm/queries";
import { updateContactStage, deleteContact } from "@/lib/crm/actions";

// UI Components (Refatorados)
import { KanbanColumn } from "@/components/crm/KanbanColumn";
import { ContactModal } from "@/components/crm/ContactModals";

export default function CRMPage() {
  const { notify } = useNotification();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string>("");

  /**
   * Inicialização conforme padrão Multi-Tenant
   */
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: uc } = await supabase
          .from("user_company")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("active", true)
          .single();
        
        if (!uc) return;
        setCompanyId(uc.company_id);

        const [initialStages, initialContacts] = await Promise.all([
          getCrmStages(uc.company_id),
          getCrmContacts(uc.company_id)
        ]);

        setStages(initialStages);
        setContacts(initialContacts);
      } catch (err: unknown) {
        const error = err as Error;
        notify("Erro de Carregamento", error.message, "error");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [notify]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteContact(id);
      notify("Removido!", "Contato excluído.", "success");
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err: unknown) {
      const error = err as Error;
      notify("Erro", error.message, "error");
    } finally {
      setDeletingId(null);
    }
  }, [notify]);

  const handleDrop = useCallback(async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const contactId = e.dataTransfer.getData("contactId");
    if (!contactId) return;

    // Update Otimista
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage_id: toStageId } : c));

    try {
      await updateContactStage(contactId, toStageId);
    } catch {
      notify("Erro", "Não foi possível mover o contato no servidor.", "error");
      // Opcional: Reverter estado em caso de erro crítico
    }
  }, [notify]);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) || 
      (c.phone ?? "").includes(q) || 
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  const contactsByStage = (stageId: string | null) =>
    filtered.filter(c => c.stage_id === stageId || (stageId === stages[0]?.id && !c.stage_id));

  return (
    <div className="flex flex-col h-full min-h-screen bg-secondary-bg">
      {/* Modais Gerenciados (Reutilizável) */}
      <ContactModal 
        open={showModal || !!editingContact} 
        onClose={() => { setShowModal(false); setEditingContact(null); }} 
        companyId={companyId} 
        contact={editingContact}
        onSave={(data) => {
          if (editingContact) {
            setContacts(prev => prev.map(c => c.id === data.id ? data : c));
          } else {
            setContacts(prev => [data, ...prev]);
          }
        }} 
      />

      {/* Header com Busca e Stats */}
      <div className="px-6 pt-8 pb-4 flex-shrink-0">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800 tracking-tight">
              CRM <span className="text-gradient">Kanban</span>
            </h1>
            <p className="text-gray-400 font-medium mt-1 text-sm">
              {contacts.length} contatos · Arraste para mover entre estágios
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar contato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border-2 border-gray-100 bg-white shadow-sm text-sm w-52 focus:border-primary/30 rounded-xl"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all text-sm whitespace-nowrap"
            >
              <Plus size={18} /> Novo Contato
            </button>
          </div>
        </motion.div>

        {/* Quick Stats bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {stages.slice(0, 6).map(stage => (
            <div key={stage.id} className="flex-shrink-0 flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-100">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="text-gray-600">{stage.name}</span>
              <span className="text-gray-400 font-semibold">{contactsByStage(stage.id).length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Board principal */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-gray-400 font-bold animate-pulse">Sincronizando CRM...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-8">
          <div className="flex gap-4 px-6 pt-2" style={{ minWidth: `${stages.length * 272}px` }}>
            {stages.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                contacts={contactsByStage(stage.id)}
                onDelete={handleDelete}
                deletingId={deletingId}
                onDrop={handleDrop}
                onDragOver={(e, id) => { e.preventDefault(); setDragOverStage(id); }}
                onDragLeave={() => setDragOverStage(null)}
                isDragOver={dragOverStage === stage.id}
                onEdit={(c) => setEditingContact(c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
