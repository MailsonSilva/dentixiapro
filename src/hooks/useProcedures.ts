import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { ProcedureCatalogItem } from "../lib/agenda/queries";

export function useProcedures(companyId: string) {
  const [procedures, setProcedures] = useState<ProcedureCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProcedures = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("procedure_catalog")
        .select("*")
        .or(`company_id.eq.${companyId},is_system.eq.true`)
        .order("is_system", { ascending: false })
        .order("name");

      if (fetchErr) throw fetchErr;
      setProcedures(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load procedures");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadProcedures();
  }, [loadProcedures]);

  const addProcedure = async (name: string, durationMin: number) => {
    setIsLoading(true);
    try {
      const { data, error: insertErr } = await supabase
        .from("procedure_catalog")
        .insert([{ company_id: companyId, name, duration_min: durationMin, is_system: false }])
        .select()
        .single();
      if (insertErr) throw insertErr;
      setProcedures((prev) => [...prev, data].sort((a, b) => {
        if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
        return a.name.localeCompare(b.name);
      }));
      return { success: true, data };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProcedure = async (id: string, name: string, durationMin: number) => {
    setIsLoading(true);
    try {
      // Cannot update system procedures
      const existing = procedures.find((p) => p.id === id);
      if (existing?.is_system) throw new Error("Não é possível alterar procedimentos do sistema.");

      const { data, error: updateErr } = await supabase
        .from("procedure_catalog")
        .update({ name, duration_min: durationMin })
        .eq("id", id)
        .eq("company_id", companyId) // Security check
        .select()
        .single();
        
      if (updateErr) throw updateErr;
      setProcedures((prev) => prev.map((p) => (p.id === id ? data : p)));
      return { success: true, data };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProcedure = async (id: string) => {
    setIsLoading(true);
    try {
      const existing = procedures.find((p) => p.id === id);
      if (existing?.is_system) throw new Error("Não é possível excluir procedimentos do sistema.");

      const { error: deleteErr } = await supabase
        .from("procedure_catalog")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (deleteErr) throw deleteErr;
      setProcedures((prev) => prev.filter((p) => p.id !== id));
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    procedures,
    isLoading,
    error,
    loadProcedures,
    addProcedure,
    updateProcedure,
    deleteProcedure,
  };
}
