"use client";

import { X, User, Plus, Loader2, CheckCircle2, MapPin, Cake } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useNotification } from "@/lib/NotificationContext";
import { Contact } from "@/lib/crm/queries";
import { createContact, updateContact } from "@/lib/crm/actions";
import { differenceInYears, parseISO } from "date-fns";

/**
 * Avatar circular com iniciais e cor baseada no nome.
 */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const palette = ["#6366f1", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#0F50A6", "#ef4444"];
  const color = palette[name.charCodeAt(0) % palette.length];
  const sizeClass = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div
      className={cn("rounded-xl flex items-center justify-center font-semibold text-white flex-shrink-0", sizeClass)}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  birth_date: string;
  address: string;
  observacao: string;
}

/**
 * Modal para Criar ou Editar contato — campos completos, idênticos à tela de Clientes.
 * Fix PGRST204: usa createContact / updateContact ao invés de upsert.
 */
export function ContactModal({
  open,
  onClose,
  onSave,
  contact = null,
  companyId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (c: Contact) => void;
  contact?: Contact | null;
  companyId?: string;
}) {
  const { notify } = useNotification();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    email: "",
    cpf: "",
    birth_date: "",
    address: "",
    observacao: "",
  });
  const ref = useRef<HTMLInputElement>(null);
  const isEditing = !!contact;

  const calcAge = (dateStr: string) => {
    try {
      return differenceInYears(new Date(), parseISO(dateStr));
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (open) {
      if (contact) {
        setForm({
          name: contact.name || "",
          phone: contact.phone || "",
          email: contact.email || "",
          cpf: contact.metadata?.cpf || "",
          birth_date: (contact as any).birth_date || "",
          address: (contact as any).address || "",
          observacao: contact.metadata?.observacao || "",
        });
      } else {
        setForm({ name: "", phone: "", email: "", cpf: "", birth_date: "", address: "", observacao: "" });
      }
      setTimeout(() => ref.current?.focus(), 100);
    }
  }, [open, contact]);

  const setField = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        birth_date: form.birth_date || null,
        metadata: {
          cpf: form.cpf.trim() || null,
          observacao: form.observacao.trim() || null,
        } as Record<string, unknown>,
      };

      let data: Contact;

      if (isEditing && contact) {
        data = await updateContact(contact.id, payload);
        notify("Contato atualizado!", "As informações foram salvas.", "success");
      } else {
        if (!companyId) throw new Error("company_id não informado");
        data = await createContact({ ...payload, company_id: companyId });
        notify("Contato salvo!", `${form.name} adicionado ao CRM.`, "success");
      }

      onSave(data);
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      notify("Erro", error.message || "Erro ao processar", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <User className="text-primary" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {isEditing ? "Editar Contato" : "Novo Lead / Contato"}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 capitalize tracking-wider">Nome *</label>
                <input
                  ref={ref}
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Ex: Maria Oliveira"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-700"
                  required
                />
              </div>

              {/* Telefone + CPF */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 capitalize tracking-wider">Telefone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 capitalize tracking-wider">CPF</label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setField("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 capitalize tracking-wider">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>

              {/* Nascimento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 capitalize tracking-wider flex items-center gap-1.5">
                  <Cake size={12} /> Data de Nascimento
                </label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setField("birth_date", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
                {form.birth_date && (
                  <p className="text-xs text-slate-400">
                    {calcAge(form.birth_date)} anos
                  </p>
                )}
              </div>

              {/* Endereço */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 capitalize tracking-wider flex items-center gap-1.5">
                  <MapPin size={12} /> Endereço
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Rua, número, bairro, cidade/UF"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>

              {/* Observação */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 capitalize tracking-wider">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={(e) => setField("observacao", e.target.value)}
                  placeholder="Notas sobre o paciente / lead..."
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-all font-medium"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white transition-all shadow-lg shadow-primary/20",
                    saving || !form.name.trim() ? "bg-gray-300 cursor-not-allowed" : "bg-primary hover:bg-primary/90 active:scale-95"
                  )}
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : isEditing ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                  {saving ? "Salvando..." : isEditing ? "Salvar Edição" : "Salvar Contato"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
