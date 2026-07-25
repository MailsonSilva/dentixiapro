"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  checkAdminAccessAction,
  getAdminDashboardMetricsAction,
  getAdminClientsAction,
  getSaaSFinancialAndCostMetricsAction,
  AdminMetrics,
  ClientRow,
  SaaSFinancialMetrics,
} from "@/lib/admin/actions";
import { AdminDashboardTab } from "@/components/admin/AdminDashboardTab";
import { AdminClientsTab } from "@/components/admin/AdminClientsTab";
import { AdminSaaSMetricsTab } from "@/components/admin/AdminSaaSMetricsTab";
import { ShieldCheck, LayoutDashboard, Users, BarChart3, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const router = useRouter();
  
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "clients" | "saas">("dashboard");

  // Dados das abas
  const [dashboardMetrics, setDashboardMetrics] = useState<AdminMetrics | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientsLoading, setClientsLoading] = useState(true);

  const [saasMetrics, setSaasMetrics] = useState<SaaSFinancialMetrics | null>(null);
  const [saasLoading, setSaasLoading] = useState(true);

  // 🔒 Gatekeeper Validation
  useEffect(() => {
    async function verifyAccess() {
      const res = await checkAdminAccessAction();
      if (!res.isAdmin) {
        toast.error("Acesso Não Autorizado: Permissão restrita a administradores.");
        router.push("/login?error=unauthorized");
        return;
      }
      setAuthorized(true);
    }
    verifyAccess();
  }, [router]);

  // Carregar dados da aba ativa
  const loadDashboardData = useCallback(async () => {
    setDashboardLoading(true);
    const res = await getAdminDashboardMetricsAction();
    if (res.error) {
      toast.error(`Erro ao carregar estatísticas: ${res.error}`);
    } else {
      setDashboardMetrics(res.data);
    }
    setDashboardLoading(false);
  }, []);

  const loadClientsData = useCallback(async () => {
    setClientsLoading(true);
    const res = await getAdminClientsAction(searchQuery, currentPage, 10);
    if (res.error) {
      toast.error(`Erro ao carregar clientes: ${res.error}`);
    } else {
      setClients(res.clients);
      setTotalClients(res.total);
    }
    setClientsLoading(false);
  }, [searchQuery, currentPage]);

  const loadSaaSData = useCallback(async () => {
    setSaasLoading(true);
    const res = await getSaaSFinancialAndCostMetricsAction();
    if (res.error) {
      toast.error(`Erro ao carregar métricas SaaS: ${res.error}`);
    } else {
      setSaasMetrics(res.data);
    }
    setSaasLoading(false);
  }, []);

  useEffect(() => {
    if (authorized) {
      if (activeTab === "dashboard") loadDashboardData();
      if (activeTab === "clients") loadClientsData();
      if (activeTab === "saas") loadSaaSData();
    }
  }, [authorized, activeTab, loadDashboardData, loadClientsData, loadSaaSData]);

  // Gatekeeper loading state
  if (authorized === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <ShieldCheck className="w-10 h-10 text-cyan-400 animate-pulse" />
        <p className="text-sm font-medium">Verificando credenciais de acesso restrito...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/simulacoes")}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
            title="Voltar ao App"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Painel Administrativo</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                🔒 Área Restrita
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Gestão de segurança, clientes, operações e saúde financeira DentixiaPro.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === "dashboard") loadDashboardData();
              if (activeTab === "clients") loadClientsData();
              if (activeTab === "saas") loadSaaSData();
              toast.info("Dados atualizados.");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Atualizar Dados
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-semibold transition-all border-b-2 ${
            activeTab === "dashboard"
              ? "bg-zinc-900 text-cyan-400 border-cyan-400 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border-transparent"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> Visão Geral (Dashboard)
        </button>

        <button
          onClick={() => setActiveTab("clients")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-semibold transition-all border-b-2 ${
            activeTab === "clients"
              ? "bg-zinc-900 text-cyan-400 border-cyan-400 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border-transparent"
          }`}
        >
          <Users className="w-4 h-4" /> Gestão de Clientes
        </button>

        <button
          onClick={() => setActiveTab("saas")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-semibold transition-all border-b-2 ${
            activeTab === "saas"
              ? "bg-zinc-900 text-cyan-400 border-cyan-400 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border-transparent"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Métricas SaaS & Custos API
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      <div>
        {activeTab === "dashboard" && (
          <AdminDashboardTab metrics={dashboardMetrics} loading={dashboardLoading} />
        )}

        {activeTab === "clients" && (
          <AdminClientsTab
            clients={clients}
            totalClients={totalClients}
            currentPage={currentPage}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            onPageChange={(p) => setCurrentPage(p)}
            onRefresh={loadClientsData}
            loading={clientsLoading}
          />
        )}

        {activeTab === "saas" && (
          <AdminSaaSMetricsTab metrics={saasMetrics} loading={saasLoading} />
        )}
      </div>
    </div>
  );
}
