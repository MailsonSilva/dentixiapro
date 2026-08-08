"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Copy, Check, Loader2, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReferralDataAction } from "@/lib/indique-e-ganhe/actions";

interface HeaderData {
  nome_completo: string;
  referral_code: string;
  commission_rate: number;
  link_completo?: string;
}

interface ResumoCards {
  id_parceiro_user: string;
  ano: number;
  mes: number;
  total_indicacoes: number;
  total_ativos: number;
  total_em_teste: number;
  total_cancelados: number;
  comissao_total: number;
}

interface Indicado {
  id_parceiro_user: string;
  nome_cliente: string;
  email_cliente: string;
  data_cadastro_user: string;
  data_referencia: string;
  mes: number;
  ano: number;
  status_formatado: string;
  nome_plano?: string;
  valor_comissao_estimada?: number;
}

const MESES = [
  { value: "todos", label: "Todos os Meses" },
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
];

export default function IndiqueEGanhePage() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [headerData, setHeaderData] = useState<HeaderData | null>(null);
  const [resumoCardsRaw, setResumoCardsRaw] = useState<ResumoCards[]>([]);
  const [indicados, setIndicados] = useState<Indicado[]>([]);

  // Filtros
  const currentYear = new Date().getFullYear();

  const [registrationYear, setRegistrationYear] = useState(currentYear);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | "todos">("todos");
  const [filterType, setFilterType] = useState<"mensal" | "anual">("mensal");

  useEffect(() => {
    async function loadData() {
      const res = await getReferralDataAction();
      if (res.error || !res.data) {
        setLoading(false);
        return;
      }

      const { userCreatedAt, userData, header, resumo, lista } = res.data;

      const userYear = new Date(userCreatedAt).getFullYear();
      setRegistrationYear(userYear);
      // Initialize filters to show everything from current year
      setSelectedYear(currentYear);
      setSelectedMonth("todos");

      const mergedHeader = {
        nome_completo: userData?.nome_completo || header?.nome_completo || "",
        referral_code: userData?.referral_code || header?.referral_code || "",
        commission_rate: userData?.commission_rate ?? header?.commission_rate ?? 10,
        link_completo: header?.link_completo
      };

      setHeaderData(mergedHeader);
      setResumoCardsRaw(resumo);
      setIndicados(lista);
      setLoading(false);
    }
    loadData();
  }, [currentYear]);

  // Derived state: os anos disponíveis (do ano de cadastro até o atual)
  const availableYears = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= registrationYear; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear, registrationYear]);

  // Filtramos os indicados por mês/ano selecionados na UI
  const filteredIndicados = useMemo(() => {
    return indicados.filter(ind => {
      const yearMatch = ind.ano === selectedYear;
      const monthMatch = filterType === "mensal" && selectedMonth !== "todos" 
        ? ind.mes === (selectedMonth as number) + 1 
        : true;

      return yearMatch && monthMatch;
    });
  }, [indicados, selectedYear, selectedMonth, filterType]);

  const resumoComputed = useMemo(() => {
    let t_ativos = 0, t_teste = 0, t_canc = 0, t_comissao = 0;
    resumoCardsRaw.forEach(row => {
      const yearMatch = row.ano === selectedYear;
      const monthMatch = filterType === "mensal" && selectedMonth !== "todos" 
        ? row.mes === (selectedMonth as number) + 1 
        : true;
      
      if (yearMatch && monthMatch) {
        t_ativos += row.total_ativos || 0;
        t_teste += row.total_em_teste || 0;
        t_canc += row.total_cancelados || 0;
        t_comissao += row.comissao_total || 0;
      }
    });
    return {
      total_ativos: t_ativos,
      total_em_teste: t_teste,
      total_cancelados: t_canc,
      comissao_total: t_comissao
    };
  }, [resumoCardsRaw, selectedYear, selectedMonth, filterType]);



  const referralLink = headerData?.referral_code ? `https://app.dentixia.com.br/register?ref=${headerData.referral_code}` : "";

  const handleCopy = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary-bg">
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 bg-secondary-bg">
      <div className="flex flex-col flex-1 pb-24 md:pb-8 border-none h-full overflow-hidden w-full">
        <main className="max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
          
          {/* Welcome Section */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              Olá, {headerData?.nome_completo || ""} 👏
            </h1>
            <p className="text-gray-500 text-sm">Acompanhe suas indicações e comissões do seu link.</p>
          </div>

          {/* Link Section (Card com cor verde suave - Regra 8) */}
          <div className="bg-[#F0FDF4] rounded-2xl p-4 md:p-6 border border-[#DCFCE7] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Ícone removido conforme Regra 2 */}
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-gray-800">Seu link de indicação</p>
                  <p className="text-[11px] sm:text-xs text-emerald-800 font-mono truncate w-[220px] sm:w-[320px] md:w-auto mt-0.5">
                    {referralLink || "Link não gerado. Complete seu cadastro."}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCopy}
                className="bg-white hover:bg-emerald-50/50 text-gray-700 border border-emerald-200/80 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-emerald-600" />}
                {copied ? "Copiado!" : "Clique para copiar"}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Sua comissão é de: <span className="font-bold text-emerald-700">{headerData?.commission_rate ? `${headerData.commission_rate}%` : "10%"}</span> por assinatura ativa.
            </p>
          </div>

          {/* Filters (Fontes e botões reduzidos - Regra 3) */}
          <div className="flex gap-2 items-center flex-wrap pt-1">
            <select
              value={filterType}
              onChange={(e) => {
                const val = e.target.value as "mensal" | "anual";
                setFilterType(val);
                if (val === "anual") {
                  setSelectedMonth("todos");
                }
              }}
              className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm outline-none w-28 focus:ring-2 focus:ring-primary/20"
            >
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm outline-none w-24 focus:ring-2 focus:ring-primary/20"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === "todos" ? "todos" : Number(e.target.value))}
              disabled={filterType === "anual"}
              className={cn(
                "bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm outline-none w-36 focus:ring-2 focus:ring-primary/20",
                filterType === "anual" && "opacity-50 cursor-not-allowed"
              )}
            >
              {MESES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <p className="text-[11px] font-bold text-gray-400 capitalize tracking-wider mt-2">Visão do Período ({filteredIndicados.length} indicações)</p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Status Cards Dinâmicos */}
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-2 col-span-1 border border-gray-50">
              <div className="flex justify-between items-center w-full">
                 <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                    <Clock size={16} className="text-orange-500" />
                 </div>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-400 capitalize leading-tight block">Em teste</span>
              <p className="text-2xl sm:text-3xl font-semibold text-[#F19642]">{resumoComputed.total_em_teste}</p>
            </div>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-2 col-span-1 border border-gray-50">
              <div className="flex justify-between items-center w-full">
                 <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Users size={16} className="text-blue-500" />
                 </div>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-400 capitalize leading-tight block">Ativos</span>
              <p className="text-2xl sm:text-3xl font-semibold text-[#11A0D9]">{resumoComputed.total_ativos}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-2 col-span-1 border border-gray-50">
              <div className="flex justify-between items-center w-full">
                 <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <Users size={16} className="text-red-500" />
                 </div>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-400 capitalize leading-tight block">Inativos</span>
              <p className="text-2xl sm:text-3xl font-semibold text-[#EB5757]">{resumoComputed.total_cancelados}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-2 col-span-1 border border-gray-50">
               <div className="flex justify-between items-center w-full">
                 <div className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500">
                    <User size={16} />
                 </div>
               </div>
               <span className="text-[10px] sm:text-xs font-bold text-gray-400 capitalize leading-tight block">Total (Mês)</span>
               <p className="text-2xl sm:text-3xl font-semibold text-gray-800">{filteredIndicados.length}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-2 col-span-2 md:col-span-1 border border-gray-50 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 $
               </div>
               <div className="flex justify-between items-center w-full">
                 <div className="w-8 h-8 rounded-2xl bg-[#E6F9F0] flex items-center justify-center text-emerald-600 font-bold">
                    $
                 </div>
               </div>
               <span className="text-[10px] sm:text-xs font-bold text-gray-400 capitalize leading-tight block z-10 relative">Comissão (Global)</span>
               <p className="text-2xl sm:text-3xl font-semibold text-emerald-600">R$ {(resumoComputed.comissao_total).toFixed(2)}</p>
            </div>
          </div>

          {/* Table (Visualização melhorada e dados completos - Regras 4 & 5) */}
          <div className="space-y-3 pt-2">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Plano</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Data Inscrição</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Comissão Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredIndicados.map((item, i) => (
                      <tr key={i} className="text-xs text-gray-700 hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800">{item.nome_cliente || "Cliente"}</span>
                            {item.email_cliente && (
                              <span className="text-[10px] text-gray-400 font-normal">{item.email_cliente}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                            item.status_formatado?.toLowerCase() === "active" || item.status_formatado === "Ativo" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : item.status_formatado?.toLowerCase() === "canceled" || item.status_formatado === "Inativo" 
                              ? "bg-rose-50 text-rose-700 border-rose-200" 
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {(item.status_formatado?.toLowerCase() === "active" || item.status_formatado === "Ativo") && <Check size={12} className="mr-1 text-emerald-600" />}
                            {(item.status_formatado?.toLowerCase() === "canceled" || item.status_formatado === "Inativo" || item.status_formatado?.toLowerCase() === "trialing") && <Clock size={12} className="mr-1 text-amber-600" />}
                            {item.status_formatado}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap text-gray-600 font-medium">
                          {item.nome_plano || "Plano DentixIA"}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-500 whitespace-nowrap">
                          {item.data_cadastro_user ? new Date(item.data_cadastro_user).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-700 whitespace-nowrap">
                          {item.valor_comissao_estimada ? `R$ ${Number(item.valor_comissao_estimada).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                    {filteredIndicados.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic text-xs">
                          Nenhuma indicação registrada no período selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
