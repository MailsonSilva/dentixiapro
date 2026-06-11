"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, User, Phone, Mail, Calendar,
  Trash2, Edit2, X, Loader2, Save, MapPin, Cake, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";
import { useRouter } from "next/navigation";
import { differenceInYears, parseISO, format } from "date-fns";
import { ProcedureHistory } from "@/components/clientes/ProcedureHistory";

const CONFIRM_TIMEOUT = 4000;


export type ContactItem = {
  id: string;
  created_at: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  birth_date?: string | null;
  metadata?: { cpf?: string | null, observacao?: string | null } | null;
  stage_id?: string | null;
  crm_stages?: {
    id: string;
    name: string;
    color: string;
  } | null;
};

export default function ClientesPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const { notify } = useNotification();
  const router = useRouter();

  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);

  // CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    cpf: "",
    address: "",
    birth_date: "",
  });

  // ── Exclusão sem popup: 2-cliques ───────────────────────
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [deleteConfirmActive, setDeleteConfirmActive] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deleteProgressState, setDeleteProgressState] = useState(0);

  const executeDelete = useCallback(async (contactId: string) => {
    setDeletingContactId(contactId);
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", contactId);
      if (error) throw error;
      notify("Excluído", "Paciente removido com sucesso.", "success");
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      if (selectedContact?.id === contactId) setSelectedContact(null);
    } catch {
      notify("Erro", "Não foi possível excluir o paciente.", "error");
    } finally {
      setDeletingContactId(null);
    }
  }, [notify, selectedContact]);

  const handleDeleteClick = (contactId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (deleteConfirmActive === contactId) {
      clearTimeout(deleteTimerRef.current!);
      clearInterval(deleteIntervalRef.current!);
      setDeleteConfirmActive(null);
      setDeleteProgressState(0);
      executeDelete(contactId);
      return;
    }
    clearTimeout(deleteTimerRef.current!);
    clearInterval(deleteIntervalRef.current!);
    setDeleteConfirmActive(contactId);
    setDeleteProgressState(0);
    const start = Date.now();
    deleteIntervalRef.current = setInterval(() => {
      setDeleteProgressState(Math.min(((Date.now() - start) / CONFIRM_TIMEOUT) * 100, 100));
    }, 40);
    deleteTimerRef.current = setTimeout(() => {
      setDeleteConfirmActive(null);
      setDeleteProgressState(0);
    }, CONFIRM_TIMEOUT);
  };

  useEffect(() => () => {
    clearTimeout(deleteTimerRef.current!);
    clearInterval(deleteIntervalRef.current!);
  }, []);

  // ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: uc } = await supabase
        .from("user_company").select("company_id").eq("user_id", user.id).single();
      if (uc) setCompanyId(uc.company_id);

      const [{ data: contactsData, error: cErr }] =
        await Promise.all([
          supabase
            .from("contacts")
            .select(`*, crm_stages:stage_id ( id, name, color )`)
            .order("created_at", { ascending: false }),
        ]);

      if (cErr) throw cErr;
      setContacts(contactsData || []);
    } catch (error: unknown) {
      notify("Erro ao buscar dados", (error as Error).message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase().trim();
    return contacts.filter(
      (c) => c.name?.toLowerCase().includes(q)
        || c.phone?.includes(q)
        || c.email?.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const getStageColor = (color: string | null | undefined) => color ?? "#94a3b8";

  const openAddModal = () => {
    setFormData({ id: "", name: "", phone: "", email: "", cpf: "", address: "", birth_date: "" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (contact: ContactItem) => {
    const meta = contact.metadata ?? {};
    setFormData({
      id: contact.id || "",
      name: contact.name || "",
      phone: contact.phone || "",
      email: contact.email || "",
      cpf: meta.cpf || "",
      address: contact.address || "",
      birth_date: contact.birth_date || "",
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { notify("Erro", "O nome é obrigatório", "error"); return; }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: uc } = await supabase
        .from("user_company").select("company_id").eq("user_id", user.id).single();
      if (!uc) throw new Error("Nenhuma empresa vinculada.");

      const basePayload = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        birth_date: formData.birth_date || null,
        metadata: { cpf: formData.cpf || null },
      };

      if (isEditing) {
        // update: não inclui company_id para evitar violação de RLS
        const { error } = await supabase.from("contacts").update(basePayload).eq("id", formData.id);
        if (error) throw error;
        notify("Sucesso", "Paciente atualizado!", "success");
      } else {
        const { error } = await supabase.from("contacts").insert([{ ...basePayload, company_id: uc.company_id }]);
        if (error) throw error;
        notify("Sucesso", "Paciente criado!", "success");
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      notify("Erro ao salvar", (err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgendar = (contactId: string) => router.push(`/agenda?contact_id=${contactId}`);

  const calcAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), parseISO(birthDate));
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
      <div className="p-6 md:p-8 flex-1 flex flex-col max-w-7xl mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Pacientes & CRM</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Gerencie a lista de clientes, status e histórico de negociações.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm shadow-primary/20 transition-all self-start md:self-auto"
          >
            <Plus size={18} /> Novo Paciente
          </button>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">

          {/* Table */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative w-full sm:max-w-xs">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar pacientes..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs capitalize tracking-wider font-bold">
                    <th className="px-6 py-4 border-b border-slate-100">Nome do Paciente</th>
                    <th className="px-6 py-4 border-b border-slate-100">Status (CRM)</th>
                    <th className="px-6 py-4 border-b border-slate-100">Contato</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {isLoading ? (
                    <tr><td colSpan={4} className="text-center py-10 text-slate-500">Carregando...</td></tr>
                  ) : filteredContacts.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10 text-slate-500">
                      {search ? "Nenhum resultado." : "Nenhum paciente cadastrado."}
                    </td></tr>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isConfirmingThis = deleteConfirmActive === contact.id;
                      return (
                        <tr
                          key={contact.id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer relative"
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
                                  <p className="text-xs text-slate-400 font-medium mt-0.5">CPF: {contact.metadata.cpf}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border"
                              style={{
                                backgroundColor: `${getStageColor(contact.crm_stages?.color)}15`,
                                borderColor: `${getStageColor(contact.crm_stages?.color)}30`,
                                color: getStageColor(contact.crm_stages?.color),
                              }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: getStageColor(contact.crm_stages?.color) }} />
                              {contact.crm_stages?.name || "Sem Fase"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {contact.phone && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                  <Phone size={14} className="text-slate-400" />{contact.phone}
                                </div>
                              )}
                              {contact.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Mail size={14} className="text-slate-400" />{contact.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleAgendar(contact.id)} title="Agendar" className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                <Calendar size={16} />
                              </button>
                              <button onClick={() => openEditModal(contact)} title="Editar" className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>

                              {/* Botão de exclusão 2-cliques */}
                              <div className="relative">
                                <button
                                  onClick={(e) => handleDeleteClick(contact.id, e)}
                                  disabled={deletingContactId === contact.id}
                                  title={isConfirmingThis ? "Confirmar exclusão" : "Excluir"}
                                  className={`relative px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all overflow-hidden flex items-center gap-1.5 ${
                                    isConfirmingThis
                                      ? "bg-red-500 text-white"
                                      : "bg-red-50 text-red-500 hover:bg-red-100"
                                  }`}
                                >
                                  {/* Barra de progresso */}
                                  {isConfirmingThis && (
                                    <div
                                      className="absolute bottom-0 left-0 h-0.5 bg-red-300 transition-none"
                                      style={{ width: `${deleteProgressState}%` }}
                                    />
                                  )}
                                  {deletingContactId === contact.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : isConfirmingThis ? (
                                    <AlertTriangle size={12} />
                                  ) : (
                                    <Trash2 size={12} />
                                  )}
                                  {isConfirmingThis ? "Confirmar?" : ""}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drawer de detalhes */}
          {selectedContact && (
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed md:relative inset-y-0 md:inset-auto right-0 z-50 md:z-0 w-full max-w-md md:w-[400px] h-full md:h-auto bg-white border text-sm border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden shrink-0 shadow-2xl md:shadow-sm"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Detalhes do Paciente</h3>
                <button onClick={() => setSelectedContact(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-2xl">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">{selectedContact.name}</h2>
                    <p className="text-sm font-medium text-slate-500">
                      Cadastrado em {new Date(selectedContact.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    {/* Status CRM — somente leitura */}
                    {selectedContact.crm_stages && (
                      <div
                        className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border"
                        style={{
                          backgroundColor: `${getStageColor(selectedContact.crm_stages?.color)}15`,
                          borderColor: `${getStageColor(selectedContact.crm_stages?.color)}30`,
                          color: getStageColor(selectedContact.crm_stages?.color),
                        }}
                      >
                        {selectedContact.crm_stages.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100 mb-2">
                  <h4 className="font-bold text-slate-700 text-xs capitalize tracking-wider flex items-center gap-2">
                    <User size={14} /> Dados Cadastrais
                  </h4>
                  {selectedContact.phone && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1.5"><Phone size={12} /> Telefone</span>
                      <span className="font-semibold text-slate-700">{selectedContact.phone}</span>
                    </div>
                  )}
                  {selectedContact.email && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1.5"><Mail size={12} /> Email</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[180px]">{selectedContact.email}</span>
                    </div>
                  )}
                  {selectedContact.metadata?.cpf && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">CPF</span>
                      <span className="font-semibold text-slate-700">{selectedContact.metadata.cpf}</span>
                    </div>
                  )}
                  {selectedContact.birth_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1.5"><Cake size={12} /> Nascimento</span>
                      <span className="font-semibold text-slate-700">
                        {format(parseISO(selectedContact.birth_date), "dd/MM/yyyy")}
                        <span className="text-slate-400 font-normal ml-1">({calcAge(selectedContact.birth_date)} anos)</span>
                      </span>
                    </div>
                  )}
                  {selectedContact.address && (
                    <div className="flex items-start justify-between text-sm gap-2">
                      <span className="text-slate-500 flex items-center gap-1.5 shrink-0"><MapPin size={12} /> Endereço</span>
                      <span className="font-semibold text-slate-700 text-right">{selectedContact.address}</span>
                    </div>
                  )}
                </div>

                <ProcedureHistory contactId={selectedContact.id} companyId={companyId} />
              </div>

              <div className="p-5 border-t border-slate-100 flex gap-2">
                <button onClick={() => openEditModal(selectedContact)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors">
                  Editar
                </button>
                {/* Botão excluir 2-cliques no drawer */}
                <button
                  onClick={() => handleDeleteClick(selectedContact.id)}
                  disabled={deletingContactId === selectedContact.id}
                  className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 text-sm ${
                    deleteConfirmActive === selectedContact.id
                      ? "bg-red-500 text-white"
                      : "bg-red-50 text-red-500 hover:bg-red-100"
                  }`}
                >
                  {deletingContactId === selectedContact.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : deleteConfirmActive === selectedContact.id
                    ? <AlertTriangle size={14} />
                    : <Trash2 size={14} />}
                  {deleteConfirmActive === selectedContact.id ? "Confirmar?" : "Excluir"}
                </button>
                <button onClick={() => handleAgendar(selectedContact.id)} className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl font-bold transition-colors">
                  Agendar
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal Criação/Edição — SEM crm_stage_id */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <User className="text-primary" size={20} />
                  {isEditing ? "Editar Paciente" : "Novo Paciente"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="text-xs font-bold text-slate-500 capitalize tracking-wider mb-2 block">Nome Completo *</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do Paciente" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 capitalize tracking-wider mb-2 block">Celular / WhatsApp</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 capitalize tracking-wider mb-2 block">CPF</label>
                    <input type="text" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 capitalize tracking-wider mb-2 block">E-mail</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 capitalize tracking-wider mb-2 block flex items-center gap-1.5">
                    <Cake size={12} /> Data de Nascimento
                  </label>
                  <input type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700" />
                  {formData.birth_date && <p className="text-xs text-slate-400 mt-1">{calcAge(formData.birth_date)} anos</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 capitalize tracking-wider mb-2 block flex items-center gap-1.5">
                    <MapPin size={12} /> Endereço
                  </label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Rua, número, bairro, cidade/UF" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700" />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all disabled:opacity-50">
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
