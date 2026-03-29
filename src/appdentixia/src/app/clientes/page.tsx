"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, User, FileText, Phone, Mail, Activity, Calendar, Trash2, Edit2, X, Loader2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ClientesPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useNotification();
  const router = useRouter();
  
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  // CRUD States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    cpf: "",
    crm_stage_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: stagesData, error: stagesError } = await supabase
        .from("crm_stages")
        .select("*")
        .order("order_index");

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select(`
          *,
          crm_stages ( id, name, color )
        `)
        .order("created_at", { ascending: false });

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
    } catch (error: any) {
      console.error(error);
      notify("Erro ao buscar dados", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getStageColor = (color: string | null) => {
    return color ? color : "#94a3b8";
  };

  const openAddModal = () => {
    setFormData({ id: "", name: "", phone: "", email: "", cpf: "", crm_stage_id: "" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (contact: any) => {
    setFormData({
      id: contact.id,
      name: contact.name || "",
      phone: contact.phone || "",
      email: contact.email || "",
      cpf: contact.metadata?.cpf || "",
      crm_stage_id: contact.crm_stage_id || "",
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (contactId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este paciente? O histórico será apagado.")) return;
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", contactId);
      if (error) throw error;
      notify("Sucesso", "Paciente excluído com sucesso", "success");
      setContacts(contacts.filter(c => c.id !== contactId));
      if (selectedContact?.id === contactId) setSelectedContact(null);
    } catch (error: any) {
      notify("Erro", "Erro ao excluir o paciente", "error");
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      notify("Erro", "O nome do paciente é obrigatório", "error");
      return;
    }

    setIsSaving(true);
    try {
      // Pega empresa vinculada
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) throw new Error("Não autenticado");
      
      const { data: uc } = await supabase.from("user_company").select("company_id").eq("user_id", user.id).single();
      if(!uc) throw new Error("Nenhuma empresa vinculada ao usuário.");

      const payload = {
        company_id: uc.company_id,
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        crm_stage_id: formData.crm_stage_id || null,
        metadata: {
          cpf: formData.cpf || null
        }
      };

      if (isEditing) {
        const { error } = await supabase.from("contacts").update(payload).eq("id", formData.id);
        if (error) throw error;
        notify("Sucesso", "Paciente atualizado com sucesso", "success");
      } else {
        const { error } = await supabase.from("contacts").insert([payload]);
        if (error) throw error;
        notify("Sucesso", "Paciente criado com sucesso", "success");
      }

      setIsModalOpen(false);
      fetchData(); // reload
    } catch (err: any) {
      notify("Erro ao salvar", err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgendar = (contactId: string) => {
    // Redireciona para Agenda com o parametro na querystring.
    router.push(`/agenda?contact_id=${contactId}`);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
      <div className="p-6 md:p-8 flex-1 flex flex-col max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pacientes & CRM</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Gerencie a lista de clientes, status e histórico de negociações.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm shadow-primary/20 transition-all self-start md:self-auto"
          >
            <Plus size={18} />
            Novo Paciente
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          
          {/* Main Table View */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar pacientes..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="px-6 py-4 border-b border-slate-100">Nome do Paciente</th>
                    <th className="px-6 py-4 border-b border-slate-100">Status (CRM)</th>
                    <th className="px-6 py-4 border-b border-slate-100">Contato</th>
                    <th className="px-6 py-4 border-b border-slate-100">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {isLoading ? (
                    <tr><td colSpan={4} className="text-center py-10 text-slate-500">Carregando pacientes...</td></tr>
                  ) : contacts.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10 text-slate-500">Nenhum paciente cadastrado.</td></tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr 
                        key={contact.id} 
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => setSelectedContact(contact)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{contact.name}</p>
                              {contact.metadata?.cpf && (
                                <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">CPF: {contact.metadata.cpf}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div 
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-opacity-10 border"
                            style={{ 
                              backgroundColor: `${getStageColor(contact.crm_stages?.color)}15`,
                              borderColor: `${getStageColor(contact.crm_stages?.color)}30`,
                              color: getStageColor(contact.crm_stages?.color) 
                            }}
                          >
                            <div 
                              className="w-1.5 h-1.5 rounded-full mr-2" 
                              style={{ backgroundColor: getStageColor(contact.crm_stages?.color) }}
                            />
                            {contact.crm_stages?.name || 'Sem Fase'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                <Phone size={14} className="text-slate-400" />
                                {contact.phone}
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail size={14} className="text-slate-400" />
                                {contact.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                               <button 
                                 onClick={() => handleAgendar(contact.id)}
                                 title="Agendar Consulta"
                                 className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                               >
                                 <Calendar size={18} />
                               </button>
                               <button 
                                 onClick={() => openEditModal(contact)}
                                 title="Editar Paciente"
                                 className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                               >
                                 <Edit2 size={18} />
                               </button>
                               <button 
                                 onClick={() => handleDelete(contact.id)}
                                 title="Excluir Paciente"
                                 className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                               >
                                 <Trash2 size={18} />
                               </button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side Drawer (Details) */}
          {selectedContact && (
            <motion.div 
              initial={{ opacity: 0, x: 50, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "380px" }}
              className="bg-white border text-sm border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden shrink-0"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Detalhes do Paciente</h3>
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">{selectedContact.name}</h2>
                    <p className="text-sm font-medium text-slate-500">Criado em {new Date(selectedContact.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Info Row */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                      <User size={14} /> Dados Cadastrais
                    </h4>
                    {selectedContact.phone && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Telefone</span>
                        <span className="font-semibold text-slate-700">{selectedContact.phone}</span>
                      </div>
                    )}
                    {selectedContact.email && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Email</span>
                        <span className="font-semibold text-slate-700">{selectedContact.email}</span>
                      </div>
                    )}
                    {selectedContact.metadata?.cpf && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">CPF</span>
                        <span className="font-semibold text-slate-700">{selectedContact.metadata.cpf}</span>
                      </div>
                    )}
                  </div>

                  {/* Histórico Básico */}
                  <div>
                     <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                      <Activity size={14} /> Histórico Médio
                    </h4>
                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        <p className="text-xs text-slate-400 italic text-center w-full">Em breve: Relatórios dinâmicos do Dentixia Pro conectando as mensagens e sessões.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-t border-slate-100 flex gap-2">
                 <button 
                   onClick={() => openEditModal(selectedContact)}
                   className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors"
                 >
                    Editar
                 </button>
                 <button 
                   onClick={() => handleAgendar(selectedContact.id)}
                   className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl font-bold transition-colors"
                 >
                    Agendar Consulta
                 </button>
              </div>
            </motion.div>
          )}

        </div>
      </div>

       {/* Modal Criação/Edição */}
       <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <User className="text-primary" size={20} />
                  {isEditing ? "Editar Paciente" : "Novo Paciente"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="p-6 space-y-4">
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nome Completo *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Nome do Paciente" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-700" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Celular / WhatsApp</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="(00) 00000-0000" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-700 text-sm" 
                      />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">CPF</label>
                      <input 
                        type="text" 
                        value={formData.cpf}
                        onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                        placeholder="000.000.000-00" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-700 text-sm" 
                      />
                   </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">E-mail</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@exemplo.com" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-700" 
                  />
                </div>

                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Status Inicial / Funil (CRM)</label>
                   <select 
                      value={formData.crm_stage_id}
                      onChange={(e) => setFormData({...formData, crm_stage_id: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-700 appearance-none"
                   >
                     <option value="">Nenhum (Lista Geral)</option>
                     {stages.map(s => (
                       <option key={s.id} value={s.id}>{s.name}</option>
                     ))}
                   </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? "Salvando..." : "Salvar Paciente"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
