"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getPlansAction, getPlanosUserDataAction, createCheckoutSessionAction } from "@/lib/planos/actions";
import { useNotification } from "@/lib/NotificationContext";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, ShieldCheck, Star, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { IMAGES } from "@/lib/images";

interface Plan {
  id: string;
  unit_amount: number;
  interval: string;
  currency: string;
  active: boolean;
  product_name: string;
  product_description: string | null;
}

const PERKS = [
  "Simulações ilimitadas com IA",
  "Cancele quando quiser",
  "Suporte via WhatsApp",
];

export default function PlanosPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [userData, setUserData] = useState<{
    email: string; nome_completo: string; cpf: string; telefone: string;
    address: string; city: string; postal_code: string; state: string;
    id: string; referral_code: string; company_id: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      const userRes = await getPlanosUserDataAction();
      if (userRes.error || !userRes.data) {
        router.push("/login");
        return;
      }
      
      setUserData(userRes.data as any);

      const plansRes = await getPlansAction();
      if (plansRes.plans && plansRes.plans.length > 0) {
        setPlans(plansRes.plans);
        // Selecionar por padrão o plano Anual se existir, senão o primeiro
        const annualPlan = plansRes.plans.find((p: Plan) => p.interval === "year");
        setSelectedId(annualPlan ? annualPlan.id : plansRes.plans[0].id);
      }
      setLoadingPlans(false);
    }
    loadData();
  }, [router]);

  const isAnnual = (p: Plan) => p.interval === "year";

  const formatCurrency = (amount: number) =>
    (Math.floor(amount) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleCheckout = async (planId: string) => {
    if (!userData) return;
    setSelectedId(planId);
    setCheckoutLoading(true);
    try {
      const return_url = `${window.location.origin}/perfil`;
      const res = await createCheckoutSessionAction({
        price_id: planId,
        email: userData.email,
        company_id: userData.company_id,
        return_url,
        name: userData.nome_completo,
        cpf: userData.cpf,
        address: {
          line1: userData.address || "",
          city: userData.city || "",
          postal_code: userData.postal_code || "",
          state: userData.state || "",
        },
        phone: userData.telefone,
        referral_code: userData.referral_code,
      });

      if (res.error) {
        throw new Error(res.error);
      }
      if (res.url) {
        window.location.href = res.url;
      } else {
        throw new Error("URL de checkout não retornada.");
      }
    } catch (err: unknown) {
      notify("Erro", err instanceof Error ? err.message : "Tente novamente.", "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loadingPlans) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#eef2f7]">
        <Loader2 className="animate-spin text-[#1a5fb4]" size={36} />
      </div>
    );
  }

  // Encontrar o valor mensal base para calcular desconto real
  const monthlyPlan = plans.find(p => p.interval === "month");
  const baseMonthlyAmount = monthlyPlan ? monthlyPlan.unit_amount : 19700; // fallback R$197

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#dce8f8] to-[#eef2f7] flex flex-col items-center pt-6 pb-12 px-4 font-sans relative">
      {/* Botão de Navegação de Saída: Voltar ao Início */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 font-bold text-xs shadow-sm border border-gray-200/60 transition-all active:scale-[0.98]"
        >
          <ArrowLeft size={15} />
          <span>Voltar ao Início</span>
        </button>
      </div>

      {/* Header Compacto */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-5 text-center">
        <div className="flex justify-center mb-2.5">
          <Image
            src={IMAGES.logo}
            alt="DentixIA"
            width={130}
            height={34}
            className="h-7 w-auto object-contain"
            priority
          />
        </div>
        <h1 className="text-lg md:text-xl font-bold text-[#1a2a4a] mb-0.5">
          Escolha o plano ideal
        </h1>
        <p className="text-gray-500 text-[11px] max-w-xs">
          Assinatura segura via Stripe. Cancele quando quiser.
        </p>
      </motion.div>

      {/* Grid de Planos Compactos com espaçamento aumentado */}
      <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-7 items-stretch">
        {plans.map((plan, i) => {
          const annual = isAnnual(plan);
          const monthlyEq = annual ? plan.unit_amount / 12 : plan.unit_amount;
          const selected = selectedId === plan.id;
          const isLoadingThis = checkoutLoading && selected;

          // Cálculo exato de desconto percentual em relação ao plano mensal anualizado
          const annualCostIfMonthly = baseMonthlyAmount * 12;
          const realDiscountPercent = annualCostIfMonthly > 0 
            ? Math.round(((annualCostIfMonthly - plan.unit_amount) / annualCostIfMonthly) * 100)
            : 17;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.08 } }}
              className="relative flex flex-col h-full"
            >
              {/* Destaque Visual "Mais vendido" VERDE no plano principal (Anual) */}
              {annual && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-emerald-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap uppercase tracking-wider ring-2 ring-[#dce8f8]">
                  <Sparkles size={10} className="text-yellow-300" />
                  Mais vendido
                </div>
              )}

              <div
                onClick={() => setSelectedId(plan.id)}
                className={`group flex flex-col h-full bg-white rounded-xl transition-all duration-300 cursor-pointer ring-offset-2 ring-offset-[#eef2f7] ${
                  selected
                    ? "ring-2 ring-emerald-600 shadow-lg scale-[1.01] z-10 border-transparent"
                    : "hover:scale-[1.005] hover:shadow-md border border-gray-200"
                }`}
              >
                <div className="flex flex-col h-full p-3.5">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between mb-2 pt-0.5">
                    <div className="flex-1">
                      <p className={`font-bold text-xs mb-0.5 ${selected ? "text-[#1a2a4a]" : "text-gray-700"}`}>
                        {plan.product_name}
                      </p>
                      {annual && (
                        <span className="inline-block text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ECONOMIZE {realDiscountPercent}% (2 MESES GRÁTIS)
                        </span>
                      )}
                    </div>
                    <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      selected ? "border-emerald-600 bg-white shadow-inner" : "border-gray-300 bg-gray-50"
                    }`}>
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        selected ? "bg-emerald-600 scale-100" : "bg-transparent scale-0"
                      }`} />
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="mb-3 flex flex-col justify-center">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-black tracking-tight transition-colors ${selected ? "text-[#1a2a4a]" : "text-gray-800"}`}>
                        {formatCurrency(monthlyEq)}
                      </span>
                      <span className="text-gray-400 text-[10px] font-bold">/mês</span>
                    </div>
                    {annual && (
                      <p className="text-gray-400 text-[10px] font-medium mt-0.5">
                        Cobrado anualmente: <span className="text-emerald-700 font-bold">{formatCurrency(plan.unit_amount)}</span>
                      </p>
                    )}
                  </div>

                  {/* Benefícios (Perks) */}
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {PERKS.map((perk, j) => (
                      <li key={j} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-600">
                        <CheckCircle2 size={13} strokeWidth={2.5} className={annual ? "text-emerald-500" : "text-gray-400"} />
                        <span>{perk}</span>
                      </li>
                    ))}
                    {annual && (
                      <li className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                        <Star size={13} fill="currentColor" className="text-emerald-500" />
                        <span>Economia de {realDiscountPercent}% no ano (2 meses grátis)</span>
                      </li>
                    )}
                  </ul>

                  {/* Botão de Ação CTA */}
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); handleCheckout(plan.id); }}
                    disabled={checkoutLoading}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      annual
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200"
                        : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
                    } disabled:opacity-70 disabled:cursor-wait`}
                  >
                    {isLoadingThis ? (
                      <><Loader2 size={14} className="animate-spin" /><span>Processando...</span></>
                    ) : (
                      <span>Assinar Agora</span>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.4 } }}
        className="mt-6 flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[11px] tracking-wider">
          <ShieldCheck size={15} className="text-emerald-500" />
          <span>Pagamento Seguro via Stripe</span>
        </div>
        <p className="text-gray-400 text-[10px] max-w-[260px] leading-relaxed">
          Cancele a qualquer momento.
        </p>
      </motion.div>
    </div>
  );
}