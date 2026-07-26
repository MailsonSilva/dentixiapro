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
import { AdminNotificationsTab } from "@/components/admin/AdminNotificationsTab";
import { AdminSaaSMetricsTab } from "@/components/admin/AdminSaaSMetricsTab";
import { ShieldCheck, LayoutDashboard, Users, Bell, BarChart3, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const router = useRouter();
  
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "clients" | "notifications" | "saas">("dashboard");

  // Dados das abas
  const [dashboardMetrics, setDashboardMetrics] = useState<AdminMetrics | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Clientes + Filtros
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "trial" | "subscribers" | "blocked">("all");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
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
    const res = await getAdminClientsAction(
      searchQuery,
      statusFilter,
      startDate,
      endDate,
      currentPage,
      10
    );
    if (res.error) {
      toast.error(`Erro ao carregar clientes: ${res.error}`);
    } else {
      setClients(res.clients);
      setTotalClients(res.total);
    }
    setClientsLoading(false);
  }, [searchQuery, statusFilter, startDate, endDate, currentPage]);

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
      <div className="min-h-screen bg-secondary-bg flex flex-col items-center justify-center text-slate-500 gap-3">
        <ShieldCheck className="w-10 h-10 text-primary animate-pulse" />
        <p className="text-sm font-medium">Verificando credenciais de acesso restrito...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-bg text-slate-800 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/simulacoes")}
            className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-colors shadow-sm"
            title="Voltar ao App"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Painel Administrativo</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                🔒 Área Restrita
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Gestão de segurança, clientes, notificações e saúde financeira DentixiaPro.
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
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" /> Atualizar Dados
          </button>
        </div>
      </div>

      {/* Navegação por Abas Principais */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === "dashboard"
              ? "bg-white text-primary border-primary shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> Visão Geral (Dashboard)
        </button>

        <button
          onClick={() => setActiveTab("clients")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === "clients"
              ? "bg-white text-primary border-primary shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent"
          }`}
        >
          <Users className="w-4 h-4" /> Gestão de Clientes
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === "notifications"
              ? "bg-white text-primary border-primary shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent"
          }`}
        >
          <Bell className="w-4 h-4" /> Central de Notificações
        </button>

        <button
          onClick={() => setActiveTab("saas")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === "saas"
              ? "bg-white text-primary border-primary shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent"
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
            statusFilter={statusFilter}
            startDate={startDate}
            endDate={endDate}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            onStatusFilterChange={(s) => {
              setStatusFilter(s);
              setCurrentPage(1);
            }}
            onDateRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              setCurrentPage(1);
            }}
            onPageChange={(p) => setCurrentPage(p)}
            onRefresh={loadClientsData}
            loading={clientsLoading}
          />
        )}

        {activeTab === "notifications" && (
          <AdminNotificationsTab />
        )}

        {activeTab === "saas" && (
          <AdminSaaSMetricsTab metrics={saasMetrics} loading={saasLoading} />
        )}
      </div>
    </div>
  );
}
