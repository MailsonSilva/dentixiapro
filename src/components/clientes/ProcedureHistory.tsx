"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getProcedureRecords, ProcedureRecord } from "@/lib/clientes/queries";
import { addProcedureRecord, deleteProcedureRecord } from "@/lib/clientes/actions";
import { getProcedureCatalog, ProcedureCatalogItem } from "@/lib/agenda/queries";
import { ProcedureGrid } from "@/components/procedimentos/ProcedureGrid";
import { useNotification } from "@/lib/NotificationContext";

const STATUS_CONFIG = {
  realizado: {
    label: "Realizado",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pendente: {
    label: "Pendente",
    icon: Clock,
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  cancelado: {
    label: "Cancelado",
    icon: XCircle,
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-600 border-red-200",
  },
};

interface Props {
  contactId: string;
  companyId: string;
}

export function ProcedureHistory({ contactId, companyId }: Props) {
  const { notify } = useNotification();
  const [records, setRecords] = useState<ProcedureRecord[]>([]);
  const [catalog, setCatalog] = useState<ProcedureCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    catalogId: "",
    customName: "",
    performedAt: format(new Date(), "yyyy-MM-dd"),
    status: "realizado" as "realizado" | "cancelado" | "pendente",
    notes: "",
  });

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const [recs, cat] = await Promise.all([
        getProcedureRecords(contactId),
        getProcedureCatalog(companyId),
      ]);
      setRecords(recs);
      setCatalog(cat);
    } catch {
      notify("Erro", "Não foi possível carregar o histórico.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [contactId, notify]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedItem = catalog.find((c) => c.id === form.catalogId);
    const procedureName = selectedItem?.name || form.customName.trim();

    if (!procedureName) {
      notify("Atenção", "Selecione ou informe um procedimento.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await addProcedureRecord({
        companyId,
        contactId,
        procedureName,
        catalogId: form.catalogId || null,
        performedAt: form.performedAt,
        status: form.status,
        notes: form.notes || undefined,
      });
      notify("Sucesso", "Procedimento registrado!", "success");
      setShowAddForm(false);
      setForm({
        catalogId: "",
        customName: "",
        performedAt: format(new Date(), "yyyy-MM-dd"),
        status: "realizado",
        notes: "",
      });
      fetchRecords();
    } catch {
      notify("Erro", "Não foi possível salvar o procedimento.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProcedureRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      notify("Removido", "Registro excluído.", "success");
    } catch {
      notify("Erro", "Não foi possível excluir.", "error");
    }
  };

  return (
    <div className="mt-6">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h4 className="font-bold text-slate-700 text-xs capitalize tracking-wider flex items-center gap-2">
          <Activity size={14} />
          Histórico de Procedimentos
          <span className="ml-1 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {records.length}
          </span>
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddForm((v) => !v);
              setIsExpanded(true);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/8 hover:bg-primary/15 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Plus size={12} /> Adicionar
          </button>
          {isExpanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Add Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.form
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onSubmit={handleAddRecord}
                  className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3"
                >
                  <p className="text-xs font-bold text-primary">Novo Registro</p>

                  <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    <ProcedureGrid
                      procedures={catalog}
                      onSelect={(proc) => setForm((f) => ({ ...f, catalogId: proc.id, customName: "" }))}
                      selectedId={form.catalogId !== "__custom__" ? form.catalogId : undefined}
                      readonly={true}
                    />
                  </div>
                  
                  <div className="mt-2 text-right">
                    <button 
                       type="button" 
                       onClick={() => setForm((f) => ({ ...f, catalogId: "__custom__", customName: "" }))}
                       className="text-[10px] font-bold text-primary hover:underline"
                    >
                      + Digitar outro procedimento manual
                    </button>
                  </div>

                  {form.catalogId === "__custom__" && (
                    <input
                      type="text"
                      placeholder="Nome do procedimento"
                      value={form.customName}
                      onChange={(e) => setForm((f) => ({ ...f, customName: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700"
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">Data</label>
                      <input
                        type="date"
                        required
                        value={form.performedAt}
                        onChange={(e) => setForm((f) => ({ ...f, performedAt: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            status: e.target.value as "realizado" | "cancelado" | "pendente",
                          }))
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none font-medium"
                      >
                        <option value="realizado">Realizado</option>
                        <option value="pendente">Pendente</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    placeholder="Observações (opcional)"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none resize-none font-medium text-slate-700"
                  />

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : null}
                      Salvar
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Timeline */}
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Activity size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">Nenhum procedimento registrado.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 text-xs font-bold text-primary hover:underline"
                >
                  Adicionar o primeiro
                </button>
              </div>
            ) : (
              <div className="relative space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {records.map((rec) => {
                  const cfg = STATUS_CONFIG[rec.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 relative pl-6"
                    >
                      {/* Dot */}
                      <div
                        className={`absolute left-0 top-3 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${cfg.dot}`}
                      />
                      {/* Card */}
                      <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 shadow-xs group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">
                              {rec.procedure_name}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {format(parseISO(rec.performed_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}
                            >
                              <StatusIcon size={10} />
                              {cfg.label}
                            </span>
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Remover"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {rec.notes && (
                          <p className="text-[11px] text-slate-500 mt-1.5 italic">
                            &ldquo;{rec.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
