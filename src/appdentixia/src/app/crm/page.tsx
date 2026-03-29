"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Phone, Mail, Trash2, X, User, Loader2,
  MessageSquare, GripVertical,
  CheckCircle2, Clock, Stethoscope, TrendingUp, Heart, ThumbsDown,
  Smile, Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  name: string;
  color: string;
  order_index: number;
}

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  metadata: Record<string, string> | null;
  stage_id: string | null;
  created_at: string;
}

const DEFAULT_STAGES = [
  { name: "Novo Lead", color: "#6366f1", order_index: 0 },
  { name: "Em Atendimento", color: "#0ea5e9", order_index: 1 },
  { name: "Avaliação Agendada", color: "#f59e0b", order_index: 2 },
  { name: "Em Orçamento", color: "#8b5cf6", order_index: 3 },
  { name: "Tratamento Aprovado", color: "#06b6d4", order_index: 4 },
  { name: "Em Tratamento", color: "#0F50A6", order_index: 5 },
  { name: "Finalizado", color: "#10b981", order_index: 6 },
  { name: "Perdido", color: "#ef4444", order_index: 7 },
];

const STAGE_ICONS: Record<string, React.ElementType> = {
  "Novo Lead": Inbox,
  "Em Atendimento": MessageSquare,
  "Avaliação Agendada": Clock,
  "Em Orçamento": TrendingUp,
  "Tratamento Aprovado": CheckCircle2,
  "Em Tratamento": Stethoscope,
  "Finalizado": Heart,
  "Perdido": ThumbsDown,
};

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const palette = ["#6366f1", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#0F50A6", "#ef4444"];
  const color = palette[name.charCodeAt(0) % palette.length];
  const sizeClass = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div
      className={cn("rounded-xl flex items-center justify-center font-black text-white flex-shrink-0", sizeClass)}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function NewContactModal({
  open, onClose, onSave, companyId,
}: {
  open: boolean; onClose: () => void;
  onSave: (c: Contact) => void; companyId: string;
}) {
  const { notify } = useNotification();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", observacao: "" });
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setForm({ name: "", phone: "", email: "", observacao: "" }); setTimeout(() => ref.current?.focus(), 100); }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase.from("contacts")
        .insert({ company_id: companyId, created_by: user.id, name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, metadata: form.observacao ? { observacao: form.observacao } : {} })
        .select().single();
      if (error) throw error;
      notify("Contato salvo!", `${form.name} adicionado.`, "success");
      onSave(data as Contact);
      onClose();
    } catch (err) { notify("Erro", err instanceof Error ? err.message : "Erro", "error"); }
    finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <User className="text-primary" size={20} />
                </div>
                <h2 className="text-xl font-black text-gray-800">Novo Contato</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome *</label>
                <input ref={ref} type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Maria Oliveira" className="w-full" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="w-full" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observação</label>
                <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Notas sobre o paciente..." className="w-full border-2 border-slate-200 bg-white/50 rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary/40 resize-none transition-all" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" disabled={saving || !form.name.trim()} className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white transition-all shadow-lg shadow-primary/20", saving || !form.name.trim() ? "bg-gray-300 cursor-not-allowed" : "bg-primary hover:bg-primary/90 active:scale-95")}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  {saving ? "Salvando..." : "Salvar Contato"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function EditContactModal({
  open, onClose, onSave, contact,
}: {
  open: boolean; onClose: () => void;
  onSave: (c: Contact) => void; contact: Contact | null;
}) {
  const { notify } = useNotification();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", observacao: "" });
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && contact) {
      setForm({
        name: contact.name || "",
        phone: contact.phone || "",
        email: contact.email || "",
        observacao: contact.metadata?.observacao || "",
      });
      setTimeout(() => ref.current?.focus(), 100);
    }
  }, [open, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !contact) return;
    setSaving(true);
    try {
      const metadata = { ...contact.metadata };
      if (form.observacao || metadata.observacao) metadata.observacao = form.observacao;
      
      const { data, error } = await supabase.from("contacts")
        .update({ name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, metadata: Object.keys(metadata).length ? metadata : null })
        .eq("id", contact.id).select().single();
      if (error) throw error;
      notify("Contato atualizado!", `As informações foram salvas.`, "success");
      onSave(data as Contact);
      onClose();
    } catch (err) { notify("Erro", err instanceof Error ? err.message : "Erro", "error"); }
    finally { setSaving(false); }
  };

  if (!contact) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <User className="text-primary" size={20} />
                </div>
                <h2 className="text-xl font-black text-gray-800">Editar Contato</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome *</label>
                <input ref={ref} type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Maria Oliveira" className="w-full" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="w-full" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observação</label>
                <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Notas sobre o paciente..." className="w-full border-2 border-slate-200 bg-white/50 rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary/40 resize-none transition-all" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" disabled={saving || !form.name.trim()} className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white transition-all shadow-lg shadow-primary/20", saving || !form.name.trim() ? "bg-gray-300 cursor-not-allowed" : "bg-primary hover:bg-primary/90 active:scale-95")}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  {saving ? "Salvando..." : "Salvar Edição"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function KanbanCard({
  contact, onDelete, onDragStart, deleting, onClick
}: {
  contact: Contact; onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, contact: Contact) => void; deleting: boolean; onClick: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      draggable
      onDragStart={(e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDragStart(e as any, contact);
      }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md p-3 cursor-pointer group transition-all hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical size={14} className="text-gray-300 flex-shrink-0 cursor-grab active:cursor-grabbing hover:opacity-100 transition-opacity" />
          <Avatar name={contact.name} size="sm" />
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-800 truncate leading-tight">{contact.name}</p>
            {contact.phone && (
              <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                <Phone size={9} />{contact.phone}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(contact.id); }}
          disabled={deleting}
          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        </button>
      </div>
      {contact.metadata?.observacao && (
        <p className="text-[11px] text-gray-400 mt-2 pl-1 line-clamp-2 leading-relaxed">{contact.metadata.observacao}</p>
      )}
      <div className="flex items-center gap-2 mt-2 pl-1">
        {contact.email && <Mail size={10} className="text-gray-300" />}
        <p className="text-[10px] text-gray-300">{new Date(contact.created_at).toLocaleDateString("pt-BR")}</p>
      </div>
    </motion.div>
  );
}

function KanbanColumn({
  stage, contacts, onDelete, deletingId, onDrop, onDragOver, onDragLeave, isDragOver, onEdit
}: {
  stage: Stage; contacts: Contact[]; onDelete: (id: string) => void;
  deletingId: string | null; onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: () => void; isDragOver: boolean; onEdit: (contact: Contact) => void;
}) {
  const StageIcon = STAGE_ICONS[stage.name] || Smile;


  const handleDragStart = (e: React.DragEvent, contact: Contact) => {
    e.dataTransfer.setData("contactId", contact.id);
    e.dataTransfer.setData("fromStageId", contact.stage_id || "null");
  };


  return (
    <div
      className={cn(
        "flex-shrink-0 w-64 flex flex-col rounded-2xl transition-all duration-200",
        isDragOver ? "ring-2 ring-offset-1" : ""
      )}
      style={{ "--tw-ring-color": isDragOver ? stage.color : "transparent" } as React.CSSProperties}
      onDrop={(e) => onDrop(e, stage.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, stage.id); }}
      onDragLeave={onDragLeave}
    >
      {/* Column Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
        style={{ backgroundColor: stage.color + "15" }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stage.color + "25" }}>
          <StageIcon size={14} style={{ color: stage.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black truncate" style={{ color: stage.color }}>{stage.name}</p>
        </div>
        <span className="text-xs font-black text-white rounded-full px-1.5 py-0.5" style={{ backgroundColor: stage.color }}>
          {contacts.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          "flex-1 space-y-2 rounded-xl p-2 min-h-[120px] transition-all duration-200",
          isDragOver ? "bg-gray-50 border-2 border-dashed" : "border-2 border-transparent"
        )}
        style={{ borderColor: isDragOver ? stage.color + "60" : "transparent" }}
      >
        <AnimatePresence>
          {contacts.map((c) => (
            <KanbanCard
              key={c.id}
              contact={c}
              onDelete={onDelete}
              onDragStart={handleDragStart}
              deleting={deletingId === c.id}
              onClick={() => onEdit(c)}
            />
          ))}
        </AnimatePresence>
        {contacts.length === 0 && (
          <div className="h-16 flex items-center justify-center rounded-xl text-gray-300 text-xs">
            Arraste um contato aqui
          </div>
        )}
      </div>
    </div>
  );
}

export default function CRMPage() {
  const { notify } = useNotification();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string>("");


  // Buscar company_id e dados
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: uc } = await supabase.from("user_company").select("company_id").eq("user_id", user.id).eq("active", true).single();
      if (!uc) return;
      setCompanyId(uc.company_id);

      // Buscar stages
      let { data: stagesData } = await supabase.from("crm_stages").select("*").eq("company_id", uc.company_id).order("order_index");

      // Se não existir stages, criar os padrões
      if (!stagesData || stagesData.length === 0) {
        const defaultsToInsert = DEFAULT_STAGES.map(s => ({ ...s, company_id: uc.company_id }));
        const { data: inserted } = await supabase.from("crm_stages").insert(defaultsToInsert).select();
        stagesData = inserted;
      }
      setStages((stagesData || []) as Stage[]);

      // Buscar contatos
      const { data: contactsData } = await supabase.from("contacts").select("*").eq("company_id", uc.company_id).order("created_at", { ascending: false });
      setContacts((contactsData || []) as Contact[]);
      setLoading(false);
    };
    init();
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Remover este contato?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) notify("Erro", error.message, "error");
    else { notify("Removido!", "Contato excluído.", "success"); setContacts(prev => prev.filter(c => c.id !== id)); }
    setDeletingId(null);
  }, [notify]);

  const handleDrop = useCallback(async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const contactId = e.dataTransfer.getData("contactId");
    if (!contactId) return;

    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage_id: toStageId } : c));

    const { error } = await supabase.from("contacts").update({ stage_id: toStageId }).eq("id", contactId);
    if (error) notify("Erro", "Não foi possível mover o contato.", "error");
  }, [notify]);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q) || (c.email ?? "").toLowerCase().includes(q);
  });

  const contactsByStage = (stageId: string | null) =>
    filtered.filter(c => c.stage_id === stageId || (stageId === stages[0]?.id && !c.stage_id));

  return (
    <div className="flex flex-col h-full min-h-screen bg-secondary-bg">
      <NewContactModal open={showModal} onClose={() => setShowModal(false)} companyId={companyId} onSave={(c) => setContacts(prev => [c, ...prev])} />
      <EditContactModal open={showEditModal} onClose={() => { setShowEditModal(false); setTimeout(() => setEditingContact(null), 200); }} contact={editingContact} onSave={(updated) => setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))} />

      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex-shrink-0">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">
              CRM <span className="text-gradient">Kanban</span>
            </h1>
            <p className="text-gray-400 font-medium mt-1 text-sm">
              {contacts.length} contatos · Arraste para mover entre estágios
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search inline */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar contato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 !rounded-xl !border-2 !border-gray-100 bg-white shadow-sm text-sm w-52 focus:!border-primary/30 !py-2"
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

        {/* Stats */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {stages.slice(0, 6).map(stage => {
            const count = contactsByStage(stage.id).length;
            return (
              <div key={stage.id} className="flex-shrink-0 flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-100">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-gray-600">{stage.name}</span>
                <span className="text-gray-400 font-black">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-400 font-bold animate-pulse">Carregando CRM...</p>
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
                onEdit={(c) => { setEditingContact(c); setShowEditModal(true); }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
