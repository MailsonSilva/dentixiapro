import { supabase } from "@/lib/supabase";

export interface ProcedureCatalogItem {
  id: string;
  name: string;
  duration_min: number;
  is_system: boolean;
  company_id?: string;
}

export async function getProcedureCatalog(companyId: string): Promise<ProcedureCatalogItem[]> {
  const { data, error } = await supabase
    .from("procedure_catalog")
    .select("id, name, duration_min, is_system, company_id")
    .or(`is_system.eq.true,company_id.eq.${companyId}`)
    .order("name", { ascending: true });

  if (error) return [];
  return (data as ProcedureCatalogItem[]) || [];
}
